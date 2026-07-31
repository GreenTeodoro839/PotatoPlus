// PotatoPlus — authserver 统一身份认证
// 美化开启：自定义登录界面，点“登录”时无 UI 地自动完成滑块验证 + 提交登录（滑块协议见 sliderCaptcha.js）。
// 美化关闭：不处理验证码，仅在原始页插入“启用美化”入口（按钮代码沿用原 authserver_captcha.js）。
(function () {
  "use strict";

  // --- 美化开启：注入样式 ---
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
          '<div class="pjw-as-subtitle">统一身份认证登录</div>' +
        '</div>' +
        '<form id="pjw-as-form" autocomplete="off">' +
          '<div class="pjw-as-field">' +
            '<input id="pjw-as-username" type="text" placeholder="学号"' +
              ' value="' + savedUser.replace(/"/g, "&quot;") + '" autocomplete="username" spellcheck="false">' +
          '</div>' +
          '<div class="pjw-as-field">' +
            '<input id="pjw-as-password" type="password" placeholder="密码"' +
              ' value="' + savedPass.replace(/"/g, "&quot;") + '" autocomplete="current-password">' +
          '</div>' +
          '<label class="pjw-as-checkbox">' +
            '<input id="pjw-as-save" type="checkbox"' + (hasSaved ? " checked" : "") + '>' +
            '<span>记住密码</span>' +
          '</label>' +
          '<button id="pjw-as-submit" type="submit">登 录</button>' +
        '</form>' +
        '<div class="pjw-as-footer">' +
          '<span>PotatoPlus ' + version + '</span>' +
          '<div class="pjw-as-qr-wrap">' +
            qrSVG +
            '<div class="pjw-as-qr-popup">' +
              '<img id="pjw-as-qr-img" width="160" height="160" alt="扫码登录">' +
              '<p>微信或南京大学APP扫码登录</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div></div>' +
      '<div id="pjw-as-toast-wrap"></div>';

    document.body.appendChild(overlay);

    // --- 引用 ---
    const usernameEl     = document.getElementById("pjw-as-username");
    const passwordEl     = document.getElementById("pjw-as-password");
    const saveEl         = document.getElementById("pjw-as-save");
    const submitEl       = document.getElementById("pjw-as-submit");
    const qrImgEl        = document.getElementById("pjw-as-qr-img");
    const toastWrap      = document.getElementById("pjw-as-toast-wrap");

    // --- 初始焦点 ---
    if (!usernameEl.value) usernameEl.focus();
    else if (!passwordEl.value) passwordEl.focus();
    else submitEl.focus();

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

    // --- 阻止键盘事件冒泡到原始页面（原始页面在 body 上监听 Enter 会触发双重提交） ---
    overlay.addEventListener("keydown", function(e) { e.stopPropagation(); });
    overlay.addEventListener("keyup",   function(e) { e.stopPropagation(); });
    overlay.addEventListener("keypress",function(e) { e.stopPropagation(); });

    // --- 焦点在 overlay 外时，Enter 同样交由 overlay 处理 ---
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

    async function doLogin() {
      var username = usernameEl.value.trim();
      var password = passwordEl.value;
      if (!username || !password) return showToast("请输入学号和密码", true);

      submitEl.disabled = true;
      submitEl.textContent = "登录中…";

      // 保存凭据
      if (saveEl.checked) {
        pjw.data.as_username = username;
        pjw.data.as_password = password;
      } else {
        delete pjw.data.as_username;
        delete pjw.data.as_password;
      }

      try {
        // 1. 检查是否需要滑块验证
        if (await checkNeedCaptcha(username)) {
          showToast("正在处理滑块验证…", false);
          var ok = await pjwVerifySliderCaptcha({ attempts: 5 });
          if (!ok) {
            showToast("滑块验证失败，请重试", true);
            return resetSubmit();
          }
        }
        // 2. 提交登录（真实表单导航，由浏览器处理 CAS 跳转 / Cookie）
        await submitLogin(username, password);
        // 成功：页面已导航离开；失败会刷新回登录页，由 observePageError 提示
      } catch (e) {
        showToast("登录出错: " + (e && e.message || e), true);
        resetSubmit();
      }
    }

    // 检查当前账号是否需要滑块验证（默认按“需要”处理）
    async function checkNeedCaptcha(username) {
      try {
        var resp = await fetch(
          location.origin + "/authserver/checkNeedCaptcha.htl?username=" + encodeURIComponent(username),
          { credentials: "include" }
        );
        var data = await resp.json();
        return !(data && data.isNeed === false);
      } catch (_) {
        return true;
      }
    }

    // 读取原始表单的隐藏字段 + 盐，构造并提交一个真实表单
    async function submitLogin(username, password) {
      var salt = (document.getElementById("pwdEncryptSalt") || {}).value;
      var form = getPwdForm();
      function field(name) {
        var el = form && form.querySelector('input[name="' + name + '"]');
        return el ? el.value : "";
      }
      var lt = field("lt");
      var execution = field("execution");
      var eventId = field("_eventId") || "submit";
      var cllt = field("cllt") || "userNameLogin";
      var dllt = field("dllt");
      var rmShown = field("rmShown");

      if (!salt) throw new Error("缺少加密盐");
      var encPwd = await pjwEncryptAuthserverPassword(password, salt);

      var formEl = document.createElement("form");
      formEl.method = "POST";
      formEl.action = location.href; // 含 service 参数
      formEl.style.display = "none";
      function append(name, value) {
        var input = document.createElement("input");
        input.type = "hidden"; input.name = name; input.value = value;
        formEl.appendChild(input);
      }
      append("username", username);
      append("password", encPwd);
      append("lt", lt);
      append("captcha", "");
      append("cllt", cllt);
      append("dllt", dllt);
      append("execution", execution);
      append("_eventId", eventId);
      if (rmShown) append("rmShown", rmShown);
      document.body.appendChild(formEl);
      formEl.submit();
    }

    function getPwdForm() {
      var cllt = document.querySelector('input[name="cllt"][value="userNameLogin"]');
      if (cllt) return cllt.closest("form");
      return document.getElementById("pwdFromId") || document.querySelector("form");
    }

    function resetSubmit() {
      submitEl.disabled = false;
      submitEl.textContent = "登 录";
    }

    // --- 失败回显：登录失败后页面刷新回登录页，原始 #showErrorTip 会被服务端填入 ---
    // 由于我们隐藏了原始页面，这里把它转成 toast。
    observePageError();

    function observePageError() {
      var selectors = ["#showErrorTip", "#nameErrorTip", "#pwdErrorTip", "#formErrorTip", "#authErrorTip", "#msg"];
      function readError() {
        for (var i = 0; i < selectors.length; i++) {
          var el = document.querySelector(selectors[i]);
          if (el) { var t = (el.textContent || "").trim(); if (t) return t; }
        }
        return "";
      }
      var shown = readError();
      if (shown) { showToast(shown, true); resetSubmit(); return; }
      var obs = new MutationObserver(function() {
        var msg = readError();
        if (msg) { showToast(msg, true); resetSubmit(); obs.disconnect(); }
      });
      obs.observe(document.body, { childList: true, subtree: true, characterData: true });
      setTimeout(function() { obs.disconnect(); }, 15000);
    }
  }

  // --- Toast ---
  function showToast(msg, isError) {
    var overlay = document.getElementById("pjw-as-overlay");
    if (!overlay) return; // init 之前的服务端错误暂无 UI 承载
    var toastWrap = document.getElementById("pjw-as-toast-wrap");
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

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else
    init();
})();
