// ehall/schedule-bridge.js - content script 中转层
// 页面脚本 (schedule.js) 通过 window.postMessage 发请求
// 本脚本在扩展上下文中，可以调用 chrome.runtime.sendMessage

if (!window.browser) window.browser = window.chrome;

window.addEventListener("message", function (event) {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== "pp-schedule-request") return;

  var reqId = event.data.reqId;
  var force = event.data.force || false;

  browser.runtime.sendMessage(
    { type: "pp-schedule-fetch", force: force },
    function (resp) {
      window.postMessage({
        type: "pp-schedule-response",
        reqId: reqId,
        data: resp || null,
        error: browser.runtime.lastError
          ? browser.runtime.lastError.message
          : null,
      }, "*");
    }
  );
});
