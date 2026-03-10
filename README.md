# PotatoPlus 🥔

NJU 土豆改善工程 — 南京大学教务系统浏览器扩展

## 功能

- **统一身份认证验证码自动识别** — authserver.nju.edu.cn 登录页验证码自动填写
- **选课平台美化** — xk.nju.edu.cn 课程列表增强、筛选、收藏
- **选课平台验证码识别** — xk.nju.edu.cn 登录验证码自动点选
- **GPA 计算器** — 成绩页面内置学分绩计算
- **自动评教** — 一键五星好评

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
└── jiaowu/            # 教务系统
    ├── init.js        # 教务页面通用初始化
    ├── grade.js       # GPA 计算器
    └── eval.js        # 自动评教
```

## 开发

基于 Chrome Manifest V3，纯浏览器扩展（不支持油猴脚本）。

## License

GPL-3.0 — 详见 [LICENSE](LICENSE)

## Credits

By [Limos](https://potatoplus.zcec.top/about)
