(function () {
  var defineRef = window.define;
  if (typeof defineRef === "function" && window.__ppChartAmd) {
    try {
      defineRef.amd = window.__ppChartAmd;
    } catch (_) {}
  }
  try {
    delete window.__ppChartAmd;
  } catch (_) {
    window.__ppChartAmd = undefined;
  }
})();
