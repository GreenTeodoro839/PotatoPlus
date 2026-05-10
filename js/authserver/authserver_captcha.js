class AuthserverCaptchaOCR {
  constructor(meta, qWeights, f32Biases) {
    this.meta = meta;
    this.qWeights = qWeights;
    this.f32Biases = f32Biases;
    this.cache = new Map();
    this.charset = meta.charset;
    this.imgW = meta.img_w;
    this.imgH = meta.img_h;
    this.mean = meta.rgb_mean || [0.7336, 0.7450, 0.7780];
    this.std = meta.rgb_std || [0.3062, 0.3100, 0.3177];
  }

  static async create(baseUrl = "") {
    const prefix = baseUrl ? baseUrl.replace(/\/$/, "") + "/" : "";
    const meta = await fetch(prefix + "authserver_captcha_model.json").then(r => r.json());
    const qBuf = await fetch(prefix + (meta.quantization?.weights_file || "authserver_captcha_weights_q8.bin")).then(r => r.arrayBuffer());
    const bBuf = await fetch(prefix + (meta.quantization?.biases_file || "authserver_captcha_biases_f32.bin")).then(r => r.arrayBuffer());
    return new AuthserverCaptchaOCR(meta, new Int8Array(qBuf), new Float32Array(bBuf));
  }

  tensor(name) {
    if (this.cache.has(name)) return this.cache.get(name);
    const m = this.meta.tensors[name];
    if (!m) throw new Error(`Missing tensor: ${name}`);

    let out;
    if (m.dtype === "qint8") {
      const src = this.qWeights.subarray(m.offset, m.offset + m.length);
      out = new Float32Array(m.length);
      for (let i = 0; i < src.length; i++) out[i] = src[i] * m.scale;
    } else if (m.dtype === "float32") {
      out = this.f32Biases.subarray(m.offset, m.offset + m.length);
    } else {
      throw new Error(`Unsupported tensor dtype for ${name}: ${m.dtype}`);
    }

    this.cache.set(name, out);
    return out;
  }

  warmup() {
    for (const name of Object.keys(this.meta.tensors)) this.tensor(name);
  }

  async predictFromImageElement(img) {
    const imageData = authserverCaptchaImageToImageData(img, this.imgW, this.imgH);
    return this.predictFromImageData(imageData);
  }

  predictFromImageData(imageData) {
    let x = authserverCaptchaPreprocessRgb(imageData, this.imgW, this.imgH, this.mean, this.std);
    x = authserverCaptchaRelu(authserverCaptchaConv2dSame(x, 3, this.imgH, this.imgW, this.tensor("conv1.weight"), this.tensor("conv1.bias"), 16, 3, 1));
    x = authserverCaptchaMaxPool2d(x, 16, 30, 80, 2);
    x = authserverCaptchaRelu(authserverCaptchaConv2dSame(x, 16, 15, 40, this.tensor("conv2.weight"), this.tensor("conv2.bias"), 32, 3, 1));
    x = authserverCaptchaMaxPool2d(x, 32, 15, 40, 2);
    x = authserverCaptchaRelu(authserverCaptchaConv2dSame(x, 32, 7, 20, this.tensor("conv3.weight"), this.tensor("conv3.bias"), 64, 3, 1));
    x = authserverCaptchaMaxPool2d(x, 64, 7, 20, 2);
    x = authserverCaptchaRelu(authserverCaptchaLinear(x, this.tensor("fc1.weight"), this.tensor("fc1.bias"), 256));
    x = authserverCaptchaLinear(x, this.tensor("fc2.weight"), this.tensor("fc2.bias"), this.meta.num_chars * this.meta.num_classes);
    return authserverCaptchaDecode(x, this.charset, this.meta.num_chars, this.meta.num_classes);
  }
}

function authserverCaptchaImageToImageData(img, width = 80, height = 30) {
  const canvas = typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(width, height)
    : Object.assign(document.createElement("canvas"), { width, height });
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function authserverCaptchaPreprocessRgb(imageData, width = 80, height = 30, mean, std) {
  const src = imageData.data;
  const out = new Float32Array(3 * width * height);
  const plane = width * height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const idx = y * width + x;
      out[idx] = ((src[si] / 255.0) - mean[0]) / std[0];
      out[plane + idx] = ((src[si + 1] / 255.0) - mean[1]) / std[1];
      out[2 * plane + idx] = ((src[si + 2] / 255.0) - mean[2]) / std[2];
    }
  }
  return out;
}

function authserverCaptchaConv2dSame(input, inC, inH, inW, weight, bias, outC, k, pad) {
  const outH = inH;
  const outW = inW;
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

function authserverCaptchaMaxPool2d(input, c, h, w, size) {
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

function authserverCaptchaLinear(input, weight, bias, outFeatures) {
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

function authserverCaptchaRelu(x) {
  for (let i = 0; i < x.length; i++) if (x[i] < 0) x[i] = 0;
  return x;
}

function authserverCaptchaDecode(logits, charset, positions, classes) {
  let text = "";
  for (let p = 0; p < positions; p++) {
    let best = 0;
    let bestVal = -Infinity;
    for (let c = 0; c < classes; c++) {
      const v = logits[p * classes + c];
      if (v > bestVal) {
        bestVal = v;
        best = c;
      }
    }
    text += charset[best];
  }
  return text;
}

const PJW_AUTH_CAPTCHA_MODEL_BASE_URL = (() => {
  const scriptEl = document.currentScript;
  if (!scriptEl || !scriptEl.src) return "";
  return new URL("../../models/", scriptEl.src).toString();
})();

let pjwAuthserverCaptchaOcrPromise = null;

function getPjwAuthserverCaptchaOcr() {
  if (!PJW_AUTH_CAPTCHA_MODEL_BASE_URL) throw new Error("Local captcha model URL is unavailable");
  if (!pjwAuthserverCaptchaOcrPromise) {
    pjwAuthserverCaptchaOcrPromise = AuthserverCaptchaOCR.create(PJW_AUTH_CAPTCHA_MODEL_BASE_URL);
  }
  return pjwAuthserverCaptchaOcrPromise;
}

function initAuthserver() {
  console.log("[PotatoPlus] initAuthserver() called");
  console.log(`[PotatoPlus] v${pjw.version} (${pjw.platform}) by Limos — authserver mode`);

  // --- Inject styles ---
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .pjw-as-switch input:checked + .pjw-as-slider { background-color: #90138b !important; }
    .pjw-as-slider:before { content:""; position:absolute; height:14px; width:14px; left:3px; bottom:3px; background:#fff; transition:.3s; border-radius:50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
    .pjw-as-switch input:checked + .pjw-as-slider:before { transform: translateX(16px); }
    .pjw-authserver-wrapper * { font-family: inherit; }
    .pjw-captcha-toast { position:fixed; top:16px; left:50%; transform:translateX(-50%) translateY(-60px); z-index:100001; padding:10px 20px; border-radius:8px; font-size:14px; color:#fff; box-shadow:0 4px 12px rgba(0,0,0,0.2); opacity:0; transition:opacity .3s ease, transform .3s ease; pointer-events:none; white-space:nowrap; }
    .pjw-captcha-toast-visible { opacity:1 !important; transform:translateX(-50%) translateY(0) !important; }
    .pjw-captcha-toast-info { background:rgba(33,33,33,0.85); }
    .pjw-captcha-toast-error { background:rgba(183,28,28,0.9); }
  `;
  document.head.appendChild(styleEl);

  // --- Create UI elements via DOM (no jQuery, no innerHTML on body) ---
  const container = document.querySelector("section.main")
    || document.querySelector(".main")
    || document.querySelector("#main")
    || document.querySelector(".auth_login_wrapper")
    || document.body;
  console.log("[PotatoPlus] container:", container.tagName, container.className || container.id);

  const wrapper = document.createElement("div");
  wrapper.className = "pjw-authserver-wrapper";
  wrapper.style.cssText = "margin: 8px 0 0 0; display: flex; align-items: center; gap: 8px; justify-content: center;";

  wrapper.innerHTML = `
    <label class="pjw-as-switch" style="position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0;">
      <input type="checkbox" id="pjw-authserver-captcha-switch" style="opacity:0;width:0;height:0;">
      <span class="pjw-as-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 20px;"></span>
    </label>
    <span style="color: #666; font-size: 13px; user-select: none;">验证码识别</span>
  `;

  container.appendChild(wrapper);
  console.log("[PotatoPlus] UI wrapper inserted");

  const enableHijackBtn = document.createElement("span");
  enableHijackBtn.textContent = "PotatoPlus \u7f8e\u5316";
  enableHijackBtn.title = "\u70b9\u51fb\u542f\u7528 PotatoPlus \u9875\u9762\u7f8e\u5316";
  enableHijackBtn.style.cssText = "cursor:pointer;user-select:none;border:1px solid #ccc;border-radius:4px;padding:1px 5px;font-size:12px;color:#999;margin-left:4px;";
  enableHijackBtn.addEventListener("mouseover", function() {
    enableHijackBtn.style.borderColor = "#90138b";
    enableHijackBtn.style.color = "#90138b";
  });
  enableHijackBtn.addEventListener("mouseout", function() {
    enableHijackBtn.style.borderColor = "#ccc";
    enableHijackBtn.style.color = "#999";
  });
  enableHijackBtn.addEventListener("click", function() {
    pjw.preferences.authserver_hijack = true;
    location.reload();
  });
  wrapper.appendChild(enableHijackBtn);

  // --- Switch logic ---
  const switchEl = wrapper.querySelector("#pjw-authserver-captcha-switch");
  switchEl.checked = pjw.isOn("authserver_solve_captcha");

  switchEl.addEventListener("change", function() {
    pjw.preferences.authserver_solve_captcha = switchEl.checked;
    if (switchEl.checked) initAuthserverCaptchaSolver();
  });

  // --- Toast helper ---
  function showCaptchaToast(msg, isError) {
    const old = document.getElementById("pjw-captcha-toast");
    if (old) old.remove();
    const toast = document.createElement("div");
    toast.id = "pjw-captcha-toast";
    toast.className = "pjw-captcha-toast " + (isError ? "pjw-captcha-toast-error" : "pjw-captcha-toast-info");
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("pjw-captcha-toast-visible"), 10);
    setTimeout(() => {
      toast.classList.remove("pjw-captcha-toast-visible");
      setTimeout(() => toast.remove(), 400);
    }, isError ? 5000 : 3000);
  }

  // --- Captcha solving ---
  let _solvingCaptcha = false;

  async function solveAuthserverCaptcha() {
    if (!pjw.isOn("authserver_solve_captcha")) return;
    const imgEl = document.querySelector(".login-main #captchaImg") || document.getElementById("captchaImg");
    if (!imgEl) return;
    if (_solvingCaptcha) return;
    if (!imgEl.complete || imgEl.naturalWidth === 0) {
      imgEl.addEventListener("load", () => solveAuthserverCaptcha(), { once: true });
      return;
    }
    _solvingCaptcha = true;

    showCaptchaToast("正在识别验证码...", false);

    try {
      const startedAt = performance.now();
      const ocr = await getPjwAuthserverCaptchaOcr();
      const captchaText = await ocr.predictFromImageElement(imgEl);
      if (typeof captchaText !== "string" || captchaText.length !== 4)
        throw new Error("识别结果格式不正确");

      const captchaInput = document.getElementById("captchaResponse")
        || document.getElementById("captcha")
        || document.querySelector("input[name='captchaResponse']");
      if (captchaInput) {
        captchaInput.value = captchaText;
        captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
        captchaInput.dispatchEvent(new Event("change", { bubbles: true }));
      }

      showCaptchaToast(`识别完成: ${captchaText} (${(performance.now() - startedAt).toFixed(0)}ms)`, false);
      console.log("[PotatoPlus] Authserver captcha solved:", captchaText);
    } catch (e) {
      console.log("[PotatoPlus] Authserver captcha solve failed:", e.message);
      showCaptchaToast(`验证码识别失败: ${e.message}`, true);
    } finally {
      _solvingCaptcha = false;
    }
  }

  function initAuthserverCaptchaSolver() {
    console.log("[PotatoPlus] initAuthserverCaptchaSolver()");
    if (pjw._authserverCaptchaInitialized) return;
    pjw._authserverCaptchaInitialized = true;

    let currentImgEl = null;
    let imgAttrObserver = null;
    let lastSolvedSrc = "";

    function onNewSrc(imgEl) {
      if (!pjw.isOn("authserver_solve_captcha")) return;
      const src = imgEl.getAttribute("src") || "";
      if (!src || src === lastSolvedSrc) return;
      lastSolvedSrc = src;
      console.log("[PotatoPlus] captchaImg new src detected");
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        solveAuthserverCaptcha();
      } else {
        imgEl.addEventListener("load", () => solveAuthserverCaptcha(), { once: true });
      }
    }

    function attachToImg(imgEl) {
      if (imgEl === currentImgEl) return;
      console.log("[PotatoPlus] attaching to captchaImg element");
      if (imgAttrObserver) imgAttrObserver.disconnect();
      currentImgEl = imgEl;

      imgAttrObserver = new MutationObserver(function(mutations) {
        for (const m of mutations) {
          if (m.attributeName === "src") onNewSrc(imgEl);
        }
      });
      imgAttrObserver.observe(imgEl, { attributes: true, attributeFilter: ["src"] });

      imgEl.addEventListener("load", function() {
        const src = imgEl.getAttribute("src") || "";
        if (src && src !== lastSolvedSrc) {
          lastSolvedSrc = src;
          solveAuthserverCaptcha();
        }
      });

      onNewSrc(imgEl);
    }

    const bodyObserver = new MutationObserver(function() {
      const imgEl = document.querySelector(".login-main #captchaImg") || document.getElementById("captchaImg");
      if (imgEl && imgEl !== currentImgEl) attachToImg(imgEl);
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    const imgEl = document.querySelector(".login-main #captchaImg") || document.getElementById("captchaImg");
    if (imgEl) attachToImg(imgEl);
  }

  // Auto-start if preference is enabled
  if (pjw.isOn("authserver_solve_captcha")) initAuthserverCaptchaSolver();
  console.log("[PotatoPlus] initAuthserver() complete");
}

// Entry point
(function() {
  if (pjw.isOn("authserver_hijack")) return;
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initAuthserver);
  else
    initAuthserver();
})();
