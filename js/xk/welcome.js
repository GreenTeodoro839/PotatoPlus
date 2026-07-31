// xk/welcome.js - 选课系统登录页 (welcome page + xk captcha solver)
// Depends on: common/core.js (pjw), jQuery ($)

function initXKWelcome(getBulletin) {

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
    if (!pjw.featureOn("xk.captcha") || $("#loginDiv").css("display") === "none") return;
    const imgEl = document.getElementById("vcodeImg");
    if (!imgEl || !imgEl.complete || imgEl.naturalWidth === 0) return;
    if (_solvingCaptcha) return;
    _solvingCaptcha = true;

    showCaptchaToast("正在识别验证码...", false);

    try {
      const startedAt = performance.now();
      const solver = await getPjwXKCaptchaSolver();
      const points = await solver.solve(imgEl);
      if (!Array.isArray(points) || points.length !== 4)
        throw new Error("识别结果格式不正确");

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

      const elapsed = performance.now() - startedAt;
      showCaptchaToast(`识别完成 (${elapsed.toFixed(0)}ms)`, false);
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

  pjw.featureOn("xk.captcha") && initCAPTCHASolver();

  const welcome_html = `
    <div class="pjw-xk-welcome-card">
      <div id="pjw-bulletin-content" style="font-size: 14px;">${pjw.data.bulletin_content || ""}</div>
      <div class="pjw-xk-welcome-link-container">
        <a href="https://potatoplus.zcec.top" target="_blank" style="font-weight: bold;">PotatoPlus ${pjw.version}</a>
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
  if (!pjw.featureOn("xk.beautify"))
    $(".pjw-xk-welcome-card").hide();

  pjw.renderUpdateNotice(".pjw-xk-welcome-card");
  getBulletin();
}
