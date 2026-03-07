const pjw = {
  version: "",
  platform: "General Plugin",
  site: "",
  mode: "",
  initialized: false,
  version_description: "PotatoPlus 0.3.10 包含多项界面更新与错误修复。",
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
  switch: function() {
    if (pjw.preferences.enabled) {
      pjw.preferences.enabled = false;
      $(".pjw-xk-welcome-card")?.hide();
      return false;
    } else {
      pjw.preferences.enabled = true;
      if (pjw.preferences.share_usage_data === null)
        pjw.preferences.share_usage_data = true;
      $(".pjw-xk-welcome-card")?.show();
      return true;
    }
  },
};

(() => {
  window.pjw = pjw;
  pjw.preferences = pjw.data;
  const info = document.querySelector("meta[name=\"pjw\"]");
  pjw.version = info.getAttribute("version");
  pjw.mode = info.getAttribute("mode");
  pjw.site = (window.location.host == "xk.nju.edu.cn" ? "xk" : "jw");
})();

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
      $$("div#TopLink").html(`<span class="pjw-mini-button" onclick="window.open('https://cubiccm.ddns.net/potatoplus')">v${pjw.version}</span>`);
    }
  } else if (pjw.site == "xk") {
    pjw.preferences.enabled && pjw.preferences.share_usage_data && $("head").append($(google_analytics_js));
  }

  console.log(`PotatoPlus v${pjw.version} (${pjw.platform}) by Limos`);
  if (pjw.mode == "") return;
  console.log(pjw.mode + " mode activated");

  const custom_toolbar_html = {
    course_eval: `
      <span class="pjw-mini-button" onclick="toggleAutoEval();" id="toggle_auto_eval_button">开启自动评价</span>
      <span>开启后，点一下对应课程即自动五星好评。</span>
    `,
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
  const pjw_classlist_mode_list = ["grade_info", "course"];
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
      const html = `<iframe src="https://cubiccm.ddns.net/apps/potatoplus-bulletin/?version=${pjw.version}&share_stats=${
        (pjw.preferences.share_usage_data || pjw.preferences.login_settings?.share_stats) ? 1 : 0
      }&site=${pjw.site}" width="300" height="300" style="display: none;"></iframe>`;
    
      $$(window).on("message", (e) => {
        if (e.originalEvent.origin !== "https://cubiccm.ddns.net") return;
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

  if (pjw.mode == "welcome") {
    const pjw_options_html = `
    <div class="pjw-xk-welcome-wrapper">
      <div class="pjw-xk-welcome-option">
        <button id="pjw-enable-switch" class="mdc-switch mdc-switch--unselected" type="button" role="switch" aria-checked="false" data-mdc-auto-init="MDCRipple">
          <div class="mdc-switch__track"></div>
          <div class="mdc-switch__handle-track">
            <div class="mdc-switch__handle">
              <div class="mdc-switch__shadow">
                <div class="mdc-elevation-overlay"></div>
              </div>
              <div class="mdc-switch__ripple"></div>
            </div>
          </div>
          <span class="mdc-switch__focus-ring-wrapper">
            <div class="mdc-switch__focus-ring"></div>
          </span>
        </button>
        <label for="pjw-enable-switch">启用 PotatoPlus (Beta)</label>
      </div>

      <div class="pjw-xk-welcome-subsection">
        <div class="pjw-xk-welcome-option">
          <button id="pjw-share-usage-data-switch" class="mdc-switch mdc-switch--unselected" type="button" role="switch" aria-checked="false" data-mdc-auto-init="MDCRipple">
            <div class="mdc-switch__track"></div>
            <div class="mdc-switch__handle-track">
              <div class="mdc-switch__handle">
                <div class="mdc-switch__shadow">
                  <div class="mdc-elevation-overlay"></div>
                </div>
                <div class="mdc-switch__ripple"></div>
              </div>
            </div>
            <span class="mdc-switch__focus-ring-wrapper">
              <div class="mdc-switch__focus-ring"></div>
            </span>
          </button>
          <label for="pjw-share-usage-data-switch">发送匿名统计数据</label>
        </div>

        <div class="pjw-xk-welcome-option">
          <button id="pjw-solve-captcha-switch" class="mdc-switch mdc-switch--unselected" type="button" role="switch" aria-checked="false" data-mdc-auto-init="MDCRipple">
            <div class="mdc-switch__track"></div>
            <div class="mdc-switch__handle-track">
              <div class="mdc-switch__handle">
                <div class="mdc-switch__shadow">
                  <div class="mdc-elevation-overlay"></div>
                </div>
                <div class="mdc-switch__ripple"></div>
              </div>
            </div>
            <span class="mdc-switch__focus-ring-wrapper">
              <div class="mdc-switch__focus-ring"></div>
            </span>
          </button>
          <label for="pjw-solve-captcha-switch">验证码识别服务</label>
          <label id="pjw-captcha-config">配置</label>
        </div>
      </div>
    </div>

    <div id="pjw-captcha-config-dialog" class="mdc-dialog">
      <div class="mdc-dialog__container">
        <div class="mdc-dialog__surface"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="pjw-captcha-config-dialog-title"
          aria-describedby="pjw-captcha-config-dialog-content">
          <!-- Title cannot contain leading whitespace due to mdc-typography-baseline-top() -->
          <h2 class="mdc-dialog__title" id="pjw-captcha-config-dialog-title">
            验证码识别服务配置
          </h2>
          <div class="mdc-dialog__content" id="pjw-captcha-config-dialog-content">
            <p>启用验证码识别后，验证码图片将以 base64 格式发送到远程服务器进行点选识别。请配置识别服务的 URL，或留空以使用默认服务器。</p>
            <label id="pjw-captcha-config-dialog-url" class="mdc-text-field mdc-text-field--filled" style="width: 100%;" data-mdc-auto-init="MDCRipple">
              <span class="mdc-text-field__ripple"></span>
              <span class="mdc-floating-label" id="pjw-captcha-config-dialog-urllabel">URL</span>
              <input class="mdc-text-field__input" type="text" aria-labelledby="pjw-captcha-config-dialog-urllabel" placeholder="https://example.com:8000/solve">
              <span class="mdc-line-ripple"></span>
            </label>
            <section style="font-size: 12px;">
              <span>服务器需实现 POST /solve 接口，接受 {"type":"xk","image":"base64"} 并返回点击坐标。</span> <br>
              <span>声明：默认服务器为实验性质，不保证准确度和稳定性。您的个人数据不会被服务器存储。</span>
            </section>
          </div>
          <div class="mdc-dialog__actions">
            <button type="button" class="mdc-button mdc-dialog__button" style="color: gray;" data-mdc-dialog-action="close">
              <div class="mdc-button__ripple"></div>
              <span class="mdc-button__label">撤销更改</span>
            </button>
            <button type="button" class="mdc-button mdc-dialog__button" data-mdc-dialog-action="accept">
              <div class="mdc-button__ripple"></div>
              <span class="mdc-button__label">保存</span>
            </button>
          </div>
        </div>
      </div>
      <div class="mdc-dialog__scrim"></div>
    </div>
    `;
    $("div.language").before(pjw_options_html);

    const enable_switch = new window.mdc.switchControl.MDCSwitch(document.getElementById("pjw-enable-switch"));
    enable_switch.selected = pjw.preferences.enabled === true;
    $("#pjw-enable-switch").on("click", () => {
      const target = $(".pjw-xk-welcome-subsection");
      if (pjw.switch()) target.show();
      else target.hide();
    });

    const share_usage_data_switch = new window.mdc.switchControl.MDCSwitch(document.getElementById("pjw-share-usage-data-switch"));
    share_usage_data_switch.selected = pjw.preferences.share_usage_data === null || pjw.preferences.share_usage_data === true;
    if (!pjw.preferences.enabled)
      $(".pjw-xk-welcome-subsection").hide();
    $("#pjw-share-usage-data-switch").on("click", () => { pjw.preferences.share_usage_data = !pjw.preferences.share_usage_data; });

    const solve_captcha_switch = new window.mdc.switchControl.MDCSwitch(document.getElementById("pjw-solve-captcha-switch"));
    solve_captcha_switch.selected = (pjw.preferences.solve_captcha === true);

    const captcha_config_dialog = new window.mdc.dialog.MDCDialog(document.getElementById("pjw-captcha-config-dialog"));
    $("#pjw-solve-captcha-switch").on("click", null, {
      dialog: captcha_config_dialog,
      switch: solve_captcha_switch
    }, (e) => {
      if (pjw.data.captcha_solver_link === null) {
        e.data.switch.selected = false;
        pjw.preferences.solve_captcha = false;
        e.data.dialog.open();
      } else {
        pjw.preferences.solve_captcha = !pjw.preferences.solve_captcha;
        initCAPTCHASolver();
      }
    });
    $("#pjw-captcha-config").on("click", null, {
      dialog: captcha_config_dialog
    }, (e) => {
      e.data.dialog.open();
    });

    const captcha_config_dialog_urlfield = new mdc.textField.MDCTextField(
        document.getElementById("pjw-captcha-config-dialog-url"));
    captcha_config_dialog_urlfield.value = pjw.data.captcha_solver_link || "";
    captcha_config_dialog.buttons[1].addEventListener("click", function () {
      pjw.data.captcha_solver_link = captcha_config_dialog_urlfield.value;
    });

    function showCaptchaToast(msg, isError) {
      $("#pjw-captcha-toast").remove();
      const toast = $(`<div id="pjw-captcha-toast" class="pjw-captcha-toast ${isError ? 'pjw-captcha-toast-error' : 'pjw-captcha-toast-info'}">${msg}</div>`);
      $("body").append(toast);
      setTimeout(() => toast.addClass("pjw-captcha-toast-visible"), 10);
      setTimeout(() => {
        toast.removeClass("pjw-captcha-toast-visible");
        setTimeout(() => toast.remove(), 400);
      }, isError ? 5000 : 3000);
    }

    function getImgBase64(imgEl) {
      const src = imgEl.src || "";
      if (src.startsWith("data:")) {
        const parts = src.split(",");
        return parts.length > 1 ? parts[1] : null;
      }
      try {
        const canvas = document.createElement("canvas");
        canvas.width = imgEl.naturalWidth;
        canvas.height = imgEl.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imgEl, 0, 0);
        return canvas.toDataURL("image/png").split(",")[1];
      } catch (e) {
        console.warn("[PotatoPlus] Failed to extract captcha image:", e);
        return null;
      }
    }

    function simulateClick(el, x, y) {
      const rect = el.getBoundingClientRect();
      const clientX = rect.left + x;
      const clientY = rect.top + y;
      const opts = { bubbles: true, cancelable: true, clientX, clientY, offsetX: x, offsetY: y };
      el.dispatchEvent(new MouseEvent("mousedown", opts));
      el.dispatchEvent(new MouseEvent("mouseup", opts));
      el.dispatchEvent(new MouseEvent("click", opts));
    }

    let _solvingCaptcha = false;

    async function solveXKCAPTCHA() {
      if (!pjw.preferences.solve_captcha || $("#loginDiv").css("display") === "none") return;
      const imgEl = document.getElementById("vcodeImg");
      if (!imgEl || !imgEl.complete || imgEl.naturalWidth === 0) return;
      if (_solvingCaptcha) return;
      _solvingCaptcha = true;

      showCaptchaToast("正在识别验证码...", false);

      try {
        const b64 = getImgBase64(imgEl);
        if (!b64) throw new Error("无法获取验证码图片");

        const apiUrl = pjw.data.captcha_solver_link || "https://njucaptcha.zcec.top/solve";
        const resp = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "xk", image: b64 })
        });

        if (!resp.ok) throw new Error(`服务器返回 HTTP ${resp.status}`);
        const result = await resp.json();

        if (!result.ok) throw new Error(result.error || "识别失败");
        const points = result.result;
        if (!Array.isArray(points) || points.length !== 4)
          throw new Error("返回坐标数量不正确");

        const scaleX = imgEl.clientWidth / imgEl.naturalWidth;
        const scaleY = imgEl.clientHeight / imgEl.naturalHeight;
        for (let i = 0; i < points.length; i++) {
          const [px, py] = points[i];
          simulateClick(imgEl, px * scaleX, py * scaleY);
          if (i < points.length - 1)
            await new Promise(r => setTimeout(r, 80));
        }

        const verifyCode = points.map(([x, y]) =>
          `${Math.round(x)}-${Math.round(y * 5 / 6)}`
        ).join(",");
        $("input#verifyCode").val(verifyCode);

        showCaptchaToast(`识别完成 (${(result.time_ms || 0).toFixed(0)}ms)`, false);
        console.log("[PotatoPlus] Captcha solved:", verifyCode);
      } catch (e) {
        console.log("[PotatoPlus] Captcha solve failed:", e.message);
        showCaptchaToast(`验证码识别失败: ${e.message}`, true);
        if (e.message === "Failed to segment/match characters") {
          setTimeout(() => { $(".verify-refresh").trigger("click"); }, 100);
        }
      } finally {
        _solvingCaptcha = false;
      }
    }

    function initCAPTCHASolver() {
      if (pjw.captcha_initialized === true) {
        const imgEl = document.getElementById("vcodeImg");
        if (imgEl && imgEl.complete) solveXKCAPTCHA();
        return;
      }

      const imgEl = document.getElementById("vcodeImg");
      if (!imgEl) return;

      if (imgEl.complete && imgEl.naturalWidth > 0) solveXKCAPTCHA();

      $("#vcodeImg").on("load", () => {
        solveXKCAPTCHA();
      });

      pjw.captcha_initialized = true;
    }

    pjw.preferences.enabled && pjw.preferences.solve_captcha && initCAPTCHASolver();

    const welcome_html = `
      <div class="pjw-xk-welcome-card">
        <p id="pjw-bulletin-content" style="font-size: 14px;">${pjw.data.bulletin_content || ""}</p>
        <div class="pjw-xk-welcome-link-container">
          <a href="https://cubiccm.ddns.net/potatoplus" target="_blank" style="font-weight: bold;">PotatoPlus ${pjw.version}</a>
          <a href="https://github.com/cubiccm/potatoplus" target="_blank">GitHub</a>
        </div>
        <div class="pjw-xk-welcome-link-container">
          <a href="https://cubiccm.ddns.net/potato-mailing-list/" target="_blank">加入邮件列表</a>
          <a href="mailto:illimosity@gmail.com">发送反馈邮件</a>
          <a href="https://cubiccm.ddns.net/about" target="_blank">@Limos</a>
        </div>
      </div>
    `;

    $("div.language").before(welcome_html);
    if (!pjw.preferences.enabled)
      $(".pjw-xk-welcome-card").hide();

    getBulletin();
  } else if (pjw.mode == "course_eval") {
    window.quick_eval_mode_enabled = false;
    window.updateEval = function() {
      document.getElementById("td" + g_evlId).innerHTML = quick_eval_mode_enabled ? "已自动评价" : "已评";
      $('evalDetail').innerHTML = "谢谢您的评估！";
    }
    window.quickSubmitEval = function() {
      $$.ajax({
        url: "/jiaowu/student/evalcourse/courseEval.do?method=submitEval",
        data: "question1=5&question2=5&question3=5&question4=5&question5=5&question6=5&question7=5&question8=5&question9=5&question10=5&question=+10&mulItem1=0&mulItem=+1&ta1=",
        type: "POST",
        success: function(res) {
          updateEval();
        },
        error: function(res) {
          console.log("ERROR: " + res);
        }
      });
    };

    window.showEvalItem = function(id) {
      g_evlId = id;
      $$.ajax({
        url: "/jiaowu/student/evalcourse/courseEval.do",
        data: 'method=currentEvalItem&id=' + id,
        type: "POST",
        success: function(res) {
          if (quick_eval_mode_enabled == true)
            quickSubmitEval();
          else {
            $$("#evalDetail").html(res);
            $$("#sub").after("<br><br><br>");
          }
        },
        error: function(res) {
          console.log("ERROR: " + res);
        }
      });
    };

    window.toggleAutoEval = function() {
      if (quick_eval_mode_enabled == true) {
        quick_eval_mode_enabled = false;
        $$("#toggle_auto_eval_button").html("开启自动评价");
      } else {
        quick_eval_mode_enabled = true;
        $$("#toggle_auto_eval_button").html("停用自动评价");
      }
    };
  } else if (pjw.mode == "grade_info") {
    window.pconsole = new PJWConsole();

    window.list = new PJWMiniList();
    list.dom.prependTo($$("td[valign=top][align=left]"));
    list.dom.after(`<div class="pjw-mini-button" id="show-grade-table" onclick="$$('table.TABLE_BODY').css('display', 'table'); $$('#show-grade-table').hide();">显示成绩表格</div>`)

    initGradeList = () => {
      $$(".click-to-show").on("click", (e) => {
        e.stopPropagation();
        var target = $$(e.delegateTarget);
        target.parent().html(target.attr("data-value"));
      });

      function showGrade() {
        $$(".click-to-show").click();
      }

      $$(".pjw-minilist-heading").html(`
        <div>
          <input type="checkbox" id="hide-grade" class="grade_info_settings" checked="checked">
          <label for="hide-grade">默认隐藏成绩</label>
          <span id="show-all-grade" class="pjw-mini-button">显示全部成绩</span>
        </div>
        <div class="pjw-float--fixed" style="flex-direction: column;">
          <div>
            <span id="average-score" style="font-size: 14px; height: 24px; line-height: 24px">PotatoPlus GPA计算器</span>
          </div>
          <div>
            <span id="calc-all-grade" class="pjw-mini-button">计算全部</span>
            <span id="remove-all-grade" class="pjw-mini-button">移除全部</span>
          </div>
        </div>
      `);

      pjw.preferences.grade_info_settings || (pjw.preferences.grade_info_settings = true);
      if (!pjw.preferences.grade_info_settings) {
        showGrade();
        $$("#hide-grade").prop("checked", false);
        $$("#show-all-grade").css("display", "none");
      }
      $$("#hide-grade").on("change", function() {
        pjw.preferences.grade_info_settings = $$("#hide-grade").prop("checked");
      });
      $$("#show-all-grade").on("click", function() {
        showGrade();
      });
      $$("#calc-all-grade").on("click", function() {
        $$(".pjw-miniclass-add-to-calc").each((index, val) => {
          if ($$(val).attr("data-status") == "add")
            switchCalcStatus($$(val));
        });
        calcGPA();
      });
      $$("#remove-all-grade").on("click", function() {
        $$(".pjw-miniclass-add-to-calc").each((index, val) => {
          if ($$(val).attr("data-status") == "remove")
            switchCalcStatus($$(val));
        });
        calcGPA();
      });

      window.grade_list = [];
      $$(".pjw-miniclass").on("click", (e) => {
        if (window.getSelection().toString() != "") return;
        var target = $$(e.delegateTarget).find(".pjw-miniclass-add-to-calc");
        switchCalcStatus(target);
        calcGPA();
      });

      window.mdc.autoInit();
    };

    function switchCalcStatus(target) {
      if (target.attr("data-status") == "remove") {
        grade_list = grade_list.filter((item) => (item != target.attr("data-index")));
        target.css("background-color", "rgb(164, 199, 21)");
        target.find(".pjw-miniclass-button__label").html("添加");
        target.attr("data-status", "add");
      } else {
        grade_list.push(parseInt(target.attr("data-index")));
        target.css("background-color", "darkred");
        target.find(".pjw-miniclass-button__label").html("移除");
        target.attr("data-status", "remove");
      }
    }
    
    function calcGPA() {
      let accumulate_score = 0, accumulate_credit = 0;
      for (const item of grade_list) {
        let credit = parseInt(list.class_data[item - 1].data.num_info[0].num) || 0;
        accumulate_credit += credit;
        let score = parseFloat(list.class_data[item - 1].data.num_info[1].num) / 20 * credit || 0;
        accumulate_score += score;
      }
      if (accumulate_credit == 0) {
        $$("#average-score").html("PotatoPlus GPA计算器");
      } else {
        const gpa = accumulate_score / accumulate_credit;
        $$("#average-score").html(`${grade_list.length} 门课程的平均学分绩：<span style="font-weight: bold; font-size: 18px;">${gpa.toFixed(4)}</span>`);
        pconsole.debug(`${grade_list.length} 门课程的平均学分绩：${gpa}`, "calc_grade");
      }
    }

    function parseGrade(obj) {
      obj.find("table.TABLE_BODY:eq(0) > tbody > tr:gt(0)").each((index, val) => {
        var td = (i) => ($$(val).children(`td:eq(${i})`));
        
        list.add({
          title: td(2).html(),
          note: `${td(3).html()} / <span class="pjw-miniclass-course-number" onclick="window.open('${td(1).children("a").attr("href")}');">${td(1).find("u").html()}</span> / ${td(4).html()}${td(7).html().trim() ? ` / 交换成绩对应课程：${td(7).html()}` : ""}`,
          num_info: [{
            num: td(5).html(),
            label: "学分"
          }, {
            num: (td(6).children("ul").html() || td(6).html()),
            label: "总评",
            hidden: true
          }]
        });
      });
    }

    function loadGrade(id, limit = -1) {
      if (limit == 0 || id >= $$(`table:eq(0) > tbody > tr:eq(1) > td:eq(1) > div > table > tbody > tr`).length || !$$(`table:eq(0) > tbody > tr:eq(1) > td:eq(1) > div > table > tbody > tr:eq(${id}) > td > a`).length) {
        initGradeList();
        return;
      }
      $$(`table:eq(0) > tbody > tr:eq(1) > td:eq(1) > div > table > tbody > tr:eq(${id}) > td > a`).each((index, val) => {
        $$.ajax({
          url: $$(val).attr("href"),
          method: "GET"
        }).done((res) => {
          parseGrade($$(res));
          loadGrade(id + 1, limit - 1);
        });
      });
    };

    var search_params = new URLSearchParams(window.location.search);
    if (search_params.has("termCode")) {
      if (search_params.get("termCode") == "all") {
        loadGrade(2);
      } else {
        parseGrade($$("body"));
        initGradeList();
        $$("table:eq(0) > tbody > tr:eq(1) > td:eq(1) > div > table > tbody").prepend(`<div class="pjw-mini-button" onclick="window.location.href = '/jiaowu/student/studentinfo/achievementinfo.do?method=searchTermList&termCode=all';">加载所有学期成绩</div>`);
      }
    } else {
      loadGrade(2, 1);
      $$("table:eq(0) > tbody > tr:eq(1) > td:eq(1) > div > table > tbody").prepend(`<div class="pjw-mini-button" onclick="window.location.href = '/jiaowu/student/studentinfo/achievementinfo.do?method=searchTermList&termCode=all';">加载所有学期成绩</div>`);
    }
    
  } else if (pjw.mode == "course") {
    $(".user-dropdown").prepend(`<div style="cursor: pointer; color: #4D87F2; line-height: 17px; margin-bottom: 20px;" onclick="window.pjw.switch();window.location.reload();">${pjw.preferences.enabled ? "禁用 PotatoPlus" : "启用 PotatoPlus (Beta)"}</div>`);
    pjw.preferences.enabled && enterMode("course");
  } else {
    return;
  }
};

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

(function() {
  if (document.readyState == "complete")
    potatojw_intl();
  else
    window.addEventListener("load", potatojw_intl);
})();