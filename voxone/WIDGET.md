# 声渡 VoxOne · 悬浮语音客服 Widget 集成指南

一行 `<script>` 即可在**任意客户网页 / H5** 右下角嵌入一个由「声渡 VoxOne」网关驱动的悬浮语音客服。完全自包含(内联全部 CSS/HTML,不依赖 VoxOne 控制台的 `styles.css`/`app.js`),支持文字 + 全双工语音(说话识别 + AI 朗读 + 打断)。

**语音双引擎(自动选择,面板顶部有标识):**
- **⚡ SenseAudio 实时语音**——当 VoxOne 已在「SenseAudio 接入」页配置真实端点 + API Key(即 `live` 模式)时,widget 录音走**真实 SenseAudio ASR**、播报走**真实 SenseAudio TTS**,均经网关令牌免登录代理。
- **🎙️ 浏览器本地语音**——未接入端点(`builtin`)或端点不支持语音时,自动降级为浏览器 Web Speech(`SpeechRecognition` + `speechSynthesis`);再不支持则降级纯文本。功能始终可用。

> 商汤 SenseTime 出品 · 声渡 VoxOne · SenseAudio V2.0

---

## 1. 一分钟接入

把下面这段贴到你官网页面 `</body>` 之前即可(把 `data-token` 换成你的网关令牌,`https://voxone.example.com` 换成 VoxOne 部署地址):

```html
<script
  src="https://voxone.example.com/assets/widget.js"
  data-token="vx_你的网关令牌"
  data-scenario="ecom"
  data-mode="service"
  data-lang="zh"
  data-title="智能语音客服"></script>
```

如果嵌入方页面与 VoxOne **同源**(部署在同一域名下),`data-voxone-base` 可省略,`src` 用相对路径 `/assets/widget.js` 即可。

加载后:页面右下角自动出现 🎧 悬浮气泡 → 点击展开聊天面板 → 打字发送,或按 🎙️ 直接说话。

---

## 2. 配置项(script 标签 `data-*` 属性)

| 属性 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `data-token` | **是** | — | 网关令牌。凭此令牌免登录调用网关(见第 4 节获取方式)。 |
| `data-voxone-base` | 否 | `''`(同源) | VoxOne 服务基址,如 `https://voxone.example.com`。跨域时必填。 |
| `data-scenario` | 否 | `ecom` | 业务场景:`ecom` 跨境电商 / `app` 出海 App / `fintech` 金融科技 / `local` 本地生活 / `auto` 汽车保险。 |
| `data-mode` | 否 | `service` | 模式:`service` 客服 / `sales` 销售 / `outbound` 外呼。 |
| `data-lang` | 否 | `zh` | 语种:`zh`/`yue`/`en`/`es`/`ar`/`th`/`vi`/`id`/`ja`/`pt`。决定识别与朗读嗓音。 |
| `data-title` | 否 | `声渡智能语音客服` | 面板顶部标题(可写你自己的品牌名)。 |
| `data-accent` | 否 | 商汤珊瑚红 | 可选主色(任意 CSS 颜色),用于按钮/气泡主色调。 |

---

## 3. 功能一览

- **悬浮气泡 + 聊天面板**:顶部品牌条(🌊 声渡 VoxOne · 标题 · `SenseAudio V2.0` 徽标)、关闭按钮。
- **消息气泡**:用户气泡(蓝/珊瑚)、AI 气泡(语音青描边,带意图标签)、转人工时插入「已转人工」系统气泡。
- **全双工语音(双引擎)**:
  - `live` 模式 → **真实 SenseAudio 语音**:按 🎙️ 开始录音,内置**语音活动检测(VAD)**在你停顿约 1.1s 后自动断句,音频经网关送 SenseAudio ASR 转写后自动发送;AI 回复经 SenseAudio TTS 合成音频回放。
  - `builtin`/不支持 → **浏览器语音**:`SpeechRecognition` 连续识别 + `speechSynthesis` 朗读;再不行则纯文本。
  - 两条路径都支持 **AI 播报时用户开口即打断(barge-in)**;麦克风未授权时一次性轻提示后降级,功能不受影响。
- **实时波形 + 语音模式标识**:监听/播报时底部出现语音青波形动画(纯 CSS);面板顶部徽标实时显示当前是「⚡ 实时语音」还是「🎙️ 浏览器语音」,由 `GET /api/agent-gateway/capabilities` 自动探测。
- **健壮性**:网络异常仅提示一次「连接失败」不崩溃;真实端点某项语音能力不可用时本会话自动回退浏览器语音;所有 DOM id 加 `vxw-` 前缀避免与宿主页冲突;`z-index: 2147483000`;移动端(≤480px)面板自动占满全屏。

每次发送都会带上累积的对话历史:

```
POST  {base}/api/agent-gateway/invoke?token={token}
Content-Type: application/json

{
  "scenario": "ecom",
  "mode": "service",
  "text": "我的订单还没发货",
  "history": [{ "role": "user", "text": "..." }, { "role": "ai", "text": "..." }],
  "lang": "zh"
}
```

网关返回:

```json
{ "reply": { "text": "…", "intent": "物流查询", "transfer": false,
             "sentiment": "neutral", "lang": "zh", "latencyMs": 260, "source": "builtin" } }
```

Widget 渲染 `reply.text`,`reply.transfer` 为 `true` 时展示「已转人工」气泡,并把 `{role:'user'|'ai', text}` 累积进 `history`。开场会本地展示一条欢迎语,后续对话全部走网关。

自检(可选):`GET {base}/api/agent-gateway/agents?token={token}` 返回该令牌可用的 Agent 能力清单。

**语音网关接口(均凭 `token` 免登录、支持跨域,widget 内部自动调用):**

| 接口 | 用途 | 关键返回 |
|---|---|---|
| `GET /api/agent-gateway/capabilities?token=` | 探测语音能力,决定用真实语音还是浏览器语音 | `{ voice: { mode:"live"\|"builtin", serverVoice, tts, asr, provider } }` |
| `POST /api/agent-gateway/tts?token=` | 文字 → 语音(真实 TTS) | `{ ok, audioBase64, contentType }`;未接入端点时 `{ ok:false, fallback:true }` |
| `POST /api/agent-gateway/asr?token=` | 语音 → 文字(真实 ASR) | `{ ok, text }`;未接入端点时 `{ ok:false, fallback:true }` |

> 语音端点、模型名、接口路径、音色均在控制台「SenseAudio 接入」页配置(默认 OpenAI 兼容形态:`/audio/speech`、`/audio/transcriptions`)。`fallback:true` 表示当前为 `builtin` 或端点未提供该能力,widget 据此自动切回浏览器语音。

---

## 4. 网关令牌从哪来

登录 VoxOne 控制台 → **「统一 Agent 对接」页**(`integration.html`),在「入站网关(Gateway)」区块可查看/复制当前**网关令牌**(形如 `vx_xxxxxxxx`),并可一键轮换。该令牌免登录、面向外部调用,请仅用于受信任的嵌入页面;轮换后旧令牌立即失效。

> 权限说明:只有具备「集成管理 / 全局查看」权限的账号能在该页看到令牌明文。

---

## 5. 跨域(CORS)

当嵌入页与 VoxOne 部署在**不同域名**时,`fetch` 属于跨域请求,需要 VoxOne 网关在响应中返回允许跨域的 CORS 头(`Access-Control-Allow-Origin` 等)。**该能力已由平台侧统一支持**,无需嵌入方额外处理——只要把 `data-voxone-base` 指向正确的 VoxOne 地址即可。

同源部署(widget 与网关同域)则不涉及跨域,`data-voxone-base` 留空即可。

> 语音识别/朗读依赖浏览器 Web Speech API,通常要求页面运行在 **HTTPS**(或 `localhost`)下并授权麦克风;不满足时 widget 自动降级为纯文本模式。

---

## 6. 宿主页可调用的 API

Widget 加载后在全局暴露:

```js
window.VoxOneWidget.open();    // 展开面板
window.VoxOneWidget.close();   // 收起面板
window.VoxOneWidget.toggle();  // 切换
window.VoxOneWidget.config();  // 返回当前生效配置(只读副本)
```

例如把你官网现有的「联系客服」按钮接上 widget:

```html
<button onclick="VoxOneWidget.open()">联系客服</button>
```

---

## 7. 本地演示

仓库内 `embed-demo.html` 是一个**模拟客户官网**(虚构跨境电商「云台优选 · YunTai Global」),已在右下角接入本 widget,用于演示「嵌入即用」。**无需手动改令牌**——通过 VoxOne 服务访问 `http://localhost:5190/embed-demo` 时,服务端会自动把 `data-token` 注入为当前真实网关令牌(DB 重置/轮换后也始终有效)。

**体验真实 SenseAudio 语音的两步:**
1. 登录控制台 → 「SenseAudio 接入」页,填端点(默认 `https://api.senseaudio.cn/v1`)、粘贴你的 **API Key**、按需调整 TTS/ASR 模型名与接口路径 → 保存。引擎从 `builtin` 切为 `live`。
2. 打开 `embed-demo` → 顶部徽标变为「⚡ SenseAudio 实时语音」→ 按 🎙️ 说一句,即走真实 ASR 转写、真实 TTS 播报。

> 未配置 Key 时,demo 依然完整可用(内置对话大脑 + 浏览器语音),徽标显示「🎙️ 浏览器本地语音」。
