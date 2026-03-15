function initAuthserver() {
  console.log("[PotatoPlus] initAuthserver() called");
  console.log(`[PotatoPlus] v${pjw.version} (${pjw.platform}) by Limos — authserver mode`);

  // --- Inject styles ---
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    .pjw-as-switch input:checked + .pjw-as-slider { background-color: #90138b !important; }
    .pjw-as-slider:before { content:""; position:absolute; height:14px; width:14px; left:3px; bottom:3px; background:#fff; transition:.3s; border-radius:50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
    .pjw-as-switch input:checked + .pjw-as-slider:before { transform: translateX(16px); }
    #pjw-authserver-captcha-config:hover { border-color: #90138b !important; color: #90138b !important; }
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
    <span style="color: #666; font-size: 13px; user-select: none;">验证码识别</span>
    <span id="pjw-authserver-captcha-config" style="cursor: pointer; user-select: none; border: 1px solid #ccc; border-radius: 4px; padding: 1px 5px; font-size: 12px; color: #999;">配置</span>
  `;

  container.appendChild(wrapper);
  console.log("[PotatoPlus] UI wrapper inserted");

  // 添加"启用 PotatoPlus 劫持登录"按钮
  const enableHijackBtn = document.createElement("span");
  enableHijackBtn.textContent = "PotatoPlus \u7f8e\u5316";
  enableHijackBtn.title = "\u70b9\u51fb\u542f\u7528 PotatoPlus \u9875\u9762\u7f8e\u5316";
  enableHijackBtn.style.cssText = "cursor:pointer;user-select:none;border:1px solid #ccc;border-radius:4px;padding:1px 5px;font-size:12px;color:#999;margin-left:4px;";
  enableHijackBtn.addEventListener("mouseover", function() { enableHijackBtn.style.borderColor = "#90138b"; enableHijackBtn.style.color = "#90138b"; });
  enableHijackBtn.addEventListener("mouseout",  function() { enableHijackBtn.style.borderColor = "#ccc";    enableHijackBtn.style.color = "#999"; });
  enableHijackBtn.addEventListener("click", function() {
    pjw.preferences.authserver_hijack = true;
    location.reload();
  });
  wrapper.appendChild(enableHijackBtn);

  // --- Config dialog (appended to body) ---
  const dialogEl = document.createElement("div");
  dialogEl.id = "pjw-authserver-captcha-config-dialog";
  dialogEl.style.cssText = "display:none; position:fixed; top:0; left:0; right:0; bottom:0; z-index:100000; background:rgba(0,0,0,0.5); justify-content:center; align-items:center;";
  dialogEl.innerHTML = `
    <div style="background: #fff; border-radius: 8px; padding: 24px; max-width: 420px; width: 90%; box-shadow: 0 8px 30px rgba(0,0,0,0.3);">
      <h3 style="margin:0 0 12px 0; font-size: 18px; color: #333;">验证码识别服务配置</h3>
      <p style="font-size: 14px; color: #666; margin: 0 0 16px 0;">启用验证码识别后，验证码图片将以 base64 格式发送到远程服务器进行识别。请配置识别服务的 URL，或留空以使用默认服务器。</p>
      <input id="pjw-authserver-captcha-url-input" type="text" placeholder="https://example.com:8000/solve"
        style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; outline: none;">
      <div style="font-size: 12px; color: #999; margin-top: 8px;">
        <span>服务器需实现 POST /solve 接口，接受 {"type":"nju","image":"base64"} 并返回识别结果。</span><br>
        <span>声明：默认服务器为实验性质，不保证准确度和稳定性。您的个人数据不会被服务器存储。</span>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
        <button id="pjw-authserver-dialog-cancel" style="padding:6px 16px; border:1px solid #ccc; border-radius:4px; background:#fff; color:#666; cursor:pointer; font-size:14px;">撤销更改</button>
        <button id="pjw-authserver-dialog-save" style="padding:6px 16px; border:none; border-radius:4px; background:#90138b; color:#fff; cursor:pointer; font-size:14px;">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialogEl);

  // --- Switch logic ---
  const switchEl = document.getElementById("pjw-authserver-captcha-switch");
  switchEl.checked = pjw.isOn("authserver_solve_captcha");

  const urlInput = document.getElementById("pjw-authserver-captcha-url-input");

  function openDialog() {
    urlInput.value = pjw.data.authserver_captcha_solver_link || "";
    dialogEl.style.display = "flex";
  }
  function closeDialog() {
    dialogEl.style.display = "none";
  }

  switchEl.addEventListener("change", function() {
    pjw.preferences.authserver_solve_captcha = switchEl.checked;
    if (switchEl.checked) initAuthserverCaptchaSolver();
  });

  document.getElementById("pjw-authserver-captcha-config").addEventListener("click", openDialog);
  document.getElementById("pjw-authserver-dialog-cancel").addEventListener("click", closeDialog);
  document.getElementById("pjw-authserver-dialog-save").addEventListener("click", function() {
    pjw.data.authserver_captcha_solver_link = urlInput.value;
    closeDialog();
    switchEl.checked = true;
    pjw.preferences.authserver_solve_captcha = true;
    initAuthserverCaptchaSolver();
  });

  dialogEl.addEventListener("click", function(e) {
    if (e.target === dialogEl) closeDialog();
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

      const apiUrl = pjw.data.authserver_captcha_solver_link || "https://njucaptcha.zcec.top/solve";
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "nju", image: b64 })
      });

      if (!resp.ok) throw new Error(`服务器返回 HTTP ${resp.status}`);
      const result = await resp.json();

      if (!result.ok) throw new Error(result.error || "识别失败");
      const captchaText = result.result;
      if (typeof captchaText !== "string" || captchaText.length !== 4)
        throw new Error("返回结果格式不正确");

      const captchaInput = document.getElementById("captchaResponse")
        || document.getElementById("captcha")
        || document.querySelector("input[name='captchaResponse']");
      if (captchaInput) {
        captchaInput.value = captchaText;
        captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
        captchaInput.dispatchEvent(new Event("change", { bubbles: true }));
      }

      showCaptchaToast(`识别完成: ${captchaText} (${(result.time_ms || 0).toFixed(0)}ms)`, false);
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
