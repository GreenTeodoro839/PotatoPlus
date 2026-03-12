# PotatoPlus 🥔

NJU 土豆改善工程 — 南京大学教务系统浏览器扩展

## 功能

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
js/
├── inject.js          # 入口，按页面按需加载脚本
├── vendor/            # 第三方库
│   ├── jquery.min.js
│   ├── material-components-web.min.js
│   └── tinypinyin.js
├── common/            # 共享模块
│   ├── core.js        # pjw 全局对象、偏好存储
│   ├── console.js     # 通知控制台
│   ├── lib.js         # UI 组件库
│   ├── crypto.js      # AES 加密（选课 API）
│   ├── filter.js      # 课程筛选
│   └── classlist.js   # 课程列表组件
├── authserver/        # 统一身份认证
│   └── captcha.js     # 验证码识别
├── xk/                # 选课系统 xk.nju.edu.cn
│   ├── welcome.js     # 登录页 + 验证码识别
│   └── course.js      # 选课列表增强
├── ehall/             # ehall / jwapp 页面增强
│   ├── home.js        # ehall 首页卡片与入口
│   ├── schedule.js    # 课表弹窗
│   ├── schedule-bridge.js # 页面脚本与扩展消息桥接
│   ├── grade.js       # 成绩页 GPA 计算器
│   └── eval.js        # 自动评教
├── jiaowu/            # 旧教务系统
│   └── init.js        # 教务页面通用初始化
└── background.js      # Service Worker，请求课表 API / 登录态判断
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
