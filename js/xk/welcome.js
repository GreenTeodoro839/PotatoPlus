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
        <label for="pjw-solve-captcha-switch">验证码识别（本地）</label>
      </div>
    </div>
  </div>
  `;
  $("div.language").before(pjw_options_html);

  const enable_switch = new window.mdc.switchControl.MDCSwitch(document.getElementById("pjw-enable-switch"));
  enable_switch.selected = pjw.isOn("enabled");
  $("#pjw-enable-switch").on("click", () => {
    const target = $(".pjw-xk-welcome-subsection");
    if (pjw.switch()) target.show();
    else target.hide();
  });

  const share_usage_data_switch = new window.mdc.switchControl.MDCSwitch(document.getElementById("pjw-share-usage-data-switch"));
  share_usage_data_switch.selected = pjw.isOn("share_usage_data");
  if (!pjw.isOn("enabled"))
    $(".pjw-xk-welcome-subsection").hide();
  $("#pjw-share-usage-data-switch").on("click", () => { pjw.toggle("share_usage_data"); });

  const solve_captcha_switch = new window.mdc.switchControl.MDCSwitch(document.getElementById("pjw-solve-captcha-switch"));
  solve_captcha_switch.selected = pjw.isOn("solve_captcha");
  $("#pjw-solve-captcha-switch").on("click", () => {
    if (pjw.toggle("solve_captcha")) initCAPTCHASolver();
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
  let _pendingSolve = false;

  function getCaptchaStamp(imgEl) {
    if (!imgEl) return "";
    const src = imgEl.getAttribute("src") || imgEl.src || "";
    return `${src}|${imgEl.naturalWidth || 0}x${imgEl.naturalHeight || 0}`;
  }

  function isCaptchaStillCurrent(stamp) {
    const cur = document.getElementById("vcodeImg");
    if (!cur || !cur.complete || cur.naturalWidth === 0) return false;
    return getCaptchaStamp(cur) === stamp;
  }

  async function solveXKCAPTCHA() {
    if (!pjw.isOn("solve_captcha") || $("#loginDiv").css("display") === "none") return;
    const imgEl = document.getElementById("vcodeImg");
    if (!imgEl || !imgEl.complete || imgEl.naturalWidth === 0) return;
    if (_solvingCaptcha) {
      _pendingSolve = true;
      return;
    }
    _solvingCaptcha = true;
    _pendingSolve = false;

    const stamp = getCaptchaStamp(imgEl);
    showCaptchaToast("正在识别验证码...", false);

    try {
      const b64 = getImgBase64(imgEl);
      if (!b64) throw new Error("无法获取验证码图片");
      if (!window.pjwONNX) throw new Error("本地识别模块未加载");

      const result = await window.pjwONNX.solveXK(b64);

      if (!isCaptchaStillCurrent(stamp)) return;

      const points = result.points;
      const curImgEl = document.getElementById("vcodeImg");
      if (!curImgEl || !curImgEl.complete || curImgEl.naturalWidth === 0) return;
      const scaleX = curImgEl.clientWidth / curImgEl.naturalWidth;
      const scaleY = curImgEl.clientHeight / curImgEl.naturalHeight;
      for (let i = 0; i < points.length; i++) {
        if (!isCaptchaStillCurrent(stamp)) return;
        const [px, py] = points[i];
        simulateClick(curImgEl, px * scaleX, py * scaleY);
        if (i < points.length - 1)
          await new Promise(r => setTimeout(r, 80));
      }

      if (!isCaptchaStillCurrent(stamp)) return;

      const verifyCode = points.map(([x, y]) =>
        `${Math.round(x)}-${Math.round(y * 5 / 6)}`
      ).join(",");
      $("input#verifyCode").val(verifyCode);

      showCaptchaToast(`识别完成 (${result.time_ms.toFixed(0)}ms)`, false);
      console.log("[PotatoPlus] Captcha solved:", verifyCode);
    } catch (e) {
      if (!isCaptchaStillCurrent(stamp)) return;
      console.log("[PotatoPlus] Captcha solve failed:", e.message);
      showCaptchaToast(`验证码识别失败: ${e.message}`, true);
      if (e.message === "Failed to segment/match characters") {
        setTimeout(() => { $(".verify-refresh").trigger("click"); }, 100);
      }
    } finally {
      _solvingCaptcha = false;
      if (_pendingSolve) {
        _pendingSolve = false;
        solveXKCAPTCHA();
      }
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

    $("#vcodeImg").on("load", () => { solveXKCAPTCHA(); });

    pjw.captcha_initialized = true;
  }

  pjw.isOn("enabled") && pjw.isOn("solve_captcha") && initCAPTCHASolver();

  const welcome_html = `
    <div class="pjw-xk-welcome-card">
      <div id="pjw-bulletin-content" style="font-size: 14px;">${pjw.data.bulletin_content || ""}</div>
      <div class="pjw-xk-welcome-link-container">
        <a href="https://potatoplus.zcec.top/potatoplus" target="_blank" style="font-weight: bold;">PotatoPlus ${pjw.version}</a>
        <a href="https://github.com/GreenTeodoro839/PotatoPlus" target="_blank">GitHub</a>
      </div>
      <div class="pjw-xk-welcome-link-container">
        <a href="https://potatoplus.zcec.top/potato-mailing-list/" target="_blank">加入邮件列表</a>
        <a href="mailto:zhy9559@qq.com">发送反馈邮件</a>
        <a href="https://potatoplus.zcec.top/about" target="_blank">@小猪</a>
      </div>
    </div>
  `;

  $("div.language").before(welcome_html);
  if (!pjw.isOn("enabled"))
    $(".pjw-xk-welcome-card").hide();

  getBulletin();
}
