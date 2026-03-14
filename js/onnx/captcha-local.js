// js/onnx/captcha-local.js
// Local ONNX-based captcha solving — replaces remote server inference
// Depends on: meta[name="pjw"] with "base" attribute (set by inject.js)

(function () {
  "use strict";

  var TAG = "[PotatoPlus ONNX]";
  var PJW_BASE = document.querySelector('meta[name="pjw"]').getAttribute("base") || "";

  // ======================================================================
  // ORT Loading (lazy)
  // ======================================================================

  var _ortLoaded = false;
  var _ortLoading = null;

  function loadORT() {
    if (_ortLoaded && window.ort) return Promise.resolve();
    if (_ortLoading) return _ortLoading;
    _ortLoading = new Promise(function (resolve, reject) {
      if (window.ort) { _ortLoaded = true; return resolve(); }
      var s = document.createElement("script");
      s.src = PJW_BASE + "js/vendor/ort/ort.min.js";
      s.onload = function () {
        ort.env.wasm.wasmPaths = PJW_BASE + "js/vendor/ort/";
        ort.env.wasm.numThreads = 1;
        _ortLoaded = true;
        console.log(TAG, "ORT loaded");
        resolve();
      };
      s.onerror = function () { reject(new Error("无法加载 ort.min.js")); };
      document.documentElement.appendChild(s);
    });
    return _ortLoading;
  }

  // ======================================================================
  // Session Management
  // ======================================================================

  var _sessions = {};

  function getSession(modelName) {
    if (_sessions[modelName]) return Promise.resolve(_sessions[modelName]);
    return loadORT().then(function () {
      var url = PJW_BASE + "models/" + modelName;
      return fetch(url);
    }).then(function (resp) {
      if (!resp.ok) throw new Error("模型加载失败: " + modelName + " HTTP " + resp.status);
      return resp.arrayBuffer();
    }).then(function (buf) {
      return ort.InferenceSession.create(buf, { executionProviders: ["wasm"] });
    }).then(function (session) {
      _sessions[modelName] = session;
      console.log(TAG, "Session ready:", modelName, "inputs:", session.inputNames, "outputs:", session.outputNames);
      return session;
    });
  }

  // ======================================================================
  // Image Utilities
  // ======================================================================

  function base64ToCanvas(b64, contextOptions) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        var ctx = contextOptions ? c.getContext("2d", contextOptions) : c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(c);
      };
      img.onerror = function () { reject(new Error("图片解码失败")); };
      img.src = "data:image/png;base64," + b64;
    });
  }

  function canvasToTensorCHW(canvas, w, h, mean, std) {
    var tmp = document.createElement("canvas");
    tmp.width = w; tmp.height = h;
    var ctx = tmp.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, w, h);
    var data = ctx.getImageData(0, 0, w, h).data;
    var size = w * h;
    var f32 = new Float32Array(3 * size);
    for (var i = 0; i < size; i++) {
      f32[i]            = (data[i * 4]     / 255.0 - mean[0]) / std[0];
      f32[size + i]     = (data[i * 4 + 1] / 255.0 - mean[1]) / std[1];
      f32[2 * size + i] = (data[i * 4 + 2] / 255.0 - mean[2]) / std[2];
    }
    return new ort.Tensor("float32", f32, [1, 3, h, w]);
  }

  function softmax(arr) {
    var max = -Infinity;
    for (var i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
    var exps = new Float64Array(arr.length);
    var sum = 0;
    for (var i = 0; i < arr.length; i++) { exps[i] = Math.exp(arr[i] - max); sum += exps[i]; }
    if (sum < 1e-9) sum = 1e-9;
    for (var i = 0; i < arr.length; i++) exps[i] /= sum;
    return exps;
  }

  // ======================================================================
  // NJU Authserver Captcha Solver (4-char text recognition)
  // ======================================================================

  var NJU_CHARSET = "123456789abcdefghijklmnopqrstuvwxyz".split("");
  var NJU_W = 80, NJU_H = 30;
  var NJU_MEAN = [0.7336, 0.745, 0.778];
  var NJU_STD  = [0.3062, 0.31, 0.3177];
  var NJU_MODEL = "nju_captcha.onnx";

  function solveNJU(b64) {
    var t0 = performance.now();
    return getSession(NJU_MODEL).then(function (session) {
      return base64ToCanvas(b64).then(function (srcCanvas) {
        var tensor = canvasToTensorCHW(srcCanvas, NJU_W, NJU_H, NJU_MEAN, NJU_STD);
        var feeds = {};
        feeds[session.inputNames[0]] = tensor;
        return session.run(feeds);
      }).then(function (results) {
        var output = results[session.outputNames[0]];
        var d = output.data;
        var dims = output.dims; // [1, numPositions, numClasses]
        var numPos = dims[1], numCls = dims[2];
        var text = "";
        for (var p = 0; p < numPos; p++) {
          var best = 0, bestVal = -Infinity;
          for (var c = 0; c < numCls; c++) {
            var v = d[p * numCls + c];
            if (v > bestVal) { bestVal = v; best = c; }
          }
          text += NJU_CHARSET[best] || "?";
        }
        var elapsed = performance.now() - t0;
        console.log(TAG, "NJU solved:", text, elapsed.toFixed(0) + "ms");
        return { text: text, time_ms: elapsed };
      });
    });
  }

  // ======================================================================
  // XK Course Selection Captcha Solver (click-position detection)
  // ======================================================================

  // ---- Constants ----
  var UPPER_HEIGHT = 100;
  var TITLE_X_CENTERS = [127, 150, 173, 196];
  var TITLE_Y_TOP = 101, TITLE_Y_BOTTOM = 117, TITLE_HALF_X = 10;
  var XK_UPPER_MODEL = "upper_model.onnx";
  var XK_TITLE_MODEL = "title_model.onnx";

  var NORM_PRESETS = {
    imagenet: { mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225] },
    half:     { mean: [0.5, 0.5, 0.5],       std: [0.5, 0.5, 0.5] },
  };

  var _xkUpperCfg = null, _xkTitleCfg = null;

  function loadXKConfig(modelName) {
    var url = PJW_BASE + "models/" + modelName.replace(".onnx", "_config.json");
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).catch(function (e) {
      console.warn(TAG, "Config not found for", modelName, "— using defaults:", e.message);
      return { input_size: 80, normalize: "imagenet", idx_to_cls: {} };
    });
  }

  // ---- Foreground mask (saturation-based) ----

  function fgMask(pixels, w, h, satThr) {
    // pixels: Uint8ClampedArray RGBA, length = w*h*4
    satThr = satThr || 0.15;
    var mask = new Uint8Array(h * w);
    for (var i = 0; i < h * w; i++) {
      var r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2];
      var maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
      var sat = (maxc - minc) / (maxc + 0.000001);
      var lightBg = (r > 165 && g > 205 && b > 225);
      mask[i] = (sat > satThr && !lightBg) ? 1 : 0;
    }
    return mask;
  }

  // ---- Connected components (flood fill) ----

  function connectedComponents(mask, w, h, minArea) {
    minArea = minArea || 25;
    var visited = new Uint8Array(h * w);
    var regions = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = y * w + x;
        if (!mask[idx] || visited[idx]) continue;
        var stack = [[x, y]];
        visited[idx] = 1;
        var pxs = [];
        while (stack.length) {
          var pt = stack.pop(), cx = pt[0], cy = pt[1];
          pxs.push(pt);
          for (var ny = Math.max(0, cy - 1); ny <= Math.min(h - 1, cy + 1); ny++) {
            for (var nx = Math.max(0, cx - 1); nx <= Math.min(w - 1, cx + 1); nx++) {
              var ni = ny * w + nx;
              if (!visited[ni] && mask[ni]) { visited[ni] = 1; stack.push([nx, ny]); }
            }
          }
        }
        if (pxs.length < minArea) continue;
        var mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity, sX = 0, sY = 0;
        for (var k = 0; k < pxs.length; k++) {
          var px = pxs[k][0], py = pxs[k][1];
          if (px < mnX) mnX = px; if (px > mxX) mxX = px;
          if (py < mnY) mnY = py; if (py > mxY) mxY = py;
          sX += px; sY += py;
        }
        var bw = mxX - mnX + 1, bh = mxY - mnY + 1;
        if (bw < 6 || bh < 6) continue;
        if (bw / Math.max(bh, 1) > 5 || bh / Math.max(bw, 1) > 5) continue;
        regions.push({
          center: [Math.round(sX / pxs.length), Math.round(sY / pxs.length)],
          bbox: [mnX, mnY, mxX + 1, mxY + 1],
          area: pxs.length,
        });
      }
    }
    regions.sort(function (a, b) { return b.area - a.area; });
    return regions;
  }

  // ---- Merge nearby regions ----

  function mergeNearby(regions, distThresh) {
    distThresh = distThresh || 20;
    if (regions.length <= 1) return regions;
    var merged = regions.map(function (r) {
      return { center: [r.center[0], r.center[1]], bbox: r.bbox.slice(), area: r.area };
    });
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < merged.length && !changed; i++) {
        for (var j = i + 1; j < merged.length; j++) {
          var ci = merged[i].center, cj = merged[j].center;
          var dist = Math.sqrt((ci[0] - cj[0]) * (ci[0] - cj[0]) + (ci[1] - cj[1]) * (ci[1] - cj[1]));
          if (dist < distThresh) {
            var ai = merged[i].area, aj = merged[j].area, t = ai + aj;
            merged[i] = {
              center: [Math.round((ci[0] * ai + cj[0] * aj) / t), Math.round((ci[1] * ai + cj[1] * aj) / t)],
              bbox: [Math.min(merged[i].bbox[0], merged[j].bbox[0]), Math.min(merged[i].bbox[1], merged[j].bbox[1]),
                     Math.max(merged[i].bbox[2], merged[j].bbox[2]), Math.max(merged[i].bbox[3], merged[j].bbox[3])],
              area: t,
            };
            merged.splice(j, 1);
            changed = true;
            break;
          }
        }
      }
    }
    merged.sort(function (a, b) { return b.area - a.area; });
    return merged;
  }

  // ---- Segment upper area → find char regions ----

  function segmentUpper(fullCanvas, upperImageData) {
    var imgW = fullCanvas.width;
    var upperH = Math.min(UPPER_HEIGHT, fullCanvas.height);
    var px = upperImageData.data;
    var thresholds = [[0.18, 25], [0.14, 15], [0.10, 8], [0.06, 8]];
    var regions = [];
    for (var t = 0; t < thresholds.length; t++) {
      var mask = fgMask(px, imgW, upperH, thresholds[t][0]);
      regions = connectedComponents(mask, imgW, upperH, thresholds[t][1]);
      regions = mergeNearby(regions, 20);
      if (regions.length >= 4) return regions.slice(0, 8);
    }
    return regions.slice(0, 8);
  }

  // ---- Color-isolated upper char crop ----

  function cropUpperChar(fullCanvas, upperImageData, fg, cx, cy) {
    var imgW = fullCanvas.width, H = Math.min(UPPER_HEIGHT, fullCanvas.height);
    var px = upperImageData.data;
    var W = imgW;
    var searchHalf = 40, colorThresh = 80.0, pad = 4;

    // Sample center color
    var sr = 4;
    var sy1 = Math.max(0, cy - sr), sy2 = Math.min(H, cy + sr);
    var sx1 = Math.max(0, cx - sr), sx2 = Math.min(W, cx + sr);
    var fgCnt = 0, cR = 0, cG = 0, cB = 0;
    for (var yy = sy1; yy < sy2; yy++) {
      for (var xx = sx1; xx < sx2; xx++) {
        if (fg[yy * W + xx]) {
          var ii = (yy * W + xx) * 4;
          cR += px[ii]; cG += px[ii + 1]; cB += px[ii + 2]; fgCnt++;
        }
      }
    }
    if (fgCnt < 3) {
      var fgR = fgMask(px, W, H, 0.08);
      fgCnt = 0; cR = cG = cB = 0;
      for (var yy = sy1; yy < sy2; yy++) {
        for (var xx = sx1; xx < sx2; xx++) {
          if (fgR[yy * W + xx]) {
            var ii = (yy * W + xx) * 4;
            cR += px[ii]; cG += px[ii + 1]; cB += px[ii + 2]; fgCnt++;
          }
        }
      }
    }
    if (fgCnt >= 3) { cR /= fgCnt; cG /= fgCnt; cB /= fgCnt; }
    else { var ii = (cy * W + cx) * 4; cR = px[ii]; cG = px[ii + 1]; cB = px[ii + 2]; }

    // Search window
    var ax1 = Math.max(0, cx - searchHalf), ay1 = Math.max(0, cy - searchHalf);
    var ax2 = Math.min(W, cx + searchHalf), ay2 = Math.min(H, cy + searchHalf);
    var lW = ax2 - ax1, lH = ay2 - ay1;

    // Build character mask
    var charMask = new Uint8Array(lH * lW);
    for (var ly = 0; ly < lH; ly++) {
      for (var lx = 0; lx < lW; lx++) {
        var gy = ay1 + ly, gx = ax1 + lx, gi = gy * W + gx;
        if (!fg[gi]) continue;
        var si = gi * 4;
        var dr = px[si] - cR, dg = px[si + 1] - cG, db = px[si + 2] - cB;
        if (Math.sqrt(dr * dr + dg * dg + db * db) < colorThresh)
          charMask[ly * lW + lx] = 1;
      }
    }
    var charCnt = 0;
    for (var i = 0; i < charMask.length; i++) if (charMask[i]) charCnt++;

    if (charCnt < 10) {
      // Fallback: all fg in tighter window
      var h2 = 25;
      charMask.fill(0);
      for (var ly = Math.max(0, cy - h2 - ay1); ly < Math.min(lH, cy + h2 - ay1); ly++) {
        for (var lx = Math.max(0, cx - h2 - ax1); lx < Math.min(lW, cx + h2 - ax1); lx++) {
          var gy = ay1 + ly, gx = ax1 + lx;
          if (fg[gy * W + gx]) charMask[ly * lW + lx] = 1;
        }
      }
      charCnt = 0;
      for (var i = 0; i < charMask.length; i++) if (charMask[i]) charCnt++;
    }

    // Build isolated image
    var isoCanvas = document.createElement("canvas");
    isoCanvas.width = lW; isoCanvas.height = lH;
    var isoCtx = isoCanvas.getContext("2d");
    var isoData = isoCtx.createImageData(lW, lH);
    var id = isoData.data;
    for (var ly = 0; ly < lH; ly++) {
      for (var lx = 0; lx < lW; lx++) {
        var di = (ly * lW + lx) * 4;
        if (charMask[ly * lW + lx]) {
          var si = ((ay1 + ly) * W + (ax1 + lx)) * 4;
          id[di] = px[si]; id[di + 1] = px[si + 1]; id[di + 2] = px[si + 2]; id[di + 3] = 255;
        } else {
          id[di] = 220; id[di + 1] = 220; id[di + 2] = 220; id[di + 3] = 255;
        }
      }
    }
    isoCtx.putImageData(isoData, 0, 0);

    // Tight crop + pad to square
    var mnX = lW, mxX = 0, mnY = lH, mxY = 0;
    for (var ly = 0; ly < lH; ly++) {
      for (var lx = 0; lx < lW; lx++) {
        if (charMask[ly * lW + lx]) {
          if (lx < mnX) mnX = lx; if (lx > mxX) mxX = lx;
          if (ly < mnY) mnY = ly; if (ly > mxY) mxY = ly;
        }
      }
    }

    if (charCnt < 5) {
      // Emergency: naive crop
      var half = 25;
      var cropX1 = Math.max(0, cx - half - ax1), cropY1 = Math.max(0, cy - half - ay1);
      var cropX2 = Math.min(lW, cx + half - ax1), cropY2 = Math.min(lH, cy + half - ay1);
      var cW = cropX2 - cropX1, cH = cropY2 - cropY1, side = Math.max(cW, cH);
      var out = document.createElement("canvas"); out.width = out.height = side;
      var octx = out.getContext("2d");
      octx.fillStyle = "rgb(220,220,220)"; octx.fillRect(0, 0, side, side);
      octx.drawImage(isoCanvas, cropX1, cropY1, cW, cH,
        Math.floor((side - cW) / 2), Math.floor((side - cH) / 2), cW, cH);
      return out;
    }

    var tx1 = Math.max(0, mnX - pad), ty1 = Math.max(0, mnY - pad);
    var tx2 = Math.min(lW, mxX + 1 + pad), ty2 = Math.min(lH, mxY + 1 + pad);
    var tW = tx2 - tx1, tH = ty2 - ty1, side = Math.max(tW, tH);
    var out = document.createElement("canvas"); out.width = out.height = side;
    var octx = out.getContext("2d");
    octx.fillStyle = "rgb(220,220,220)"; octx.fillRect(0, 0, side, side);
    octx.drawImage(isoCanvas, tx1, ty1, tW, tH,
      Math.floor((side - tW) / 2), Math.floor((side - tH) / 2), tW, tH);
    return out;
  }

  // ---- Title char crops (fixed positions at bottom) ----

  function cropTitleChars(fullCanvas) {
    var crops = [];
    for (var t = 0; t < TITLE_X_CENTERS.length; t++) {
      var tx = TITLE_X_CENTERS[t];
      var x1 = tx - TITLE_HALF_X, x2 = tx + TITLE_HALF_X;
      var cropW = x2 - x1, cropH = TITLE_Y_BOTTOM - TITLE_Y_TOP;
      var side = Math.max(cropW, cropH);
      var c = document.createElement("canvas"); c.width = c.height = side;
      var ctx = c.getContext("2d");
      ctx.fillStyle = "rgb(0,0,0)"; ctx.fillRect(0, 0, side, side);
      ctx.drawImage(fullCanvas, x1, TITLE_Y_TOP, cropW, cropH,
        Math.floor((side - cropW) / 2), Math.floor((side - cropH) / 2), cropW, cropH);
      crops.push(c);
    }
    return crops;
  }

  // ---- ONNX char model inference ----

  function predictProbs(session, cfg, charCanvas) {
    var inputSize = cfg.input_size || 80;
    var norm = NORM_PRESETS[cfg.normalize] || NORM_PRESETS.imagenet;
    var tensor = canvasToTensorCHW(charCanvas, inputSize, inputSize, norm.mean, norm.std);
    var feeds = {};
    feeds[session.inputNames[0]] = tensor;
    return session.run(feeds).then(function (res) {
      var logits = res[session.outputNames[0]].data;
      return softmax(logits);
    });
  }

  // ---- Hungarian matching (brute-force 4×N permutations) ----

  function hungarian4xN(cost) {
    var N = cost[0].length;
    var bestCost = Infinity, bestPerm = null;
    function search(depth, used, perm) {
      if (depth === 4) {
        var c = 0;
        for (var i = 0; i < 4; i++) c += cost[i][perm[i]];
        if (c < bestCost) { bestCost = c; bestPerm = perm.slice(); }
        return;
      }
      for (var i = 0; i < N; i++) {
        if (used[i]) continue;
        used[i] = true; perm.push(i);
        search(depth + 1, used, perm);
        perm.pop(); used[i] = false;
      }
    }
    search(0, new Array(N).fill(false), []);
    return bestPerm || [0, 1, 2, 3];
  }

  // ---- Main XK solver ----

  function solveXK(b64) {
    var t0 = performance.now();
    var upperSession, titleSession, upperCfg, titleCfg, fullCanvas;

    return Promise.all([
      getSession(XK_UPPER_MODEL),
      getSession(XK_TITLE_MODEL),
      _xkUpperCfg ? Promise.resolve(_xkUpperCfg) : loadXKConfig(XK_UPPER_MODEL).then(function (c) { _xkUpperCfg = c; return c; }),
      _xkTitleCfg ? Promise.resolve(_xkTitleCfg) : loadXKConfig(XK_TITLE_MODEL).then(function (c) { _xkTitleCfg = c; return c; }),
      base64ToCanvas(b64, { willReadFrequently: true }),
    ]).then(function (arr) {
      upperSession = arr[0]; titleSession = arr[1];
      upperCfg = arr[2]; titleCfg = arr[3]; fullCanvas = arr[4];

      var fullCtx = fullCanvas.getContext("2d", { willReadFrequently: true });
      var upperH = Math.min(UPPER_HEIGHT, fullCanvas.height);
      var upperImageData = fullCtx.getImageData(0, 0, fullCanvas.width, upperH);
      var upperFgMask = fgMask(upperImageData.data, fullCanvas.width, upperH);

      // 1. Segment upper area
      var regions = segmentUpper(fullCanvas, upperImageData);
      if (regions.length < 4) throw new Error("Failed to segment/match characters");

      // 2. Crop upper chars
      var nUpper = Math.min(regions.length, 8);
      var upperCrops = [], upperCenters = [];
      for (var i = 0; i < nUpper; i++) {
        var cx = regions[i].center[0], cy = regions[i].center[1];
        upperCrops.push(cropUpperChar(fullCanvas, upperImageData, upperFgMask, cx, cy));
        upperCenters.push([cx, cy]);
      }

      // 3. Classify upper chars (sequential — ORT WASM is not concurrent-safe)
      var titleCrops = cropTitleChars(fullCanvas);
      var allCrops = upperCrops.concat(titleCrops);
      var allSessions = [];
      var allCfgs = [];
      for (var i = 0; i < upperCrops.length; i++) { allSessions.push(upperSession); allCfgs.push(upperCfg); }
      for (var i = 0; i < titleCrops.length; i++) { allSessions.push(titleSession); allCfgs.push(titleCfg); }

      return allCrops.reduce(function (chain, crop, idx) {
        return chain.then(function (results) {
          return predictProbs(allSessions[idx], allCfgs[idx], crop).then(function (p) {
            results.push(p); return results;
          });
        });
      }, Promise.resolve([])).then(function (allProbs) {
        var upperProbs = allProbs.slice(0, upperCrops.length);
        var titleProbs = allProbs.slice(upperCrops.length);

        // Get title top-1 labels
        var titleTop1 = [];
        for (var ti = 0; ti < titleProbs.length; ti++) {
          var probs = titleProbs[ti];
          var maxIdx = 0;
          for (var i = 1; i < probs.length; i++) {
            if (probs[i] > probs[maxIdx]) maxIdx = i;
          }
          titleTop1.push(titleCfg.idx_to_cls[String(maxIdx)] || String(maxIdx));
        }

        // 5. Build cost matrix: cost[ti][ri] = -log P(upper_r == title_char_t)
        var cost = [];
        for (var ti = 0; ti < 4; ti++) {
          cost.push(new Array(nUpper).fill(100.0));
          var targetChar = titleTop1[ti];
          var targetIdx = null;
          var idx2cls = upperCfg.idx_to_cls;
          for (var k in idx2cls) {
            if (idx2cls[k] === targetChar) { targetIdx = parseInt(k); break; }
          }
          if (targetIdx === null) continue;
          for (var ri = 0; ri < nUpper; ri++) {
            var p = Math.max(upperProbs[ri][targetIdx], 1e-10);
            cost[ti][ri] = -Math.log(p);
          }
        }

        // 6. Hungarian matching
        var bestPerm = hungarian4xN(cost);
        var points = bestPerm.map(function (ri) { return upperCenters[ri]; });

        var elapsed = performance.now() - t0;
        console.log(TAG, "XK solved in", elapsed.toFixed(0) + "ms", points);
        return { points: points, time_ms: elapsed };
      });
    });
  }

  // ======================================================================
  // Expose API
  // ======================================================================

  window.pjwONNX = {
    solveNJU: solveNJU,
    solveXK: solveXK,
  };

  console.log(TAG, "captcha-local.js ready");
})();
