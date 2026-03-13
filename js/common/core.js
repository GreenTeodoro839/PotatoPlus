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
  // Check if a default-on preference is currently on (null → true)
  isOn: function(key) { return pjw.preferences[key] !== false; },
  // Toggle a default-on preference, returns the new state
  toggle: function(key) {
    const next = !pjw.isOn(key);
    pjw.preferences[key] = next;
    return next;
  },
  switch: function() {
    const on = pjw.toggle("enabled");
    if (on) $(".pjw-xk-welcome-card")?.show();
    else    $(".pjw-xk-welcome-card")?.hide();
    return on;
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
