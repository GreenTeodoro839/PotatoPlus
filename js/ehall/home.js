// ehall/home.js - ehall 首页注入 PotatoPlus 欢迎卡片 + 菜单卡片
// 注入位置: .hall 容器内, .role-matter 之前

(function () {
  "use strict";

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

    /* 菜单卡片 */
    .pp-menu-card {
      background: linear-gradient(-70deg, rgb(154, 110, 179), rgb(67, 126, 202));
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
      transition: filter .15s;
    }
    .pp-menu-btn:hover {
      filter: brightness(1.1);
      color: white;
      text-decoration: none;
    }
    .pp-menu-btn.primary {
      background: rgb(30, 50, 180);
    }
    .pp-menu-btn.secondary {
      background: rgba(255,255,255,.2);
    }
    .pp-menu-btn-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    .pp-menu-btn-inset {
      margin-left: auto;
      background: white;
      color: rgb(30, 50, 180);
      border-radius: 10px;
      padding: 4px 12px;
      font-size: 13px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      font-family: inherit;
      transition: filter .15s;
    }
    .pp-menu-btn-inset:hover {
      filter: brightness(.95);
      color: rgb(30, 50, 180);
      text-decoration: none;
    }

    /* 欢迎卡片 */
    .pp-welcome-card {
      background: #4b5e7b;
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
    // 占位符，后续替换为实际教学周获取逻辑
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
      <div class="pp-menu-date">${getDateString()}</div>
      <div class="pp-menu-week">${getWeekString()}</div>
      <div class="pp-menu-buttons">
        <a class="pp-menu-btn primary" href="https://ehallapp.nju.edu.cn/jwapp/sys/cjcx/" target="_blank">
          <span class="pp-menu-btn-icon">📊</span>
          成绩查询
          <a class="pp-menu-btn-inset" href="https://xk.nju.edu.cn/" target="_blank">＋ 选课</a>
        </a>
        <a class="pp-menu-btn secondary" href="https://ehallapp.nju.edu.cn/jwapp/sys/wspjyyapp/" target="_blank">
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
        <span class="pp-icon" style="color: #6ddf6d;">✓</span>
        <span>PotatoPlus ${version ? "v" + version + " " : ""}已加载</span>
      </div>
      <div class="pp-welcome-line bulletin">
        <span class="pp-icon">📡</span>
        <span id="pp-home-bulletin">${(window.pjw && pjw.data && pjw.data.bulletin_content) || ""}</span>
      </div>
      <div class="pp-welcome-spacer"></div>
      <div class="pp-welcome-links">
        <a href="https://cubiccm.ddns.net/potatoplus" target="_blank">PotatoPlus ${version ? "v" + version : ""}</a>
        <a href="https://github.com/GreenTeodoro839/PotatoPlus" target="_blank">GitHub</a>
        <a href="https://cubiccm.ddns.net/potato-mailing-list/" target="_blank">加入邮件列表</a>
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
    iframe.src = "https://cubiccm.ddns.net/apps/potatoplus-bulletin/?version=" +
      encodeURIComponent(pjw.version || "") +
      "&share_stats=" + ((pjw.preferences.share_usage_data || (pjw.preferences.login_settings && pjw.preferences.login_settings.share_stats)) ? 1 : 0) +
      "&site=ehall";
    iframe.width = "300";
    iframe.height = "300";
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    window.addEventListener("message", function handler(e) {
      if (e.origin !== "https://cubiccm.ddns.net") return;
      if (e.data) {
        try {
          var data = JSON.parse(e.data);
          if (data.type === "bulletin") {
            pjw.data.bulletin_content = data.content;
            pjw.data.bulletin_update_timestamp = new Date().getTime();
            var el = document.getElementById("pp-home-bulletin");
            if (el) el.innerHTML = data.content;
          }
        } catch (err) {
          console.warn("[PotatoPlus] bulletin parse error:", err);
        }
      }
    });
  }

  function inject() {
    // 等待 .hall 和 .role-matter 都渲染完
    var hall = document.querySelector(".hall");
    var roleMatter = document.querySelector(".role-matter");
    if (!hall || !roleMatter) return false;

    // 避免重复注入
    if (document.getElementById("pp-home-container")) return true;

    injectCSS();
    var cards = buildCards();
    hall.insertBefore(cards, roleMatter);
    getBulletin();
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
