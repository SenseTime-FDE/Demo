# 声渡 VoxOne · 语音原生 AI 客服 / 销售 / 外呼 一体化平台

> 商汤科技 · 大模型生态渠道部　|　底座:SenseAudio V2.0 多语言语音大模型矩阵　|　30 语言 + 粤语

一套**真实可运行**的语音原生 AI 运营中台:账号登录 + RBAC 权限 + SQLite 数据库 + 语音/文本**全双工**对话 + 会话留痕质检 + **统一 Agent 管理平台双向对接网关**。零第三方依赖,仅用 Node 内置能力。

---

## 快速启动

```bash
cd voxone
./start.sh                 # 或  node server/server.js
# 打开 http://localhost:5190     （端口可用 PORT 覆盖）
```

要求:**Node ≥ 22.5**(使用内置 `node:sqlite`)。数据库文件自动生成于 `server/voxone.db`。

### 演示账号(初始密码统一 `voxone@2026`)

| 账号 | 角色 | 可见场景 | 能做什么 |
|---|---|---|---|
| `admin` | 平台管理员 | 全部 | 全部权限(含账号/模型/对接/数据重置) |
| `ops` | 运营管理员 | 全部 | 编排 Agent、编辑配置、外呼、质检、对接 |
| `lead_ecom` | 坐席主管 | 跨境电商 | 本场景编排/质检/外呼 |
| `seat_en` | 一线坐席 | 跨境电商 / 出海App | 工作台接入、看本人会话 |
| `qa` | 质检 / 分析 | 全部(只读) | 会话质检打分、洞察 |
| `viewer` | 观察员 | 全部(只读) | 只读浏览 |

> 演示账号默认不强制改密(便于共享演示);管理员**重置密码**或**新建账号**时会置为「首登需改密」。

---

## 核心能力

| 能力 | 说明 |
|---|---|
| 🎧 **全双工语音 + 文本工作台** | SenseAudio Realtime 2.0 · 端到端可打断(barge-in)· 语音(Web Speech)与文本混合实时对话 · 实时波形/延迟/轮次/打断计数 |
| 🤖 **对话大脑** | 知识库 RAG 检索 + 话术编排;多语言(中/粤/英/阿/泰…)意图识别、情绪判断、SOP 命中、转人工;**配置真实端点后自动切换 live,否则内置引擎离线可用** |
| 🧠 **SenseAudio V2.0 接入** | TTS / VC / Realtime / ASR 模型矩阵 · 端点健康探活 · 公开第三方基准(SIM 82.0、CER 0.98…)· 定价对比 |
| 🔗 **统一 Agent 平台对接** | 出站:把已上线 Agent 注册到 Hub;入站:网关令牌暴露 `/api/agent-gateway/{agents,invoke}`,让统一平台**真实调用** VoxOne 为各场景服务(页面内含现场自测) |
| 🗂️ **会话留痕 · 质检** | 全量转写留痕(真表可增长)· 质检打分 · 意图/情绪/标签洞察 |
| 🛠️ **智能资产管理** | Agent 编排 · 知识库 · 话术/SOP · 音色库(零样本克隆)· 外呼任务 · 号码线路 |
| 🔐 **权限与账号** | scrypt 密码 + HMAC token · RBAC(角色 × 业务场景)· 服务器端强制越权拦截(403) |

## 服务的「各种场景」

跨境电商 / 零售　·　出海 App / 游戏　·　金融科技 / 跨境支付　·　本地生活 / 教育　·　汽车 / 保险
三种模式复用同一底座:**AI 客服 Inbound · AI 销售 · AI 外呼 Outbound**。

---

## 架构

```
voxone/
├── server/
│   ├── server.js     HTTP · 静态托管 · API 路由 · RBAC 拦截 · 网关
│   ├── db.js         node:sqlite —— app(业务JSON) / users / calls(留痕) / audit / integ / meta
│   ├── auth.js       scrypt 哈希 · HMAC token · RBAC(角色 × 场景)
│   ├── realtime.js   SenseAudio V2.0 接入层 + 内置对话引擎(RAG 检索 + 编排)
│   └── voxone.db     运行时自动生成
├── assets/
│   ├── seed.js       单一数据源(agents/knowledge/scripts/voices/campaigns/model/…)
│   ├── styles.css    设计系统(深藏青 console + 商汤珊瑚红 + 语音青)
│   ├── app.js        前端框架(共享外壳 + API 客户端 + 组件)
│   ├── voice.js      浏览器端全双工语音引擎(STT + TTS + barge-in + 波形)
│   └── st_logo*.png  商汤 logo
├── login.html  index.html  workbench.html  service.html  sales.html  outbound.html
├── agents.html  knowledge.html  voices.html  traces.html  model.html
├── integration.html  users.html  settings.html
└── start.sh
```

## 与「灵犀·统一 Agent 运营中台」真实双向对接

VoxOne 已与同目录的 `agent_hub`(灵犀中台,:5180)打通真实双向对接:

- **出站(VoxOne → 灵犀)**:在「统一 Agent 对接」页填入灵犀 Hub 端点(`http://localhost:5180`)与灵犀的**接入密钥**(灵犀「外部平台对接」页可复制),点「同步注册 Agent」,VoxOne 会把已上线 Agent 以单次请求注册进灵犀(`POST {hub}/api/external/register`,`x-ingest-key` 鉴权,携带回调地址与网关令牌)。
- **入站(灵犀 → VoxOne)**:灵犀「外部平台对接」页对每个已接入 Agent 提供「反向调用」,经 `POST {hub}/api/external/invoke` → VoxOne 网关 `/api/agent-gateway/invoke` → SenseAudio 对话引擎 → 返回应答。

## 接入真实 SenseAudio V2.0 / SenseNova 端点(live 模式)

在「SenseAudio 接入」页(平台管理员)填写:端点 URL、API Key、对话模型名(默认 `SenseChat-5`)、Chat 接口路径(默认 `/v1/chat/completions`,OpenAI 兼容)。保存后引擎自动从「内置」切换为 **live**:对话大脑以**场景知识库 + SOP 作 RAG** 拼 system prompt,交由真实大模型应答;端点异常自动**回退内置引擎**,不中断服务。语音合成/识别对接 SenseAudio TTS/ASR/Realtime。

## 嵌入式语音客服 widget

`assets/widget.js` 是一段**完全自包含**的脚本,一行 `<script>` 即可把悬浮「语音客服」嵌入任意客户网页/H5,经网关(令牌鉴权、已开 CORS)与 VoxOne 全双工对话(语音 + 文本)。演示见 `embed-demo.html`(虚构商城「云台优选」),集成说明见 `WIDGET.md`。

```html
<script src="https://<你的VoxOne域名>/assets/widget.js"
        data-token="<网关令牌>" data-scenario="ecom" data-mode="service" data-lang="zh"></script>
```

## 对接网关(供统一 Agent 管理平台调用)

服务器首启生成网关令牌(见启动日志与「统一 Agent 对接」页)。

```bash
# 拉取 VoxOne 已上线 Agent 能力清单
curl "http://localhost:5190/api/agent-gateway/agents?token=<网关令牌>"

# 让 VoxOne 为某场景应答(入站调用)
curl -X POST "http://localhost:5190/api/agent-gateway/invoke?token=<网关令牌>" \
  -H "Content-Type: application/json" \
  -d '{"scenario":"ecom","mode":"service","text":"我要退货怎么退款","history":[]}'
```

出站注册:在「统一 Agent 对接」页填写 Hub 端点与令牌后点「同步注册 Agent」,VoxOne 会向 `POST {hub}/api/agents/register` 逐个注册已上线 Agent(未配置端点时本地登记并如实提示)。

---

## 说明

- **全双工语音**需浏览器支持 Web Speech API 且授权麦克风(Chrome 最佳);不支持时自动降级为**文本全双工**,功能不受影响。
- 基准数据引自《SenseAudio V2.0 多语言语音能力介绍》,产品定位与场景引自《声渡 VoxOne 介绍》《声渡 VoxOne × 亿联合作》。
- 本系统为对客演示/落地底座,所有业务数据为示例种子,可在平台内实时增改。
