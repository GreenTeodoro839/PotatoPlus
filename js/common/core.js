const pjw = {
  version: "",
  platform: "General Plugin",
  site: "",
  mode: "",
  initialized: false,
  version_description: "",
  data: new Proxy(JSON.parse(localStorage.getItem("potatoplus_data")) || {}, {
    get(target, property, receiver) {
      if (property === "clear") {
        return function () {
          target = {};
          localStorage.removeItem("potatoplus_data");
        };
      }
      const data = target;
      if (property in data)
        return data[property];
      else
        return null;
    },
    set(target, property, value, receiver) {
      try {
        target[property] = value;
        localStorage.setItem("potatoplus_data", JSON.stringify(target));
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }

    },
    deleteProperty(target, property) {
      let delete_res = delete target[property];
      localStorage.setItem("potatoplus_data", JSON.stringify(target));
      return delete_res;
    }
  }),
  preferences: {},
  settings: {},
  // Check if a default-on preference is currently on (null → true)
  isOn: function(key) { return pjw.preferences[key] !== false; },
  // Check a settings-page (chrome.storage) feature flag; default-on, graceful if bridge missing
  featureOn: function(key) {
    try {
      var m = document.querySelector('meta[name="pjw-settings"]');
      if (m) return (JSON.parse(m.getAttribute("content")) || {})[key] !== false;
    } catch (_) {}
    return pjw.settings[key] !== false;
  },
  // Toggle a default-on preference, returns the new state
  toggle: function(key) {
    const next = !pjw.isOn(key);
    pjw.preferences[key] = next;
    return next;
  },
  UPDATE_URL: "https://potatoplus.zcec.top/#install",
  // Compare a remote version string against the running version (both may have a leading "v")
  isUpdateAvailable: function(latest) {
    if (!latest || !pjw.version) return false;
    const a = String(latest).replace(/^v/i, "").split(".").map(Number);
    const b = String(pjw.version).replace(/^v/i, "").split(".").map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i] || 0, y = b[i] || 0;
      if (x > y) return true;
      if (x < y) return false;
    }
    return false;
  },
  // Render/refresh an "update available" notice at the top of the given card container.
  // Self-healing: removes the notice when no newer version applies or it was dismissed.
  renderUpdateNotice: function(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const latest = pjw.data.latest_version;
    let notice = container.querySelector(".pjw-update-notice");
    const show = pjw.isUpdateAvailable(latest) && pjw.data.update_dismissed_version !== latest;
    if (!show) { if (notice) notice.remove(); return; }
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "pjw-update-notice";
      notice.style.cssText = "display:flex;align-items:center;gap:8px;margin:0 0 10px;padding:8px 10px;" +
        "background:rgba(99,6,95,.08);border:1px solid rgba(99,6,95,.25);border-radius:8px;" +
        "font-size:13px;line-height:1.4;";
      container.insertBefore(notice, container.firstChild);
    }
    notice.textContent = "";
    const label = document.createElement("span");
    label.style.flex = "1";
    label.textContent = "🆕 新版本 v" + latest + " 可用";
    const link = document.createElement("a");
    link.href = pjw.UPDATE_URL;
    link.target = "_blank";
    link.textContent = "查看更新";
    link.style.cssText = "color:#63065f;font-weight:bold;text-decoration:none;white-space:nowrap;";
    const close = document.createElement("span");
    close.textContent = "✕";
    close.title = "忽略此版本";
    close.style.cssText = "cursor:pointer;opacity:.6;padding:0 2px;";
    close.addEventListener("click", function() {
      pjw.data.update_dismissed_version = latest;
      notice.remove();
    });
    notice.appendChild(label);
    notice.appendChild(link);
    notice.appendChild(close);
  },
};

(() => {
  window.pjw = pjw;
  pjw.preferences = pjw.data;
  const info = document.querySelector("meta[name=\"pjw\"]");
  pjw.version = info.getAttribute("version");
  pjw.mode = info.getAttribute("mode");
  pjw.site = (window.location.host == "xk.nju.edu.cn" ? "xk" :
              (window.location.host == "authserver.nju.edu.cn" ? "authserver" : "jw"));
  try {
    const sMeta = document.querySelector("meta[name=\"pjw-settings\"]");
    if (sMeta) pjw.settings = JSON.parse(sMeta.getAttribute("content")) || {};
  } catch (_) { pjw.settings = {}; }
})();

window.proto_backup = {
  reduce: function (callback, initialVal) {
    // Source: https://stackoverflow.com/questions/55699861/implementing-reduce-from-scratch-not-sure-how-js-knows-what-array-is
    var accumulator = (initialVal === undefined) ? this[0] : initialVal;
    var start = (initialVal === undefined) ? 1 : 0;
    for (var i = start; i < this.length; i++) {
      accumulator = callback(accumulator, this[i])
    }
    return accumulator;
  }
};
