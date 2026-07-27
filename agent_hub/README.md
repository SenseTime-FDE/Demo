# 灵犀 · 统一 Agent 运营中台（SenseAgent Hub）

商汤科技 · 大模型生态渠道部 —— **一套带 RBAC 权限与后台数据库的统一 Agent 中台**，
集中管理 **数字传媒 / 数字校园 / 智慧养老 / 数字餐饮** 四大场景的 Agent、知识库与 SOP。
最终用户以 **Agent 语音交互**，**全过程数据留痕**，并据事件**推送对应 SOP 与要求**。

真后端 + SQLite + 账号登录 + 服务器强制权限（越权 403）+ 多人共享数据，**零第三方依赖**（仅 Node 内置模块）。

## 启动

需要 **Node ≥ 22.5**（用到内置 `node:sqlite`）。

```bash
cd agent_hub
./start.sh                # 或  node server/server.js
```

浏览器打开 **http://localhost:5180/login.html**（端口可用 `PORT=xxxx ./start.sh` 覆盖）。

- 数据库文件 `server/hub.db`：首次启动自动建表 + 灌入种子数据与 9 个账号，删掉即可重置。
- 业务/配置数据的种子来自 `assets/seed.js`（前后端单一数据源）；语音留痕落 `traces` 真表、可持续增长。

## 演示账号（初始密码统一 `hub@2026`）

| 账号 | 角色 | 可管场景 | 权限要点 |
|---|---|---|---|
| `admin` | 平台管理员 | 全部 | 全平台 + 账号管理 + Agent 上下架 |
| `media_admin` | 场景管理员 | 数字传媒 | 本场景 Agent/知识库/SOP/业务全权 |
| `media_op` | 运营 | 数字传媒 | 内容/分发/SOP 执行与推送 |
| `media_seat` | 坐席/一线 | 数字传媒 | 用 Agent 语音交互、产生留痕 |
| `campus_admin` / `elder_admin` / `dining_admin` | 场景管理员 | 对应场景 | 同 media_admin |
| `ops_all` | 运营 | 四场景 | 跨场景运营 |
| `viewer` | 观察员 | 全部 | 只读看板/留痕/控制台 |

## 权限模型（服务器强制，非仅前端隐藏）

| 角色 | 账号管理 | Agent 上下架 | 编辑配置 | 推送 SOP | 用 Agent 产生留痕 | 查看全部场景 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| 平台管理员 superadmin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 场景管理员 scene_admin | — | ✓* | ✓* | ✓* | ✓ | 本场景 |
| 运营 operator | — | — | ✓* | ✓* | ✓ | 本场景 |
| 坐席/一线 agent_user | — | — | — | — | ✓ | 本场景 |
| 观察员 viewer | — | — | — | — | — | ✓ |

`*` 仅限本人所属场景；每个账号绑定 1..N 个场景，服务器同时校验「角色 + 场景归属」，越权写操作直接 **403**。

## 页面地图

**平台中台（跨场景）**
| 页面 | 用途 |
|---|---|
| `login` | 账号登录 |
| `index` 平台总览 | 场景选择 + 平台级 KPI + 端到端闭环 + 最新留痕/推送 |
| `console` **Agent 控制台** | Agent 编排、上下架、绑定知识库/SOP、**绑定运行模型**、分配场景权限 |
| `models` **模型接入** | 模型货架、连接状态、启停/设默认、Agent 绑定模型、在线「试一试」**真实对话**（接入 SenseAudio 开放平台） |
| `trace` **语音留痕中心** | 全场景会话检索/回放/导出、SOP 命中分析（真表数据） |
| `sop` **SOP 与推送** | SOP 库维护、触发规则、按事件推送与签收记录 |
| `kb` **知识库管理** | 多知识库、按场景绑定、供 Agent 检索作答 |
| `integration` **外部平台对接** | 对接外部语音 Agent 平台（如声渡 VoxOne）：接入密钥、注册、反向调用 |
| `settings` 账号与权限 | 账号 CRUD、角色权限矩阵、改密、审计、重置演示数据 |

**四大场景**（每个场景 4 页：工作台 / Agent 语音原型 / 小程序 / 数据看板）
| 场景 | 工作台 | Agent | 小程序 | 看板 |
|---|---|---|---|---|
| 数字传媒（旗舰：一键分发/舆情/关键词/知识库） | `media` | `media_agent` | `media_miniapp` | `media_board` |
| 数字校园 | `campus` | `campus_agent` | `campus_miniapp` | `campus_board` |
| 智慧养老 | `eldercare` | `eldercare_agent` | `eldercare_miniapp` | `eldercare_board` |
| 数字餐饮 | `dining` | `dining_agent` | `dining_miniapp` | `dining_board` |

## 端到端闭环

`坐席用 Agent 语音交互 → ASR 转写 → 命中知识库/SOP → 推送对应 SOP 与要求 → 全程语音留痕 → 汇入数据看板`

## 模型接入（大模型）

统一在 **「模型接入」页** 配置 Agent / 场景所调用的大模型，接入 **OpenAI 兼容端点**（SenseAudio 开放平台 `https://api.senseaudio.cn/v1`）。

- **密钥安全**：`baseURL` / `apiKey` 存 `server/llm.config.json`（`/server` 路径不对外托管），前端只拿掩码（如 `sk-tr…C46a`），语音留痕中也不含明文密钥。
- **服务端网关** `server/llm.js`：`POST /api/llm/chat`（RBAC 限「可用 Agent」角色）转发到 `<baseURL>/chat/completions`；`GET /api/llm/health` 连通自检；`GET /api/models` 返回掩码配置与启停状态。
- **模型货架** `assets/models.js`：SenseAudio 自研（S2/S2-Flash/S2-Lite/S1/VL/Nova）+ 通用（DeepSeek/Qwen/Kimi/GLM/MiniMax/Doubao）文本模型，另含语音合成/识别、音乐/视频/图片能力（独立端点）。
- **Agent 绑定模型**：在「Agent 控制台」每个 Agent 可选运行模型，未指定则用平台默认聊天模型（`llm.config.json` 的 `defaultModel`，默认 `deepseek-v4-flash`）。
- **在线试一试**：模型接入页可选模型发起**真实对话**，返回延迟与 Token 用量，可勾选「写入语音留痕」。
- 换密钥/端点：编辑 `server/llm.config.json` 后重启服务即可。

## 技术栈

- 后端：`server/server.js`（node:http 路由 + 静态托管）· `server/db.js`（node:sqlite：app 配置 + users + **traces 留痕真表** + audit）· `server/auth.js`（scrypt 密码 + HMAC token + RBAC 角色×场景）。
- 前端：纯静态 HTML + `assets/{app.js,style.css,seed.js,chat.js}`；登录后 `Hub.boot()` 拉取共享数据、渲染中台外壳、按权限门禁；写操作走 `/api/change` 经服务器授权。
- 无 npm 依赖、可离线运行，部署到任意能跑 Node 的机器即可多人共用。

## 口径声明

全部数字为**目标态示意**，用于讲清场景与闭环，非真实经营数据。语音留痕、账号、Agent/知识库/SOP 配置均以真后端 SQLite 持久化，权限由服务器强制校验。
