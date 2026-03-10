// jiaowu/init.js - Shared initialization for jiaowu pages (toolbar, GA, site chrome)
// Depends on: common/core.js (pjw global), jQuery ($$)

window.potatojw_intl = function() {
  if (pjw.initialized == true) return;
  pjw.initialized = true;
  
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

  const google_analytics_js = `
  <!-- Global site tag (gtag.js) - Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=UA-173014211-1"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'UA-173014211-1', {
      'custom_map': {'dimension1': 'version'}
    });
    gtag('event', 'version_dimension', {'version': pjw.version + " " + pjw.platform});
    </script>
  `;

  if (pjw.site == "jw") {
    if ($$("#Function").length) {
      $$("#Function").addClass("light");
      $$("#Function").find("li").on("click", (e) => {
        window.location.href = $$(e.delegateTarget).find("a").attr("href");
      });
    }

    if ($$("#UserInfo").length) {
      $$("#UserInfo").html(`
        <div id="pjw-user-info" onclick="window.location.href = '/jiaowu/student/teachinginfo/courseList.do?method=currentTermCourse';">${$$("#UserInfo").html().slice(4).match(/.*?\&/)[0].slice(0, -1)}
          <div id="pjw-user-type">${$$("#UserInfo").html().slice(4).match(/：.*/)[0].slice(1)}</div>
        </div>
      `);
      $$("#TopLink").children("img").remove();
      if ($$(".Line").length) {
        $$("table").find("tr").each((index, obj) => {
          if ($$(obj).html().trim() == "")
            $$(obj).remove();
        });
        $$("table").find("td[align=right] > b").css({
          "font-size": "14px",
          "color": "rgba(0, 0, 0, .75)",
          "font-weight": "bold"
        });
        $$("table").find("td[align=left] > b").css({
          "font-size": "14px",
          "color": "rgba(0, 0, 0, .65)",
          "font-weight": "normal"
        });
        $$("table").find("td[align=left] > b > a").css({
          "font-size": "14px",
          "color": "rgba(0, 0, 0, .65)",
          "font-weight": "normal"
        });
      }
    }
    
    if ($$("div#TopLink").length > 0) {
      $$("div#TopLink").html(`<span class="pjw-mini-button" onclick="window.open('https://potatoplus.zcec.top/potatoplus')">v${pjw.version}</span>`);
    }
  } else if (pjw.site == "xk") {
    pjw.preferences.enabled && pjw.preferences.share_usage_data && $("head").append($(google_analytics_js));
  }

  console.log(`PotatoPlus v${pjw.version} (${pjw.platform}) by Limos`);
  if (pjw.mode == "") return;
  console.log(pjw.mode + " mode activated");

  const custom_toolbar_html = {
  };

  // PJW Toolbar for specific pages
  if (pjw.mode in custom_toolbar_html) {
    $$("body").append(`<div id='pjw-toolbar'><div id="pjw-toolbar-content">` +
      custom_toolbar_html[pjw.mode]
    + `<div class="about-proj"></div></div></div>`);

    const toolbar_button_html = `
      <div id="pjw-toolbar-collapse-bg"><canvas id="pjw-toolbar-collapse" width="30px" height="30px"></canvas></div>
    `;
    $$("#pjw-toolbar").prepend(toolbar_button_html);

    const about_this_project = `
      <span style="user-select: text;">PotatoPlus v` + pjw.version + `</span>
    `;
    $$(".about-proj").html(about_this_project);

    // Draw collapse button
    var canvas = document.getElementById("pjw-toolbar-collapse");
    window.ctx = canvas.getContext('2d');
    ctx.fillStyle = "#63065f";

    ctx.beginPath();
    ctx.moveTo(6, 7);
    ctx.lineTo(6, 23);
    ctx.lineTo(7, 24);
    ctx.lineTo(8, 23);
    ctx.lineTo(8, 7);
    ctx.lineTo(7, 6);
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(22, 6);
    ctx.lineTo(9, 15);
    ctx.lineTo(22, 24);
    ctx.lineTo(23, 25);
    ctx.lineTo(24, 24);
    ctx.lineTo(12, 15);
    ctx.lineTo(24, 6);
    ctx.lineTo(23, 5);
    ctx.fill();
    ctx.closePath();

    // Collapse / Expand toolbar
    function switchToolBar() {
      if (pjw.preferences.is_toolbar_collapsed) expandToolBar();
      else collapseToolBar();
    }
    function collapseToolBar() {
      $$("#pjw-toolbar").css("left", "-100%");
      $$("#pjw-toolbar-collapse-bg").css("background-color", "");
      $$("#pjw-toolbar-collapse").css({
        "position": "fixed",
        "left": "30px",
        "bottom": "30px",
        "top": "calc(100% - 60px)",
        "transform": "rotate(180deg)"
      });
      pjw.preferences.is_toolbar_collapsed = true;
    }
    if (pjw.preferences.is_toolbar_collapsed === true)
      collapseToolBar();
    $$("#pjw-toolbar-collapse-bg").on("click", switchToolBar);
    $$("#pjw-toolbar-collapse").on("mousedown", () => { if (pjw.preferences.is_toolbar_collapsed === false) $$("#pjw-toolbar-collapse-bg").css("background-color", "rgba(255, 255, 255, 1.0)");} );
    $$("#pjw-toolbar-collapse-bg").on("mousedown", () => { if (pjw.preferences.is_toolbar_collapsed === false) $$("#pjw-toolbar-collapse-bg").css("background-color", "rgba(255, 255, 255, 1.0)");} );

    // Show toolbar
    function expandToolBar() {
      $$("#pjw-toolbar").css("left", "");
      $$("#pjw-toolbar").css("opacity", "");
      $$("#pjw-toolbar-collapse").css({
        "position": "",
        "left": "",
        "bottom": "",
        "top": "",
        "transform": ""
      });
      pjw.preferences.is_toolbar_collapsed = false;
    }
  }

  // Initialize ClassList
  const pjw_classlist_mode_list = ["course"];
  if (pjw_classlist_mode_list.includes(pjw.mode)) {
    ClassListPlugin();
  }

  // Storage upgrade upon version upgrade
  if ((pjw.data.version || 0) !== pjw.version) {
    if (localStorage.getItem("version")) {
      localStorage.clear();
    }
    delete pjw.data.bulletin_update_timestamp;
    delete pjw.data.bulletin_content;
    pjw.data.version = pjw.version;
  }

  var enterMode = function(mode) {
    window.pjw_select_mode = pjw.mode;
    class_select_funcs[mode]();
  }

  var getBulletin = function() {
    if ((pjw.data.bulletin_update_timestamp || 0) + 300000 <= new Date().getTime()) {
      const html = `<iframe src="https://potatoplus.zcec.top/apps/potatoplus-bulletin/?version=${pjw.version}&share_stats=${
        (pjw.preferences.share_usage_data || pjw.preferences.login_settings?.share_stats) ? 1 : 0
      }&site=${pjw.site}" width="300" height="300" style="display: none;"></iframe>`;
    
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
            }
          }
        }
      });

      $$("body").append(html);
    }
  }

  // Dispatch to feature-specific modules
  if (pjw.mode == "welcome") {
    // xk/welcome.js handles this
    if (typeof initXKWelcome === "function") {
      initXKWelcome(getBulletin);
    }
  } else if (pjw.mode == "course") {
    // xk/course.js handles this
    $(".user-dropdown").prepend(`<div style="cursor: pointer; color: #4D87F2; line-height: 17px; margin-bottom: 20px;" onclick="window.pjw.switch();window.location.reload();">${pjw.preferences.enabled ? "禁用 PotatoPlus" : "启用 PotatoPlus (Beta)"}</div>`);
    pjw.preferences.enabled && enterMode("course");
  } else {
    return;
  }
};

// Entry point for non-authserver pages
(function() {
  if (pjw.site == "authserver") return; // authserver/captcha.js handles this
  if (document.readyState == "complete")
    potatojw_intl();
  else
    window.addEventListener("load", potatojw_intl);
})();
