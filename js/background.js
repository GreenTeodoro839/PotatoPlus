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
  rows.sort(function (a, b) { return (a.PX || 0) - (b.PX || 0); });
  var term = rows[0];
  var termCode = term.DM || term.XNXQDM;
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
