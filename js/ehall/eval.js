// ehall/eval.js - 新版评教自动评价 (ehall.nju.edu.cn 网上评教应用)
// 基于 https://github.com/SuperKenVery/NJU-judge-teaching
// 在评教主页注入一键评教按钮，点击后自动完成所有评教

(function() {
  "use strict";

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function xpath(query, index) {
    index = index || 1;
    var matches = document.evaluate(query, document, null, XPathResult.ANY_TYPE, null);
    var result;
    for (var i = 0; i < index; i++) {
      result = matches.iterateNext();
    }
    return result;
  }

  // 所有选项选"很好"
  function allgood() {
    var index = 1;
    var good = xpath(
      '//div[@id="txwj-index-card"]//label[text()[contains(.,"很好")]]//input[@type="radio"]',
      index
    );
    console.info("[PotatoPlus] 全部打很好");
    while (good != null) {
      good.checked = true;
      index++;
      good = xpath(
        '//div[@id="txwj-index-card"]//label[text()[contains(.,"很好")]]//input[@type="radio"]',
        index
      );
    }
  }

  // 提交评教
  async function submitEval() {
    var submit = xpath('//footer[@id="txwjFooter"]//a[text()[contains(.,"提交")]]');
    if (!submit) {
      console.warn("[PotatoPlus] 找不到提交按钮");
      return;
    }
    console.info("[PotatoPlus] 提交");
    submit.click();

    await sleep(200);

    var confirm = xpath('//a[text()[contains(.,"确认")]]');
    if (confirm) {
      console.info("[PotatoPlus] 确认提交");
      confirm.click();
    }

    await sleep(4000);

    var no_recommend = xpath('//div[@id="buttons"]//button[text()[contains(.,"暂不推荐")]]');
    if (no_recommend) {
      console.info("[PotatoPlus] 跳过推荐最喜爱的老师");
      no_recommend.click();
    }

    await sleep(200);

    var no_tas = xpath('//div[@class="bh-dialog-btnContainerBox"]//a[text()[contains(.,"暂时不评")]]');
    if (no_tas) {
      console.info("[PotatoPlus] 跳过助教评价");
      no_tas.click();
    }
  }

  // 进入下一个待评教课程
  var next_judge_button_index = 1;
  async function nextCourse() {
    var judge_next = xpath(
      '//section[@class="ckdwpj"]//div[@style="display: block;"]//div[@class="card-btn blue"]',
      next_judge_button_index
    );
    if (judge_next == null) {
      console.info("[PotatoPlus] 没有下一个要评价了");
      return false;
    }

    console.info("[PotatoPlus] 评价下一个", judge_next);
    judge_next.click();

    // 检测是否因已出成绩而无法评教
    await sleep(700);
    var cannot_judge = xpath('//div[@class="bh-tip-top-bar"]');
    if (cannot_judge != null) {
      console.warn("[PotatoPlus] 该课程无法评教，跳过");
      next_judge_button_index += 1;
      var close = xpath('//a[@class="bh-tip-closeIcon"]');
      if (close) close.click();
      await sleep(700);
      return await nextCourse();
    }

    return true;
  }

  // 主流程：循环评教所有课程
  async function autoEvalAll() {
    next_judge_button_index = 1;
    var count = 0;
    updateButton("running");

    while (await nextCourse()) {
      await sleep(1000);
      allgood();
      await submitEval();
      await sleep(500);
      count++;
      updateButton("running", count);
    }

    console.log("[PotatoPlus] 自动评教完成，共评价 " + count + " 门课程");
    updateButton("done", count);
  }

  // --- UI: 注入按钮到评教主页 ---

  var btnEl = null;

  function updateButton(state, count) {
    if (!btnEl) return;
    if (state === "running") {
      btnEl.textContent = "🔄 评教中..." + (count ? " (" + count + " 门已完成)" : "");
      btnEl.style.backgroundColor = "#ff9800";
      btnEl.style.pointerEvents = "none";
    } else if (state === "done") {
      btnEl.textContent = "✅ 评教完成！共 " + (count || 0) + " 门";
      btnEl.style.backgroundColor = "#4caf50";
      btnEl.style.pointerEvents = "none";
    } else {
      btnEl.textContent = "⚡ PotatoPlus 一键评教";
      btnEl.style.backgroundColor = "#90138b";
      btnEl.style.pointerEvents = "auto";
    }
  }

  function injectButton() {
    // 等待页面 SPA 渲染完成后注入
    var attempts = 0;
    var maxAttempts = 30;

    function tryInject() {
      attempts++;

      // 尝试找到评教主页的容器（金智 WIS 框架的 xspj 模块）
      var container = document.querySelector(".xspj")
        || document.querySelector("[data-pageid]")
        || document.querySelector(".bh-paper-pile");

      if (!container && attempts < maxAttempts) {
        setTimeout(tryInject, 500);
        return;
      }

      // 创建按钮
      btnEl = document.createElement("div");
      btnEl.id = "pjw-auto-eval-btn";
      btnEl.textContent = "⚡ PotatoPlus 一键评教";
      btnEl.style.cssText = [
        "position: fixed",
        "bottom: 24px",
        "right: 24px",
        "z-index: 99999",
        "background-color: #90138b",
        "color: #fff",
        "padding: 12px 24px",
        "border-radius: 28px",
        "font-size: 15px",
        "font-weight: 500",
        "cursor: pointer",
        "box-shadow: 0 4px 16px rgba(144, 19, 139, 0.4)",
        "transition: all 0.3s ease",
        "user-select: none",
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      ].join(";");

      btnEl.addEventListener("mouseenter", function() {
        if (btnEl.style.pointerEvents !== "none") {
          btnEl.style.transform = "scale(1.05)";
          btnEl.style.boxShadow = "0 6px 20px rgba(144, 19, 139, 0.5)";
        }
      });
      btnEl.addEventListener("mouseleave", function() {
        btnEl.style.transform = "scale(1)";
        btnEl.style.boxShadow = "0 4px 16px rgba(144, 19, 139, 0.4)";
      });

      btnEl.addEventListener("click", function() {
        // 需要先进入"待我评教"页面
        var dwpjTab = xpath('//section[@class="xspj"]//div[@type="dwpj"]')
          || document.querySelector("[type='dwpj']");
        
        if (dwpjTab) {
          console.info("[PotatoPlus] 点击'待我评教'");
          dwpjTab.click();
          // 等待页面切换后开始评教
          setTimeout(function() {
            autoEvalAll();
          }, 1500);
        } else {
          // 可能已经在待我评教页面了
          autoEvalAll();
        }
      });

      document.body.appendChild(btnEl);
      console.log("[PotatoPlus] 一键评教按钮已注入");
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() {
        setTimeout(tryInject, 1000);
      });
    } else {
      setTimeout(tryInject, 1000);
    }
  }

  injectButton();
})();
