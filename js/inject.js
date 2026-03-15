if (!window.browser) window.browser = window.chrome;

function injectScript(path, module = false) {
  return new Promise((resolve, reject) => {
    var script = document.createElement('script');
    if (module) script.setAttribute('type', 'module');
    else script.setAttribute('type', 'text/javascript');
    script.src = browser.runtime.getURL(path);
    script.onload = resolve;
    script.onerror = reject;
    document.documentElement.appendChild(script);
  });
}

function injectScripts(paths) {
  // Chain scripts sequentially to guarantee execution order
  return paths.reduce((chain, path) => chain.then(() => injectScript(path)), Promise.resolve());
}

function injectStyle(path) {
  var stylesheet = document.createElement('link');
  stylesheet.setAttribute('type', 'text/css');
  stylesheet.setAttribute('rel', 'stylesheet');
  stylesheet.setAttribute('href', browser.runtime.getURL(path));
  document.documentElement.appendChild(stylesheet);
}

function injectStyleFromString(str) {
  var style = document.createElement('style');
  style.setAttribute('type', 'text/css');
  style.innerHTML = str;
  document.documentElement.appendChild(style);
}

// Mode detection
var modes_reg = {
  portal: /\/\/p\.nju\.edu\.cn\/portal/i,
  course: /grablessons.do/i,
  welcome: /(xk.nju.edu.cn\/xsxkapp\/sys\/xsxkapp\/\*default\/index.do|\/\/xk.nju.edu.cn\/$)/i,
  xk_system: /\/\/xk.nju.edu.cn/i,
  authserver: /\/\/authserver\.nju\.edu\.cn\/authserver\/login/i,
  ehall_eval: /ehallapp\.nju\.edu\.cn\/jwapp\/sys\/wspjyyapp/i,
  ehall_grade: /ehallapp\.nju\.edu\.cn\/jwapp\/sys\/cjcx/i,
  ehall_home: /ehall\.nju\.edu\.cn\/ywtb-portal\//i,
  ams: /ams\.nju\.edu\.cn/i,
};

let pjw_mode = "";
for (const mode_name in modes_reg) {
  if (modes_reg[mode_name].test(window.location.href)) {
    pjw_mode = mode_name;
    break;
  }
}

// Expose mode via meta tag
(() => {
  const info = document.createElement("meta");
  info.setAttribute("name", "pjw");
  info.setAttribute("version", browser?.runtime?.getManifest()?.version || "");
  info.setAttribute("mode", pjw_mode);
  document.documentElement.appendChild(info);
})();

// Conditional script injection based on current page
// Scripts are loaded sequentially to guarantee dependency order
if (pjw_mode == "portal") {
  // Portal login — runs entirely in content-script world (no CSP issues)
  const PJW_STORAGE = "potatoplus_data";
  const SKIP_KEY   = "pjw_portal_skip";

  if (sessionStorage.getItem(SKIP_KEY)) {
    // Second load after login-check passed — let the page load normally
    sessionStorage.removeItem(SKIP_KEY);
  } else {
    // First load: stop page immediately to prevent CAS redirect
    window.stop();
    portalLoginFlow();
  }

  async function portalLoginFlow() {
    try {
      const resp = await fetch("/api/portal/v1/getinfo?" + Date.now());
      const data = await resp.json();
      if (data.reply_code === 0) {
        // Already logged in — reload and let original page through
        sessionStorage.setItem(SKIP_KEY, "1");
        return location.reload();
      }
    } catch (_) { /* not logged in or network error */ }
    buildPortalLogin();
  }

  function pjwData()    { try { return JSON.parse(localStorage.getItem(PJW_STORAGE)) || {}; } catch { return {}; } }
  function pjwSave(obj) { localStorage.setItem(PJW_STORAGE, JSON.stringify(obj)); }

  function buildPortalLogin() {
    const stored    = pjwData();
    const savedUser = stored.portal_username || "";
    const savedPass = stored.portal_password || "";
    const hasSaved  = !!(savedUser || savedPass);
    const version   = browser?.runtime?.getManifest()?.version || "";

    // innerHTML="" is the only approach that reliably renders after window.stop()
    document.documentElement.innerHTML = "";

    // Add inline <style> first — this resets margin on ALL body/head elements
    // (including browser-auto-inserted duplicates), eliminating the top gap
    const style = document.createElement("style");
    style.textContent = "html,head,body{margin:0!important;padding:0!important;border:0!important}" +
      "body.pjw-portal-body{min-height:100vh;display:flex;align-items:center;justify-content:center;" +
      "background:linear-gradient(135deg,#1a0a2e 0%,#3d1a5c 40%,#63065f 100%);" +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}";
    document.documentElement.appendChild(style);

    const head = document.createElement("head");
    head.innerHTML = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = browser.runtime.getURL("css/portal-login.css");
    head.appendChild(css);
    document.documentElement.appendChild(head);

    const body = document.createElement("body");
    body.className = "pjw-portal-body";
    document.documentElement.appendChild(body);
    document.title = "PotatoPlus - \u6821\u56ed\u7f51\u767b\u5f55";

    // Remove any empty duplicate <head>/<body> auto-inserted by the browser
    document.querySelectorAll("head:empty, body:not(.pjw-portal-body)").forEach(el => el.remove());

    body.innerHTML =
      '<div class="pjw-portal-container"><div class="pjw-portal-card">' +
        '<div class="pjw-portal-header">' +
          '<div class="pjw-portal-title">PotatoPlus</div>' +
          '<div class="pjw-portal-subtitle">\u6821\u56ed\u7f51\u767b\u5f55</div>' +
        '</div>' +
        '<form id="pjw-portal-form" autocomplete="off">' +
          '<div class="pjw-portal-field">' +
            '<input id="pjw-portal-username" type="text" placeholder="\u5b66\u53f7"' +
              ' value="' + savedUser + '" autocomplete="username" spellcheck="false">' +
          '</div>' +
          '<div class="pjw-portal-field">' +
            '<input id="pjw-portal-password" type="password" placeholder="\u5bc6\u7801"' +
              ' value="' + savedPass + '" autocomplete="current-password">' +
          '</div>' +
          '<label class="pjw-portal-checkbox">' +
            '<input id="pjw-portal-save" type="checkbox"' + (hasSaved ? " checked" : "") + '>' +
            '<span>\u8bb0\u4f4f\u5bc6\u7801</span>' +
          '</label>' +
          '<button id="pjw-portal-submit" type="submit">\u767b \u5f55</button>' +
        '</form>' +
        '<div class="pjw-portal-footer">' +
          '<span>PotatoPlus ' + version + '</span>' +
          '<a href="https://authserver.nju.edu.cn/authserver/login?service=http%3A%2F%2Fp.nju.edu.cn%2Fapi%2Fcas%2Fgetinfo"' +
            '>\u7edf\u4e00\u8eab\u4efd\u8ba4\u8bc1\u767b\u5f55</a>' +
        '</div>' +
      '</div></div>' +
      '<div id="pjw-portal-toast-container"></div>';

    const toastBox   = document.getElementById("pjw-portal-toast-container");
    const usernameEl = document.getElementById("pjw-portal-username");
    const passwordEl = document.getElementById("pjw-portal-password");
    const saveEl     = document.getElementById("pjw-portal-save");
    const submitEl   = document.getElementById("pjw-portal-submit");

    if (!usernameEl.value) usernameEl.focus();
    else if (!passwordEl.value) passwordEl.focus();
    else submitEl.focus();

    document.getElementById("pjw-portal-form").addEventListener("submit", function (e) {
      e.preventDefault();
      doLogin();
    });

    async function doLogin() {
      const username = usernameEl.value.trim();
      const password = passwordEl.value;
      if (!username || !password) return showToast("\u8bf7\u8f93\u5165\u5b66\u53f7\u548c\u5bc6\u7801", true);

      submitEl.disabled = true;
      submitEl.textContent = "\u767b\u5f55\u4e2d\u2026";

      try {
        const resp = await fetch("/api/portal/v1/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });
        const data = await resp.json();

        if (data.reply_code === 0) {
          const d = pjwData();
          if (saveEl.checked) { d.portal_username = username; d.portal_password = password; }
          else { delete d.portal_username; delete d.portal_password; }
          pjwSave(d);
          submitEl.textContent = "\u767b\u5f55\u6210\u529f";
          showToast("\u767b\u5f55\u6210\u529f\uff0c\u6b63\u5728\u8df3\u8f6c\u2026", false);
          sessionStorage.setItem(SKIP_KEY, "1");
          setTimeout(() => location.reload(), 500);
        } else {
          const msg = (data.results && data.results.io_reply_msg) || data.reply_msg || "\u767b\u5f55\u5931\u8d25";
          showToast(msg, true);
          submitEl.disabled = false;
          submitEl.textContent = "\u767b \u5f55";
        }
      } catch (err) {
        showToast("\u7f51\u7edc\u9519\u8bef: " + err.message, true);
        submitEl.disabled = false;
        submitEl.textContent = "\u767b \u5f55";
      }
    }

    function showToast(msg, isError) {
      const old = document.getElementById("pjw-portal-toast");
      if (old) old.remove();
      const t = document.createElement("div");
      t.id = "pjw-portal-toast";
      t.className = "pjw-portal-toast " + (isError ? "pjw-portal-toast-error" : "pjw-portal-toast-info");
      t.textContent = msg;
      toastBox.appendChild(t);
      requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("pjw-portal-toast-visible")));
      setTimeout(() => { t.classList.remove("pjw-portal-toast-visible"); setTimeout(() => t.remove(), 400); }, isError ? 5000 : 3000);
    }

    // Do NOT auto-login — let the user click the button
  }

} else if (pjw_mode == "ehall_eval") {
  // ehall 新版评教页面：只需注入一键评教脚本
  injectScripts([
    "js/common/core.js",
    "js/ehall/eval.js",
  ]);

} else if (pjw_mode == "authserver") {
  var _pjwAuthD = {};
  try { _pjwAuthD = JSON.parse(localStorage.getItem("potatoplus_data")) || {}; } catch (_) {}
  if (_pjwAuthD.authserver_hijack !== false) {
    // 劫持模式：隐藏原始页面，注入自定义登录界面
    injectStyleFromString(
      "body{visibility:hidden!important}" +
      "#pjw-as-overlay{visibility:visible!important}" +
      "#pjw-as-config-dialog{visibility:visible!important}" +
      "#pjw-as-toast-wrap{visibility:visible!important}"
    );
    injectScripts([
      "js/common/core.js",
      "js/authserver/login.js",
    ]);
  } else {
    // 非劫持模式：加载验证码识别器（含"启用劫持"入口）
    injectScripts([
      "js/common/core.js",
      "js/authserver/captcha.js",
    ]);
  }

} else if (pjw_mode == "welcome") {
  injectScripts([
    "js/vendor/material-components-web.min.js",
    "js/common/core.js",
    "js/xk/welcome.js",
    "js/jiaowu/init.js",
  ]);

} else if (pjw_mode == "course") {
  injectScripts([
    "js/vendor/material-components-web.min.js",
    "js/vendor/tinypinyin.js",
    "js/common/core.js",
    "js/common/console.js",
    "js/common/lib.js",
    "js/common/filter.js",
    "js/common/classlist.js",
    "js/common/crypto.js",
    "js/xk/course.js",
    "js/jiaowu/init.js",
  ]);

} else if (pjw_mode == "xk_system") {
  injectScripts([
    "js/common/core.js",
  ]);

} else if (pjw_mode == "ehall_grade") {
  // ehall 成绩查询页面
  injectScripts([
    "js/common/core.js",
    "js/ehall/grade.js",
  ]);

} else if (pjw_mode == "ehall_home") {
  // ehall 首页
  injectScripts([
    "js/common/core.js",
    "js/ehall/schedule.js",
    "js/ehall/home.js",
  ]);

} else if (pjw_mode == "ams") {
  // AMS 作业提交系统 UI 美化
  injectScripts([
    "js/common/core.js",
    "js/ams/ams.js",
  ]);

} else if (pjw_mode != "") {
  injectScripts([
    "js/vendor/jquery.min.js",
    "js/vendor/material-components-web.min.js",
    "js/common/core.js",
    "js/jiaowu/init.js",
  ]);
}

