// ehall/grade-visualizer.js - 成绩页顶部可视化面板
// Derived from YifeiZhang0508/SmewinGPAPlug-in content.js (MIT License).
// Copyright (c) 2026 Yifei Zhang.

(function () {
  "use strict";

  var PREFS_KEY = "potatoplus_grade_visualizer_prefs";
  var GRADUATION_GOAL = 150;
  var rowsCache = null;
  var progressChart = null;
  var trendChart = null;

  function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function parseNumber(v) {
    if (v == null || v === "") return NaN;
    return parseFloat(String(v).replace(/[^\d.-]/g, ""));
  }

  function getRoleId() {
    try {
      return window._JW_INIT_CONFIG && window._JW_INIT_CONFIG.ROLEID;
    } catch (e) {
      return null;
    }
  }

  function changeAppRole(roleId) {
    return fetch("/jwapp/sys/funauthapp/api/changeAppRole/cjcx/" + encodeURIComponent(roleId) + ".do", {
      method: "POST",
      credentials: "include",
    });
  }

  function fetchGrades() {
    var body = new URLSearchParams({
      "querySetting": JSON.stringify([{ name: "SFYX", value: "1", linkOpt: "AND", builder: "m_value_equal" }]),
      "*order": "-XNXQDM,-KCH,-KXH",
      "pageSize": "500",
      "pageNumber": "0",
    });
    return fetch("/jwapp/sys/cjcx/modules/cjcx/xscjcx.do", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (json) {
      return (json && json.datas && json.datas.xscjcx && json.datas.xscjcx.rows) || [];
    });
  }

  function fetchAllGrades(force) {
    if (!force && rowsCache) return Promise.resolve(rowsCache);
    var roleId = getRoleId();
    var p = roleId ? changeAppRole(roleId).then(fetchGrades) : fetchGrades();
    return p.then(function (rows) {
      rowsCache = rows;
      return rows;
    });
  }

  function semesterInfo(row) {
    var code = row.XNXQDM || "";
    var display = row.XNXQDM_DISPLAY || row.XNXQMC || code || "未知学期";
    var m = String(code).match(/^(\d{4})-(\d{4})-([123])$/);
    if (m) return { label: display, orderKey: (+m[1]) * 10 + (+m[3]) };
    m = String(display).match(/(\d{4})-(\d{4})/);
    var term = /暑/.test(display) ? 3 : (/2|春/.test(display) ? 2 : 1);
    return { label: display, orderKey: (m ? +m[1] : 0) * 10 + term };
  }

  function courseNature(row) {
    return row.KCXZDM_DISPLAY || row.KCXZMC || row.KCLBDM_DISPLAY || row.KCLBMC || "其他";
  }

  function courseBucket(row) {
    var t = courseNature(row);
    if (/通修/.test(t)) return "通修";
    if (/平台/.test(t)) return "平台";
    if (/核心/.test(t)) return "核心";
    if (/通识/.test(t)) return "通识";
    if (/选修/.test(t)) return "选修";
    return "其他";
  }

  function isValid(row) {
    return row.SFYX == null || String(row.SFYX) === "1" || row.SFYX_DISPLAY === "是";
  }

  function isPassed(row) {
    var score = parseNumber(row.ZCJ);
    if (!isNaN(score)) return score >= 60;
    var text = [row.DJCJMC, row.SFJG_DISPLAY, row.ZCJ].join(" ");
    if (/未通过|不通过|不及格|缺考|旷考/.test(text)) return false;
    return /通过|合格|及格|优秀|良好|中等/.test(text);
  }

  function numericScore(row) {
    if (String(row.DJCJLXDM) !== "100" && row.DJCJLXDM != null) return NaN;
    return parseNumber(row.ZCJ);
  }

  function calcStats(rows) {
    var stats = {
      totalEarned: 0,
      all: { weightedSum: 0, credit: 0 },
      degree: { weightedSum: 0, credit: 0 },
      creditDist: {},
      semestersAll: {},
      semestersDegree: {},
    };

    rows.forEach(function (row) {
      if (!isValid(row)) return;
      var credit = parseNumber(row.XF);
      if (isNaN(credit) || credit <= 0) return;
      var bucket = courseBucket(row);
      if (isPassed(row)) {
        stats.totalEarned += credit;
        stats.creditDist[bucket] = (stats.creditDist[bucket] || 0) + credit;
      }

      var score = numericScore(row);
      if (isNaN(score)) return;
      stats.all.weightedSum += score * credit;
      stats.all.credit += credit;

      var sem = semesterInfo(row);
      if (!stats.semestersAll[sem.orderKey]) {
        stats.semestersAll[sem.orderKey] = { label: sem.label, weightedSum: 0, credit: 0 };
      }
      stats.semestersAll[sem.orderKey].weightedSum += score * credit;
      stats.semestersAll[sem.orderKey].credit += credit;

      if (/通修|平台|核心/.test(courseNature(row))) {
        stats.degree.weightedSum += score * credit;
        stats.degree.credit += credit;
        if (!stats.semestersDegree[sem.orderKey]) {
          stats.semestersDegree[sem.orderKey] = { label: sem.label, weightedSum: 0, credit: 0 };
        }
        stats.semestersDegree[sem.orderKey].weightedSum += score * credit;
        stats.semestersDegree[sem.orderKey].credit += credit;
      }
    });

    function calcGpa(w, c) {
      return c === 0 ? "0.0000" : ((w / c) / 20).toFixed(4);
    }

    var keys = Array.from(new Set(
      Object.keys(stats.semestersAll).concat(Object.keys(stats.semestersDegree)).map(function (k) {
        return parseInt(k, 10);
      })
    )).sort(function (a, b) { return a - b; });

    var cumAllW = 0, cumAllC = 0, cumDegW = 0, cumDegC = 0;
    var labels = [], termAll = [], termDegree = [], cumAll = [], cumDegree = [];
    keys.forEach(function (k) {
      var a = stats.semestersAll[k];
      var d = stats.semestersDegree[k];
      labels.push((a || d).label);
      termAll.push(a ? parseFloat(calcGpa(a.weightedSum, a.credit)) : null);
      termDegree.push(d ? parseFloat(calcGpa(d.weightedSum, d.credit)) : null);
      if (a) { cumAllW += a.weightedSum; cumAllC += a.credit; }
      if (d) { cumDegW += d.weightedSum; cumDegC += d.credit; }
      cumAll.push(parseFloat(calcGpa(cumAllW, cumAllC)));
      cumDegree.push(parseFloat(calcGpa(cumDegW, cumDegC)));
    });

    return {
      totalEarned: stats.totalEarned,
      allGPA: calcGpa(stats.all.weightedSum, stats.all.credit),
      degreeGPA: calcGpa(stats.degree.weightedSum, stats.degree.credit),
      creditDistribution: stats.creditDist,
      semesterTrend: {
        labels: labels,
        term: { allGpa: termAll, degreeGpa: termDegree },
        cumulative: { allGpa: cumAll, degreeGpa: cumDegree },
      },
    };
  }

  function injectCSS() {
    if (document.getElementById("pp-grade-visualizer-style")) return;
    var style = document.createElement("style");
    style.id = "pp-grade-visualizer-style";
    style.textContent = `
      #pp-grade-viz-panel {
        position: relative;
        z-index: 10;
        width: calc(100% - 40px);
        min-height: 320px;
        margin: 28px 20px 24px;
        padding: 20px 22px 22px;
        box-sizing: border-box;
        background: #fff;
        border: 1px solid #edf0f2;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(38,50,56,.08);
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
      }
      .pp-grade-viz-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 32px;
        margin-bottom: 18px;
      }
      .pp-grade-viz-title {
        font-size: 18px;
        line-height: 1.35;
        font-weight: 700;
        color: #263238;
      }
      .pp-grade-viz-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pp-grade-viz-btn {
        border: 1px solid #cfd8dc;
        border-radius: 18px;
        background: #fff;
        color: #37474f;
        cursor: pointer;
        padding: 6px 14px;
        font-size: 13px;
      }
      .pp-grade-viz-btn:hover { background: #f5f8fa; }
      .pp-grade-viz-body {
        display: grid;
        grid-template-columns: 280px 240px minmax(360px, 1fr);
        gap: 22px;
        min-height: 240px;
      }
      .pp-grade-viz-card {
        min-width: 0;
        border: 1px solid #edf0f2;
        border-radius: 8px;
        padding: 16px;
        background: #fff;
      }
      .pp-grade-viz-overview {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .pp-grade-viz-metric {
        border-radius: 8px;
        background: #f6f8fa;
        padding: 12px;
      }
      .pp-grade-viz-label {
        font-size: 12px;
        color: #607d8b;
        margin-bottom: 8px;
      }
      .pp-grade-viz-value {
        font-size: 25px;
        font-weight: 700;
        color: #1565c0;
      }
      .pp-grade-viz-value.degree { color: #ef6c00; }
      .pp-grade-viz-chartbox {
        position: relative;
        height: 230px;
      }
      .pp-grade-viz-progress-wrap {
        position: relative;
        height: 210px;
      }
      .pp-grade-viz-progress-wrap canvas {
        position: relative;
        z-index: 1;
      }
      .pp-grade-viz-progress-center {
        position: absolute;
        z-index: 2;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        pointer-events: none;
      }
      .pp-grade-viz-tooltip {
        position: absolute;
        z-index: 3;
        left: 0;
        top: 0;
        max-width: 170px;
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(38, 38, 38, .95);
        color: #fff;
        font-size: 13px;
        line-height: 1.4;
        pointer-events: none;
        opacity: 0;
        transform: translate(-50%, calc(-100% - 8px));
        transition: opacity .08s ease;
        box-shadow: 0 8px 18px rgba(0,0,0,.2);
        white-space: nowrap;
      }
      .pp-grade-viz-tooltip-title {
        margin-bottom: 5px;
        font-weight: 700;
      }
      .pp-grade-viz-tooltip-row {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .pp-grade-viz-tooltip-swatch {
        width: 11px;
        height: 11px;
        border-radius: 2px;
        background: currentColor;
        flex: 0 0 auto;
      }
      .pp-grade-viz-dist {
        display: grid;
        grid-template-columns: 1fr;
        gap: 7px;
        margin-top: 14px;
      }
      .pp-grade-viz-dist-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        color: #455a64;
      }
      .pp-grade-viz-mode {
        font-size: 13px;
        border: 1px solid #cfd8dc;
        border-radius: 8px;
        padding: 5px 8px;
        background: #fff;
      }
      .pp-grade-viz-loading,
      .pp-grade-viz-error {
        min-height: 170px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #78909c;
      }
      .pp-grade-viz-error { color: #b71c1c; }
      @media (max-width: 980px) {
        .pp-grade-viz-body {
          grid-template-columns: 1fr;
        }
        .pp-grade-viz-chartbox { height: 280px; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    injectCSS();
    var panel = document.getElementById("pp-grade-viz-panel");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "pp-grade-viz-panel";
    panel.innerHTML =
      '<div class="pp-grade-viz-head">' +
        '<div class="pp-grade-viz-title">PotatoPlus 成绩可视化</div>' +
        '<div class="pp-grade-viz-actions"><button class="pp-grade-viz-btn" id="pp-grade-viz-refresh">刷新</button></div>' +
      '</div>' +
      '<div class="pp-grade-viz-loading">正在获取成绩数据...</div>';

    var target = document.querySelector(".bh-container")
      || document.querySelector("[data-pageid]")
      || document.querySelector(".emap-main")
      || document.body;
    target.insertBefore(panel, target.firstChild);
    panel.querySelector("#pp-grade-viz-refresh").addEventListener("click", function () {
      rowsCache = null;
      renderLoading();
      loadAndRender(true);
    });
    return panel;
  }

  function destroyCharts() {
    if (progressChart) progressChart.destroy();
    if (trendChart) trendChart.destroy();
    progressChart = null;
    trendChart = null;
  }

  function renderLoading() {
    destroyCharts();
    var panel = ensurePanel();
    var oldBody = panel.querySelector(".pp-grade-viz-body,.pp-grade-viz-error,.pp-grade-viz-loading");
    if (oldBody) oldBody.remove();
    panel.insertAdjacentHTML("beforeend", '<div class="pp-grade-viz-loading">正在获取成绩数据...</div>');
  }

  function renderError(message) {
    destroyCharts();
    var panel = ensurePanel();
    var oldBody = panel.querySelector(".pp-grade-viz-body,.pp-grade-viz-error,.pp-grade-viz-loading");
    if (oldBody) oldBody.remove();
    panel.insertAdjacentHTML("beforeend", '<div class="pp-grade-viz-error">成绩可视化加载失败：' + esc(message) + '</div>');
  }

  function loadAndRender(force) {
    if (!window.Chart) {
      renderError("Chart.js 未加载");
      return;
    }
    fetchAllGrades(force).then(function (rows) {
      if (!rows.length) {
        renderError("没有找到成绩数据");
        return;
      }
      renderDashboard(calcStats(rows));
    }).catch(function (e) {
      renderError(e && e.message ? e.message : String(e));
    });
  }

  function renderDashboard(stats) {
    destroyCharts();
    var panel = ensurePanel();
    var oldBody = panel.querySelector(".pp-grade-viz-body,.pp-grade-viz-error,.pp-grade-viz-loading");
    if (oldBody) oldBody.remove();

    var fixedOrder = ["通修", "平台", "核心", "通识", "选修", "其他"];
    var colors = ["#43a047", "#1e88e5", "#f9a825", "#8e24aa", "#00acc1", "#78909c"];
    var distHtml = fixedOrder.map(function (type, idx) {
      var value = stats.creditDistribution[type] || 0;
      return '<div class="pp-grade-viz-dist-row"><span>' + esc(type) + '</span>' +
        '<strong style="color:' + colors[idx] + '">' + value.toFixed(1).replace(/\\.0$/, "") + '</strong></div>';
    }).join("");

    panel.insertAdjacentHTML("beforeend",
      '<div class="pp-grade-viz-body">' +
        '<div class="pp-grade-viz-card">' +
          '<div class="pp-grade-viz-overview">' +
            '<div class="pp-grade-viz-metric"><div class="pp-grade-viz-label">综合学分绩</div><div class="pp-grade-viz-value">' + esc(stats.allGPA) + '</div></div>' +
            '<div class="pp-grade-viz-metric"><div class="pp-grade-viz-label">学位课学分绩</div><div class="pp-grade-viz-value degree">' + esc(stats.degreeGPA) + '</div></div>' +
          '</div>' +
          '<div class="pp-grade-viz-dist">' + distHtml + '</div>' +
        '</div>' +
        '<div class="pp-grade-viz-card">' +
          '<div class="pp-grade-viz-label">学分完成进度</div>' +
          '<div class="pp-grade-viz-progress-wrap">' +
            '<canvas id="pp-grade-viz-progress"></canvas>' +
            '<div class="pp-grade-viz-progress-center">' +
              '<div class="pp-grade-viz-label">已修 / 目标</div>' +
              '<div class="pp-grade-viz-value" style="font-size:20px;color:#263238">' + stats.totalEarned.toFixed(1).replace(/\\.0$/, "") + ' / ' + GRADUATION_GOAL + '</div>' +
            '</div>' +
            '<div class="pp-grade-viz-tooltip" id="pp-grade-viz-progress-tooltip"></div>' +
          '</div>' +
        '</div>' +
        '<div class="pp-grade-viz-card">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
            '<div class="pp-grade-viz-label" style="margin:0;">GPA 趋势</div>' +
            '<select class="pp-grade-viz-mode" id="pp-grade-viz-mode"><option value="term">单学期</option><option value="cumulative">累计</option></select>' +
          '</div>' +
          '<div class="pp-grade-viz-chartbox"><canvas id="pp-grade-viz-trend"></canvas></div>' +
        '</div>' +
      '</div>'
    );

    var modeSelect = document.getElementById("pp-grade-viz-mode");
    var prefs = loadPrefs();
    if (prefs.mode === "cumulative") modeSelect.value = "cumulative";
    modeSelect.addEventListener("change", function () {
      savePrefs({ mode: modeSelect.value });
      renderTrend(stats.semesterTrend, modeSelect.value);
    });

    renderProgress(stats.creditDistribution, stats.totalEarned, fixedOrder, colors);
    renderTrend(stats.semesterTrend, modeSelect.value);
  }

  function renderProgress(dist, totalEarned, fixedOrder, colors) {
    var ctx = document.getElementById("pp-grade-viz-progress");
    if (!ctx) return;
    var labels = fixedOrder.slice();
    var values = fixedOrder.map(function (k) { return dist[k] || 0; });
    labels.push("未完成");
    values.push(Math.max(0, GRADUATION_GOAL - totalEarned));
    progressChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{ data: values, backgroundColor: colors.concat(["#e0e0e0"]), borderWidth: 0, hoverOffset: 4 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: renderProgressTooltip,
          },
        },
      },
    });
  }

  function renderProgressTooltip(context) {
    var tooltipEl = document.getElementById("pp-grade-viz-progress-tooltip");
    if (!tooltipEl) return;
    var tooltip = context.tooltip;
    if (!tooltip || tooltip.opacity === 0 || !tooltip.dataPoints || !tooltip.dataPoints.length) {
      tooltipEl.style.opacity = "0";
      return;
    }

    var point = tooltip.dataPoints[0];
    var color = point.element && point.element.options && point.element.options.backgroundColor;
    var raw = typeof point.raw === "number" ? point.raw.toFixed(1).replace(/\\.0$/, "") : point.raw;
    tooltipEl.innerHTML =
      '<div class="pp-grade-viz-tooltip-title">' + esc(point.label) + '</div>' +
      '<div class="pp-grade-viz-tooltip-row" style="color:' + esc(color || "#fff") + '">' +
        '<span class="pp-grade-viz-tooltip-swatch"></span>' +
        '<span style="color:#fff">' + esc(point.label) + ': ' + esc(raw) + ' 学分</span>' +
      '</div>';

    var canvas = context.chart.canvas;
    var wrap = tooltipEl.parentElement;
    var left = canvas.offsetLeft + tooltip.caretX;
    var top = canvas.offsetTop + tooltip.caretY;
    var minLeft = 70;
    var maxLeft = Math.max(minLeft, wrap.clientWidth - 70);
    tooltipEl.style.left = Math.max(minLeft, Math.min(left, maxLeft)) + "px";
    tooltipEl.style.top = Math.max(34, top) + "px";
    tooltipEl.style.opacity = "1";
  }

  function renderTrend(trendData, mode) {
    var ctx = document.getElementById("pp-grade-viz-trend");
    if (!ctx) return;
    if (trendChart) trendChart.destroy();
    var series = mode === "cumulative" ? trendData.cumulative : trendData.term;
    var points = series.allGpa.concat(series.degreeGpa).filter(function (v) {
      return typeof v === "number" && !isNaN(v);
    });
    var minY = points.length ? Math.max(0, Math.floor((Math.min.apply(Math, points) - 0.2) * 10) / 10) : 0;
    var maxY = points.length ? Math.min(5, Math.ceil((Math.max.apply(Math, points) + 0.2) * 10) / 10) : 5;
    if (minY >= maxY) minY = Math.max(0, maxY - 0.5);
    trendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: trendData.labels,
        datasets: [
          {
            label: "综合 GPA",
            data: series.allGpa,
            borderColor: "#1e88e5",
            backgroundColor: "#fff",
            borderWidth: 2,
            pointRadius: 4,
            tension: 0,
          },
          {
            label: "学位 GPA",
            data: series.degreeGpa,
            borderColor: "#ef6c00",
            backgroundColor: "#fff",
            borderWidth: 2,
            pointRadius: 4,
            tension: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: function (context) {
                return (context.dataset.label || "GPA") + ": " + context.raw;
              },
            },
          },
        },
        scales: {
          y: { min: minY, max: maxY, grid: { color: "#edf0f2" } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  function start() {
    ensurePanel();
    loadAndRender(false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(start, 800);
    });
  } else {
    setTimeout(start, 800);
  }
})();
