// PotatoPlus — authserver 统一身份认证 登录劫持
// 同步设置标志，让后续脚本（authserver_captcha.js 等）能读到
pjw._authserverHijackActive = pjw.isOn("authserver_hijack");

(function () {
  "use strict";

  if (!pjw.isOn("authserver_hijack")) return;

  // --- 注入样式 ---
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    #pjw-as-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 2147483647; visibility: visible !important;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #1a0a2e 0%, #3d1a5c 40%, #63065f 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .pjw-as-container { width: 100%; max-width: 380px; padding: 20px; box-sizing: border-box; }
    .pjw-as-card {
      background: rgba(255,255,255,0.95); border-radius: 20px;
      padding: 40px 32px 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .pjw-as-header { text-align: center; margin-bottom: 28px; }
    .pjw-as-title { font-size: 26px; font-weight: 700; color: #63065f; letter-spacing: 1px; }
    .pjw-as-subtitle { font-size: 14px; color: #999; margin-top: 6px; }
    .pjw-as-field { margin-bottom: 14px; }
    .pjw-as-field input {
      width: 100%; box-sizing: border-box; padding: 12px 16px;
      border: 1.5px solid #ddd; border-radius: 10px; font-size: 15px;
      color: #333; background: #fafafa; outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    .pjw-as-field input:focus {
      border-color: #63065f; box-shadow: 0 0 0 3px rgba(99,6,95,.1); background: #fff;
    }
    .pjw-as-field input::placeholder { color: #bbb; }
    /* 验证码行 */
    .pjw-as-captcha-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: stretch; }
    .pjw-as-captcha-input-wrap { flex: 1; }
    #pjw-as-captcha {
      width: 100%; box-sizing: border-box; padding: 12px 16px;
      border: 1.5px solid #ddd; border-radius: 10px; font-size: 15px;
      color: #333; background: #fafafa; outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    #pjw-as-captcha:focus {
      border-color: #63065f; box-shadow: 0 0 0 3px rgba(99,6,95,.1); background: #fff;
    }
    #pjw-as-captcha::placeholder { color: #bbb; }
    .pjw-as-captcha-img-wrap {
      flex-shrink: 0; display: flex; align-items: center; gap: 2px;
      border: 1.5px solid #ddd; border-radius: 10px; padding: 0 8px 0 6px;
      background: #fafafa; cursor: pointer; transition: border-color .2s;
    }
    .pjw-as-captcha-img-wrap:hover { border-color: #63065f; }
    #pjw-as-captcha-img { height: 32px; display: block; border-radius: 4px; pointer-events: none; min-width: 72px; }
    #pjw-as-captcha-refresh {
      background: none; border: none; padding: 2px 0 2px 2px; cursor: pointer;
      font-size: 17px; color: #bbb; line-height: 1; flex-shrink: 0;
    }
    #pjw-as-captcha-refresh:hover { color: #63065f; }
    /* 验证码识别控件 */
    .pjw-as-captcha-controls {
      display: flex; align-items: center; gap: 8px; margin: 0 0 14px;
      padding: 8px 0; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0;
    }
    .pjw-as-ctrl-label { font-size: 13px; color: #666; flex: 1; user-select: none; }
    /* 拨动开关 */
    .pjw-as-switch { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; }
    .pjw-as-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
    .pjw-as-slider {
      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
      background: #ccc; transition: .3s; border-radius: 20px;
    }
    .pjw-as-slider::before {
      content: ""; position: absolute; height: 14px; width: 14px;
      left: 3px; bottom: 3px; background: #fff; transition: .3s;
      border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,.3);
    }
    .pjw-as-switch input:checked + .pjw-as-slider { background: #90138b; }
    .pjw-as-switch input:checked + .pjw-as-slider::before { transform: translateX(16px); }
    /* 记住密码 */
    .pjw-as-checkbox {
      display: flex; align-items: center; gap: 8px; margin: 4px 0 18px; cursor: pointer; user-select: none;
    }
    .pjw-as-checkbox input[type="checkbox"] { width: 16px; height: 16px; accent-color: #63065f; cursor: pointer; }
    .pjw-as-checkbox span { font-size: 13px; color: #888; }
    /* 登录按钮 */
    #pjw-as-submit {
      width: 100%; padding: 13px; border: none; border-radius: 10px;
      font-size: 16px; font-weight: 600; color: #fff; letter-spacing: 2px;
      background: linear-gradient(50deg, rgba(99,6,95,1) 0%, rgba(93,42,175,1) 60%, rgba(255,71,71,1) 100%);
      cursor: pointer; transition: opacity .2s, transform .1s;
    }
    #pjw-as-submit:hover:not(:disabled) { opacity: .9; }
    #pjw-as-submit:active:not(:disabled) { transform: scale(.98); }
    #pjw-as-submit:disabled { opacity: .6; cursor: default; }
    /* 底栏 */
    .pjw-as-footer {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 20px; font-size: 12px; color: #bbb; gap: 8px;
    }
    .pjw-as-footer-center { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .pjw-as-footer-label { font-size: 12px; color: #bbb; white-space: nowrap; }
    /* 二维码悬浮 */
    .pjw-as-qr-wrap { position: relative; flex-shrink: 0; }
    .pjw-as-qr-icon { color: #ccc; display: block; line-height: 1; transition: color .2s; }
    .pjw-as-qr-wrap:hover .pjw-as-qr-icon { color: #90138b; }
    .pjw-as-qr-popup {
      display: none; position: absolute; bottom: 28px; right: 0;
      background: #fff; border-radius: 12px; padding: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,.25); text-align: center; white-space: nowrap; z-index: 10;
    }
    #pjw-as-qr-img { width: 160px; height: 160px; display: block; }
    .pjw-as-qr-popup p { font-size: 12px; color: #999; margin: 8px 0 0; }
    .pjw-as-qr-wrap:hover .pjw-as-qr-popup { display: block; }
    /* Toast */
    #pjw-as-toast-wrap {
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      z-index: 2147483647; pointer-events: none; visibility: visible !important;
    }
    .pjw-as-toast {
      padding: 10px 24px; border-radius: 8px; font-size: 14px; color: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,.2); opacity: 0;
      transform: translateY(-20px); transition: opacity .3s, transform .3s; white-space: nowrap;
    }
    .pjw-as-toast-show { opacity: 1; transform: translateY(0); }
    .pjw-as-toast-info { background: rgba(33,33,33,.85); }
    .pjw-as-toast-error { background: rgba(183,28,28,.9); }
  `;
  (document.head || document.documentElement).appendChild(styleEl);

  function init() {
    const metaEl  = document.querySelector('meta[name="pjw"]');
    const version = metaEl ? (metaEl.getAttribute("version") || "") : "";
    const savedUser = pjw.data.as_username || "";
    const savedPass = pjw.data.as_password || "";
    const hasSaved  = !!(savedUser || savedPass);

    // QR code SVG icon
    const qrSVG =
      '<svg class="pjw-as-qr-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="currentColor">' +
        '<rect x="1.5" y="1.5" width="7" height="7" rx=".8" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="3.5" y="3.5" width="3" height="3"/>' +
        '<rect x="13.5" y="1.5" width="7" height="7" rx=".8" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="15.5" y="3.5" width="3" height="3"/>' +
        '<rect x="1.5" y="13.5" width="7" height="7" rx=".8" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="3.5" y="15.5" width="3" height="3"/>' +
        '<rect x="13" y="13" width="2.5" height="2.5"/>' +
        '<rect x="16.5" y="13" width="2.5" height="2.5"/>' +
        '<rect x="13" y="16.5" width="2.5" height="2.5"/>' +
        '<rect x="16.5" y="16.5" width="2.5" height="2.5"/>' +
      '</svg>';

    // --- 构建遮罩层 ---
    const overlay = document.createElement("div");
    overlay.id = "pjw-as-overlay";
    overlay.innerHTML =
      '<div class="pjw-as-container"><div class="pjw-as-card">' +
        '<div class="pjw-as-header">' +
          '<div class="pjw-as-title">PotatoPlus</div>' +
          '<div class="pjw-as-subtitle">\u7edf\u4e00\u8eab\u4efd\u8ba4\u8bc1\u767b\u5f55</div>' +
        '</div>' +
        '<form id="pjw-as-form" autocomplete="off">' +
          '<div class="pjw-as-field">' +
            '<input id="pjw-as-username" type="text" placeholder="\u5b66\u53f7"' +
              ' value="' + savedUser.replace(/"/g, "&quot;") + '" autocomplete="username" spellcheck="false">' +
          '</div>' +
          '<div class="pjw-as-field">' +
            '<input id="pjw-as-password" type="password" placeholder="\u5bc6\u7801"' +
              ' value="' + savedPass.replace(/"/g, "&quot;") + '" autocomplete="current-password">' +
          '</div>' +
          '<div class="pjw-as-captcha-row">' +
            '<div class="pjw-as-captcha-input-wrap">' +
              '<input id="pjw-as-captcha" type="text" placeholder="\u9a8c\u8bc1\u7801" autocomplete="off" maxlength="10">' +
            '</div>' +
            '<div class="pjw-as-captcha-img-wrap" id="pjw-as-captcha-img-wrap" title="\u70b9\u51fb\u5237\u65b0\u9a8c\u8bc1\u7801">' +
              '<img id="pjw-as-captcha-img" alt="\u9a8c\u8bc1\u7801">' +
              '<button type="button" id="pjw-as-captcha-refresh">\u21ba</button>' +
            '</div>' +
          '</div>' +
          '<div class="pjw-as-captcha-controls">' +
            '<label class="pjw-as-switch">' +
              '<input type="checkbox" id="pjw-as-captcha-switch">' +
              '<span class="pjw-as-slider"></span>' +
            '</label>' +
            '<span class="pjw-as-ctrl-label">\u9a8c\u8bc1\u7801\u8bc6\u522b</span>' +
            '<span style="width:42px;flex-shrink:0;"></span>' +
          '</div>' +
          '<label class="pjw-as-checkbox">' +
            '<input id="pjw-as-save" type="checkbox"' + (hasSaved ? " checked" : "") + '>' +
            '<span>\u8bb0\u4f4f\u5bc6\u7801</span>' +
          '</label>' +
          '<button id="pjw-as-submit" type="submit">\u767b \u5f55</button>' +
        '</form>' +
        '<div class="pjw-as-footer">' +
          '<span>PotatoPlus ' + version + '</span>' +
          '<div class="pjw-as-footer-center">' +
            '<label class="pjw-as-switch">' +
              '<input type="checkbox" id="pjw-as-hijack-switch" checked>' +
              '<span class="pjw-as-slider"></span>' +
            '</label>' +
            '<span class="pjw-as-footer-label">\u9875\u9762\u7f8e\u5316</span>' +
          '</div>' +
          '<div class="pjw-as-qr-wrap">' +
            qrSVG +
            '<div class="pjw-as-qr-popup">' +
              '<img id="pjw-as-qr-img" width="160" height="160" alt="\u626b\u7801\u767b\u5f55">' +
              '<p>\u5fae\u4fe1\u6216\u5357\u4eac\u5927\u5b66APP\u626b\u7801\u767b\u5f55</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div></div>' +
      '<div id="pjw-as-toast-wrap"></div>';

    document.body.appendChild(overlay);

    // --- 引用 ---
    const usernameEl       = document.getElementById("pjw-as-username");
    const passwordEl       = document.getElementById("pjw-as-password");
    const captchaEl        = document.getElementById("pjw-as-captcha");
    const captchaImgEl     = document.getElementById("pjw-as-captcha-img");
    const captchaImgWrap   = document.getElementById("pjw-as-captcha-img-wrap");
    const captchaRefreshEl = document.getElementById("pjw-as-captcha-refresh");
    const captchaSwitchEl  = document.getElementById("pjw-as-captcha-switch");
    const saveEl           = document.getElementById("pjw-as-save");
    const submitEl         = document.getElementById("pjw-as-submit");
    const hijackSwitchEl   = document.getElementById("pjw-as-hijack-switch");
    const qrImgEl          = document.getElementById("pjw-as-qr-img");
    const toastWrap        = document.getElementById("pjw-as-toast-wrap");

    // --- 初始焦点 ---
    if (!usernameEl.value) usernameEl.focus();
    else if (!passwordEl.value) passwordEl.focus();
    else submitEl.focus();

    // --- 验证码图片：等 .login-main #captchaImg 有 src 后移入 overlay ---
    // 页面结构：.login-main.login-slider > #loginViewDiv > form#pwdFromId > ... > img#captchaImg
    // 其他 tab（phoneLoginDiv/pwdLoginDiv）也有 #captchaImg，但 .login-main 下的才是当前激活视图的。
    // 与 authserver_captcha.js 保持一致，用 ".login-main #captchaImg" 定位。
    var _mainCaptchaImg = null;

    function reparentCaptchaImg(img) {
      if (_mainCaptchaImg) return;
      _mainCaptchaImg = img;
      img.id = "pjw-captcha-img-active";
      img.style.cssText =
        "height:32px!important;display:block!important;border-radius:4px!important;" +
        "pointer-events:none!important;min-width:72px!important;max-width:120px!important;";
      var placeholder = document.getElementById("pjw-as-captcha-img");
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.replaceChild(img, placeholder);
      }
    }

    (function watchLoginMainCaptcha() {
      function watchImg(img) {
        if (img.getAttribute("src")) { reparentCaptchaImg(img); return; }
        var obs = new MutationObserver(function() {
          if (img.getAttribute("src")) { obs.disconnect(); reparentCaptchaImg(img); }
        });
        obs.observe(img, { attributes: true, attributeFilter: ["src"] });
      }

      var img = document.querySelector(".login-main #captchaImg");
      if (img) { watchImg(img); return; }

      // .login-main 尚未插入 DOM，等待
      var bodyObs = new MutationObserver(function() {
        var img = document.querySelector(".login-main #captchaImg");
        if (img) { bodyObs.disconnect(); watchImg(img); }
      });
      bodyObs.observe(document.body, { childList: true, subtree: true });
    })();

    // --- 刷新验证码 ---
    function doRefresh() {
      // 直接操作 _mainCaptchaImg，不用 getElementById（移动后 id 已改，且页面有重复 id）
      if (_mainCaptchaImg) {
        _mainCaptchaImg.src = "/authserver/getCaptcha.htl?" + Date.now();
      } else if (typeof reloadCaptcha === "function") {
        reloadCaptcha(true);
      }
      captchaEl.value = "";
      captchaEl.focus();
    }
    captchaRefreshEl.addEventListener("click", doRefresh);
    captchaImgWrap.addEventListener("click", function(e) {
      if (e.target !== captchaRefreshEl) doRefresh();
    });

    // --- 同步二维码图片 ---
    var origQrImg = document.getElementById("qr_img");
    if (origQrImg) {
      function syncQr() {
        var src = origQrImg.getAttribute("src") || origQrImg.src || "";
        if (src) qrImgEl.src = src;
      }
      syncQr();
      new MutationObserver(syncQr).observe(origQrImg, { attributes: true, attributeFilter: ["src"] });
    }

    // --- 劫持开关 ---
    hijackSwitchEl.addEventListener("change", function() {
      pjw.preferences.authserver_hijack = hijackSwitchEl.checked;
      if (!hijackSwitchEl.checked) location.reload();
    });

    // --- 验证码识别开关 ---
    captchaSwitchEl.checked = pjw.isOn("authserver_solve_captcha");
    captchaSwitchEl.addEventListener("change", function() {
      pjw.preferences.authserver_solve_captcha = captchaSwitchEl.checked;
      if (captchaSwitchEl.checked) initCaptchaSolver();
    });

    // --- 阻止键盘事件冒泡到原始页面（原始页面在 body 上监听 keyup Enter 来触发登录，会导致双重提交） ---
    overlay.addEventListener("keydown", function(e) { e.stopPropagation(); });
    overlay.addEventListener("keyup",   function(e) { e.stopPropagation(); });
    overlay.addEventListener("keypress",function(e) { e.stopPropagation(); });

    // --- 焦点在 overlay 外时（如原始隐藏表单），Enter 键同样交由 overlay 处理 ---
    document.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !overlay.contains(document.activeElement)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        submitEl.click();
      }
    }, true);
    document.addEventListener("keyup", function(e) {
      if (e.key === "Enter" && !overlay.contains(document.activeElement)) {
        e.stopImmediatePropagation();
      }
    }, true);

    // --- 表单提交 ---
    document.getElementById("pjw-as-form").addEventListener("submit", function(e) {
      e.preventDefault();
      doLogin();
    });

    function doLogin() {
      var username = usernameEl.value.trim();
      var password = passwordEl.value;
      var captcha  = captchaEl.value.trim();
      if (!username || !password) return showToast("\u8bf7\u8f93\u5165\u5b66\u53f7\u548c\u5bc6\u7801", true);
      if (!captcha) return showToast("\u8bf7\u8f93\u5165\u9a8c\u8bc1\u7801", true);

      submitEl.disabled = true;
      submitEl.textContent = "\u767b\u5f55\u4e2d\u2026";

      // 保存凭据
      if (saveEl.checked) {
        pjw.data.as_username = username;
        pjw.data.as_password = password;
      } else {
        delete pjw.data.as_username;
        delete pjw.data.as_password;
      }

      // 填入原始表单
      var origUser    = document.getElementById("username");
      var origPass    = document.getElementById("password"); // name="passwordText"
      var origCaptcha = document.getElementById("captcha");
      if (origUser)    { origUser.value    = username; origUser.dispatchEvent(new Event("input", { bubbles: true })); }
      if (origPass)    { origPass.value    = password; origPass.dispatchEvent(new Event("input", { bubbles: true })); }
      if (origCaptcha) { origCaptcha.value = captcha;  origCaptcha.dispatchEvent(new Event("input", { bubbles: true })); }

      // 监听错误提示
      var errorEl = document.getElementById("showErrorTip") || document.getElementById("nameErrorTip") || document.getElementById("pwdErrorTip");
      var errorObserver = null;
      var errorTimer = null;

      function resetSubmit() {
        submitEl.disabled = false;
        submitEl.textContent = "\u767b \u5f55";
        if (errorObserver) { errorObserver.disconnect(); errorObserver = null; }
        if (errorTimer) { clearTimeout(errorTimer); errorTimer = null; }
      }

      if (errorEl) {
        errorObserver = new MutationObserver(function() {
          var msg = errorEl.textContent.trim();
          if (msg) { showToast(msg, true); resetSubmit(); }
        });
        errorObserver.observe(errorEl, { childList: true, subtree: true, characterData: true });
      }

      // 也监听 formErrorTip
      var formErrorEl = document.getElementById("formErrorTip");
      var formErrorObs = null;
      if (formErrorEl) {
        formErrorObs = new MutationObserver(function() {
          var el = document.getElementById("showErrorTip");
          var msg = el ? el.textContent.trim() : formErrorEl.textContent.trim();
          if (msg) { showToast(msg, true); resetSubmit(); if (formErrorObs) { formErrorObs.disconnect(); formErrorObs = null; } }
        });
        formErrorObs.observe(formErrorEl, { childList: true, subtree: true, characterData: true });
      }

      errorTimer = setTimeout(resetSubmit, 15000);

      // 点击原始登录按钮（触发页面自带加密逻辑）
      var loginBtn = document.getElementById("login_submit") || document.querySelector("a.login-btn");
      if (loginBtn) {
        loginBtn.click();
      } else {
        var form = document.getElementById("pwdFromId");
        if (form) form.submit();
        else resetSubmit();
      }
    }

    // --- Toast ---
    function showToast(msg, isError) {
      var old = document.getElementById("pjw-as-toast");
      if (old) old.remove();
      var t = document.createElement("div");
      t.id = "pjw-as-toast";
      t.className = "pjw-as-toast " + (isError ? "pjw-as-toast-error" : "pjw-as-toast-info");
      t.textContent = msg;
      toastWrap.appendChild(t);
      requestAnimationFrame(function() {
        requestAnimationFrame(function() { t.classList.add("pjw-as-toast-show"); });
      });
      setTimeout(function() {
        t.classList.remove("pjw-as-toast-show");
        setTimeout(function() { if (t.parentNode) t.remove(); }, 400);
      }, isError ? 5000 : 3000);
    }

    // --- 验证码识别器 ---
    var _captchaInited = false;
    var _solvingCaptcha = false;

    function initCaptchaSolver() {
      if (_captchaInited) return;
      _captchaInited = true;
      // _mainCaptchaImg is set by watchLoginMainCaptcha once .login-main #captchaImg
      // has a src; the shared watcher handles appearance + src-change lifecycle.
      pjwAuthserverWatchCaptchaImg(
        function() { return _mainCaptchaImg; },
        function(imgEl) { solveCaptcha(imgEl); }
      );
    }

    async function solveCaptcha(imgEl) {
      if (!pjw.isOn("authserver_solve_captcha")) return;
      if (_solvingCaptcha) return;
      if (!imgEl || !imgEl.complete || imgEl.naturalWidth === 0) return;
      _solvingCaptcha = true;
      showToast("\u6b63\u5728\u8bc6\u522b\u9a8c\u8bc1\u7801\u2026", false);
      try {
        var startedAt = performance.now();
        var ocr = await getPjwAuthserverCaptchaOcr();
        var text = await ocr.predictFromImageElement(imgEl);
        if (typeof text !== "string" || text.length !== 4) throw new Error("\u8bc6\u522b\u7ed3\u679c\u683c\u5f0f\u4e0d\u6b63\u786e");
        captchaEl.value = text;
        captchaEl.dispatchEvent(new Event("input", { bubbles: true }));
        showToast("\u8bc6\u522b\u5b8c\u6210: " + text + " (" + (performance.now() - startedAt).toFixed(0) + "ms)", false);
      } catch (e) {
        showToast("\u9a8c\u8bc1\u7801\u8bc6\u522b\u5931\u8d25: " + e.message, true);
      } finally {
        _solvingCaptcha = false;
      }
    }

    if (pjw.isOn("authserver_solve_captcha")) initCaptchaSolver();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else
    init();
})();
