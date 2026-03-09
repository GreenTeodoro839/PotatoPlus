if (!window.browser) window.browser = window.chrome;

function injectScript(path, module = false, defer = false) {
  var script = document.createElement('script');
  if (defer) script.setAttribute('defer', '');
  if (module) script.setAttribute('type', 'module');
  else script.setAttribute('type', 'text/javascript');
  script.src = browser.runtime.getURL(path);
  document.documentElement.appendChild(script);
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

// Conditional script/style injection based on current page
if (pjw_mode == "authserver") {
  // Authserver: lightweight, no jQuery/MDC needed (page has its own jQuery)
  injectScript("js/common/core.js");
  injectScript("js/authserver/captcha.js");

} else if (pjw_mode == "welcome") {
  // xk.nju.edu.cn welcome/login page (page already has jQuery)
  injectScript("js/vendor/material-components-web.min.js");
  injectScript("js/common/core.js");
  injectScript("js/xk/welcome.js");
  injectScript("js/jiaowu/init.js");

} else if (pjw_mode == "course") {
  // xk.nju.edu.cn course selection (page already has jQuery)
  injectScript("js/vendor/material-components-web.min.js");
  injectScript("js/vendor/tinypinyin.js");
  injectScript("js/common/core.js");
  injectScript("js/common/console.js");
  injectScript("js/common/lib.js");
  injectScript("js/common/filter.js");
  injectScript("js/common/classlist.js");
  injectScript("js/common/crypto.js");
  injectScript("js/xk/course.js");
  injectScript("js/jiaowu/init.js");

} else if (pjw_mode == "xk_system") {
  // Other xk.nju.edu.cn pages (no specific features, just core)
  injectScript("js/common/core.js");

} else if (pjw_mode == "grade_info") {
  // jiaowu grade info page
  if (pjw_mode == "grade_info") {
    injectStyleFromString(`table.TABLE_BODY{ display: none; }`);
  }
  injectScript("js/vendor/jquery.min.js");
  injectScript("js/vendor/material-components-web.min.js");
  injectScript("js/vendor/tinypinyin.js");
  injectScript("js/common/core.js");
  injectScript("js/common/console.js");
  injectScript("js/common/lib.js");
  injectScript("js/common/filter.js");
  injectScript("js/common/classlist.js");
  injectScript("js/common/crypto.js");
  injectScript("js/jiaowu/grade.js");
  injectScript("js/jiaowu/init.js");

} else if (pjw_mode == "course_eval") {
  // jiaowu course evaluation page
  injectScript("js/vendor/jquery.min.js");
  injectScript("js/vendor/material-components-web.min.js");
  injectScript("js/common/core.js");
  injectScript("js/jiaowu/eval.js");
  injectScript("js/jiaowu/init.js");

} else if (pjw_mode != "") {
  // Other recognized jiaowu pages
  injectScript("js/vendor/jquery.min.js");
  injectScript("js/vendor/material-components-web.min.js");
  injectScript("js/common/core.js");
  injectScript("js/jiaowu/init.js");
}
