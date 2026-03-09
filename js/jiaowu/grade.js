// jiaowu/grade.js - GPA计算器 / 成绩查看
// Depends on: common/core.js (pjw), common/classlist.js, common/console.js, common/lib.js, jQuery ($$)

function initGradeInfo() {
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
}
