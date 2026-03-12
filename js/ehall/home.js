// ehall/home.js - ehall 首页注入 PotatoPlus 欢迎卡片 + 菜单卡片
// 注入位置: .hall > .body 内, .role-matter 之前

(function () {
  "use strict";

  // 登录后默认跳首页(#/)，劫持到办事大厅(#/hall)让卡片正常注入
  if (location.hash === "#/" || location.hash === "" || location.hash === "#") {
    location.hash = "#/hall";
    // 不 return，继续往下走等 MutationObserver 捕获 .hall > .body
  }

  // ehall appShow 入口（需登录态才能正确跳转到子应用）
  var EHALL_BASE = "https://ehall.nju.edu.cn/appShow?appId=";
  var APP_GRADE = EHALL_BASE + "4768574631264620";   // 成绩查询
  var APP_EVAL  = EHALL_BASE + "5856333445645704";   // 本-网上评教
  var APP_XK    = "https://xk.nju.edu.cn/";          // 选课

  var APP_COURSES = EHALL_BASE + "4766960573884517"; // 查询全部课程

  var CSS = `
    /* ===== 容器：纵向堆叠，全宽 ===== */
    .pp-home-container {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin: 20px auto;
      max-width: 1200px;
      padding: 0 24px;
    }
    @media (max-width: 768px) {
      .pp-home-container { padding: 0 12px; }
    }

    /* ===== 功能卡片 — 紫蓝渐变 + 磨砂 ===== */
    .pp-menu-card {
      background: linear-gradient(-70deg, rgba(154, 110, 179, .85), rgba(67, 126, 202, .85));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 22px 28px;
      color: rgba(255,255,255,.9);
      width: 100%;
      box-sizing: border-box;
    }
    /* 上半：日期 + 学期/教学周 左边，课表按钮右边 */
    .pp-menu-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    .pp-menu-date {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .pp-menu-semester {
      font-size: 14px;
      color: rgba(255,255,255,.7);
      margin-right: 8px;
    }
    .pp-menu-week {
      font-size: 16px;
      color: rgba(255,255,255,.8);
    }
    .pp-menu-sub {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
    }
    /* 下半：按钮横排 */
    .pp-menu-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .pp-menu-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 14px;
      padding: 10px 20px;
      font-size: 14px;
      color: white;
      border: none;
      cursor: pointer;
      font-family: inherit;
      text-decoration: none;
      transition: all .2s ease;
      background: rgba(255,255,255,.18);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .pp-menu-btn:hover {
      background: rgba(255,255,255,.32);
      color: white;
      text-decoration: none;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,.15);
    }
    .pp-menu-btn-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    /* 课表按钮 */
    .pp-sched-open {
      background: rgba(255,255,255,.18);
      border: none;
      color: rgba(255,255,255,.9);
      cursor: pointer;
      font-size: 14px;
      padding: 8px 16px;
      border-radius: 12px;
      transition: all .15s;
      white-space: nowrap;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .pp-sched-open:hover {
      background: rgba(255,255,255,.32);
      color: #fff;
      transform: translateY(-1px);
    }

    /* ===== 信息卡片 — 深灰蓝 + 磨砂 ===== */
    .pp-welcome-card {
      background: rgba(75, 94, 123, .85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 22px 28px;
      color: rgba(255,255,255,.82);
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .pp-welcome-line {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 5px 0;
      font-size: 15px;
      line-height: 1.6;
    }
    .pp-welcome-line .pp-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .pp-welcome-line.bulletin .pp-icon,
    .pp-welcome-line.bulletin span {
      color: #8ecafc;
    }
    .pp-welcome-spacer {
      flex: 1;
    }
    .pp-welcome-links {
      font-size: 12px;
      color: rgba(255,255,255,.65);
      margin-top: 10px;
    }
    .pp-welcome-links a {
      color: rgba(255,255,255,.65);
      text-decoration: none;
      margin: 0 5px;
      transition: color .15s;
    }
    .pp-welcome-links a:first-child { margin-left: 0; }
    .pp-welcome-links a:hover { color: white; }
  `;

  function injectCSS() {
    if (document.getElementById("pp-home-style")) return;
    var s = document.createElement("style");
    s.id = "pp-home-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function getDateString() {
    var d = new Date();
    var days = ["日", "一", "二", "三", "四", "五", "六"];
    return (d.getMonth() + 1) + "月" + d.getDate() + "日 星期" + days[d.getDay()];
  }

  function getSemesterName() {
    try {
      var cache = JSON.parse(localStorage.getItem("potatoplus_schedule_cache"));
      if (cache && cache.termName) return cache.termName;
    } catch (e) {}
    return "";
  }

  function getWeekString() {
    // 从缓存获取教学周
    try {
      var cache = JSON.parse(localStorage.getItem("potatoplus_schedule_cache"));
      if (cache && cache.semesterStartMonday) {
        return formatWeek(cache.semesterStartMonday);
      }
    } catch (e) {}
    // 无缓存，异步获取
    fetchWeekAsync();
    return "";
  }

  function formatWeek(startMonday) {
    var start = new Date(startMonday);
    var now = new Date();
    var day = now.getDay(); var diff = day === 0 ? -6 : 1 - day;
    var nowMon = new Date(now); nowMon.setDate(nowMon.getDate() + diff); nowMon.setHours(0,0,0,0);
    var sday = start.getDay(); var sdiff = sday === 0 ? -6 : 1 - sday;
    var startMon = new Date(start); startMon.setDate(startMon.getDate() + sdiff); startMon.setHours(0,0,0,0);
    var week = Math.floor((nowMon - startMon) / (7 * 24 * 3600 * 1000)) + 1;
    return week >= 1 ? "第" + week + "周" : "";
  }

  function fetchWeekAsync() {
    // 通过 postMessage -> bridge -> background 获取
    var reqId = "week-" + Date.now();
    function handler(event) {
      if (event.source !== window) return;
      if (!event.data || event.data.type !== "pp-schedule-response") return;
      if (event.data.reqId !== reqId) return;
      window.removeEventListener("message", handler);
      var resp = event.data.data;
      if (!resp || resp.error) return;
      var obj = {timestamp: Date.now(), courses: resp.courses, termName: resp.termName};
      if (resp.semesterStartMonday) obj.semesterStartMonday = resp.semesterStartMonday;
      localStorage.setItem("potatoplus_schedule_cache", JSON.stringify(obj));
      if (resp.semesterStartMonday) {
        var el = document.querySelector(".pp-menu-week");
        if (el) el.textContent = formatWeek(resp.semesterStartMonday);
      }
      if (resp.termName) {
        var semEl = document.querySelector(".pp-menu-semester");
        if (semEl) semEl.textContent = resp.termName;
      }
    }
    window.addEventListener("message", handler);
    window.postMessage({type: "pp-schedule-request", reqId: reqId, force: false}, "*");
  }

  function buildCards() {
    var container = document.createElement("div");
    container.className = "pp-home-container";
    container.id = "pp-home-container";

    // --- 功能卡片（上）：日期 + 学期/教学周 + 横排按钮 ---
    var menu = document.createElement("div");
    menu.className = "pp-menu-card";
    menu.innerHTML = `
      <div class="pp-menu-header">
        <div>
          <div class="pp-menu-date">${getDateString()}</div>
          <div class="pp-menu-sub">
            <span class="pp-menu-semester">${getSemesterName()}</span>
            <span class="pp-menu-week">${getWeekString()}</span>
          </div>
        </div>
        <button class="pp-sched-open" id="pp-schedule-btn" title="查看课表">📅 课表</button>
      </div>
      <div class="pp-menu-buttons">
        <a class="pp-menu-btn" href="${APP_GRADE}" target="_blank">
          <span class="pp-menu-btn-icon">📊</span>
          成绩查询
        </a>
        <a class="pp-menu-btn" href="${APP_XK}" target="_blank">
          <span class="pp-menu-btn-icon">📚</span>
          选课
        </a>
        <a class="pp-menu-btn" href="${APP_EVAL}" target="_blank">
          <span class="pp-menu-btn-icon">📝</span>
          一键评教
        </a>
        <a class="pp-menu-btn" href="${APP_COURSES}" target="_blank">
          <span class="pp-menu-btn-icon">🔍</span>
          查询全部课程
        </a>
      </div>
    `;

    // --- 信息卡片（下）---
    var welcome = document.createElement("div");
    welcome.className = "pp-welcome-card";

    var version = "";
    try { version = window.pjw && pjw.version ? pjw.version : ""; } catch(e) {}

    welcome.innerHTML = `
      <div class="pp-welcome-line">
        <span class="pp-icon" style="color: #4caf50;">✓</span>
        <span>PotatoPlus ${version ? "v" + version + " " : ""}已加载</span>
      </div>
      <div class="pp-welcome-line bulletin">
        <span class="pp-icon">📡</span>
        <div id="pp-home-bulletin">${(window.pjw && pjw.data && pjw.data.bulletin_content) || ""}</div>
      </div>
      <div class="pp-welcome-spacer"></div>
      <div class="pp-welcome-links">
        <a href="https://potatoplus.zcec.top/potatoplus" target="_blank">PotatoPlus ${version ? "v" + version : ""}</a>
        <a href="https://github.com/GreenTeodoro839/PotatoPlus" target="_blank">GitHub</a>
        <a href="https://potatoplus.zcec.top/potato-mailing-list/" target="_blank">加入邮件列表</a>
      </div>
    `;

    container.appendChild(menu);
    container.appendChild(welcome);
    return container;
  }

  function getBulletin() {
    if (!window.pjw) return;
    if ((pjw.data.bulletin_update_timestamp || 0) + 300000 > new Date().getTime()) return;

    var iframe = document.createElement("iframe");
    iframe.src = "https://potatoplus.zcec.top/apps/potatoplus-bulletin/?version=" +
      encodeURIComponent(pjw.version || "") +
      "&share_stats=" + ((pjw.preferences.share_usage_data || (pjw.preferences.login_settings && pjw.preferences.login_settings.share_stats)) ? 1 : 0) +
      "&site=ehall";
    iframe.width = "300";
    iframe.height = "300";
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    function bulletinHandler(e) {
      if (e.origin !== "https://potatoplus.zcec.top") return;
      if (e.data) {
        try {
          var data = JSON.parse(e.data);
          if (data.type === "bulletin") {
            pjw.data.bulletin_content = data.content;
            pjw.data.bulletin_update_timestamp = new Date().getTime();
            var el = document.getElementById("pp-home-bulletin");
            if (el) el.innerHTML = data.content;
            window.removeEventListener("message", bulletinHandler);
          }
        } catch (err) {
          console.warn("[PotatoPlus] bulletin parse error:", err);
        }
      }
    }
    window.addEventListener("message", bulletinHandler);
  }

  function inject() {
    // DOM 结构（登录态）: .main > .body > .hall > .body > .role-matter
    // DOM 结构（未登录）: .hall > .body > .role-matter
    // 统一找最内层的 .hall > .body，在 .role-matter 之前注入
    var body = document.querySelector(".hall > .body");
    var roleMatter = body ? body.querySelector(".role-matter") : null;
    if (!body) return false;

    // 避免重复注入
    if (document.getElementById("pp-home-container")) return true;

    injectCSS();
    var cards = buildCards();
    if (roleMatter) {
      body.insertBefore(cards, roleMatter);
    } else {
      body.insertBefore(cards, body.firstChild);
    }
    getBulletin();

    // 课表按钮绑定
    var schedBtn = document.getElementById("pp-schedule-btn");
    if (schedBtn) {
      schedBtn.addEventListener("click", function () {
        if (window.ppSchedule) window.ppSchedule.open();
        else console.warn("[PotatoPlus] schedule.js 未加载");
      });
    }

    console.log("[PotatoPlus] ehall 首页卡片已注入");
    return true;
  }

  // 持久 MutationObserver：只要 #/hall 且卡片不存在就注入，永不 disconnect
  // 解决 SPA 路由切换后 Vue 重绘导致卡片消失问题
  var _injecting = false;
  var persistObserver = new MutationObserver(function () {
    if (_injecting) return;
    var hash = location.hash;
    if (hash !== "#/hall" && hash !== "#/" && hash !== "" && hash !== "#") return;
    if (document.getElementById("pp-home-container")) return;
    _injecting = true;
    // 等 Vue 完成本次渲染再注入
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        inject();
        _injecting = false;
      });
    });
  });
  persistObserver.observe(document.documentElement, { childList: true, subtree: true });

  // 首次注入尝试
  inject();
})();
