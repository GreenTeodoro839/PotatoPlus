# PotatoPlus 🥔

NJU 土豆改善工程 — 南京大学教务系统浏览器扩展

## 功能

- **校园网快捷登录** — p.nju.edu.cn 未登录时拦截 CAS 跳转，展示内置登录页，直接完成校园网认证
- **统一身份认证验证码自动识别** — authserver.nju.edu.cn 登录页验证码自动填写
- **选课平台美化** — xk.nju.edu.cn 课程列表增强、筛选、收藏
- **选课平台验证码识别** — xk.nju.edu.cn 登录验证码自动点选
- **GPA 计算器** — 成绩页面内置学分绩计算，页面加载后自动弹出面板
- **课表弹窗** — ehall 首页右上角一键查看周课表，支持教学周、缓存、重叠课程悬浮详情
- **自动评教** — 一键五星好评
- **AMS作业提交平台美化** — 给复古的 ams.nju.edu.cn 做个现代化的UI

## 安装

### Chrome / Edge
1. 打开 `chrome://extensions/`（或 `edge://extensions/`）
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目文件夹

### Firefox
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」
3. 选择 `manifest.json`

## 项目结构

```
css/
├── portal-login.css   # 校园网登录页样式
└── ...                # 其他页面样式
js/
├── inject.js          # 内容脚本入口，按站点/页面按需注入模块（含校园网登录劫持逻辑）
├── background.js      # 后台脚本（Manifest V3 service worker）
├── vendor/            # 第三方依赖
│   ├── jquery.min.js
│   ├── material-components-web.min.js
│   └── tinypinyin.js
├── common/            # 通用模块
│   ├── core.js        # 全局对象、偏好存储、基础工具
│   ├── console.js     # 通知/控制台 UI
│   ├── lib.js         # 通用 UI 组件库
│   ├── crypto.js      # AES 加密（选课 API）
│   ├── filter.js      # 课程筛选逻辑
│   └── classlist.js   # 课程列表组件
├── authserver/        # 统一身份认证 authserver.nju.edu.cn
│   └── captcha.js     # 登录验证码识别
├── xk/                # 选课系统 xk.nju.edu.cn
│   ├── welcome.js     # 登录页增强 + 验证码识别
│   └── course.js      # 选课列表增强
├── ehall/             # ehall / jwapp 页面增强
│   ├── home.js        # ehall 首页卡片与入口
│   ├── schedule.js    # 课表弹窗
│   ├── schedule-bridge.js # 页面脚本与扩展消息桥接
│   ├── grade.js       # 成绩页 GPA 计算器
│   └── eval.js        # 自动评教
├── ams/               # AMS 作业提交系统 ams.nju.edu.cn
│   └── ams.js         # 顶栏/侧栏/列表/详情/欢迎页 UI 美化
└── jiaowu/            # 旧教务系统
    └── init.js        # 教务页面通用初始化
```

## 说明

### 课表弹窗
- 入口：ehall 首页左侧卡片右上角「📅 课表」
- 数据来源：ehall / jwapp 课表接口
- 教学周：从服务端 `semester.json` 获取学期起始日期计算
- 缓存：保存在 `localStorage`，有效期一周；有缓存时可直接查看
- 登录检查：无缓存或手动刷新时，会检查 ehall 登录状态，未登录则提示先登录

## 开发

基于 Chrome Manifest V3，纯浏览器扩展（不支持油猴脚本）。

## License

GPL-3.0 — 详见 [LICENSE](LICENSE)

## Credits

By [小猪](https://potatoplus.zcec.top/about)
原作者 [cubiccm](https://github.com/cubiccm)
