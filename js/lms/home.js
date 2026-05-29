// PotatoPlus — lms.nju.edu.cn 首页「速览」
// 拦住 /user/index 的重型 SPA（~17MB JS），改渲染一个直接调接口的轻量看板。
// 内容脚本（隔离世界，document_start）：可 window.stop()、同源 fetch 带 cookie、不受页面 CSP 限制。
(() => {
  // 仅顶层窗口的首页生效
  if (window.top !== window.self) return;
  if (!/^\/user\/index\/?$/.test(location.pathname)) return;

  const ext = window.browser || window.chrome;
  const SKIP_KEY = "pjw_lms_skip";

  // 逃生放行：用户点了「进入原版首页」后，本次加载不拦截
  if (sessionStorage.getItem(SKIP_KEY)) {
    sessionStorage.removeItem(SKIP_KEY);
    return;
  }

  // 立即截断那 17MB SPA 的加载
  window.stop();

  // ---------- 工具 ----------
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;          // 数据一律走 textContent，杜绝 XSS
      else if (k.slice(0, 2) === "on" && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach((c) => {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function fmtTime(v) {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    const p = (x) => String(x).padStart(2, "0");
    return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function courseHref(id) { return id != null ? `/course/${id}/content` : "#"; }

  async function api(path) {
    const r = await fetch(path, { credentials: "include", headers: { Accept: "application/json" } });
    const ct = r.headers.get("content-type") || "";
    if (r.status === 401 || r.status === 403 || !ct.includes("json")) {
      const e = new Error("auth"); e.auth = true; throw e;
    }
    if (!r.ok) throw new Error("http " + r.status);
    return r.json();
  }

  const TODO_LABEL = {
    homework: "作业", exam: "考试", questionnaire: "问卷", classroom: "课堂",
    course_discussion: "讨论", live: "直播", material: "资料", offline: "线下",
    page: "页面", slide: "课件", web_link: "链接", group_task: "小组任务",
  };
  const todoLabel = (t) => TODO_LABEL[t] || "任务";

  // timeline 的 type 多达十几种且服务端可能新增，按关键字归类成简洁中文，避免出现原始英文
  function tlLabel(type) {
    const t = type || "";
    let base = "动态";
    if (/score/.test(t)) base = "成绩";
    else if (/exam/.test(t)) base = "考试";
    else if (/homework/.test(t)) base = "作业";
    else if (/activity/.test(t)) base = "活动";
    else if (/bulletin/.test(t)) base = "公告";
    else if (/discussion/.test(t)) base = "讨论";
    if (/expiring_today/.test(t)) return base + "·今日截止";
    if (/expiring/.test(t)) return base + "·将截止";
    if (/will_start/.test(t)) return base + "·即将开始";
    return base;
  }

  // 缓存（timeline 服务端慢达 ~4.5s）：先秒显上次数据，再后台刷新
  const CACHE_KEY = "pjw_lms_cache";
  function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (_) { return {}; } }
  function writeCache(patch) { try { const c = readCache(); Object.assign(c, patch); localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (_) {} }

  // ---------- 骨架 ----------
  document.documentElement.innerHTML = "";

  const reset = document.createElement("style");
  reset.textContent = "html,head,body{margin:0!important;padding:0!important;border:0!important}";
  document.documentElement.appendChild(reset);

  const head = document.createElement("head");
  head.innerHTML = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = ext.runtime.getURL("css/lms.css");
  head.appendChild(link);
  document.documentElement.appendChild(head);

  const body = document.createElement("body");
  body.className = "pjw-lms-body";
  document.documentElement.appendChild(body);
  document.title = "速览 - 智汇南雍";

  // 清掉浏览器自动补的空 head/body
  document.querySelectorAll("head:empty, body:not(.pjw-lms-body)").forEach((e) => e.remove());

  function gotoOriginal() {
    sessionStorage.setItem(SKIP_KEY, "1");
    location.reload();
  }

  function quickLink(text, href) {
    return el("a", { class: "pjw-lms-qlink", href, text });
  }

  // 顶栏
  body.appendChild(el("header", { class: "pjw-lms-topbar" }, [
    el("div", { class: "pjw-lms-brand" }, [
      el("span", { class: "pjw-lms-logo", text: "🥔" }),
      el("span", { class: "pjw-lms-brand-name", text: "PotatoPlus" }),
      el("span", { class: "pjw-lms-brand-sub", text: "速览" }),
    ]),
    el("nav", { class: "pjw-lms-nav" }, [
      quickLink("我的资源", "/user/resources/files"),
      quickLink("我的笔记", "/user/notes"),
      quickLink("公告", "/bulletin-list/"),
      el("button", { class: "pjw-lms-origin", text: "进入原版首页", onclick: gotoOriginal }),
    ]),
  ]));

  const main = el("main", { class: "pjw-lms-main" });
  body.appendChild(main);

  // 区块容器
  function section(id, icon, title) {
    const count = el("span", { class: "pjw-lms-count", id: id + "-count" });
    const head = el("div", { class: "pjw-lms-card-head" }, [
      el("span", { class: "pjw-lms-card-title" }, [icon + " " + title, count]),
    ]);
    const bodyEl = el("div", { class: "pjw-lms-card-body", id: id + "-body" }, loading());
    return { card: el("section", { class: "pjw-lms-card", id }, [head, bodyEl]), body: bodyEl, count };
  }
  function loading() { return el("div", { class: "pjw-lms-loading", text: "加载中…" }); }
  function empty(t) { return el("div", { class: "pjw-lms-empty", text: t }); }
  function errBox(t) { return el("div", { class: "pjw-lms-err", text: t }); }

  const todoSec = section("pjw-lms-todo", "📋", "待办");
  const tlSec = section("pjw-lms-tl", "🔔", "通知 / 动态");
  const courseSec = section("pjw-lms-course", "📚", "我的课程");

  const topRow = el("div", { class: "pjw-lms-row" }, [todoSec.card, tlSec.card]);
  main.appendChild(topRow);
  main.appendChild(courseSec.card);

  // ---------- 渲染 ----------
  function renderTodos(list) {
    todoSec.body.innerHTML = "";
    todoSec.count.textContent = list && list.length ? list.length : "";
    if (!list || !list.length) { todoSec.body.appendChild(empty("暂无待办 🎉")); return; }
    list.slice().sort((a, b) => new Date(a.end_time) - new Date(b.end_time)).forEach((t) => {
      todoSec.body.appendChild(el("a", { class: "pjw-lms-item", href: courseHref(t.course_id) }, [
        el("div", { class: "pjw-lms-item-main" }, [
          el("span", { class: "pjw-lms-tag", text: todoLabel(t.type) }),
          el("span", { class: "pjw-lms-item-title", text: t.title || "" }),
        ]),
        el("div", { class: "pjw-lms-item-sub" }, [
          el("span", { text: t.course_name || "" }),
          t.end_time ? el("span", { class: "pjw-lms-due", text: "截止 " + fmtTime(t.end_time) }) : null,
        ]),
      ]));
    });
  }

  function renderTimeline(list, unread) {
    tlSec.body.innerHTML = "";
    tlSec.count.textContent = unread ? "未读 " + unread : "";
    if (!list || !list.length) { tlSec.body.appendChild(empty("暂无通知")); return; }
    list.slice(0, 15).forEach((n) => {
      const p = n.payload || {};
      tlSec.body.appendChild(el("a", { class: "pjw-lms-item" + (n.unread ? " pjw-lms-unread" : ""), href: courseHref(p.course_id) }, [
        el("div", { class: "pjw-lms-item-main" }, [
          el("span", { class: "pjw-lms-tag", text: tlLabel(n.type) }),
          el("span", { class: "pjw-lms-item-title", text: p.exam_title || p.course_name || "" }),
        ]),
        el("div", { class: "pjw-lms-item-sub" }, [
          el("span", { text: p.course_name || "" }),
          n.timestamp ? el("span", { text: fmtTime(n.timestamp) }) : null,
        ]),
      ]));
    });
  }

  let allCourses = [];
  const grid = el("div", { class: "pjw-lms-grid" });
  const search = el("input", {
    class: "pjw-lms-search", type: "search", placeholder: "🔍 搜索课程名 / 课号 / 老师…",
    oninput: (e) => renderGrid(e.target.value.trim().toLowerCase()),
  });

  function renderGrid(q) {
    grid.innerHTML = "";
    const list = !q ? allCourses : allCourses.filter((c) => {
      const teachers = (c.instructors || []).map((i) => i.name).join(" ");
      return [c.name, c.course_code, teachers].join(" ").toLowerCase().includes(q);
    });
    if (!list.length) { grid.appendChild(empty("没有匹配的课程")); return; }
    list.forEach((c) => {
      const teacher = (c.instructors || []).map((i) => i.name).join("、");
      grid.appendChild(el("a", { class: "pjw-lms-course", href: courseHref(c.id), title: c.name }, [
        el("div", { class: "pjw-lms-course-name", text: c.name || "" }),
        el("div", { class: "pjw-lms-course-meta", text: [teacher, c.credit ? c.credit + " 学分" : ""].filter(Boolean).join(" · ") }),
      ]));
    });
  }

  function renderCourses(list) {
    allCourses = list || [];
    courseSec.count.textContent = allCourses.length;
    courseSec.body.innerHTML = "";
    courseSec.body.appendChild(search);
    courseSec.body.appendChild(grid);
    renderGrid("");
  }

  // 未登录兜底：拦下首页又没会话会白屏，这里给出明确出口
  function showLoginNeeded() {
    main.innerHTML = "";
    main.appendChild(el("div", { class: "pjw-lms-login" }, [
      el("div", { class: "pjw-lms-login-title", text: "需要先登录" }),
      el("div", { class: "pjw-lms-login-sub", text: "未检测到登录状态，前往原版首页完成统一身份认证。" }),
      el("button", { class: "pjw-lms-origin", text: "前往登录", onclick: gotoOriginal }),
    ]));
  }

  // ---------- 缓存秒显 + 后台刷新 ----------
  const cache = readCache();
  if (cache.courses) renderCourses(cache.courses);
  if (cache.todos) renderTodos(cache.todos);
  if (cache.timeline) renderTimeline(cache.timeline.notifications, cache.timeline.unread_count);

  let authFailed = false;
  api("/api/my-courses")
    .then((d) => { renderCourses(d.courses); writeCache({ courses: d.courses }); })
    .catch((e) => {
      if (e.auth) { authFailed = true; showLoginNeeded(); }
      else if (!cache.courses) { courseSec.body.innerHTML = ""; courseSec.body.appendChild(errBox("课程加载失败")); }
    });
  api("/api/todos")
    .then((d) => { if (!authFailed) { renderTodos(d.todo_list); writeCache({ todos: d.todo_list }); } })
    .catch((e) => { if (!e.auth && !authFailed && !cache.todos) { todoSec.body.innerHTML = ""; todoSec.body.appendChild(errBox("待办加载失败")); } });
  api("/api/timeline?limit=15")
    .then((d) => { if (!authFailed) { renderTimeline(d.notifications, d.unread_count); writeCache({ timeline: { notifications: d.notifications, unread_count: d.unread_count } }); } })
    .catch((e) => { if (!e.auth && !authFailed && !cache.timeline) { tlSec.body.innerHTML = ""; tlSec.body.appendChild(errBox("通知加载失败")); } });
})();
