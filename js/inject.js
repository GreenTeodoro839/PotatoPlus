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
  course: /grablessons.do/i,
  welcome: /(xk.nju.edu.cn\/xsxkapp\/sys\/xsxkapp\/\*default\/index.do|\/\/xk.nju.edu.cn\/$)/i,
  xk_system: /\/\/xk.nju.edu.cn/i,
  authserver: /\/\/authserver\.nju\.edu\.cn\/authserver\/login/i,
  course_eval: /evalcourse\/courseEval.do\?method=currentEvalCourse/i,
  grade_info: /student\/studentinfo\/achievementinfo.do\?method=searchTermList/i,
};

let pjw_mode = "";
for (const mode_name in modes_reg) {
  if (modes_reg[mode_name].test(window.location.href) == true) {
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
if (pjw_mode == "authserver") {
  injectScripts([
    "js/common/core.js",
    "js/authserver/captcha.js",
  ]);

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

} else if (pjw_mode == "grade_info") {
  injectStyleFromString(`table.TABLE_BODY{ display: none; }`);
  injectScripts([
    "js/vendor/jquery.min.js",
    "js/vendor/material-components-web.min.js",
    "js/vendor/tinypinyin.js",
    "js/common/core.js",
    "js/common/console.js",
    "js/common/lib.js",
    "js/common/filter.js",
    "js/common/classlist.js",
    "js/common/crypto.js",
    "js/jiaowu/grade.js",
    "js/jiaowu/init.js",
  ]);

} else if (pjw_mode == "course_eval") {
  injectScripts([
    "js/vendor/jquery.min.js",
    "js/vendor/material-components-web.min.js",
    "js/common/core.js",
    "js/jiaowu/eval.js",
    "js/jiaowu/init.js",
  ]);

} else if (pjw_mode != "") {
  injectScripts([
    "js/vendor/jquery.min.js",
    "js/vendor/material-components-web.min.js",
    "js/common/core.js",
    "js/jiaowu/init.js",
  ]);
}
