// Tiny CNN runtime shared by authserver/xk captcha solvers.
// Provides Q8 model loading + the conv2d/maxpool/linear/relu primitives.
// Works in both window and service-worker contexts.

(function (root) {
  "use strict";

  const SCRIPT_URL = (typeof document !== "undefined" && document.currentScript && document.currentScript.src) || "";
  const MODELS_BASE = SCRIPT_URL ? new URL("../../models/", SCRIPT_URL).toString() : "";

  function imageToImageData(img, w, h) {
    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }

  // src.data is HWC uint8 with the given byte stride (3 for RGB, 4 for RGBA).
  // Output is CHW float32, normalized by (x/255 - mean) / std.
  function preprocessRgb(src, w, h, mean, std, stride) {
    stride = stride | 0 || 3;
    const data = src.data;
    const out = new Float32Array(3 * w * h);
    const plane = w * h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = (y * w + x) * stride;
        const idx = y * w + x;
        out[idx]             = ((data[si]     / 255.0) - mean[0]) / std[0];
        out[plane + idx]     = ((data[si + 1] / 255.0) - mean[1]) / std[1];
        out[2 * plane + idx] = ((data[si + 2] / 255.0) - mean[2]) / std[2];
      }
    }
    return out;
  }

  function conv2dSame(input, inC, inH, inW, weight, bias, outC, k, pad) {
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

  function maxPool2d(input, c, h, w, size) {
    const outH = Math.floor(h / size);
    const outW = Math.floor(w / size);
    const out = new Float32Array(c * outH * outW);
    for (let ch = 0; ch < c; ch++) {
      for (let oy = 0; oy < outH; oy++) {
        for (let ox = 0; ox < outW; ox++) {
          let m = -Infinity;
          for (let ky = 0; ky < size; ky++) {
            for (let kx = 0; kx < size; kx++) {
              const iy = oy * size + ky;
              const ix = ox * size + kx;
              const v = input[(ch * h + iy) * w + ix];
              if (v > m) m = v;
            }
          }
          out[(ch * outH + oy) * outW + ox] = m;
        }
      }
    }
    return out;
  }

  function linear(input, weight, bias, outFeatures) {
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

  function relu(x) {
    for (let i = 0; i < x.length; i++) if (x[i] < 0) x[i] = 0;
    return x;
  }

  function materializeTensor(model, name) {
    if (model.cache.has(name)) return model.cache.get(name);
    const t = model.meta.tensors[name];
    if (!t) throw new Error(`tinycnn: missing tensor ${name}`);
    let out;
    if (t.dtype === "qint8") {
      const src = model.qWeights.subarray(t.offset, t.offset + t.length);
      out = new Float32Array(t.length);
      for (let i = 0; i < src.length; i++) out[i] = src[i] * t.scale;
    } else if (t.dtype === "float32") {
      out = model.biases.subarray(t.offset, t.offset + t.length);
    } else {
      throw new Error(`tinycnn: unsupported dtype ${t.dtype}`);
    }
    model.cache.set(name, out);
    return out;
  }

  async function loadModel(prefix, name) {
    const meta = await fetch(prefix + `${name}_model.json`).then(r => r.json());
    const qBuf = await fetch(prefix + (meta.quantization?.weights_file || `${name}_weights_q8.bin`)).then(r => r.arrayBuffer());
    const bBuf = await fetch(prefix + (meta.quantization?.biases_file || `${name}_biases_f32.bin`)).then(r => r.arrayBuffer());
    const model = {
      meta,
      qWeights: new Int8Array(qBuf),
      biases: new Float32Array(bBuf),
      cache: new Map(),
    };
    model.tensor = (n) => materializeTensor(model, n);
    return model;
  }

  function warmupModel(model) {
    for (const n of Object.keys(model.meta.tensors)) materializeTensor(model, n);
  }

  function modelsBaseUrl() { return MODELS_BASE; }

  root.pjwTinycnn = {
    imageToImageData,
    preprocessRgb,
    conv2dSame,
    maxPool2d,
    linear,
    relu,
    loadModel,
    warmupModel,
    modelsBaseUrl,
  };
})(typeof self !== "undefined" ? self : this);
