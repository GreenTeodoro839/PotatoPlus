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

  // --- Find container to append UI ---
  const container = document.querySelector("section.main")
    || document.querySelector(".main")
    || document.querySelector("#main")
    || document.querySelector(".auth_login_wrapper")
    || document.body;
  console.log("[PotatoPlus] container:", container.tagName, container.className || container.id);

  // --- Create UI elements via DOM (no jQuery, no innerHTML on body) ---
  const wrapper = document.createElement("div");
  wrapper.className = "pjw-authserver-wrapper";
  wrapper.style.cssText = "margin: 8px 0 0 0; display: flex; align-items: center; gap: 8px; justify-content: center;";

  wrapper.innerHTML = `
    <label class="pjw-as-switch" style="position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0;">
      <input type="checkbox" id="pjw-authserver-captcha-switch" style="opacity:0;width:0;height:0;">
      <span class="pjw-as-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 20px;"></span>
    </label>
    <span style="color: #666; font-size: 13px; user-select: none;">验证码识别（本地）</span>
  `;

  container.appendChild(wrapper);
  console.log("[PotatoPlus] UI wrapper inserted");

  // --- Switch logic ---
  const switchEl = document.getElementById("pjw-authserver-captcha-switch");
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

  // --- Captcha image base64 extraction ---
  function getImgBase64(imgEl) {
    const src = imgEl.src || "";
    if (src.startsWith("data:")) {
      const parts = src.split(",");
      return parts.length > 1 ? parts[1] : null;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = imgEl.naturalWidth;
      canvas.height = imgEl.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imgEl, 0, 0);
      return canvas.toDataURL("image/png").split(",")[1];
    } catch (e) {
      console.warn("[PotatoPlus] Failed to extract captcha image:", e);
      return null;
    }
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
      const b64 = getImgBase64(imgEl);
      if (!b64) throw new Error("无法获取验证码图片");
      if (!window.pjwONNX) throw new Error("本地识别模块未加载");

      const result = await window.pjwONNX.solveNJU(b64);
      const captchaText = result.text;

      const captchaInput = document.getElementById("captchaResponse")
        || document.getElementById("captcha")
        || document.querySelector("input[name='captchaResponse']");
      if (captchaInput) {
        captchaInput.value = captchaText;
        captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
        captchaInput.dispatchEvent(new Event("change", { bubbles: true }));
      }

      showCaptchaToast(`识别完成: ${captchaText} (${result.time_ms.toFixed(0)}ms)`, false);
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
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initAuthserver);
  else
    initAuthserver();
})();
