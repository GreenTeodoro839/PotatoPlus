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

var modes_reg = {
  course: /grablessons.do/i, // 选课系统列表
  welcome: /(xk.nju.edu.cn\/xsxkapp\/sys\/xsxkapp\/\*default\/index.do|\/\/xk.nju.edu.cn\/$)/i, // xk.nju.edu.cn 登录界面
  xk_system: /\/\/xk.nju.edu.cn/i, // 选课系统 xk.nju.edu.cn 的其它界面

  authserver: /\/\/authserver\.nju\.edu\.cn\/authserver\/login/i, // 统一身份认证登录

  course_eval: /evalcourse\/courseEval.do\?method=currentEvalCourse/i, // 课程评估
  grade_info: /student\/studentinfo\/achievementinfo.do\?method=searchTermList/i, // 成绩查看
}

let pjw_mode = "";
for (const mode_name in modes_reg) {
  if (modes_reg[mode_name].test(window.location.href) == true) {
    pjw_mode = mode_name;
    break;
  }
}

(() => {
  const info = document.createElement("meta");
  info.setAttribute("name", "pjw");
  info.setAttribute("version", 
      (typeof GM_info == "undefined" ? "" : GM_info?.script?.version) 
      || (browser?.runtime?.getManifest()?.version || ""));
  info.setAttribute("mode", pjw_mode);
  document.documentElement.appendChild(info);
})();

/* BELOW COMMENTS ARE USED TO GENERATE USERSCRIPT */
// injectStyle("css/material-components-web.min.css");
// injectStyle("css/pjw.css");
// injectStyle("css/pjw-classlist.css");
// injectStyle("css/pjw-filter.css");
// injectStyle("css/pjw-console.css");
/* DO NOT REMOVE */

if (pjw_mode == "grade_info") {
  injectStyleFromString(`table.TABLE_BODY{ display: none; }`);
}

if (pjw_mode == "authserver") {
  // Authserver mode: lightweight injection (core only, page has jQuery)
  injectScript("js/pjw-core.js");
} else {
  if (pjw_mode != "course" && pjw_mode != "xk_system" && pjw_mode != "welcome") {
    injectScript("js/jquery.min.js");
  }

  injectScript("js/material-components-web.min.js");

  if (pjw_mode != "") {
    injectScript("js/tinypinyin.js");
    injectScript("js/pjw-console.js");
    injectScript("js/pjw-lib.js");
    injectScript("js/pjw-filter.js");
    injectScript("js/pjw-classlist.js");
    injectScript("js/pjw-crypto.js");
    injectScript("js/pjw-modes.js");
  }

  injectScript("js/pjw-core.js");
}