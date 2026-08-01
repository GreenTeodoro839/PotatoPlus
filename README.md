# PotatoPlus 🥔

NJU 土豆改善工程 — 南京大学教务系统浏览器扩展

## 功能

点工具栏图标打开**设置页**，每个功能可独立开关（新开关默认开）。

- **校园网快捷登录** — p.nju.edu.cn 未登录时拦截 CAS 跳转，展示内置登录页直接完成认证
- **统一身份认证美化** — authserver.nju.edu.cn 登录页替换为 PotatoPlus 风格界面，点“登录”时后台自动完成滑块验证并提交，含记住密码、扫码入口
- **选课平台验证码识别** — xk.nju.edu.cn 登录点选验证码本地自动识别
- **选课平台红黑榜** — 原生选课界面的教学班卡片上显示教师组评分，点击查看评价（数据来自 njuclass.zcec.top）
- **成绩可视化** — 成绩页顶部面板：综合 / 学位学分绩、学分分布、GPA 趋势
- **成绩查询 GPA 计算器** — 浮动按钮 + 弹窗，勾选课程计算学分绩
- **课表弹窗** — ehall 首页一键查看周课表，支持教学周、缓存、重叠课程详情
- **一键评教** — 自动五星好评并提交
- **AMS 作业平台美化** — ams.nju.edu.cn 现代化 UI，解除图片上传 300K 前端限制
- **LMS 首页精简提速** — 智汇南雍（lms.nju.edu.cn）拦截臃肿 chatbot 脚本，首页替换为轻量「速览」看板，直接调接口秒开待办 / 通知 / 我的课程

## 安装

### Chrome / Edge
1. 打开 `chrome://extensions/`（或 `edge://extensions/`）
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目文件夹

### Firefox（需 115+）
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」
3. 选择 `manifest.json`

## 项目结构

```
options.html            # 设置页（点工具栏图标打开）
rules/
└── lms.json            # declarativeNetRequest 规则：拦截 lms chatbot 脚本
css/
├── options.css         # 设置页样式
├── xk-welcome.css      # xk 登录页公告卡 + 验证码 toast
├── portal-login.css    # 校园网登录页样式
├── ams-global.css      # AMS 全站基础样式
├── lms.css             # lms 精简看板样式
├── njuclass.css        # 选课平台红黑榜样式
└── material-components-web.min.css  # Material Components（设置页用）
js/
├── inject.js           # 内容脚本入口，按站点按需注入模块（含校园网登录劫持）
├── background.js       # MV3 service worker：课表 API + 站点级动态注册 + njuclass API
├── options.js          # 设置页：数据驱动开关 + 升级提醒
├── vendor/             # 第三方依赖（jQuery / Material Components / Chart.js）
├── common/
│   ├── core.js         # 全局对象 pjw、偏好存储、featureOn 门控
│   └── tinycnn.js      # 本地验证码识别 CNN 推理
├── authserver/         # 统一身份认证
│   ├── login.js        # 美化覆盖层 + 登录自动化
│   └── sliderCaptcha.js # 滑块验证码协议复现（缺口识别 + 轨迹 + 验签）
├── xk/                 # 选课系统
│   ├── welcome.js      # 登录页公告卡 + 验证码识别触发
│   └── captcha_ocr.js  # 点选验证码 OCR
├── njuclass/           # 选课平台红黑榜
│   ├── core.js         # NjuClassCore（教师集合匹配等工具）
│   ├── content.js      # 教学班卡片评分 + 评价弹窗（动态注册的内容脚本）
│   └── api.js          # njuclass.zcec.top 评价 API（由 background importScripts）
├── ehall/              # ehall / jwapp
│   ├── home.js         # 首页卡片与入口
│   ├── schedule.js     # 课表弹窗
│   ├── schedule-bridge.js # 页面脚本 ↔ 扩展消息桥接
│   ├── grade-visualizer.js # 成绩可视化面板
│   ├── grade.js        # GPA 计算器
│   └── eval.js         # 一键评教
├── ams/
│   └── ams.js          # AMS UI 美化 + 图片上传限制解除 + LaTeX 批量插入
├── lms/
│   └── home.js         # 首页「速览」轻量看板（拦截重型 SPA，直接调接口）
└── jiaowu/
    └── init.js         # xk 登录页引导（公告卡 / 公告拉取 / 版本升级）
```

## 说明

### 设置页与功能开关
- 入口：点工具栏图标；每个功能独立开关，状态保存在本地，新开关默认开。
- ams / lms / 红黑榜为站点级开关（关则浏览器完全不注入该站点）；其余为功能级开关（改后刷新页面生效）。

### 课表弹窗
- 入口：ehall 首页卡片「📅 课表」
- 数据来源：ehall / jwapp 课表接口（经 service worker 绕过 CORS）
- 教学周：从 `potatoplus.zcec.top` 的 `semester.json` 取学期起始日期计算
- 缓存：保存在 `localStorage`，有效期一周；有缓存时可直接查看
- 登录检查：无缓存或手动刷新时检查 ehall 登录状态，未登录则提示

## 开发

基于 Chrome Manifest V3，纯浏览器扩展（不支持油猴脚本），无构建步骤。版本号只在 `manifest.json` 改。

## License

GPL-3.0 — 详见 [LICENSE](LICENSE)

## Credits

By [小猪](https://potatoplus.zcec.top/about)
原作者 [cubiccm](https://github.com/cubiccm)
