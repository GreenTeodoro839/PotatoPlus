// xk/captcha_ocr.js — fully local OCR for the xk.nju.edu.cn click captcha.
//
// Pipeline:
//   1. Read the 250×120 captcha image into an ImageData.
//   2. Find the 4 floating colored chars in the upper area (y<100) via
//      saturation-mask connected components.
//   3. For each upper region, crop a 56×56 box around the center, resize
//      to 48×48, run the upper char classifier.
//   4. For each of 4 fixed title-bar positions, crop 24×24, resize to 48×48,
//      run the title char classifier.
//   5. Brute-force the 24 permutations matching upper → title to minimize
//      cross-entropy; return the 4 click points in title order.
//
// Two q8-quantized TinyCNNs (xk_captcha_upper_*, xk_captcha_title_*) live in
// ../../models/ and use the same format as authserver_captcha.

class XKCaptchaSolver {
  constructor(upper, title) {
    this.upper = upper;   // {meta, qWeights, biases, cache}
    this.title = title;
  }

  static async create(baseUrl = "") {
    const prefix = baseUrl ? baseUrl.replace(/\/$/, "") + "/" : "";

    async function loadModel(name) {
      const meta = await fetch(prefix + `${name}_model.json`).then(r => r.json());
      const qBuf = await fetch(prefix + (meta.quantization?.weights_file || `${name}_weights_q8.bin`)).then(r => r.arrayBuffer());
      const bBuf = await fetch(prefix + (meta.quantization?.biases_file || `${name}_biases_f32.bin`)).then(r => r.arrayBuffer());
      return {
        meta,
        qWeights: new Int8Array(qBuf),
        biases: new Float32Array(bBuf),
        cache: new Map(),
      };
    }

    const [upper, title] = await Promise.all([
      loadModel("xk_captcha_upper"),
      loadModel("xk_captcha_title"),
    ]);
    if (upper.meta.num_classes !== title.meta.num_classes ||
        upper.meta.classes.length !== title.meta.classes.length) {
      console.warn("[xk_ocr] upper/title class sets differ in size");
    }
    return new XKCaptchaSolver(upper, title);
  }

  warmup() {
    for (const m of [this.upper, this.title]) {
      for (const n of Object.keys(m.meta.tensors)) xkTensor(m, n);
    }
  }

  async solve(imgEl) {
    const meta = this.upper.meta;
    const W = meta.img_w | 0, H = meta.img_h | 0;
    const imageData = xkImageToImageData(imgEl, W, H);

    const regions = xkFindUpperRegions(imageData, meta.upper_crop?.upper_area_height ?? 100);
    if (regions.length < 4) throw new Error("Failed to segment/match characters");

    // Classify the 4 upper regions and the 4 title slots.
    const upperLogits = regions.map(r => xkClassify(this.upper, xkCropUpper(imageData, r.cx, r.cy)));
    const titleLogits = [];
    const tx = meta.title_crop?.x_centers ?? [127, 150, 173, 196];
    for (let i = 0; i < 4; i++) {
      titleLogits.push(xkClassify(this.title, xkCropTitle(imageData, i, tx)));
    }

    // Bipartite match upper→title by minimizing -log p(upper_i = argmax title_j).
    const titleArgmax = titleLogits.map(l => xkArgmax(l));
    const upperProb = upperLogits.map(xkSoftmax);
    const cost = [[], [], [], []];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        cost[i][j] = -Math.log(Math.max(upperProb[i][titleArgmax[j]], 1e-12));
    const assignment = xkBestAssignment4(cost);

    // points[j] = pixel position to click for title slot j
    const points = new Array(4);
    for (let i = 0; i < 4; i++) {
      const j = assignment[i];
      points[j] = [regions[i].cx, regions[i].cy];
    }
    return points;
  }
}


// ---------------------------------------------------------------------------
// image → ImageData
// ---------------------------------------------------------------------------

function xkImageToImageData(imgEl, w, h) {
  const canvas = typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imgEl, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}


// ---------------------------------------------------------------------------
// Upper-area localization: HSV-saturation foreground + 8-connectivity flood
// fill. Light gray background pixels are excluded; rare touching components
// are split by area / aspect heuristics, then top-4 by area are returned.
// ---------------------------------------------------------------------------

function xkFindUpperRegions(imageData, upperH) {
  const W = imageData.width;
  const H = Math.min(upperH, imageData.height);
  const data = imageData.data;
  const mask = new Uint8Array(W * H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * imageData.width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const maxc = Math.max(r, g, b);
      const minc = Math.min(r, g, b);
      const sat = maxc === 0 ? 0 : (maxc - minc) / maxc;
      const lightBg = r > 165 && g > 205 && b > 225;
      if (sat > 0.18 && !lightBg) mask[y * W + x] = 1;
    }
  }

  let regions = xkConnectedComponents(mask, W, H, 25);
  if (regions.length < 4) {
    // Retry with looser thresholds.
    const mask2 = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * imageData.width + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const maxc = Math.max(r, g, b);
        const minc = Math.min(r, g, b);
        const sat = maxc === 0 ? 0 : (maxc - minc) / maxc;
        const lightBg = r > 175 && g > 215 && b > 235;
        if (sat > 0.10 && !lightBg) mask2[y * W + x] = 1;
      }
    }
    regions = xkConnectedComponents(mask2, W, H, 12);
  }
  regions = xkMergeNearby(regions, 14);
  regions.sort((a, b) => b.area - a.area);
  return regions.slice(0, 4);
}

function xkConnectedComponents(mask, W, H, minArea) {
  const visited = new Uint8Array(W * H);
  const regions = [];
  const stack = new Int32Array(W * H);
  for (let sy = 0; sy < H; sy++) {
    for (let sx = 0; sx < W; sx++) {
      const si = sy * W + sx;
      if (!mask[si] || visited[si]) continue;
      let sp = 0;
      stack[sp++] = si;
      visited[si] = 1;
      let sumX = 0, sumY = 0, n = 0;
      let minX = sx, maxX = sx, minY = sy, maxY = sy;
      while (sp > 0) {
        const idx = stack[--sp];
        const x = idx % W;
        const y = (idx - x) / W;
        sumX += x; sumY += y; n++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
            const ni = ny * W + nx;
            if (mask[ni] && !visited[ni]) {
              visited[ni] = 1;
              stack[sp++] = ni;
            }
          }
        }
      }
      if (n < minArea) continue;
      const bw = maxX - minX + 1, bh = maxY - minY + 1;
      if (bw < 6 || bh < 6) continue;
      if (bw / Math.max(bh, 1) > 5 || bh / Math.max(bw, 1) > 5) continue;
      regions.push({ cx: sumX / n, cy: sumY / n, bbox: [minX, minY, maxX + 1, maxY + 1], area: n });
    }
  }
  return regions;
}

function xkMergeNearby(regions, distThresh) {
  const out = regions.map(r => ({ ...r }));
  let changed = true;
  while (changed) {
    changed = false;
    outer:
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[i].cx - out[j].cx;
        const dy = out[i].cy - out[j].cy;
        if (Math.hypot(dx, dy) >= distThresh) continue;
        const ai = out[i].area, aj = out[j].area, sum = ai + aj;
        const bi = out[i].bbox, bj = out[j].bbox;
        out[i] = {
          cx: (out[i].cx * ai + out[j].cx * aj) / sum,
          cy: (out[i].cy * ai + out[j].cy * aj) / sum,
          bbox: [
            Math.min(bi[0], bj[0]), Math.min(bi[1], bj[1]),
            Math.max(bi[2], bj[2]), Math.max(bi[3], bj[3]),
          ],
          area: sum,
        };
        out.splice(j, 1);
        changed = true;
        break outer;
      }
    }
  }
  return out;
}


// ---------------------------------------------------------------------------
// Crop helpers — must mirror trainer/xk_captcha_common.py exactly.
// ---------------------------------------------------------------------------

const XK_UPPER_PAD_RGB = [220, 220, 220];
const XK_TITLE_PAD_RGB = [0, 0, 0];
const XK_UPPER_WINDOW = 56;
const XK_INPUT_SIZE = 48;
const XK_TITLE_Y_TOP = 101;
const XK_TITLE_Y_BOTTOM = 117;

// Pad-cropped uint8 RGB array (out_size × out_size × 3) ready for normalize.
function xkPaddedCrop(imageData, x1, y1, x2, y2, padRgb) {
  const W = imageData.width, H = imageData.height;
  const src = imageData.data;
  const outW = x2 - x1, outH = y2 - y1;
  const out = new Uint8Array(outW * outH * 3);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const sx = x1 + x, sy = y1 + y;
      const o = (y * outW + x) * 3;
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) {
        out[o] = padRgb[0]; out[o + 1] = padRgb[1]; out[o + 2] = padRgb[2];
      } else {
        const si = (sy * W + sx) * 4;
        out[o] = src[si]; out[o + 1] = src[si + 1]; out[o + 2] = src[si + 2];
      }
    }
  }
  return { data: out, width: outW, height: outH };
}

// Bilinear resize uint8 RGB array to (outSize × outSize × 3).
function xkResizeBilinear(src, outSize) {
  const sw = src.width, sh = src.height;
  const out = new Uint8Array(outSize * outSize * 3);
  if (sw === outSize && sh === outSize) {
    out.set(src.data);
    return { data: out, width: outSize, height: outSize };
  }
  const xRatio = sw / outSize;
  const yRatio = sh / outSize;
  for (let y = 0; y < outSize; y++) {
    const fy = (y + 0.5) * yRatio - 0.5;
    const y0 = Math.max(0, Math.floor(fy));
    const y1 = Math.min(sh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < outSize; x++) {
      const fx = (x + 0.5) * xRatio - 0.5;
      const x0 = Math.max(0, Math.floor(fx));
      const x1 = Math.min(sw - 1, x0 + 1);
      const tx = fx - x0;
      const o = (y * outSize + x) * 3;
      for (let c = 0; c < 3; c++) {
        const p00 = src.data[(y0 * sw + x0) * 3 + c];
        const p01 = src.data[(y0 * sw + x1) * 3 + c];
        const p10 = src.data[(y1 * sw + x0) * 3 + c];
        const p11 = src.data[(y1 * sw + x1) * 3 + c];
        const top = p00 + (p01 - p00) * tx;
        const bot = p10 + (p11 - p10) * tx;
        out[o + c] = top + (bot - top) * ty;
      }
    }
  }
  return { data: out, width: outSize, height: outSize };
}

function xkCropUpper(imageData, cx, cy) {
  const half = XK_UPPER_WINDOW >> 1;
  const x1 = Math.round(cx) - half;
  const y1 = Math.round(cy) - half;
  const box = xkPaddedCrop(imageData, x1, y1, x1 + XK_UPPER_WINDOW, y1 + XK_UPPER_WINDOW, XK_UPPER_PAD_RGB);
  return xkResizeBilinear(box, XK_INPUT_SIZE);
}

function xkCropTitle(imageData, index, xCenters) {
  const cx = xCenters[index];
  const yMid = (XK_TITLE_Y_TOP + XK_TITLE_Y_BOTTOM) >> 1;
  const half = 12;
  const box = xkPaddedCrop(imageData, cx - half, yMid - half, cx + half, yMid + half, XK_TITLE_PAD_RGB);
  return xkResizeBilinear(box, XK_INPUT_SIZE);
}


// ---------------------------------------------------------------------------
// Q8 tensor materialization and CNN ops (mirrors authserver_captcha.js).
// ---------------------------------------------------------------------------

function xkTensor(m, name) {
  if (m.cache.has(name)) return m.cache.get(name);
  const t = m.meta.tensors[name];
  if (!t) throw new Error(`xk_ocr: missing tensor ${name}`);
  let out;
  if (t.dtype === "qint8") {
    const src = m.qWeights.subarray(t.offset, t.offset + t.length);
    out = new Float32Array(t.length);
    for (let i = 0; i < src.length; i++) out[i] = src[i] * t.scale;
  } else if (t.dtype === "float32") {
    out = m.biases.subarray(t.offset, t.offset + t.length);
  } else {
    throw new Error(`xk_ocr: unsupported dtype ${t.dtype}`);
  }
  m.cache.set(name, out);
  return out;
}

function xkPreprocessRgb(src, w, h, mean, std) {
  // Source is RGB uint8 in HWC. Output is CHW float32, normalized.
  const data = src.data;
  const out = new Float32Array(3 * w * h);
  const plane = w * h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 3;
      const idx = y * w + x;
      out[idx]            = ((data[si]     / 255.0) - mean[0]) / std[0];
      out[plane + idx]    = ((data[si + 1] / 255.0) - mean[1]) / std[1];
      out[2 * plane + idx] = ((data[si + 2] / 255.0) - mean[2]) / std[2];
    }
  }
  return out;
}

function xkConv2dSame(input, inC, inH, inW, weight, bias, outC, k, pad) {
  const outH = inH, outW = inW;
  const out = new Float32Array(outC * outH * outW);
  for (let oc = 0; oc < outC; oc++) {
    const b = bias[oc];
    for (let oy = 0; oy < outH; oy++) {
      for (let ox = 0; ox < outW; ox++) {
        let sum = b;
        for (let ic = 0; ic < inC; ic++) {
          for (let ky = 0; ky < k; ky++) {
            const iy = oy + ky - pad;
            if (iy < 0 || iy >= inH) continue;
            for (let kx = 0; kx < k; kx++) {
              const ix = ox + kx - pad;
              if (ix < 0 || ix >= inW) continue;
              const wi = (((oc * inC + ic) * k + ky) * k + kx);
              const ii = (ic * inH + iy) * inW + ix;
              sum += input[ii] * weight[wi];
            }
          }
        }
        out[(oc * outH + oy) * outW + ox] = sum;
      }
    }
  }
  return out;
}

function xkMaxPool2(input, c, h, w) {
  const outH = h >> 1, outW = w >> 1;
  const out = new Float32Array(c * outH * outW);
  for (let ch = 0; ch < c; ch++) {
    for (let oy = 0; oy < outH; oy++) {
      for (let ox = 0; ox < outW; ox++) {
        const iy = oy * 2, ix = ox * 2;
        const a = input[(ch * h + iy) * w + ix];
        const b = input[(ch * h + iy) * w + ix + 1];
        const cc = input[(ch * h + iy + 1) * w + ix];
        const d = input[(ch * h + iy + 1) * w + ix + 1];
        let mx = a; if (b > mx) mx = b; if (cc > mx) mx = cc; if (d > mx) mx = d;
        out[(ch * outH + oy) * outW + ox] = mx;
      }
    }
  }
  return out;
}

function xkLinear(input, weight, bias, outFeatures) {
  const inFeatures = input.length;
  const out = new Float32Array(outFeatures);
  for (let o = 0; o < outFeatures; o++) {
    let sum = bias[o];
    const base = o * inFeatures;
    for (let i = 0; i < inFeatures; i++) sum += input[i] * weight[base + i];
    out[o] = sum;
  }
  return out;
}

function xkRelu(x) {
  for (let i = 0; i < x.length; i++) if (x[i] < 0) x[i] = 0;
  return x;
}

function xkClassify(model, crop) {
  const meta = model.meta;
  const size = meta.input_size;
  const channels = meta.channels;
  const hidden = meta.hidden;
  let x = xkPreprocessRgb(crop, size, size, meta.rgb_mean, meta.rgb_std);
  x = xkRelu(xkConv2dSame(x, 3, size, size,
        xkTensor(model, "conv1.weight"), xkTensor(model, "conv1.bias"),
        channels[0], 3, 1));
  x = xkMaxPool2(x, channels[0], size, size);
  let h = size >> 1, w = size >> 1;
  x = xkRelu(xkConv2dSame(x, channels[0], h, w,
        xkTensor(model, "conv2.weight"), xkTensor(model, "conv2.bias"),
        channels[1], 3, 1));
  x = xkMaxPool2(x, channels[1], h, w);
  h >>= 1; w >>= 1;
  x = xkRelu(xkConv2dSame(x, channels[1], h, w,
        xkTensor(model, "conv3.weight"), xkTensor(model, "conv3.bias"),
        channels[2], 3, 1));
  x = xkMaxPool2(x, channels[2], h, w);
  x = xkRelu(xkLinear(x,
        xkTensor(model, "fc1.weight"), xkTensor(model, "fc1.bias"),
        hidden));
  x = xkLinear(x,
        xkTensor(model, "fc2.weight"), xkTensor(model, "fc2.bias"),
        meta.num_classes);
  return x;
}

function xkArgmax(arr) {
  let bi = 0, bv = arr[0];
  for (let i = 1; i < arr.length; i++) if (arr[i] > bv) { bv = arr[i]; bi = i; }
  return bi;
}

function xkSoftmax(logits) {
  let mx = logits[0];
  for (let i = 1; i < logits.length; i++) if (logits[i] > mx) mx = logits[i];
  const out = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) { out[i] = Math.exp(logits[i] - mx); sum += out[i]; }
  for (let i = 0; i < logits.length; i++) out[i] /= sum;
  return out;
}

// Brute-force best 4×4 assignment. Returns array where result[i] = j means
// upper i should be clicked for title slot j.
function xkBestAssignment4(cost) {
  const perms = [
    [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,1,2],[0,3,2,1],
    [1,0,2,3],[1,0,3,2],[1,2,0,3],[1,2,3,0],[1,3,0,2],[1,3,2,0],
    [2,0,1,3],[2,0,3,1],[2,1,0,3],[2,1,3,0],[2,3,0,1],[2,3,1,0],
    [3,0,1,2],[3,0,2,1],[3,1,0,2],[3,1,2,0],[3,2,0,1],[3,2,1,0],
  ];
  let best = perms[0], bestC = Infinity;
  for (const p of perms) {
    let total = 0;
    for (let i = 0; i < 4; i++) total += cost[i][p[i]];
    if (total < bestC) { bestC = total; best = p; }
  }
  return best;
}


// ---------------------------------------------------------------------------
// Lazy singleton for the welcome page to pick up.
// ---------------------------------------------------------------------------

const PJW_XK_MODEL_BASE_URL = (() => {
  const scriptEl = document.currentScript;
  if (!scriptEl || !scriptEl.src) return "";
  return new URL("../../models/", scriptEl.src).toString();
})();

let pjwXKCaptchaSolverPromise = null;

function getPjwXKCaptchaSolver() {
  if (!PJW_XK_MODEL_BASE_URL) throw new Error("Local captcha model URL is unavailable");
  if (!pjwXKCaptchaSolverPromise) {
    pjwXKCaptchaSolverPromise = XKCaptchaSolver.create(PJW_XK_MODEL_BASE_URL);
  }
  return pjwXKCaptchaSolverPromise;
}
