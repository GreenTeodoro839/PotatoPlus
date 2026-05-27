// background.js - PotatoPlus Service Worker
// 处理需要绕过 CORS 的请求（课表 API 等）

if (!globalThis.browser) globalThis.browser = globalThis.chrome;

browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === "pp-schedule-fetch") {
    handleScheduleFetch(msg).then(sendResponse).catch(function (e) {
      sendResponse({ error: e.message || "未知错误" });
    });
    return true; // 异步响应
  }
});

async function handleScheduleFetch(msg) {
  var force = msg.force || false;

  // 0. 检查 ehall 登录状态
  var loginResp = await fetch(
    "https://ehall.nju.edu.cn/jsonp/ywtb/info/getUserInfoAndSchoolInfo",
    { credentials: "include" }
  );
  if (!loginResp.ok) throw new Error("检查登录状态失败 (HTTP " + loginResp.status + ")");
  var loginData = await loginResp.json();
  var hasLogin = !!(loginData && loginData.data && loginData.data.hasLogin === true);
  if (!hasLogin) {
    throw new Error("请先登录 ehall 后再查看课表");
  }

  // 1. 先激活 jwapp 应用（访问 appShow 页面获取 cookie/session）
  try {
    await fetch("https://ehall.nju.edu.cn/appShow?appId=4770397878132218", {
      credentials: "include",
      redirect: "follow",
    });
  } catch (e) {
    console.warn("[PotatoPlus bg] appShow 激活失败:", e);
    // 不阻断，可能已经激活过
  }

  // 2. 获取学期列表
  var termResp = await fetch(
    "https://ehallapp.nju.edu.cn/jwapp/sys/wdkb/modules/jshkcb/xnxqcx.do",
    { method: "POST", credentials: "include" }
  );
  if (!termResp.ok) throw new Error("获取学期列表失败 (HTTP " + termResp.status + ")");
  var termData = await termResp.json();
  var rows = (termData.datas && (termData.datas.xnxqcx || termData.datas.jshkcb || {}).rows) || null;
  if (!rows || !rows.length) throw new Error("学期列表为空");
  var term = selectCurrentTerm(rows, new Date());
  var termCode = getTermCode(term);
  var termName = term.MC || term.XNXQDM_DISPLAY || termCode;

  // 3. 获取课表
  var schedResp = await fetch(
    "https://ehallapp.nju.edu.cn/jwapp/sys/wdkb/modules/xskcb/xskcb.do?XNXQDM=" + termCode,
    { credentials: "include" }
  );
  if (!schedResp.ok) throw new Error("获取课表失败 (HTTP " + schedResp.status + ")");
  var schedData = await schedResp.json();
  var raws = (schedData.datas && schedData.datas.xskcb && schedData.datas.xskcb.rows) || [];

  // 4. 解析课程
  var courses = [];
  raws.forEach(function (r) {
    var weeks = parseWeeks(r.ZCMC, r.SKZC);
    if (!weeks.length) return;
    courses.push({
      name: r.KCM || "",
      classroom: r.JASMC || "",
      classNumber: r.KCH || "",
      teacher: r.SKJS || "",
      weeks: weeks,
      weekTime: parseInt(r.SKXQ) || 0,
      startTime: parseInt(r.KSJC) || 0,
      endTime: parseInt(r.JSJC) || 0,
      weeksStr: r.ZCMC || "",
    });
  });

  // 5. 获取学期起始日期
  var semesterStartMonday = null;
  try {
    var semResp = await fetch("https://potatoplus.zcec.top/apps/potatoplus-schedule/semester.json");
    console.log("[PotatoPlus bg] semester.json status:", semResp.status);
    if (semResp.ok) {
      var semData = await semResp.json();
      semesterStartMonday = semData.semester_start_monday || null;
      console.log("[PotatoPlus bg] semester_start_monday:", semesterStartMonday);
    }
  } catch (e) {
    console.warn("[PotatoPlus bg] 获取学期起始日期失败:", e);
  }

  return {
    courses: courses,
    termName: termName,
    semesterStartMonday: semesterStartMonday,
  };
}

function selectCurrentTerm(rows, now) {
  var today = toDateOnly(now || new Date());
  var sortedRows = rows.slice().sort(function (a, b) {
    return (a.PX || 0) - (b.PX || 0);
  });

  for (var i = 0; i < sortedRows.length; i++) {
    var explicitRange = getExplicitTermRange(sortedRows[i]);
    if (explicitRange && isInDateRange(today, explicitRange)) return sortedRows[i];
  }

  for (var j = 0; j < sortedRows.length; j++) {
    var inferredRange = getInferredTermRange(sortedRows[j]);
    if (inferredRange && isInDateRange(today, inferredRange)) return sortedRows[j];
  }

  return sortedRows[0];
}

function getTermCode(row) {
  if (!row) return "";
  if (row.DM) return String(row.DM);
  if (row.XNXQDM) return String(row.XNXQDM);
  if (row.XNDM && row.XQDM) return String(row.XNDM) + "-" + String(row.XQDM);
  return "";
}

function getExplicitTermRange(row) {
  var start = parseTermDate(row && row.QSSYRQ);
  var end = parseTermDate(row && row.ZZSYRQ);
  if (!start && !end) return null;
  return {
    start: start,
    end: end ? addDays(end, 1) : null,
  };
}

function getInferredTermRange(row) {
  var code = getTermCode(row);
  var match = code.match(/^(\d{4})-(\d{4})-([123])$/);
  var yearStart = match ? parseInt(match[1], 10) : null;
  var yearEnd = match ? parseInt(match[2], 10) : null;
  var termNo = match ? parseInt(match[3], 10) : parseInt(row && row.XQDM, 10);

  if ((!yearStart || !yearEnd) && row && row.XNDM) {
    var yearMatch = String(row.XNDM).match(/^(\d{4})-(\d{4})$/);
    if (yearMatch) {
      yearStart = parseInt(yearMatch[1], 10);
      yearEnd = parseInt(yearMatch[2], 10);
    }
  }

  if (!yearStart || !yearEnd || !termNo) return null;
  if (termNo === 1) return { start: new Date(yearStart, 8, 1), end: new Date(yearEnd, 1, 1) };
  if (termNo === 2) return { start: new Date(yearEnd, 1, 1), end: new Date(yearEnd, 6, 1) };
  if (termNo === 3) return { start: new Date(yearEnd, 6, 1), end: new Date(yearEnd, 8, 1) };
  return null;
}

function parseTermDate(value) {
  if (!value) return null;
  var s = String(value);
  var m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!m) m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  var d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  return isNaN(d.getTime()) ? null : d;
}

function toDateOnly(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function isInDateRange(date, range) {
  if (range.start && date < range.start) return false;
  if (range.end && date >= range.end) return false;
  return true;
}

function parseWeeks(t, b) {
  if (typeof b === "string" && b.length > 0) {
    var w = [];
    for (var i = 0; i < b.length; i++) if (b[i] === "1") w.push(i + 1);
    if (w.length > 0) return w;
  }
  if (!t) return [];
  var ws = [];
  t.split(",").forEach(function (p) {
    var m = p.match(/(\d+)(?:-(\d+))?周?(?:\((单|双)\))?/);
    if (!m) return;
    var s = +m[1], e = m[2] ? +m[2] : s, f = m[3] === "单" ? 1 : m[3] === "双" ? 2 : 0;
    for (var w = s; w <= e; w++)
      if (f === 0 || (f === 1 && w % 2 === 1) || (f === 2 && w % 2 === 0))
        if (ws.indexOf(w) < 0) ws.push(w);
  });
  return ws.sort(function (a, b) { return a - b; });
}
