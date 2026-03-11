// ehall/home.js - ehall 首页注入 PotatoPlus 欢迎卡片 + 菜单卡片
// 注入位置: .hall > .body 内, .role-matter 之前

(function () {
  "use strict";

  // ehall appShow 入口（需登录态才能正确跳转到子应用）
  var EHALL_BASE = "https://ehall.nju.edu.cn/appShow?appId=";
  var APP_GRADE = EHALL_BASE + "4768574631264620";   // 成绩查询
  var APP_EVAL  = EHALL_BASE + "5856333445645704";   // 本-网上评教
  var APP_XK    = "https://xk.nju.edu.cn/";          // 选课

  var CSS = `
    .pp-home-container {
      display: flex;
      gap: 16px;
      margin: 20px auto;
      max-width: 1200px;
      padding: 0 24px;
    }
    @media (max-width: 768px) {
      .pp-home-container {
        flex-direction: column;
        padding: 0 12px;
      }
    }

    /* 菜单卡片 — 紫蓝渐变 + 磨砂 */
    .pp-menu-card {
      background: linear-gradient(-70deg, rgba(154, 110, 179, .85), rgba(67, 126, 202, .85));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 22px 28px;
      color: rgba(255,255,255,.9);
      flex: 1;
      min-width: 0;
    }
    .pp-menu-date {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .pp-menu-week {
      font-size: 16px;
      color: rgba(255,255,255,.8);
      margin-bottom: 18px;
    }
    .pp-menu-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .pp-menu-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      border-radius: 14px;
      padding: 11px 18px;
      font-size: 15px;
      color: white;
      border: none;
      cursor: pointer;
      font-family: inherit;
      text-decoration: none;
      transition: all .2s ease;
      background: rgba(255,255,255,.2);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .pp-menu-btn:hover {
      background: rgba(255,255,255,.35);
      color: white;
      text-decoration: none;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,.15);
    }
    .pp-menu-btn-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    /* 欢迎卡片 — 深灰蓝 + 磨砂 */
    .pp-welcome-card {
      background: rgba(75, 94, 123, .85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 22px 28px;
      color: rgba(255,255,255,.82);
      flex: 1;
      min-width: 0;
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
    .pp-welcome-links a:first-child {
      margin-left: 0;
    }
    .pp-welcome-links a:hover {
      color: white;
    }
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

  function getWeekString() {
    // 尝试从缓存获取教学周信息
    try {
      var cache = JSON.parse(localStorage.getItem("potatoplus_schedule_cache"));
      if (cache && cache.semesterStartMonday) {
        var start = new Date(cache.semesterStartMonday);
        var now = new Date();
        // 回退到本周一
        var day = now.getDay(); var diff = day === 0 ? -6 : 1 - day;
        var nowMon = new Date(now); nowMon.setDate(nowMon.getDate() + diff); nowMon.setHours(0,0,0,0);
        var startMon = new Date(start); var sday = startMon.getDay(); var sdiff = sday === 0 ? -6 : 1 - sday;
        startMon.setDate(startMon.getDate() + sdiff); startMon.setHours(0,0,0,0);
        var week = Math.floor((nowMon - startMon) / (7 * 24 * 3600 * 1000)) + 1;
        if (week >= 1) return "第" + week + "周";
      }
    } catch (e) {}
    return "教学周";
  }

  function buildCards() {
    var container = document.createElement("div");
    container.className = "pp-home-container";
    container.id = "pp-home-container";

    // --- 菜单卡片 ---
    var menu = document.createElement("div");
    menu.className = "pp-menu-card";
    menu.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="pp-menu-date">${getDateString()}</div>
        <button class="pp-sched-open" id="pp-schedule-btn" title="查看课表">📅 课表</button>
      </div>
      <div class="pp-menu-week">${getWeekString()}</div>
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
      </div>
    `;

    // --- 欢迎卡片 ---
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
        <span id="pp-home-bulletin">${(window.pjw && pjw.data && pjw.data.bulletin_content) || ""}</span>
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
    // 实际 DOM: .hall > .body > .role-matter
    // 在 .body 内、.role-matter 之前注入
    var body = document.querySelector(".hall > .body");
    var roleMatter = document.querySelector(".hall > .body > .role-matter");
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

  // SPA：用 MutationObserver 等待 DOM 就绪
  if (inject()) return;

  var observer = new MutationObserver(function () {
    if (inject()) {
      observer.disconnect();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // 超时兜底
  setTimeout(function () {
    observer.disconnect();
    inject();
  }, 15000);
})();
