// xk/welcome.js - 选课系统登录页 (welcome page + xk captcha solver)
// Depends on: common/core.js (pjw), jQuery ($)

function initXKWelcome(getBulletin) {
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
}
