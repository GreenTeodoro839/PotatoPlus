var class_select_funcs = {

"course":
function() {
  window.getListParam = function(page) {
    function getOrderString() {
      var order = '';
      var $orderDomArr = $('.result-container .course-order[data-order="order"]');
      if ($orderDomArr.length == 0) {
        $orderDomArr = $('.result-container .course-order[data-order="desc"]');
      }
      if ($orderDomArr.length > 0) {
        var orderField = $orderDomArr.eq(0).attr('data-type');
        switch (orderField) {
          case 'KCH':
            order += 'courseNumber';
            break;
          case 'KCMC':
            order += 'courseName';
            break;
          case 'XF':
            order += 'credit';
            break;
          case 'JSMC':
            order += 'teacherName';
            break;
          case 'SJDD':
            order += 'teachingPlace';
            break;
          case 'YXRS':
            order += 'classCapacity';
            break;
          case 'XQ':
            order += 'campusName';
            break;
          case 'XKFS':
            order += 'typeName';
            break;
          case 'BJS':
            order += 'number';
            break;
          case 'BZ':
            order += 'extInfo';
            break;
          case 'KCXZ':
            order += 'courseNatureName';
            break;
          case 'KCLB':
            order += 'courseSection';
            break;
          case 'KKDW':
            order += 'departmentName';
            break;
          case 'TXSJ':
            order += 'deleteOperateTime';
            break;
          case 'NJ':
            order += 'recommendGrade';
            break;
          default:
            break;
        }
        if ($orderDomArr.eq(0).attr('data-order') == 'desc') {
          order += ' -';
        } else {
          order += ' +';
        }
      }
      return order;
    }
    var content = $('.search-input').val();
    content = content == null ? '' : content;
    if (content) {
      content = content.replace(/\\/g, '\\\\').replace(/\"/g, '\\\"');
    }
    var studentInfo = JSON.parse(sessionStorage.getItem('studentInfo')); //学生信息
    var studentCode = studentInfo.code; // 学号
    // 选课批次
    var electiveBatch = studentInfo.electiveBatch;
    var electiveBatchCode = electiveBatch.code;
    // 当前校区
    var currentCampus = JSON.parse(sessionStorage.getItem('currentCampus'));
    var campus = currentCampus.code; // 校区
    var teachingClassType = sessionStorage.getItem("teachingClassTypeSecond"); // 教学班类型
    if (!teachingClassType) {
      teachingClassType = sessionStorage.getItem("teachingClassType"); // 教学班类型
    }
    var queryData = '{"studentCode":"' + studentCode + '","electiveBatchCode":"' + electiveBatchCode + '","teachingClassType":"' + teachingClassType + '"';
    if (campus) {
      queryData += ',"campus":"' + campus + '"';
    }
    var type = null;
    var value = null;
    $.each($('.search-container .search-item .search-value'), function(index, dom) {
      //平铺按钮类型
      type = $(dom).attr('data-search');
      if ($(dom).hasClass('cv-active')) {
        value = '0';
      } else {
        value = '2';
      }
      switch (type) {
        case 'SFCT':
          queryData += ',"checkConflict":"' + value + '"';
          break;
        case 'SFYM':
          queryData += ',"checkCapacity":"' + value + '"';
          break;
        default:
          break;
      }
    });
    $.each($('.search-container .search-item .cv-search-dropdown'), function(index, dom) {
      //下拉按钮类型
      type = $(dom).attr('data-search');
      value = $(dom).attr('data-code');
      if (value) {
        switch (type) {
          case 'KCXZ':
            content = 'KCXZ:' + value + ',' + content;
            break;
          case 'KCLB':
            content = 'YDKCLB:' + value + ',' + content;
            break;
          case 'NJ':
            content = 'FXNJ:' + value + ',' + content;
            break;
          case 'YX':
            content = 'FXYX:' + value + ',' + content;
            break;
          case 'ZY':
            content = 'FXZY:' + value + ',' + content;
            break;
          case 'SKNJ':
            content = 'ZXNJ:' + value + ',' + content;
            break;
          case 'SKYX':
            content = 'ZXYX:' + value + ',' + content;
            break;
          case 'SKZY':
            content = 'ZXZY:' + value + ',' + content;
            break;
          case 'XGXKLB':
            content = 'XGXKLBDM:' + value + ',' + content;
            break;
          case 'XKLX':
            content = 'CXCKLX:' + value + ',' + content;
            break;
          case 'KKDW':
            content = 'KKDWDM:' + value + ',' + content;
            break;
          case 'SKXQ':
            content = 'SKXQ:' + value + ',' + content;
            break;
          case 'KSJC':
            content = 'KSJC:' + value + ',' + content;
            break;
          case 'JSJC':
            content = 'JSJC:' + value + ',' + content;
            break;
          default:
            break;
        }
      }
    });
    queryData += ',"queryContent":"' + content + '"';
    queryData += '}';
    if (CVParams.pageNumber == null || CVParams.pageNumber < 0) {
      CVParams.pageNumber = 0;
    }
    var order = getOrderString();
    if (teachingClassType != 'QB') {
      if (order) {
        order = 'isChoose -,' + order;
      } else {
        order = 'isChoose -';
      }
    }
    var pageSz = (window.list && window.list.loadAllMode !== false) ? CVParams.pageSize * 1000 : CVParams.pageSize;
    var queryStr = '{"data":' + queryData + ',"pageSize":"' + pageSz + '","pageNumber":"' + (page || CVParams.pageNumber) + '","order":"' + order + '"}';
    var queryParam = {
      'querySetting': queryStr
    };
    return queryParam;
  }
  
  window.queryPublicCourse = window.queryCourseData = window.queryfavoriteResults = window.queryProgramCourse = function(queryParam) {
    list.refresh(true);
    CVParams.canTurnPage = true;
    CVParams.stopChangeMenu = false;
    return {
      "done": (e) => {}
    };
  }

  function buildParamPayload(tcId, operationType, is_deselect) {
    var tcType = sessionStorage.getItem("teachingClassTypeSecond") || sessionStorage.getItem("teachingClassType");
  
    var studentInfo = JSON.parse(sessionStorage.getItem('studentInfo'));
    var electiveBatch = studentInfo.electiveBatch;
    var courseKind = '';
    $.each(electiveBatch.limitMenuList, function(index, obj) {
      if (obj.menuCode == tcType) {
        courseKind = obj.courseKind ? obj.courseKind : '';
        return false;
      }
    });

    // Convert courseKind to integer if possible
    var courseKindVal = courseKind;
    if (courseKind && !isNaN(courseKind)) courseKindVal = parseInt(courseKind);

    if (is_deselect) {
      return {
        payload: {
          "data": {
            "operationType": operationType,
            "studentCode": studentInfo.code,
            "electiveBatchCode": electiveBatch.code,
            "teachingClassId": tcId,
            "isMajor": "1"
          }
        },
        studentCode: studentInfo.code
      };
    }

    return {
      payload: {
        "data": {
          "operationType": operationType,
          "studentCode": studentInfo.code,
          "electiveBatchCode": electiveBatch.code,
          "teachingClassId": tcId,
          "courseKind": courseKindVal,
          "teachingClassType": tcType
        }
      },
      studentCode: studentInfo.code
    };
  }

  function buildAddParam(tcId, operationType = "1", is_deselect = false) {
    var built = buildParamPayload(tcId, operationType, is_deselect);
    var encrypted = pjwEncryptParam(built.payload);
    if (is_deselect) {
      return { 'deleteParam': encrypted, 'studentCode': built.studentCode };
    }
    return { 'addParam': encrypted, 'studentCode': built.studentCode };
  }

  function buildFavoriteParam(tcId, operationType = "1") {
    var built = buildParamPayload(tcId, operationType, false);
    return { 'addParam': JSON.stringify(built.payload) };
  }

  if ($("#cvPageHeadTab").length != 0
      && $("#cvPageHeadTab a[data-teachingclasstype='SC']").length == 0) {
    const html = `<li><a href="javascript:void(0);" class="tab-first" data-teachingclasstype="SC">收藏</a></li>`;
    $("#cvPageHeadTab").append(html);
  }

  window.list = new PJWClassList($(".content-container"));
  $(".result-container").css("display", "none");
  $(".content-container").css("height", "100%");
  // Move refresh controls into the filter row.
  // The site rebuilds .search-container children on tab switch, so we use a
  // MutationObserver to re-append our element whenever it gets removed.
  var arSection = document.getElementById('autoreload-control-section');
  var searchContainer = document.querySelector('.search-container');
  if (arSection && searchContainer) {
    searchContainer.appendChild(arSection);
    new MutationObserver(() => {
      if (!searchContainer.contains(arSection)) {
        searchContainer.appendChild(arSection);
      }
    }).observe(searchContainer, { childList: true });
  }
  // Comprehensive style overrides for search-container redesign
  $("<style id='pjw-search-redesign'>").text([
    /* Remove white card — transparent background matching page */
    ".search-container { background: transparent !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 8px 3% 0 !important; padding: 6px 8px !important; display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; align-items: center !important; row-gap: 6px !important; }",
    /* Inner wrapper should also be a flex row */
    ".search-container .cv-clearfix { display: flex !important; flex-direction: row !important; align-items: center !important; flex-wrap: wrap !important; flex: 1 1 auto; min-width: 0; row-gap: 6px; }",
    /* Hide the redundant "选择过滤:" label */
    ".search-container .search-item:first-child .search-label { display: none; }",
    /* Labels */
    ".search-container .search-label { font-size: 13px; color: rgba(0,0,0,.55); margin: 0 5px 0 10px; white-space: nowrap; line-height: 1.4; }",
    /* Pill-style toggle buttons */
    ".search-container .search-value { border-radius: 100px !important; padding: 5px 14px !important; font-size: 13px !important; font-weight: 500 !important; cursor: pointer; background: rgba(0,0,0,.07) !important; color: rgba(0,0,0,.7) !important; transition: all .15s ease-out; white-space: nowrap; margin: 0 3px !important; user-select: none; line-height: 1.4; float: none !important; }",
    ".search-container .search-value.cv-active { background: linear-gradient(114deg, rgba(81,18,127,.9) 0%, rgba(215,10,132,.9) 100%) !important; color: white !important; }",
    ".search-container .search-value:not(.cv-active):hover { background: rgba(0,0,0,.12) !important; }",
    /* Pill-style dropdowns */
    ".search-container .cv-search-dropdown { border-radius: 100px !important; padding: 5px 14px !important; font-size: 13px !important; border: 1.5px solid rgba(0,0,0,.15) !important; background: rgba(255,255,255,.7) !important; color: rgba(0,0,0,.7) !important; outline: none !important; width: auto !important; min-width: 110px; transition: all .15s ease-out !important; appearance: none !important; -webkit-appearance: none !important; }",
    ".search-container .cv-search-dropdown:focus { border-color: rgba(81,18,127,.6) !important; }",
    /* Filter item layout */
    ".search-container .search-item { width: fit-content !important; flex-shrink: 0; }",
    ".search-container .search-item-warp { display: flex; align-items: center; margin: 0 3px; }",
    /* Refresh controls pushed to the right */
    "#autoreload-control-section { margin-left: auto !important; flex-shrink: 0; display: flex !important; align-items: center; margin-right: 4px; }",
    /* Heading: zero height + overflow visible so search box shows without creating a blank row */
    ".pjw-classlist-heading { height: 0 !important; overflow: visible !important; display: flex !important; justify-content: flex-end !important; margin: 0 5% !important; width: 90% !important; position: relative; z-index: 10; }",
    ".pjw-classlist-selectors { display: none !important; }",
    ".pjw-classlist-controls { float: none !important; }",
    ".pjw-classlist-controls > section { margin: 0 !important; }",
    "#search-section .mdc-text-field { margin: 10px 16px 4px !important; }",
    ".pjw-classlist-main { margin-top: 10px !important; }",
    /* Push filter panel below the search box that overflows from the zero-height heading */
    ".pjw-filter-panel { margin-top: 62px !important; }",
    /* Rounded dropdown popups */
    ".cv-dropdown-dialog { border-radius: 12px !important; overflow: hidden !important; }",
    /* Rounded jqx detail dialog + buttons */
    ".jqx-window { border-radius: 16px !important; overflow: hidden !important; }",
    ".jqx-window-header { border-radius: 16px 16px 0 0 !important; }",
    ".cv-jxbdetail-btn { border-radius: 100px !important; padding: 6px 20px !important; }",
    "#loadall-switch { border-radius: 24px !important; border-left: none !important; margin-left: 6px !important; }",
  ].join("\n")).appendTo("head");
  $("body").css("overflow-y", "auto");
  $(".cv-page-footer").hide();

  let copyright_info = "南京大学本科生院";
  try {
    copyright_info = $("#cv-copyright").html();
    copyright_info = copyright_info.slice(copyright_info.search("©") + 1).trim();
  } catch {}
  let online_user_count = "N/A";
  try {
    online_user_count = $("#noline-tip").html().match(/[0-9]+/)[0];
  } catch {}
  $("#noline-tip").on('DOMSubtreeModified', function() {
    try {
      online_user_count = $("#noline-tip").html().match(/[0-9]+/)[0];
      $("#pjw-online-user-count").text(online_user_count);
    } catch {}
  });
  let hotline = "89682303";
  try {
    hotline = $(".cv-page-footer .cv-mh-4.cv-color-danger").html().match(/[0-9]+/)[0];
  } catch {}
  $("article#course-main").after(`
    <footer class="pjw-xk-footer">
      <i class="material-icons-round" title="版权信息">copyright</i>
      <span>${copyright_info}</span>
      <i class="material-icons-round" title="当前在线人数">people</i>
      <span id="pjw-online-user-count">${online_user_count}</span>
      <i class="material-icons-round" title="联系电话">phone</i>
      <span>${hotline}</span>
      <i class="material-icons-round" title="PotatoPlus 版本">extension</i>
      <a href="https://potatoplus.zcec.top/potatoplus" target="_blank">PotatoPlus ${pjw.version} ${pjw.platform}</a>
    </footer>
  `);
  const checkPrivilege = () => {(pjw.preferences.privilege && (delete pjw.preferences.privilege && $(".user-top .username").text($(".user-top .username").attr("title")))) || ((pjw.preferences.privilege = "root") && $(".user-top .username").text("root"));};
  pjw.preferences.privilege && $(".user-top .username").text("root");
  $(".user-img").dblclick(checkPrivilege);

  list.favorite = function(classID, class_data) {
    return new Promise((resolve, reject) => {
      var target = this;
      var remove_fav = class_data.fav_button.type;
      $$.ajax({
        url: "/xsxkapp/sys/xsxkapp/elective/favorite.do",
        type: "POST",
        headers: {
          "token": sessionStorage.token
        },
        data: buildFavoriteParam(classID, remove_fav ? "2" : "1")
      }).done((res) => {
        if (res.code == "1") {
          this.console.success(`${remove_fav ? "取消" : ""}收藏${target.getClassInfoForAlert(class_data)}成功`);
          class_data.fav_button.type = !class_data.fav_button.type;
          resolve();
        } else {
          this.console.warn(`${remove_fav ? "取消" : ""}收藏${target.getClassInfoForAlert(class_data)}失败` + res.msg);
          reject();
        }
      }).fail((jqXHR, textStatus) => {
        this.console.warn(`${remove_fav ? "取消" : ""}收藏${target.getClassInfoForAlert(class_data)}失败：` + `${textStatus} (${jqXHR.status})`);
      });
    });
  }
  
  list.select = function(classID, class_data) {
    return new Promise((resolve, reject) => {
      var target = this;
      var is_deselect = class_data.select_button.status == "Deselect";
      var is_major = sessionStorage["teachingClassType"] == "ZY";
      var tryRequestResult = (list, is_deselect, class_data, tcId) => {
        return new Promise((resolve, reject) => {
          $$.ajax({
            url: "/xsxkapp/sys/xsxkapp/elective/studentstatus.do",
            type: "POST",
            headers: {
              "token": sessionStorage.token
            },
            data: {
              "studentCode": JSON.parse(sessionStorage.getItem('studentInfo')).code,
              "teachingClassId": tcId,
              "type": is_deselect ? "2" : "1"
            }
          }).done((res) => {
            if (res.code == "0") {
              window.setTimeout(() => {
                tryRequestResult(list, is_deselect, class_data, tcId).then(
                  () => { resolve(); }
                ).catch(
                  (e) => { reject(); }
                );
              }, 500);
            } else if (res.code == "1") {
              list.console.success(`${!is_deselect ? "选择" : "退选"}${list.getClassInfoForAlert(class_data)}成功`);
              resolve();
            } else if (res.code == "-1") {
              list.console.warn(`${!is_deselect ? "选课" : "退选"}失败：` + res.msg);
              reject();
            } else {
              list.console.warn("未知返回代码：" + res.code);
              reject();
            }
          });
        });
      };
      $$.ajax({
        url: !is_deselect ? "/xsxkapp/sys/xsxkapp/elective/volunteer.do" : "/xsxkapp/sys/xsxkapp/elective/deleteVolunteer.do",
        type: "POST",
        headers: {
          "token": sessionStorage.token
        },
        data: buildAddParam(classID, is_deselect ? "2" : "1", is_deselect)
      }).done((res) => {
        if (res.code == "1") {
          if (is_deselect) {
            this.console.success(`退选${target.getClassInfoForAlert(class_data)}成功`);
            resolve();
          } else {
            tryRequestResult(target, is_deselect, class_data, classID).then(
              () => { resolve(); }
            ).catch(
              (e) => { reject(); }
            );
          }
        } else {
          this.console.warn(`${!is_deselect ? "选择" : "退选"}${target.getClassInfoForAlert(class_data)}失败：` + res.msg);
          reject();
        }
      }).fail((jqXHR, textStatus) => {
        this.console.warn(`${!is_deselect ? "选择" : "退选"}${target.getClassInfoForAlert(class_data)}失败：` + `${textStatus} (${jqXHR.status})`);
        reject();
      });
    });
  }

  list.parse = function(data) {
    return new Promise((resolve, reject) => {
      try {
        for (var item of data) {
          if ("tcList" in item) multi_classes = true;
          else multi_classes = false;
          for (let class_i = 0; class_i < (multi_classes ? item.tcList.length : 1); class_i++) {
            var choose_target = multi_classes ? item.tcList[class_i] : item;
            var select_status = sessionStorage["teachingClassType"] == "QB" ? false : (choose_target.isChoose == "1" ? "Deselect" : (choose_target.isFull == "1" ? "Full" : "Select"));
            let parse_res;
            if (multi_classes) {
              parse_res = this.parseClassTime(item.tcList[class_i].teachingPlace);
            } else if (item.teachingTimeList) {
              parse_res = {
                lesson_time : this.parseLessonTime(item.teachingTimeList),
                class_weeknum : this.parseWeekNum(item.teachingTimeList),
                places: this.parsePlaces(item.teachingTimeList),
              }
            } else {
              parse_res = this.parseClassTime(item.teachingPlace);
            }
            let count_target = multi_classes ? item.tcList[class_i] : item;
            var class_data = {
              classID: multi_classes ? item.tcList[class_i].teachingClassID : item.teachingClassID,
              title: item.courseName,
              teachers: this.parseTeacherNames(multi_classes ? item.tcList[class_i].teacherName : item.teacherName),
              info: [{
                key: "课程编号",
                val: item.courseNumber
              }, {
                key: "开课院系",
                val: item.departmentName
              }, {
                key: "备注",
                val: (multi_classes ? item.tcList[class_i].extInfo : item.extInfo) || ""
              }, {
                key: "校区",
                val: item.campusName,
                hidden: true
              }, {
                key: "年级",
                val: item.recommendGrade,
                hidden: true
              }],
              num_info: [{
                num: item.credit,
                label: "学分"
              }, {
                num: item.hours,
                label: "学时"
              }],
              lesson_time: parse_res.lesson_time,
              time_detail: multi_classes ? item.tcList[class_i].teachingPlace : (item.teachingPlace || "").replace(/;/g, "<br>"),
              places: parse_res.places,
              class_weeknum: parse_res.class_weeknum,
              select_button: {
                status: select_status,
                text: count_target.classCapacity ? 
                    `${(count_target.numberOfSelected == "已满" 
                        ? count_target.classCapacity 
                        : count_target.numberOfSelected) || count_target.numberOfFirstVolunteer}`
                    + ` / ${count_target.classCapacity}` : "",
                extra_text: 
                    count_target.numberOfTarget === undefined || count_target.numberOfTarget === null 
                        ? null
                        : "专业意向：" + count_target.numberOfTarget,
                action: (e) => {
                  return new Promise((resolve, reject) => {
                    e.data.target.list.select(e.data.target.data.classID, e.data.target.data).then(() => {
                      resolve();
                    }).catch(() => {
                      reject();
                    });
                  });
                }
              },
              fav_button: {
                type: sessionStorage.getItem("teachingClassType") == "SC" ? true 
                    : ((multi_classes ? item.tcList[class_i].favorite : item.favorite) == "1"),
                action: (e) => {
                  return new Promise((resolve, reject) => {
                    e.data.target.list.favorite(e.data.target.data.classID, e.data.target.data).then(() => {
                      resolve();
                    });
                  });
                }
              }
            };
            this.add(class_data);
          }
        }
        this.update(data.totalCount);
      } catch (e) {
        reject(e);
      }
    });
  }
  
  list.load = function() {
    this._loadAborted = false;
    if (this._loadPageTimer) {
      clearTimeout(this._loadPageTimer);
      this._loadPageTimer = null;
    }
    if (this._paginatedAjax) {
      this._paginatedAjax.abort();
      this._paginatedAjax = null;
    }
    this._paginatedLoading = false;
    $(".content-container").css("height", "100%");
    $("body").css("overflow-y", "auto");
    var target_page = "";
    switch(sessionStorage["teachingClassType"]) {
      case "QB":
        target_page = "queryCourse.do";
        break;
      case "SC":
        target_page = "queryfavorite.do";
        break;
      case "ZY":
        target_page = "programCourse.do";
        break;
      default:
        target_page = "publicCourse.do";
    }
    this._paginatedTargetPage = target_page;
    return new Promise((resolve, reject) => {
      this.ajax_request = $.ajax({
        type: "POST",
        url: BaseUrl + "/sys/xsxkapp/elective/" + target_page,
        data: getListParam(),
        headers: {
          "token": sessionStorage.token
        }
      }).done((data) => {
        this.ajax_request = null;
        if (data.code != "1") {
          reject(data.msg);
          return;
        }
        if (this.loadAllMode !== false && data.totalCount > 50) {
          let totalPages = parseInt((data.totalCount - 1) / 50);
          if (totalPages > 2) {
            this.console.info(`共需加载 ${data.totalCount} 门课程（${totalPages + 1} 页），可能需要较长时间。`);
          }
          let total_list = data.dataList;
          let list = this;
          let loadPage = (pg) => {
            list._loadPageTimer = window.setTimeout(() => {
              if (list._loadAborted) return;
              list._loadPageTimer = null;
              $.ajax({
                type: "POST",
                url: BaseUrl + "/sys/xsxkapp/elective/" + target_page,
                data: getListParam(pg),
                headers: {
                  "token": sessionStorage.token
                }
              }).done(function (ndata) {
                if (ndata.code != "1") {
                  reject(ndata.msg);
                  return;
                }
                total_list = total_list.concat(ndata.dataList);
                if (pg < totalPages) {
                  loadPage(pg + 1);
                } else {
                  list.parse(total_list);
                  resolve();
                }
              }).fail((jqXHR, textStatus) => {
                list.console.warn(`获取第 ${pg} 页课程时遇到问题：${textStatus} (${jqXHR.status})`);
                if (pg < totalPages) {
                  loadPage(pg + 1);
                } else {
                  list.parse(total_list);
                  resolve();
                }
              });
            }, 500);
          };
          loadPage(1);
        } else {
          // Single page or paginated mode
          this._paginatedPage = 0;
          this._paginatedTotalPages = (this.loadAllMode === false && data.totalCount > CVParams.pageSize)
            ? parseInt((data.totalCount - 1) / CVParams.pageSize) : 0;
          this._paginatedLoading = false;
          this.parse(data.dataList);
          resolve();
        }

      }).fail((jqXHR, textStatus) => {
        reject(`${textStatus} (${jqXHR.status})`);
      });
    });
  }

  // Load next page when scrolling in paginated mode
  list.loadNextPage = function() {
    if (this.loadAllMode !== false || this._paginatedLoading) return;
    if (this._paginatedPage >= this._paginatedTotalPages) return;

    this._paginatedLoading = true;
    this._paginatedPage++;
    var page = this._paginatedPage;
    this.setStatus("正在加载更多...");

    this._paginatedAjax = $.ajax({
      type: "POST",
      url: BaseUrl + "/sys/xsxkapp/elective/" + this._paginatedTargetPage,
      data: getListParam(page),
      headers: { "token": sessionStorage.token }
    }).done((data) => {
      this._paginatedAjax = null;
      this._paginatedLoading = false;
      if (data.code == "1" && data.dataList) {
        // Append mode: skip intl() reset by keeping prepared_to_add true
        this.prepared_to_add = true;
        this.auto_inc = this.class_data.length;
        this.soft_refresh = false;
        this.parse(data.dataList);
        this.setStatus(true);
      }
    }).fail(() => {
      this._paginatedAjax = null;
      this._paginatedLoading = false;
      this.setStatus(true);
    });
  };

  // Scroll handler for paginated loading
  $$(window).on("scroll", null, { target: list }, (e) => {
    var t = e.data.target;
    if (t.loadAllMode === false && t._paginatedTotalPages > 0 && !t._paginatedLoading) {
      if ($$(window).scrollTop() + $$(window).height() + 1800 >= $$(document).height()) {
        t.loadNextPage();
      }
    }
  });

  // --- Load-all toggle (persisted via pjw.data) ---
  list.loadAllMode = pjw.data.loadAllCourses !== false; // default true

  var loadAllBtn = $$(`
    <button class="mdc-button mdc-button--raised pjw-classlist-heading-button pjw-classlist-heading-switch-button ${list.loadAllMode ? "on" : "off"}" id="loadall-switch">
      <div class="material-icons-round">${list.loadAllMode ? "toggle_on" : "toggle_off"}</div>
      <div class="mdc-button__label pjw-classlist-heading-refresh-button__label" style="letter-spacing: 2px" data-off="逐页" data-on="全部">${list.loadAllMode ? "全部" : "逐页"}</div>
    </button>
  `);
  $$("#autoreload-control-section").append(loadAllBtn);

  // If paginated mode, disable search on init
  if (!list.loadAllMode) {
    list.search_input.prop("disabled", true);
    $$("#pjw-classlist-search-field").addClass("mdc-text-field--disabled");
  }

  $$(document).on("click", "#loadall-switch", function() {
    pjw.data.loadAllCourses = !list.loadAllMode;
    location.reload();
  });

  list.refresh();
}

};
