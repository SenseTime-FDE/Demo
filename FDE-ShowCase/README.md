# FDE Demo Hub

FDE 团队内部 Demo 中心 —— 集中收录团队为各业务线搭建的 Agent Demo，点击即可直达线上版本。深色科技风，含实时网页预览、3D 卡片、滚动动效等。

## 目录结构

```
fde-demo-hub/
├── index.html          # 页面骨架（结构）
├── css/
│   └── style.css       # 全部样式，主题色集中在 :root
├── js/
│   ├── data.js         # ★ 数据配置：增删 Demo / 分类 / 统计数字都改这里
│   └── main.js         # 渲染与交互逻辑（一般无需改动）
├── package.json        # 本地预览脚本
├── .gitignore
└── README.md
```

## 本地预览

这是纯静态站点，不需要构建。任选一种方式：

- **最简单**：直接双击 `index.html` 用浏览器打开。
- **本地服务器（推荐）**：部分浏览器对 `file://` 下的 iframe 预览有限制，用服务器更稳：

  ```bash
  npm start          # 等价于 npx serve . ，默认 http://localhost:3000
  ```

  或者用 Python：

  ```bash
  python3 -m http.server 8080
  # 浏览器打开 http://localhost:8080
  ```

## 如何新增 / 修改一个 Demo

只需编辑 **`js/data.js`**，在 `PROJECTS` 数组里加一个对象：

```js
{
  cat:   "expo",                 // 分类，对应 CATEGORIES 里的 key
  badge: "会展 Expo",            // 卡片角标
  title: "新的展位 Agent",       // 作品名称
  desc:  "一句话简介，需要密码可写在这里。",
  tags:  ["Agent", "推荐系统"],  // 标签
  url:   "https://your-demo-url",// 线上地址
  hue:   210,                    // 兜底封面色相 0-360
  live:  true,                   // 是否显示 Live 标识
}
```

> 链接里含中文时，请先做 URL 编码再填入。例如在浏览器控制台执行
> `encodeURI("https://x.github.io/Demo/展位推荐")` 得到编码后的地址。

新增分类：在同文件的 `CATEGORIES` 里加一项（`key` 自定义），再让对应 Demo 的 `cat` 用这个 key 即可。

修改顶部统计数字：编辑同文件的 `STATS`。

## 设计调整

- **配色 / 圆角 / 最大宽度**：改 `css/style.css` 顶部的 `:root` 变量。
- **品牌名 / 标题 / 文案**：改 `index.html` 里 `nav`、`header.hero`、`footer` 的文字。

## 关于实时预览

卡片缩略图用 `<iframe>` 直接渲染目标站点的真实画面。若某个站点设置了 `X-Frame-Options` / CSP 禁止被嵌入，预览会留白，此时会自动回退显示渐变兜底封面，不影响点击跳转。

## 部署

纯静态，托管到任意静态服务即可（GitHub Pages / Netlify / Vercel / 内网 Nginx）。把整个 `fde-demo-hub/` 目录作为站点根目录发布即可。

---

© 2026 FDE Studio · Forward Deployed Engineering · 内部使用 Internal Use Only
