// ehall/grade.js - ehall 成绩查询增强 (ehallapp.nju.edu.cn/jwapp/sys/cjcx/*)
// 注入浮动按钮，点击后获取全部成绩并展示 GPA 计算器面板

(function() {
  "use strict";

  var PREFS_KEY = "potatoplus_grade_prefs";

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    } catch(e) {
      return {};
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch(e) {}
  }

  // --- CSS ---
  var CSS = `
    #pp-grade-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      background-color: #90138b;
      color: #fff;
      padding: 12px 24px;
      border-radius: 28px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(144,19,139,0.4);
      transition: all 0.3s ease;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #pp-grade-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(144,19,139,0.5);
    }
    #pp-grade-overlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    }
    #pp-grade-panel {
      background: #fff;
      border-radius: 20px;
      max-width: 900px;
      width: 95vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.25);
    }
    #pp-grade-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid #f0e0ef;
      flex-shrink: 0;
    }
    #pp-grade-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    #pp-grade-title {
      font-size: 20px;
      font-weight: 700;
      color: #63065f;
    }
    #pp-grade-close {
      cursor: pointer;
      font-size: 22px;
      color: #999;
      line-height: 1;
      padding: 4px 8px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    #pp-grade-close:hover {
      background: #f5f5f5;
      color: #333;
    }
    #pp-grade-gpa-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    #pp-grade-gpa-display {
      font-size: 14px;
      color: #555;
      flex: 1;
    }
    #pp-grade-gpa-display strong {
      font-size: 20px;
      color: #90138b;
      font-weight: 700;
    }
    .pp-grade-btn-sm {
      padding: 5px 14px;
      border-radius: 20px;
      border: 1.5px solid #90138b;
      background: transparent;
      color: #90138b;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .pp-grade-btn-sm:hover {
      background: #90138b;
      color: #fff;
    }
    #pp-grade-body {
      overflow-y: auto;
      padding: 16px 24px 24px;
      flex: 1;
    }
    .pp-semester-header {
      font-size: 15px;
      font-weight: 700;
      color: #63065f;
      margin: 20px 0 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #f0e0ef;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pp-semester-header:first-child {
      margin-top: 0;
    }
    .pp-sem-btns {
      display: flex;
      gap: 6px;
    }
    .pp-sem-btn {
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 12px;
      border: 1px solid #90138b;
      background: transparent;
      color: #90138b;
      cursor: pointer;
      font-weight: 500;
    }
    .pp-sem-btn:hover {
      background: #90138b;
      color: #fff;
    }
    .pp-course-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 12px;
      border: 1.5px dotted #63065f;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    .pp-course-card:hover {
      border-style: solid;
      border-color: #90138b;
    }
    .pp-course-card.pp-selected {
      border-style: solid;
      border-color: #90138b;
      background: #90138b;
      color: #fff;
    }
    .pp-course-card.pp-selected .pp-course-type {
      background: rgba(255,255,255,0.25);
      color: #fff;
    }
    .pp-course-card.pp-selected .pp-course-score {
      color: #ffd;
    }
    .pp-course-name {
      font-weight: 600;
      font-size: 14px;
      flex: 1;
      min-width: 0;
    }
    .pp-course-type {
      font-size: 11px;
      background: #f5eaff;
      color: #63065f;
      padding: 2px 8px;
      border-radius: 10px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .pp-course-meta {
      font-size: 12px;
      color: #888;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .pp-course-card.pp-selected .pp-course-meta {
      color: rgba(255,255,255,0.75);
    }
    .pp-course-score {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      white-space: nowrap;
      flex-shrink: 0;
      min-width: 60px;
      text-align: right;
    }
    .pp-course-score.pp-hidden {
      filter: blur(4px);
      transition: filter 0.2s;
    }
    .pp-course-card:hover .pp-course-score.pp-hidden {
      filter: none;
    }
    .pp-course-checkbox {
      width: 16px;
      height: 16px;
      accent-color: #90138b;
      cursor: pointer;
      flex-shrink: 0;
    }
    .pp-course-card.pp-selected .pp-course-checkbox {
      accent-color: #fff;
    }
    #pp-grade-loading {
      text-align: center;
      padding: 48px 0;
      color: #999;
      font-size: 15px;
    }
    #pp-grade-error {
      text-align: center;
      padding: 32px 0;
      color: darkred;
      font-size: 14px;
    }
    .pp-course-pass-no {
      color: darkred;
      font-size: 12px;
      flex-shrink: 0;
    }
    .pp-course-card.pp-selected .pp-course-pass-no {
      color: #ffaaaa;
    }
  `;

  function injectCSS() {
    if (document.getElementById("pp-grade-style")) return;
    var style = document.createElement("style");
    style.id = "pp-grade-style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // --- Auto Open ---
  function autoOpenWhenReady() {
    var attempts = 0;
    function tryOpen() {
      attempts++;
      var container = document.querySelector(".bh-container") || document.querySelector("[data-pageid]") || document.body;
      if (!container && attempts < 30) {
        setTimeout(tryOpen, 500);
        return;
      }
      injectCSS();
      openPanel();
      console.log("[PotatoPlus] 成绩查询面板已自动打开");
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() { setTimeout(tryOpen, 1000); });
    } else {
      setTimeout(tryOpen, 1000);
    }
  }

  // --- Panel State ---
  var overlayEl = null;
  var allCourses = []; // [{semester, semDisplay, ...fields}]
  var selectedIds = new Set();
  var hideScores = true;

  // --- API ---
  function getRoleId() {
    try {
      return window._JW_INIT_CONFIG && window._JW_INIT_CONFIG.ROLEID;
    } catch(e) { return null; }
  }

  function changeAppRole(roleId) {
    return fetch("/jwapp/sys/funauthapp/api/changeAppRole/cjcx/" + encodeURIComponent(roleId) + ".do", {
      method: "POST",
      credentials: "include",
    });
  }

  function fetchGrades() {
    var body = new URLSearchParams({
      "querySetting": JSON.stringify([{"name":"SFYX","value":"1","linkOpt":"AND","builder":"m_value_equal"}]),
      "*order": "-XNXQDM,-KCH,-KXH",
      "pageSize": "500",
      "pageNumber": "0"
    });
    return fetch("/jwapp/sys/cjcx/modules/cjcx/xscjcx.do", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }).then(function(r) { return r.json(); });
  }

  // --- Render ---
  function calcGPA() {
    var totalW = 0, totalC = 0;
    allCourses.forEach(function(c, i) {
      if (selectedIds.has(i)) {
        var xf = parseFloat(c.XF) || 0;
        var zcj = parseFloat(c.ZCJ);
        // 只有百分制(DJCJLXDM=100)才计入学分绩，通过/不通过(200)等不计入
        if (xf > 0 && !isNaN(zcj) && String(c.DJCJLXDM) === "100") {
          totalC += xf;
          totalW += (zcj / 20) * xf;
        }
      }
    });
    var gpaEl = document.getElementById("pp-grade-gpa-display");
    if (!gpaEl) return;
    if (totalC === 0) {
      gpaEl.innerHTML = "选择课程以计算学分绩";
    } else {
      var gpa = totalW / totalC;
      gpaEl.innerHTML = "已选 " + selectedIds.size + " 门 / " + totalC.toFixed(1) + " 学分 &nbsp; 加权平均学分绩: <strong>" + gpa.toFixed(4) + "</strong>";
    }
  }

  function toggleCard(idx) {
    if (selectedIds.has(idx)) {
      selectedIds.delete(idx);
    } else {
      selectedIds.add(idx);
    }
    // update card visual
    var card = document.querySelector(".pp-course-card[data-idx='" + idx + "']");
    if (card) {
      var cb = card.querySelector(".pp-course-checkbox");
      if (selectedIds.has(idx)) {
        card.classList.add("pp-selected");
        if (cb) cb.checked = true;
      } else {
        card.classList.remove("pp-selected");
        if (cb) cb.checked = false;
      }
    }
    calcGPA();
    savePrefs(Object.assign(loadPrefs(), { selectedIds: Array.from(selectedIds) }));
  }

  function buildCourseCard(c, idx) {
    var card = document.createElement("div");
    card.className = "pp-course-card" + (selectedIds.has(idx) ? " pp-selected" : "");
    card.dataset.idx = idx;

    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "pp-course-checkbox";
    cb.checked = selectedIds.has(idx);
    cb.addEventListener("click", function(e) { e.stopPropagation(); toggleCard(idx); });

    var nameEl = document.createElement("div");
    nameEl.className = "pp-course-name";
    nameEl.textContent = c.XSKCM || c.KCH;

    var typeEl = document.createElement("div");
    typeEl.className = "pp-course-type";
    typeEl.textContent = c.KCXZDM_DISPLAY || "";

    var metaEl = document.createElement("div");
    metaEl.className = "pp-course-meta";
    metaEl.textContent = (c.XF || "?") + " 学分";

    var scoreText = "";
    if (c.ZCJ != null && c.ZCJ !== "") {
      scoreText = c.ZCJ;
      if (c.DJCJMC) scoreText += " (" + c.DJCJMC + ")";
    } else if (c.DJCJMC) {
      scoreText = c.DJCJMC;
    } else {
      scoreText = "--";
    }
    var scoreEl = document.createElement("div");
    scoreEl.className = "pp-course-score" + (hideScores ? " pp-hidden" : "");
    scoreEl.textContent = scoreText;

    card.appendChild(cb);
    card.appendChild(nameEl);
    card.appendChild(typeEl);
    card.appendChild(metaEl);

    if (c.SFJG_DISPLAY && c.SFJG_DISPLAY !== "是" && c.SFJG_DISPLAY !== "通过") {
      var passEl = document.createElement("div");
      passEl.className = "pp-course-pass-no";
      passEl.textContent = "不及格";
      card.appendChild(passEl);
    }

    card.appendChild(scoreEl);

    card.addEventListener("click", function(e) {
      if (e.target === cb) return;
      toggleCard(idx);
    });

    return card;
  }

  function renderCourses() {
    var body = document.getElementById("pp-grade-body");
    if (!body) return;
    body.innerHTML = "";

    if (allCourses.length === 0) {
      body.innerHTML = "<div id='pp-grade-error'>没有找到成绩数据</div>";
      return;
    }

    // Group by semester
    var semesters = [];
    var semMap = {};
    allCourses.forEach(function(c, idx) {
      var key = c.XNXQDM;
      if (!semMap[key]) {
        semMap[key] = { key: key, display: c.XNXQDM_DISPLAY || key, courses: [] };
        semesters.push(semMap[key]);
      }
      semMap[key].courses.push({ c: c, idx: idx });
    });

    semesters.forEach(function(sem) {
      var hdr = document.createElement("div");
      hdr.className = "pp-semester-header";

      var title = document.createElement("span");
      title.textContent = sem.display;

      var btns = document.createElement("span");
      btns.className = "pp-sem-btns";

      var selBtn = document.createElement("button");
      selBtn.className = "pp-sem-btn";
      selBtn.textContent = "全选";
      selBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        sem.courses.forEach(function(item) {
          if (!selectedIds.has(item.idx)) {
            selectedIds.add(item.idx);
            var card = document.querySelector('.pp-course-card[data-idx="' + item.idx + '"]');
            if (card) { card.classList.add("pp-selected"); var cb = card.querySelector("input"); if (cb) cb.checked = true; }
          }
        });
        calcGPA();
        savePrefs(Object.assign(loadPrefs(), { selectedIds: Array.from(selectedIds) }));
      });

      var deselBtn = document.createElement("button");
      deselBtn.className = "pp-sem-btn";
      deselBtn.textContent = "全不选";
      deselBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        sem.courses.forEach(function(item) {
          if (selectedIds.has(item.idx)) {
            selectedIds.delete(item.idx);
            var card = document.querySelector('.pp-course-card[data-idx="' + item.idx + '"]');
            if (card) { card.classList.remove("pp-selected"); var cb = card.querySelector("input"); if (cb) cb.checked = false; }
          }
        });
        calcGPA();
        savePrefs(Object.assign(loadPrefs(), { selectedIds: Array.from(selectedIds) }));
      });

      btns.appendChild(selBtn);
      btns.appendChild(deselBtn);
      hdr.appendChild(title);
      hdr.appendChild(btns);
      body.appendChild(hdr);
      sem.courses.forEach(function(item) {
        body.appendChild(buildCourseCard(item.c, item.idx));
      });
    });

    calcGPA();
  }

  function setScoreVisibility(hide) {
    hideScores = hide;
    document.querySelectorAll(".pp-course-score").forEach(function(el) {
      if (hide) el.classList.add("pp-hidden");
      else el.classList.remove("pp-hidden");
    });
    savePrefs(Object.assign(loadPrefs(), { hideScores: hide }));
  }

  function openPanel() {
    if (overlayEl) return;

    overlayEl = document.createElement("div");
    overlayEl.id = "pp-grade-overlay";

    var panel = document.createElement("div");
    panel.id = "pp-grade-panel";

    // Header
    var header = document.createElement("div");
    header.id = "pp-grade-header";

    var headerTop = document.createElement("div");
    headerTop.id = "pp-grade-header-top";

    var title = document.createElement("div");
    title.id = "pp-grade-title";
    title.textContent = "PotatoPlus 成绩查询";

    var closeBtn = document.createElement("div");
    closeBtn.id = "pp-grade-close";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", closePanel);

    headerTop.appendChild(title);
    headerTop.appendChild(closeBtn);

    var gpaBar = document.createElement("div");
    gpaBar.id = "pp-grade-gpa-bar";

    var gpaDisplay = document.createElement("div");
    gpaDisplay.id = "pp-grade-gpa-display";
    gpaDisplay.textContent = "加载中...";

    var prefs = loadPrefs();
    hideScores = prefs.hideScores !== false; // default true

    var toggleScoreBtn = document.createElement("button");
    toggleScoreBtn.className = "pp-grade-btn-sm";
    toggleScoreBtn.textContent = hideScores ? "显示成绩" : "隐藏成绩";
    toggleScoreBtn.addEventListener("click", function() {
      hideScores = !hideScores;
      setScoreVisibility(hideScores);
      toggleScoreBtn.textContent = hideScores ? "显示成绩" : "隐藏成绩";
    });

    var selectAllBtn = document.createElement("button");
    selectAllBtn.className = "pp-grade-btn-sm";
    selectAllBtn.textContent = "全选";
    selectAllBtn.addEventListener("click", function() {
      allCourses.forEach(function(c, i) {
        if (parseFloat(c.XF) > 0 && c.ZCJ != null && c.ZCJ !== "" && String(c.DJCJLXDM) === "100") selectedIds.add(i);
      });
      renderCourses();
    });

    var deselectAllBtn = document.createElement("button");
    deselectAllBtn.className = "pp-grade-btn-sm";
    deselectAllBtn.textContent = "全不选";
    deselectAllBtn.addEventListener("click", function() {
      selectedIds.clear();
      renderCourses();
    });

    gpaBar.appendChild(gpaDisplay);
    gpaBar.appendChild(toggleScoreBtn);
    gpaBar.appendChild(selectAllBtn);
    gpaBar.appendChild(deselectAllBtn);

    header.appendChild(headerTop);
    header.appendChild(gpaBar);

    // Body
    var body = document.createElement("div");
    body.id = "pp-grade-body";
    body.innerHTML = "<div id='pp-grade-loading'>正在获取成绩数据，请稍候...</div>";

    panel.appendChild(header);
    panel.appendChild(body);
    overlayEl.appendChild(panel);

    overlayEl.addEventListener("click", function(e) {
      if (e.target === overlayEl) closePanel();
    });

    document.body.appendChild(overlayEl);

    // Fetch data
    var roleId = getRoleId();
    var fetchPromise = roleId
      ? changeAppRole(roleId).then(fetchGrades)
      : fetchGrades();

    fetchPromise.then(function(json) {
      var rows = (json && json.datas && json.datas.xscjcx && json.datas.xscjcx.rows) || [];
      allCourses = rows;

      // Default selection: courses with credits > 0, ZCJ != null, and 百分制
      var prefs = loadPrefs();
      if (prefs.selectedIds) {
        selectedIds = new Set(prefs.selectedIds);
      } else {
        selectedIds = new Set();
        rows.forEach(function(c, i) {
          if ((parseFloat(c.XF) || 0) > 0 && c.ZCJ != null && c.ZCJ !== "" && String(c.DJCJLXDM) === "100") {
            selectedIds.add(i);
          }
        });
      }

      renderCourses();
    }).catch(function(err) {
      var body = document.getElementById("pp-grade-body");
      if (body) body.innerHTML = "<div id='pp-grade-error'>获取成绩失败：" + (err && err.message ? err.message : String(err)) + "</div>";
      console.error("[PotatoPlus] 获取成绩失败", err);
    });
  }

  function closePanel() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
  }

  autoOpenWhenReady();
})();
