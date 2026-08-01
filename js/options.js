// options.js - PotatoPlus 设置页（Phase 1：UI + 持久化，暂不真正控制功能）
// 加开关只需在下面 FEATURES 里追加一条；无需改 DOM 或 CSS。

// 跨浏览器：Chrome 用 chrome，Firefox 用 browser（storage API 两者都返回 Promise）
if (!globalThis.browser) globalThis.browser = globalThis.chrome;

// 每条：{ key, name, desc, default }。default 全为 true → 新装/更新新增的开关默认全开。
const FEATURES = [
  { group: "统一身份认证", items: [
    { key: "authserver.beautify", name: "登录页美化",
      desc: "authserver 登录页替换为 PotatoPlus 风格界面（含自动滑块、记住密码）", default: true },
  ]},
  { group: "校园网门户", items: [
    { key: "portal.quick_login", name: "快捷登录",
      desc: "p.nju.edu.cn 未登录时拦截 CAS 跳转，展示内置登录页直接认证", default: true },
  ]},
  { group: "选课平台 (xk)", items: [
    { key: "xk.beautify", name: "选课平台美化",
      desc: "课程列表增强、本地搜索/拼音、筛选、收藏", default: true },
    { key: "xk.captcha", name: "验证码自动识别",
      desc: "xk 登录点选验证码本地自动识别（可独立关闭）", default: true },
    { key: "xk.hongheibang", name: "选课平台红黑榜",
      desc: "原生教学班卡片上显示教师组红黑榜评分（仅在「美化」关闭时可用）", default: true,
      showWhen: function (s) { return s["xk.beautify"] === false; } },
  ]},
  { group: "ehall 子页面", items: [
    { key: "ehall.grade_visualizer", name: "成绩可视化",
      desc: "成绩页顶部面板：学分绩 / 学分分布饼图 / GPA 趋势", default: true },
    { key: "ehall.grade_query", name: "成绩查询",
      desc: "浮动按钮 + GPA 计算器弹窗（勾选课程算学分绩）", default: true },
    { key: "ehall.eval", name: "一键评教",
      desc: "评教页一键五星好评并提交", default: true },
  ]},
  { group: "ehall 首页", items: [
    { key: "ehall.home_cards", name: "首页卡片增强",
      desc: "ehall 首页欢迎卡片与快捷入口美化", default: true },
  ]},
  { group: "AMS 作业", items: [
    { key: "ams.beautify", name: "AMS 美化",
      desc: "ams.nju 现代化 UI，解除图片上传 300K 前端限制", default: true },
  ]},
  { group: "智汇南雍 (LMS)", items: [
    { key: "lms.speedup", name: "首页精简提速",
      desc: "拦截臃肿 chatbot 脚本，首页替换为轻量「速览」看板", default: true },
  ]},
];

const STORAGE_KEY = "potatoplus_settings";

// 键存在于存储里就听用户的；不存在（新装/更新新增）则用 item.default（清单里均为 true → 默认开）
function isOn(map, item) {
  return (item.key in map) ? !!map[item.key] : (item.default !== false);
}

async function loadSettings() {
  const out = await browser.storage.local.get(STORAGE_KEY);
  return out[STORAGE_KEY] || {};
}

async function saveSettings(map) {
  await browser.storage.local.set({ [STORAGE_KEY]: map });
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = text;
  return e;
}

// MDC switch DOM（结构照搬 js/xk/welcome.js 的现成写法）
function buildSwitch(selected) {
  const btn = el("button", "mdc-switch " + (selected ? "mdc-switch--selected" : "mdc-switch--unselected"));
  btn.type = "button";
  btn.setAttribute("role", "switch");
  btn.setAttribute("aria-checked", selected ? "true" : "false");
  btn.innerHTML =
    '<div class="mdc-switch__track"></div>' +
    '<div class="mdc-switch__handle-track">' +
      '<div class="mdc-switch__handle">' +
        '<div class="mdc-switch__shadow"><div class="mdc-elevation-overlay"></div></div>' +
        '<div class="mdc-switch__ripple"></div>' +
      '</div>' +
    '</div>' +
    '<span class="mdc-switch__focus-ring-wrapper"><div class="mdc-switch__focus-ring"></div></span>';
  return btn;
}

const conditionalRows = [];

function buildRow(item, settings) {
  const row = el("div", "pp-row");

  const text = el("div", "pp-row__text");
  text.appendChild(el("div", "pp-row__name", item.name));
  if (item.desc) text.appendChild(el("p", "pp-row__desc", item.desc));
  row.appendChild(text);

  const selected = isOn(settings, item);
  const btn = buildSwitch(selected);
  const switchWrap = el("div", "pp-row__switch");
  switchWrap.appendChild(btn);
  row.appendChild(switchWrap);

  // 手动实例化 MDC 开关（不用 data-mdc-auto-init）
  const mdcSwitch = new window.mdc.switchControl.MDCSwitch(btn);
  mdcSwitch.selected = selected;

  // 条件显示：如红黑榜仅在「美化」关闭时出现
  if (item.showWhen) {
    conditionalRows.push({ row: row, item: item });
    if (!item.showWhen(settings)) row.style.display = "none";
  }

  // 点击后 MDC 已自动翻转 selected；重新读取存储并写入新状态，再刷新条件行可见性
  btn.addEventListener("click", async () => {
    const fresh = await loadSettings();
    fresh[item.key] = mdcSwitch.selected;
    await saveSettings(fresh);
    refreshVisibility(fresh);
  });

  return row;
}

// 切换某开关后，重算所有带 showWhen 的行（美化开关联动红黑榜行的显隐）
function refreshVisibility(settings) {
  conditionalRows.forEach(function (cr) {
    cr.row.style.display = cr.item.showWhen(settings) ? "" : "none";
  });
}

function buildGroup(group) {
  const sec = el("section", "pp-group");
  sec.appendChild(el("h2", "pp-group__title", group.group));
  sec.appendChild(el("div", "pp-group__list"));
  return sec;
}

// --- 升级提醒：用 bulletin iframe（同 home.js / init.js 的 potatoplus-bulletin）取 latest_version；
//     isUpdateAvailable 同 core.js；dismissed 存 chrome.storage.local ---
const BULLETIN_URL = "https://potatoplus.zcec.top/apps/potatoplus-bulletin/";
const UPDATE_URL = "https://potatoplus.zcec.top/#install";
const DISMISSED_KEY = "potatoplus_update_dismissed";

function isUpdateAvailable(latest, running) {
  if (!latest || !running) return false;
  const a = String(latest).replace(/^v/i, "").split(".").map(Number);
  const b = String(running).replace(/^v/i, "").split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

// 隐藏 iframe 加载 bulletin 页，它 postMessage("*") 回 {type:"bulletin", latest_version}（同 home.js）。
// 8s 超时则放弃、不报错。
function fetchLatestVersion(runningVersion) {
  return new Promise((resolve) => {
    let done = false;
    const iframe = document.createElement("iframe");
    iframe.src = BULLETIN_URL + "?version=" + encodeURIComponent(runningVersion) + "&site=options";
    iframe.width = "0";
    iframe.height = "0";
    iframe.style.display = "none";
    function finish(val) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      iframe.remove();
      resolve(val);
    }
    function onMessage(e) {
      if (e.origin !== "https://potatoplus.zcec.top") return;
      let data = {};
      try { data = JSON.parse(e.data); } catch (_) { return; }
      if (data && data.type === "bulletin") finish(data.latest_version || null);
    }
    const timer = setTimeout(() => finish(null), 8000);
    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}

function showUpdateNotice(latest) {
  const root = document.getElementById("pp-options-groups");
  if (!root) return;
  const old = document.getElementById("pp-update-notice");
  if (old) old.remove();
  const notice = el("div", "pp-update-notice");
  notice.id = "pp-update-notice";
  notice.appendChild(el("div", "pp-update-notice__text", "🆕 发现新版本 v" + latest));
  const link = el("a", "pp-update-notice__link", "查看更新");
  link.href = UPDATE_URL;
  link.target = "_blank";
  const close = el("span", "pp-update-notice__close", "✕");
  close.title = "忽略此版本";
  close.addEventListener("click", async () => {
    await browser.storage.local.set({ [DISMISSED_KEY]: latest });
    notice.remove();
  });
  notice.appendChild(link);
  notice.appendChild(close);
  root.parentNode.insertBefore(notice, root);
}

async function checkAndShowUpdate(runningVersion) {
  const latest = await fetchLatestVersion(runningVersion);
  if (!isUpdateAvailable(latest, runningVersion)) return;
  const dismissed = (await browser.storage.local.get(DISMISSED_KEY))[DISMISSED_KEY];
  if (dismissed === latest) return;
  showUpdateNotice(latest);
}

async function init() {
  const runningVersion = browser.runtime.getManifest().version;
  const versionEl = document.getElementById("pp-options-version");
  if (versionEl) versionEl.textContent = runningVersion;

  const settings = await loadSettings();
  const root = document.getElementById("pp-options-groups");
  root.innerHTML = "";
  conditionalRows.length = 0; // 重新渲染前清掉旧引用
  for (const g of FEATURES) {
    const sec = buildGroup(g);
    const list = sec.querySelector(".pp-group__list");
    for (const item of g.items) list.appendChild(buildRow(item, settings));
    root.appendChild(sec);
  }

  checkAndShowUpdate(runningVersion); // 不 await：不阻塞页面渲染，有更新才弹
}

document.addEventListener("DOMContentLoaded", init);
