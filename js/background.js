// background.js - PotatoPlus Service Worker
// 处理需要绕过 CORS 的请求（课表 API 等）

if (!globalThis.browser) globalThis.browser = globalThis.chrome;

var TERM_CONFIG_URL = "https://potatoplus.zcec.top/apps/potatoplus-schedule/semester.json";

browser.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === "pp-schedule-fetch") {
    handleScheduleFetch(msg).then(sendResponse).catch(function (e) {
      sendResponse({ error: e.message || "未知错误" });
    });
    return true; // 异步响应
  }
});

async function handleScheduleFetch(msg) {
  var termConfig = await fetchTermConfig();
  if (!termConfig.termCode) {
    return {
      courses: [],
      termCode: "",
      termName: termConfig.termName || "假期中",
      semesterStartMonday: termConfig.semesterStartMonday || "",
      isHoliday: true,
    };
  }

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

  // 2. 用网站配置的学期编号初始化并获取课表
  await fetch("https://ehallapp.nju.edu.cn/jwapp/sys/wdkb/modules/xskcb.do", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body: "*json=1&XNXQDM=" + encodeURIComponent(termConfig.termCode),
  }).catch(function () {});

  var schedResp = await fetch(
    "https://ehallapp.nju.edu.cn/jwapp/sys/wdkb/modules/xskcb/cxxskclb.do",
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: "XNXQDM=" + encodeURIComponent(termConfig.termCode) + "&pageSize=100&pageNumber=1",
    }
  );
  if (!schedResp.ok) throw new Error("获取课表失败 (HTTP " + schedResp.status + ")");
  var schedData = await schedResp.json();
  var raws = (schedData.datas && schedData.datas.cxxskclb && schedData.datas.cxxskclb.rows) || [];

  var courses = parseCourseRows(raws);

  return {
    courses: courses,
    termCode: termConfig.termCode,
    termName: termConfig.termName || termConfig.termCode,
    semesterStartMonday: termConfig.semesterStartMonday,
    isHoliday: false,
  };
}

async function fetchTermConfig() {
  var resp = await fetch(TERM_CONFIG_URL, { cache: "no-cache" });
  if (!resp.ok) throw new Error("获取学期配置失败 (HTTP " + resp.status + ")");
  var data = await resp.json();
  var termCode = stringValue(data.term_code || data.termCode || data.code);
  var termName = stringValue(data.display_name || data.term_name || data.termName || data.name);
  var semesterStartMonday = stringValue(data.semester_start_monday || data.start_monday || data.first_week_monday || data.semesterStartMonday);
  if (termCode && !/^\d{4}-\d{4}-[123]$/.test(termCode)) throw new Error("学期配置编号格式错误");
  if (semesterStartMonday && !/^\d{4}-\d{2}-\d{2}$/.test(semesterStartMonday)) throw new Error("学期起始日期格式错误");
  return {
    termCode: termCode,
    termName: termName || (termCode ? termCode : "假期中"),
    semesterStartMonday: semesterStartMonday,
  };
}

function stringValue(value) {
  return value == null ? "" : String(value).trim();
}

function parseCourseRows(rows) {
  var courses = [];
  rows.forEach(function (row) {
    parseScheduleText(row.ZCXQJCDD || "").forEach(function (slot) {
      courses.push({
        name: row.JXBMC || row.KCM || "",
        classroom: slot.classroom || "",
        classNumber: row.KCH || "",
        teacher: row.SKJS || row.SKJSS || "",
        weeks: slot.weeks,
        weekTime: slot.weekTime,
        startTime: slot.startTime,
        endTime: slot.endTime,
        weeksStr: slot.weeksStr,
      });
    });
  });
  return courses;
}

function parseScheduleText(text) {
  return String(text || "")
    .split(/[，,](?=周[一二三四五六日天])/)
    .map(parseSchedulePart)
    .filter(Boolean);
}

function parseSchedulePart(part) {
  var m = String(part || "").trim().match(/^周([一二三四五六日天])\s*(\d+)\s*-\s*(\d+)节\s*([^\s]+周)\s*(.*)$/);
  if (!m) return null;
  var weeks = parseWeeksText(m[4]);
  if (!weeks.length) return null;
  return {
    weekTime: weekdayToNumber(m[1]),
    startTime: parseInt(m[2], 10) || 0,
    endTime: parseInt(m[3], 10) || 0,
    weeks: weeks,
    weeksStr: m[4],
    classroom: (m[5] || "").trim(),
  };
}

function weekdayToNumber(value) {
  return { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 7, "天": 7 }[value] || 0;
}

function parseWeeksText(value) {
  var s = String(value || "").replace(/第/g, "").replace(/周/g, "").replace(/\s+/g, "");
  var odd = /单/.test(s);
  var even = /双/.test(s);
  s = s.replace(/[单双]/g, "");
  var weeks = [];
  s.split(/[、,，;；]/).forEach(function (part) {
    if (!part) return;
    var range = part.match(/^(\d+)(?:[-~至](\d+))?$/);
    if (!range) return;
    var start = parseInt(range[1], 10);
    var end = parseInt(range[2] || range[1], 10);
    for (var i = start; i <= end; i++) {
      if (odd && i % 2 === 0) continue;
      if (even && i % 2 === 1) continue;
      weeks.push(i);
    }
  });
  return Array.from(new Set(weeks)).sort(function (a, b) { return a - b; });
}
