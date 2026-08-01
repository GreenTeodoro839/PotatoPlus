// jiaowu/init.js - 共享初始化（xk 登录页公告卡 / 公告拉取 / 版本升级）
// Depends on: common/core.js (pjw global), jQuery ($$)

window.potatojw_intl = function() {
  if (pjw.initialized) return;
  pjw.initialized = true;

  if (typeof jQuery === "undefined") return;
  if (jQuery.fn.jquery == "3.5.1")
    window.$$ = jQuery.noConflict();
  else
    window.$$ = $;

  const head_metadata = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,height=device-height,initial-scale=1.0,maximum-scale=1.0,user-scalable=0">
    <link rel="shortcut icon" href="https://www.nju.edu.cn/_upload/tpl/01/36/310/template310/images/16.ico" type="image/x-icon">
  `;
  $$("head").prepend(head_metadata);

  console.log(`PotatoPlus v${pjw.version} (${pjw.platform}) by Limos`);
  if (pjw.mode == "") return;
  console.log(pjw.mode + " mode activated");

  // Storage upgrade upon version upgrade
  if ((pjw.data.version || 0) !== pjw.version) {
    if (localStorage.getItem("version")) {
      localStorage.clear();
    }
    delete pjw.data.bulletin_update_timestamp;
    delete pjw.data.bulletin_content;
    delete pjw.data.latest_version;
    delete pjw.data.update_dismissed_version;
    pjw.data.version = pjw.version;
  }

  var getBulletin = function() {
    if ((pjw.data.bulletin_update_timestamp || 0) + 300000 <= new Date().getTime()) {
      const html = `<iframe src="https://potatoplus.zcec.top/apps/potatoplus-bulletin/?version=${pjw.version}&site=${pjw.site}" width="300" height="300" style="display: none;"></iframe>`;

      $$(window).on("message", (e) => {
        if (e.originalEvent.origin !== "https://potatoplus.zcec.top") return;
        if (e?.originalEvent?.data) {
          let data = {};
          try {
            data = JSON.parse(e.originalEvent.data);
          } catch (e) {
            console.warn(e);
          } finally {
            if (data["type"] == "bulletin") {
              pjw.data.bulletin_content = data["content"];
              pjw.data.bulletin_update_timestamp = new Date().getTime();
              $$("#pjw-bulletin-content").html(data["content"]);
              pjw.data.latest_version = data["latest_version"];
              pjw.renderUpdateNotice(".pjw-xk-welcome-card");
            }
          }
        }
      });

      $$("body").append(html);
    }
  }

  // Dispatch to feature-specific modules（course 模式已移除，只保留 welcome）
  if (pjw.mode == "welcome") {
    if (typeof initXKWelcome === "function") {
      initXKWelcome(getBulletin);
    }
  } else {
    return;
  }
};

// Entry point for non-authserver pages
(function() {
  if (pjw.site == "authserver") return; // authserver/login.js handles this
  if (document.readyState == "complete")
    potatojw_intl();
  else
    window.addEventListener("load", potatojw_intl);
})();
