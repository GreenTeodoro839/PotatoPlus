// CNN primitives + model loading live in js/common/tinycnn.js.

class AuthserverCaptchaOCR {
  constructor(model) {
    this.model = model;
    this.charset = model.meta.charset;
    this.imgW = model.meta.img_w;
    this.imgH = model.meta.img_h;
    this.mean = model.meta.rgb_mean || [0.7336, 0.7450, 0.7780];
    this.std = model.meta.rgb_std || [0.3062, 0.3100, 0.3177];
  }

  static async create(baseUrl = "") {
    const prefix = baseUrl ? baseUrl.replace(/\/$/, "") + "/" : "";
    const model = await pjwTinycnn.loadModel(prefix, "authserver_captcha");
    return new AuthserverCaptchaOCR(model);
  }

  warmup() { pjwTinycnn.warmupModel(this.model); }

  async predictFromImageElement(img) {
    const imageData = pjwTinycnn.imageToImageData(img, this.imgW, this.imgH);
    return this.predictFromImageData(imageData);
  }

  predictFromImageData(imageData) {
    const { preprocessRgb, conv2dSame, maxPool2d, linear, relu } = pjwTinycnn;
    const t = (n) => this.model.tensor(n);
    const W = this.imgW, H = this.imgH;
    let x = preprocessRgb(imageData, W, H, this.mean, this.std, 4); // RGBA from canvas
    x = relu(conv2dSame(x, 3, H, W, t("conv1.weight"), t("conv1.bias"), 16, 3, 1));
    x = maxPool2d(x, 16, H, W, 2);
    x = relu(conv2dSame(x, 16, H >> 1, W >> 1, t("conv2.weight"), t("conv2.bias"), 32, 3, 1));
    x = maxPool2d(x, 32, H >> 1, W >> 1, 2);
    x = relu(conv2dSame(x, 32, H >> 2, W >> 2, t("conv3.weight"), t("conv3.bias"), 64, 3, 1));
    x = maxPool2d(x, 64, H >> 2, W >> 2, 2);
    x = relu(linear(x, t("fc1.weight"), t("fc1.bias"), 256));
    x = linear(x, t("fc2.weight"), t("fc2.bias"), this.model.meta.num_chars * this.model.meta.num_classes);
    return authserverCaptchaDecode(x, this.charset, this.model.meta.num_chars, this.model.meta.num_classes);
  }
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

let pjwAuthserverCaptchaOcrPromise = null;

function getPjwAuthserverCaptchaOcr() {
  const baseUrl = pjwTinycnn.modelsBaseUrl();
  if (!baseUrl) throw new Error("Local captcha model URL is unavailable");
  if (!pjwAuthserverCaptchaOcrPromise) {
    pjwAuthserverCaptchaOcrPromise = AuthserverCaptchaOCR.create(baseUrl);
  }
  return pjwAuthserverCaptchaOcrPromise;
}

// Watches the authserver captcha <img> for appearance + src changes, invoking
// onChange(img) once per (img, src) after the image has loaded. Shared by the
// hijack overlay (login.js) and the inline toggle (initAuthserver below).
function pjwAuthserverWatchCaptchaImg(getImg, onChange) {
  let currentImg = null;
  let lastSrc = "";

  function fire(img) {
    const src = img.getAttribute("src") || "";
    if (!src || src === lastSrc) return;
    lastSrc = src;
    if (img.complete && img.naturalWidth > 0) onChange(img);
    else img.addEventListener("load", () => onChange(img), { once: true });
  }

  function attach(img) {
    if (img === currentImg) return;
    currentImg = img;
    new MutationObserver(() => fire(img))
      .observe(img, { attributes: true, attributeFilter: ["src"] });
    img.addEventListener("load", () => fire(img));
    fire(img);
  }

  function check() {
    const img = getImg();
    if (img) attach(img);
  }

  check();
  new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
}
window.pjwAuthserverWatchCaptchaImg = pjwAuthserverWatchCaptchaImg;

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

  async function solveAuthserverCaptcha(imgEl) {
    if (!pjw.isOn("authserver_solve_captcha")) return;
    imgEl = imgEl || document.querySelector(".login-main #captchaImg") || document.getElementById("captchaImg");
    if (!imgEl) return;
    if (_solvingCaptcha) return;
    if (!imgEl.complete || imgEl.naturalWidth === 0) {
      imgEl.addEventListener("load", () => solveAuthserverCaptcha(imgEl), { once: true });
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

    pjwAuthserverWatchCaptchaImg(
      () => document.querySelector(".login-main #captchaImg") || document.getElementById("captchaImg"),
      (imgEl) => solveAuthserverCaptcha(imgEl)
    );
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
