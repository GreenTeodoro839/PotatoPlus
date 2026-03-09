// jiaowu/eval.js - 自动评教功能
// Depends on: common/core.js (pjw), jQuery ($$)

function initCourseEval() {
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
}
