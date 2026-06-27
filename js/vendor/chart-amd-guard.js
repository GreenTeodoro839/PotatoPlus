(function () {
  var defineRef = window.define;
  if (typeof defineRef === "function" && defineRef.amd) {
    window.__ppChartAmd = defineRef.amd;
    try {
      defineRef.amd = undefined;
    } catch (_) {}
  }
})();
