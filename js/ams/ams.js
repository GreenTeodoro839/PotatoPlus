/**
 * PotatoPlus - AMS (作业提交系统) UI 美化脚本
 * 目标站点: ams.nju.edu.cn
 *
 * 采用纯 CSS 注入覆盖原有样式，不改变任何功能逻辑。
 * 根据当前 frame 的 URL 选择性注入对应样式。
 */
(function () {
  "use strict";

  var url = location.href;

  // 排除 TinyMCE 编辑器页面，完全不动
  if (/questions_center\.htm/.test(url)) return;

  // ========== 统一色彩变量 ==========
  // 主渐变: 紫蓝
  var GRAD = "linear-gradient(-70deg, rgba(154,110,179,.92), rgba(67,126,202,.92))";
  var GRAD_SOLID = "linear-gradient(-70deg, #9a6eb3, #437eca)";
  var ACCENT = "#6a7fc8";
  var ACCENT_DARK = "#5a6db8";
  var BG_LIGHT = "#f5f6fa";
  var BG_WHITE = "#ffffff";
  var BORDER = "#e2e6f0";
  var TEXT_MAIN = "#2c3e60";
  var TEXT_MUTED = "#8a9bbf";
  var SHADOW = "0 2px 12px rgba(100,120,200,.13)";
  var RADIUS = "10px";
  var RADIUS_SM = "6px";

  /** 向 document.head 注入 <style> 标签 */
  function injectCSS(css) {
    var s = document.createElement("style");
    s.setAttribute("data-pp-ams", "1");
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // ============================================================
  // 1. 顶栏  admin-top.jsp
  // ============================================================
  if (/admin-top\.jsp/.test(url)) {
    injectCSS(`
      /* AMS 顶栏美化 */
      body, html {
        margin: 0;
        padding: 0;
        background: transparent !important;
        overflow: hidden;
      }

      /* 顶栏容器 */
      body > table,
      #header,
      .header,
      div[id*="top"],
      div[class*="top"] {
        background: ${GRAD} !important;
        border: none !important;
        box-shadow: 0 2px 16px rgba(80,100,200,.25) !important;
        width: 100% !important;
        height: 100% !important;
      }

      /* 所有文字白色 */
      body, body *, body a, body td {
        color: #fff !important;
        font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif !important;
      }

      /* Logo / 系统标题 */
      body img[src*="logo"],
      body .logo,
      body #logo {
        filter: brightness(0) invert(1);
      }

      /* 链接 hover 效果 */
      body a:hover {
        opacity: 0.85 !important;
        text-decoration: none !important;
      }

      /* 欢迎信息、用户名区域 */
      body td, body span, body div {
        border-color: rgba(255,255,255,.15) !important;
      }

      /* 顶部表格去掉多余边框 */
      body table {
        border-collapse: collapse !important;
        border: none !important;
      }
      body td {
        border: none !important;
        padding: 0 12px !important;
        vertical-align: middle !important;
      }

      /* 退出按钮 (a.out 原本靠背景图，现在用文字代替) */
      body a.out,
      body a[href*="logout"],
      body a[href*="exit"],
      body a[onclick*="logout"] {
        background: rgba(255,255,255,.18) !important;
        border: 1px solid rgba(255,255,255,.3) !important;
        border-radius: 14px !important;
        padding: 2px 14px !important;
        font-size: 12px !important;
        transition: background .2s !important;
        background-image: none !important;
        text-indent: 0 !important;
        overflow: visible !important;
        width: auto !important;
        height: auto !important;
        line-height: normal !important;
        vertical-align: middle !important;
        display: inline-block !important;
      }
      body a.out::after {
        content: "退出" !important;
      }
      body a.out:hover,
      body a[href*="logout"]:hover,
      body a[href*="exit"]:hover,
      body a[onclick*="logout"]:hover {
        background: rgba(255,255,255,.3) !important;
      }
    `);

  // ============================================================
  // 2. 左侧栏  left_menu.htm
  // ============================================================
  } else if (/left_menu\.htm/.test(url)) {
    injectCSS(`
      /* AMS 左侧栏美化 */
      html, body {
        margin: 0;
        padding: 0;
        background: ${BG_LIGHT} !important;
        overflow-x: hidden;
        font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif !important;
      }

      /* 侧边栏容器 */
      body > table,
      #leftmenu,
      .leftmenu,
      #menu,
      .menu {
        background: ${BG_LIGHT} !important;
        border: none !important;
        width: 100% !important;
      }

      /* zTree 节点文字 */
      .ztree li a, .ztree li span.node_name {
        color: ${TEXT_MAIN} !important;
        font-size: 13px !important;
        padding: 4px 8px !important;
        border-radius: ${RADIUS_SM} !important;
        transition: all .15s !important;
      }
      .ztree li a:hover, .ztree li span.node_name:hover {
        background: rgba(100,127,200,.12) !important;
        color: ${ACCENT_DARK} !important;
        text-decoration: none !important;
      }

      /* 选中节点 */
      .ztree li a.curSelectedNode,
      .ztree li a.curSelectedNode span.node_name {
        background: ${GRAD_SOLID} !important;
        color: #fff !important;
        border-radius: ${RADIUS_SM} !important;
      }

      /* ---- 隐藏 zTree 原始 sprite 图标，用纯 CSS 替代 ---- */
      .ztree li span.button {
        background-image: none !important;
        margin-right: 2px !important;
        position: relative !important;
      }

      /* 展开/折叠箭头 — 用 CSS 三角形 */
      .ztree li span.switch {
        background-image: none !important;
        width: 18px !important;
        height: 18px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        vertical-align: middle !important;
      }
      .ztree li span.switch::after {
        content: "" !important;
        width: 0 !important;
        height: 0 !important;
        border-style: solid !important;
        position: static !important;
      }
      /* 折叠态（右箭头） */
      .ztree li span.switch.root_close::after,
      .ztree li span.switch.center_close::after,
      .ztree li span.switch.bottom_close::after {
        border-width: 4px 0 4px 6px !important;
        border-color: transparent transparent transparent ${ACCENT} !important;
      }
      /* 展开态（下箭头） */
      .ztree li span.switch.root_open::after,
      .ztree li span.switch.center_open::after,
      .ztree li span.switch.bottom_open::after {
        border-width: 6px 4px 0 4px !important;
        border-color: ${ACCENT} transparent transparent transparent !important;
      }
      /* 叶子节点（无子节点）— 不显示额外指示 */
      .ztree li span.switch.bottom_docu::after,
      .ztree li span.switch.center_docu::after,
      .ztree li span.switch.root_docu::after {
        display: none !important;
      }

      /* 文件/文件夹图标 — 用 emoji 替代 sprite */
      .ztree li span.ico_open,
      .ztree li span.ico_close,
      .ztree li span.ico_docu {
        background-image: none !important;
        width: auto !important;
        min-width: 16px !important;
        height: 16px !important;
        display: inline-block !important;
        vertical-align: middle !important;
        font-size: 14px !important;
        line-height: 18px !important;
        text-align: center !important;
        overflow: visible !important;
      }
      .ztree li span.ico_open::after {
        content: "📂" !important;
        font-size: 14px !important;
        line-height: 18px !important;
        vertical-align: top !important;
      }
      .ztree li span.ico_close::after {
        content: "📁" !important;
        font-size: 14px !important;
        line-height: 18px !important;
        vertical-align: top !important;
      }
      .ztree li span.ico_docu::after {
        content: "📄" !important;
        font-size: 14px !important;
        line-height: 18px !important;
        vertical-align: top !important;
      }

      /* zTree 连线隐藏 */
      .ztree li ul {
        padding-left: 14px !important;
      }
      .ztree li {
        list-style: none !important;
      }
      .ztree li span.button.noline_open,
      .ztree li span.button.noline_close,
      .ztree li span.button.noline_docu {
        background-image: none !important;
      }

      /* 菜单标题/分组 */
      .menu-title, .nav-title, .group-title,
      h3.type {
        color: ${TEXT_MUTED} !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: .06em !important;
        padding: 12px 12px 4px !important;
      }
      h3.type a,
      .menu-tree h3 a,
      .menu-tree h3 a.c {
        color: ${TEXT_MAIN} !important;
        text-decoration: none !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        background: none !important;
        background-image: none !important;
        padding-left: 12px !important;
        border-left: 3px solid ${ACCENT} !important;
        height: auto !important;
        line-height: 1.6 !important;
      }
      .menu-tree h3 {
        background: none !important;
        background-image: none !important;
        height: auto !important;
        margin-bottom: 8px !important;
      }

      /* 去掉菜单列表的默认圆点 */
      .menu-tree ul,
      .menu-tree li,
      .content ul,
      .content li,
      .content > ul > li {
        list-style: none !important;
        list-style-type: none !important;
        padding-left: 0 !important;
        margin: 0 !important;
        display: block !important;
      }
      .content > ul > li > a {
        display: block !important;
      }
      .menu-tree .content > ul {
        padding: 0 6px !important;
      }
      /* zTree 内部 li 保持 block */
      .ztree li {
        list-style: none !important;
        display: block !important;
      }

      /* 顶部 logo 小区域 */
      .left-top, #leftTop, .nav-header {
        background: ${GRAD} !important;
        border-radius: 0 0 ${RADIUS} ${RADIUS} !important;
        padding: 10px 12px !important;
        color: #fff !important;
        font-weight: 600 !important;
        margin-bottom: 8px !important;
        box-shadow: 0 2px 8px rgba(100,120,200,.2) !important;
      }

      /* 普通链接 */
      body a {
        color: ${TEXT_MAIN} !important;
        text-decoration: none !important;
      }
      body a:hover {
        color: ${ACCENT} !important;
      }

      /* 分隔线 */
      body hr, .divider {
        border: none !important;
        border-top: 1px solid ${BORDER} !important;
        margin: 6px 10px !important;
      }
    `);

  // ============================================================
  // 3. 底栏  admin-foot.jsp
  // ============================================================
  } else if (/admin-foot\.jsp/.test(url)) {
    injectCSS(`
      /* AMS 底栏美化 */
      html, body {
        margin: 0;
        padding: 0;
        background: #fff !important;
        overflow: hidden;
        font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif !important;
      }

      body {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-top: 1px solid ${BORDER} !important;
        height: 100% !important;
      }

      body *, body td, body span, body div {
        color: ${TEXT_MUTED} !important;
        font-size: 11px !important;
        border: none !important;
        background: transparent !important;
      }

      body table {
        border: none !important;
      }
      body td {
        padding: 0 8px !important;
        border: none !important;
      }
    `);

  // ============================================================
  // 4. 作业列表页  tc_homework/my_homework_list.htm
  // ============================================================
  } else if (/my_homework_list\.htm/.test(url)) {
    injectCSS(`
      /* AMS 作业列表页美化 */
      html, body {
        background: ${BG_LIGHT} !important;
        font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif !important;
        color: ${TEXT_MAIN} !important;
      }

      /* 主内容容器 */
      .main {
        padding: 16px !important;
      }

      /* ---- 搜索/筛选区 ---- */
      .searchBox {
        background: ${BG_WHITE} !important;
        border-radius: ${RADIUS} !important;
        box-shadow: ${SHADOW} !important;
        padding: 14px 16px !important;
        margin-bottom: 16px !important;
        border: 1px solid ${BORDER} !important;
      }

      /* 搜索标题 h5 — 去掉原始背景图，改为蓝色竖线风格 */
      .searchBox h5 {
        background: none !important;
        background-image: none !important;
        border: none !important;
        padding: 0 0 10px 0 !important;
        margin: 0 0 12px 0 !important;
        border-bottom: 1px solid ${BORDER} !important;
        height: auto !important;
        line-height: normal !important;
      }
      .searchBox h5 span {
        color: ${TEXT_MAIN} !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        background: none !important;
        background-image: none !important;
        padding-left: 12px !important;
        border-left: 3px solid ${ACCENT} !important;
      }
      .searchBox h5 span::before {
        content: none !important;
      }

      /* 搜索框内表格布局优化 */
      .searchBox table {
        border: none !important;
        border-collapse: collapse !important;
      }
      .searchBox th, .searchBox td {
        border: none !important;
        padding: 4px 8px !important;
        vertical-align: middle !important;
        background: transparent !important;
      }
      .searchBox th {
        color: ${TEXT_MUTED} !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        white-space: nowrap !important;
      }

      /* 搜索输入框 div123 容器 */
      .div123 {
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        border: none !important;
        background: none !important;
      }
      .div123 .delete-icon,
      .div123 .i-icon {
        display: none !important;
      }

      /* 输入框统一风格 */
      input[type="text"], input[type="search"],
      select, textarea {
        border: 1px solid ${BORDER} !important;
        border-radius: ${RADIUS_SM} !important;
        padding: 6px 10px !important;
        font-size: 13px !important;
        color: ${TEXT_MAIN} !important;
        background: ${BG_WHITE} !important;
        outline: none !important;
        transition: border-color .2s !important;
        height: auto !important;
        line-height: normal !important;
        box-sizing: border-box !important;
      }
      input[type="text"]:focus, input[type="search"]:focus, select:focus {
        border-color: ${ACCENT} !important;
        box-shadow: 0 0 0 3px rgba(106,127,200,.15) !important;
      }

      /* ---- 按钮 (修复文字居中) ---- */
      input[type="button"], input[type="submit"], button,
      .btn, .btnSearch, .btn-search, a.btn, .layui-btn {
        background: ${GRAD_SOLID} !important;
        color: #fff !important;
        border: none !important;
        border-radius: 16px !important;
        padding: 7px 20px !important;
        font-size: 13px !important;
        cursor: pointer !important;
        transition: opacity .2s, box-shadow .2s !important;
        box-shadow: 0 2px 8px rgba(106,127,200,.3) !important;
        height: auto !important;
        line-height: 1.3 !important;
        box-sizing: content-box !important;
        vertical-align: middle !important;
        text-align: center !important;
      }
      input[type="button"]:hover, input[type="submit"]:hover, button:hover,
      .btn:hover, .btnSearch:hover, .btn-search:hover, a.btn:hover {
        opacity: .88 !important;
        box-shadow: 0 4px 14px rgba(106,127,200,.45) !important;
      }

      /* 分页区域的 GO 链接按钮 */
      .pages a[href="#"] {
        background: ${GRAD_SOLID} !important;
        color: #fff !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 4px 12px !important;
        font-size: 12px !important;
        text-decoration: none !important;
        box-shadow: 0 1px 4px rgba(106,127,200,.25) !important;
        display: inline-block !important;
        line-height: 1.4 !important;
        vertical-align: middle !important;
      }

      /* ---- 教师信息表 ---- */
      .listBox[style*="15%"] {
        width: auto !important;
        min-width: 200px !important;
        max-width: 350px !important;
        margin: 0 5px 16px 5px !important;
        background: ${BG_WHITE} !important;
        border-radius: ${RADIUS} !important;
        box-shadow: ${SHADOW} !important;
        border: 1px solid ${BORDER} !important;
        border-left: 4px solid ${ACCENT} !important;
        overflow: visible !important;
      }
      .listBox[style*="15%"] table {
        width: 100% !important;
      }
      .listBox[style*="15%"] th {
        background: transparent !important;
        background-image: none !important;
        color: ${TEXT_MUTED} !important;
        font-weight: 600 !important;
        font-size: 12px !important;
        padding: 8px 12px !important;
        border: none !important;
        border-bottom: 1px solid ${BORDER} !important;
      }
      .listBox[style*="15%"] tr:first-child {
        background: transparent !important;
      }
      .listBox[style*="15%"] td {
        padding: 8px 12px !important;
        font-size: 13px !important;
        color: ${TEXT_MAIN} !important;
        border: none !important;
        word-break: break-all !important;
      }
      .listBox[style*="15%"] td a {
        color: ${ACCENT} !important;
        word-break: break-all !important;
      }

      /* ---- 作业表格 ---- */
      .listBox {
        background: ${BG_WHITE} !important;
        border-radius: ${RADIUS} !important;
        box-shadow: ${SHADOW} !important;
        border: 1px solid ${BORDER} !important;
        overflow: hidden !important;
        margin-top: 12px !important;
      }

      .listBox table {
        width: 100% !important;
        border-collapse: collapse !important;
      }

      /* 表头 — 用 th 选择器匹配(没有 thead) */
      .listBox tr:first-child {
        background: ${GRAD} !important;
      }
      .listBox th {
        color: #fff !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        padding: 10px 12px !important;
        border: none !important;
        white-space: nowrap !important;
        background: transparent !important;
      }

      /* 表格行 */
      .listBox tr {
        border-bottom: 1px solid ${BORDER} !important;
        transition: background .15s !important;
      }
      .listBox tr.bg,
      .listBox tr:nth-child(even) {
        background: #f8f9fd !important;
      }
      .listBox tr:hover {
        background: rgba(106,127,200,.08) !important;
      }
      .listBox table tr:first-child,
      .listBox table tr:first-child * {
        pointer-events: none !important;
      }

      /* 单元格 */
      .listBox td {
        padding: 9px 12px !important;
        font-size: 13px !important;
        color: ${TEXT_MAIN} !important;
        border: none !important;
        border-right: 1px solid ${BORDER} !important;
        vertical-align: middle !important;
      }
      .listBox td:last-child {
        border-right: none !important;
      }

      /* 表格内链接 */
      .listBox td a {
        color: ${ACCENT} !important;
        text-decoration: none !important;
        font-weight: 500 !important;
        transition: color .15s !important;
      }
      .listBox td a:hover {
        color: ${ACCENT_DARK} !important;
        text-decoration: underline !important;
      }

      /* 操作列 */
      .listBox td.operation a {
        display: inline-block !important;
        background: rgba(106,127,200,.1) !important;
        color: ${ACCENT} !important;
        border-radius: 12px !important;
        padding: 3px 12px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        transition: all .15s !important;
      }
      .listBox td.operation a:hover {
        background: ${GRAD_SOLID} !important;
        color: #fff !important;
        text-decoration: none !important;
      }

      /* ---- 分页 ---- */
      .pages-box2 {
        background: none !important;
        background-image: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        padding: 6px 12px !important;
        border-top: 1px solid ${BORDER} !important;
        border-bottom: 1px solid ${BORDER} !important;
      }
      .pages {
        padding: 4px 8px !important;
        font-size: 12px !important;
        color: ${TEXT_MUTED} !important;
        background: none !important;
        background-image: none !important;
      }
      .pages span {
        color: ${TEXT_MUTED} !important;
        font-size: 12px !important;
        vertical-align: middle !important;
      }
      .pages span[style*="bold"] {
        color: ${ACCENT} !important;
        padding: 0 4px !important;
        cursor: pointer !important;
      }
      .pages input[type="text"] {
        width: 40px !important;
        padding: 3px 6px !important;
        text-align: center !important;
      }
      .pages select {
        padding: 3px 6px !important;
        font-size: 12px !important;
      }
    `);

  // ============================================================
  // 5. 作业详情/作答页  tc_questions/view_and_answer_homework.htm & view_homework.htm
  // ============================================================
  } else if (/view_homework\.htm|view_and_answer_homework\.htm/.test(url)) {
    injectCSS(`
      /* AMS 作业详情/作答页美化 */
      html, body {
        background: ${BG_LIGHT} !important;
        font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif !important;
        color: ${TEXT_MAIN} !important;
      }

      /* 作业标题区 */
      .hw-title, .homework-title, h2, h3,
      .title-bar, .page-title {
        font-size: 16px !important;
        font-weight: 700 !important;
        color: ${TEXT_MAIN} !important;
        margin-bottom: 14px !important;
      }

      /* ---- 每道题的卡片 ---- */
      /* 尝试匹配题目行容器（通用 + 常见类名） */
      .question-item, .q-item, .questionBox,
      table.questionTable > tbody > tr,
      .listBox > table > tbody > tr,
      table[id*="question"] > tbody > tr {
        background: ${BG_WHITE} !important;
        border-radius: ${RADIUS} !important;
        box-shadow: ${SHADOW} !important;
        border: 1px solid ${BORDER} !important;
        margin-bottom: 12px !important;
        overflow: hidden !important;
        display: block !important;
        padding: 16px !important;
        transition: box-shadow .2s !important;
      }
      .question-item:hover, .q-item:hover, .questionBox:hover {
        box-shadow: 0 4px 20px rgba(100,120,200,.18) !important;
      }

      /* 题目表格整体 */
      table.questionTable, .questionList table {
        width: 100% !important;
        border-collapse: separate !important;
        border-spacing: 0 10px !important;
      }

      /* 题号 */
      .q-num, .question-num, .num,
      td.num, td[class*="num"] {
        color: #fff !important;
        background: ${GRAD_SOLID} !important;
        border-radius: 50% !important;
        width: 28px !important;
        height: 28px !important;
        line-height: 28px !important;
        text-align: center !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        flex-shrink: 0 !important;
      }

      /* 题目内容 */
      .question-content, .q-content, .questionContent,
      td.content, td[class*="content"] {
        font-size: 14px !important;
        line-height: 1.7 !important;
        color: ${TEXT_MAIN} !important;
        padding: 0 0 8px !important;
      }

      /* 已提交答案区 */
      .answer-box, .answerBox, .myAnswer,
      td[class*="answer"], .answer-content {
        background: #f0f4ff !important;
        border-left: 3px solid ${ACCENT} !important;
        border-radius: 0 ${RADIUS_SM} ${RADIUS_SM} 0 !important;
        padding: 10px 14px !important;
        font-size: 13px !important;
        color: ${TEXT_MAIN} !important;
        margin-top: 8px !important;
      }

      /* 操作按钮区 */
      .operations, .op-btns, .action-btns,
      td.operations, td[class*="op"] {
        padding-top: 10px !important;
      }

      /* 操作链接/按钮 */
      .operations a, td.operations a,
      a[href*="answer"], a[onclick*="answer"],
      a.btn-answer, .op-btns a {
        display: inline-block !important;
        background: ${GRAD_SOLID} !important;
        color: #fff !important;
        border-radius: 14px !important;
        padding: 5px 16px !important;
        font-size: 12px !important;
        text-decoration: none !important;
        margin-right: 6px !important;
        transition: opacity .2s, box-shadow .2s !important;
        box-shadow: 0 2px 8px rgba(106,127,200,.25) !important;
      }
      .operations a:hover, td.operations a:hover,
      a[href*="answer"]:hover {
        opacity: .88 !important;
        box-shadow: 0 4px 14px rgba(106,127,200,.4) !important;
      }

      /* 查看答案 / 取消 等次要操作 */
      a[href*="view"], a[onclick*="view"],
      a.btn-secondary {
        background: #f0f4ff !important;
        color: ${ACCENT} !important;
        border: 1px solid rgba(106,127,200,.3) !important;
        box-shadow: none !important;
      }
      a[href*="view"]:hover {
        background: rgba(106,127,200,.1) !important;
      }

      /* 提交按钮（通用） */
      input[type="submit"], input[type="button"], button {
        background: ${GRAD_SOLID} !important;
        color: #fff !important;
        border: none !important;
        border-radius: 16px !important;
        padding: 7px 22px !important;
        font-size: 13px !important;
        cursor: pointer !important;
        box-shadow: 0 2px 8px rgba(106,127,200,.3) !important;
        transition: opacity .2s !important;
        height: auto !important;
        line-height: 1.3 !important;
        box-sizing: content-box !important;
        vertical-align: middle !important;
        text-align: center !important;
      }
      input[type="submit"]:hover, input[type="button"]:hover, button:hover {
        opacity: .88 !important;
      }

      /* 分隔线 */
      hr {
        border: none !important;
        border-top: 1px solid ${BORDER} !important;
        margin: 14px 0 !important;
      }

      /* 通用表格美化 (与列表页保持一致) */
      table {
        border-collapse: collapse !important;
      }
      thead tr, tr.header {
        background: ${GRAD} !important;
      }
      thead th, tr.header td {
        color: #fff !important;
        font-weight: 600 !important;
        padding: 9px 12px !important;
        border: none !important;
        font-size: 13px !important;
      }
      tbody tr {
        border-bottom: 1px solid ${BORDER} !important;
        transition: background .15s !important;
      }
      tbody tr:nth-child(even) {
        background: #f8f9fd !important;
      }
      tbody tr:hover {
        background: rgba(106,127,200,.07) !important;
      }
      tbody td {
        padding: 9px 12px !important;
        font-size: 13px !important;
        color: ${TEXT_MAIN} !important;
        border: none !important;
        border-right: 1px solid ${BORDER} !important;
        vertical-align: middle !important;
      }
      tbody td:last-child {
        border-right: none !important;
      }
    `);

  // ============================================================
  // 6. 个人中心页  eclp_user/view_eclp_user.htm
  // ============================================================
  } else if (/view_eclp_user\.htm/.test(url)) {
    injectCSS(`
      html, body {
        background: ${BG_LIGHT} !important;
        font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif !important;
        color: ${TEXT_MAIN} !important;
      }

      .main {
        background: transparent !important;
        padding: 22px 26px !important;
      }

      .formBox {
        background: ${BG_WHITE} !important;
        border: 1px solid ${BORDER} !important;
        border-radius: 18px !important;
        box-shadow: ${SHADOW} !important;
        overflow: hidden !important;
      }

      .formBox > h5 {
        margin: 0 !important;
        padding: 16px 20px !important;
        background: ${GRAD} !important;
        color: #fff !important;
        border: none !important;
        font-size: 15px !important;
      }
      .formBox > h5 span,
      .formBox > h5 i {
        color: #fff !important;
        background: none !important;
      }

      .formBox .content {
        padding: 18px 18px 10px !important;
      }

      table.c2.w,
      .formBox table {
        width: 100% !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        background: ${BG_WHITE} !important;
      }
      .formBox td,
      .formBox th {
        border: none !important;
        border-bottom: 1px solid ${BORDER} !important;
        padding: 14px 16px !important;
        font-size: 13px !important;
        color: ${TEXT_MAIN} !important;
      }
      .formBox tr:nth-child(odd) td,
      .formBox tr:nth-child(odd) th {
        background: #fafbfe !important;
      }
      .formBox th.tr {
        width: 110px !important;
        text-align: right !important;
        color: #5f6f89 !important;
        font-weight: 600 !important;
      }

      .formBox input[type="email"],
      .formBox input[type="text"],
      .formBox input[type="password"] {
        border: 1px solid #d7deea !important;
        border-radius: 10px !important;
        padding: 8px 12px !important;
        background: #fff !important;
        box-shadow: none !important;
      }
      .formBox input:focus {
        outline: none !important;
        border-color: ${ACCENT} !important;
        box-shadow: 0 0 0 3px rgba(106,127,200,.14) !important;
      }

      .form-but {
        text-align: center !important;
        padding: 18px 0 4px !important;
      }
      .form-but .button-s4,
      .form-but button {
        display: inline-block !important;
        background: ${GRAD_SOLID} !important;
        background-image: ${GRAD_SOLID} !important;
        color: #fff !important;
        border: none !important;
        border-radius: 999px !important;
        padding: 9px 20px !important;
        min-width: 96px !important;
        font-size: 13px !important;
        line-height: 1.2 !important;
        text-align: center !important;
        box-shadow: 0 6px 16px rgba(106,127,200,.28) !important;
        margin: 0 10px !important;
      }
    `);

  // ============================================================
  // 7. 主页欢迎页  admin-right.jsp
  // ============================================================
  } else if (/admin-right\.jsp/.test(url)) {
    injectCSS(`
      /* AMS 主页欢迎区美化 */
      html, body {
        background: ${BG_LIGHT} !important;
        font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif !important;
        color: ${TEXT_MAIN} !important;
        height: 100% !important;
      }

      /* 欢迎横幅，绝对定位居中 */
      .welcome, .welcome-box, #welcome,
      .banner, .index-banner {
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: ${GRAD} !important;
        border-radius: ${RADIUS} !important;
        padding: 30px 40px !important;
        color: #fff !important;
        margin: 0 !important;
        box-shadow: ${SHADOW}, 0 4px 20px rgba(100,120,200,.2) !important;
        min-width: 400px !important;
      }
      .welcome *, .welcome-box *, #welcome * {
        color: #fff !important;
      }
      .welcome h2, .welcome h3, #welcome h2 {
        font-size: 20px !important;
        font-weight: 700 !important;
        margin: 0 0 6px !important;
      }
      .welcome ul {
        list-style: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .welcome li {
        margin-bottom: 8px !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
      }

      /* 公告/信息卡片 */
      .notice-box, .info-card, .card {
        background: ${BG_WHITE} !important;
        border-radius: ${RADIUS} !important;
        box-shadow: ${SHADOW} !important;
        padding: 16px 20px !important;
        margin: 0 16px 14px !important;
        border: 1px solid ${BORDER} !important;
      }
      .notice-box h4, .info-card h4 {
        color: ${ACCENT} !important;
        font-size: 14px !important;
        margin: 0 0 10px !important;
      }

      /* 链接 */
      body a {
        color: ${ACCENT} !important;
        text-decoration: none !important;
      }
      body a:hover {
        color: ${ACCENT_DARK} !important;
        text-decoration: underline !important;
      }
    `);
  }

})();
