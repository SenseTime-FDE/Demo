// ============================================================================
//  声渡 VoxOne · SenseAudio V2.0 接入层 + 对话大脑
//   · modelConfig() 读取模型矩阵配置(端点/密钥/音色/健康)
//   · health()      配置了真实端点则发起真实探活,否则返回内置引擎「就绪」
//   · reply()       给定 场景/模式/坐席/历史/用户话术 → 生成 AI 回复
//                    真实端点存在时代理到 SenseAudio Realtime / LLM,否则用
//                    内置「知识库检索 + 话术编排」引擎(离线可用,支撑全双工 Demo)
//  仅用 Node 内置能力(Node18+ 自带 fetch),零第三方依赖
// ============================================================================
const db = require("./db.js");

const MODEL_KEYS = {
  endpoint: "sa_endpoint", apiKey: "sa_apikey", realtimeModel: "sa_rt_model",
  chatPath: "sa_chat_path", chatModel: "sa_chat_model",
  // —— 语音(TTS/ASR)接入,默认走 OpenAI 兼容形态;真实 SenseAudio 若不同可在「接入配置」改 ——
  ttsModel: "sa_tts_model", ttsPath: "sa_tts_path", ttsVoice: "sa_tts_voice", ttsFormat: "sa_tts_format",
  asrModel: "sa_asr_model", asrPath: "sa_asr_path",
};

function modelConfig() {
  const { data } = db.getData();
  const endpoint = db.getMeta(MODEL_KEYS.endpoint, "");
  const apiKey = db.getMeta(MODEL_KEYS.apiKey, "");
  const cfg = data.model || {};
  return {
    ...cfg,
    endpoint,
    chatPath: db.getMeta(MODEL_KEYS.chatPath, "/chat/completions"),
    chatModel: db.getMeta(MODEL_KEYS.chatModel, "deepseek-v4-flash"),
    realtimeModel: db.getMeta(MODEL_KEYS.realtimeModel, "SenseAudio-Realtime-2.0"),
    ttsModel: db.getMeta(MODEL_KEYS.ttsModel, "senseaudio-tts-1.5-260319"),
    ttsPath: db.getMeta(MODEL_KEYS.ttsPath, "/audio/speech"),
    ttsVoice: db.getMeta(MODEL_KEYS.ttsVoice, "default"),
    ttsFormat: db.getMeta(MODEL_KEYS.ttsFormat, "mp3"),
    asrModel: db.getMeta(MODEL_KEYS.asrModel, "senseaudio-asr-1.5-260319"),
    asrPath: db.getMeta(MODEL_KEYS.asrPath, "/audio/transcriptions"),
    apiKeySet: !!apiKey,
    apiKeyMask: apiKey ? apiKey.slice(0, 4) + "••••••••" + apiKey.slice(-2) : "",
    mode: (endpoint && apiKey) ? "live" : "builtin", // 需端点+密钥齐备才走 live;缺一则用内置引擎(不发起远端慢调用)
  };
}
function setModelCreds({ endpoint, apiKey, realtimeModel, chatPath, chatModel, ttsModel, ttsPath, ttsVoice, ttsFormat, asrModel, asrPath }) {
  if (endpoint != null) db.setMeta(MODEL_KEYS.endpoint, endpoint);
  if (apiKey != null && apiKey !== "") db.setMeta(MODEL_KEYS.apiKey, apiKey);
  if (realtimeModel != null && realtimeModel !== "") db.setMeta(MODEL_KEYS.realtimeModel, realtimeModel);
  if (chatPath != null && chatPath !== "") db.setMeta(MODEL_KEYS.chatPath, chatPath);
  if (chatModel != null && chatModel !== "") db.setMeta(MODEL_KEYS.chatModel, chatModel);
  if (ttsModel != null && ttsModel !== "") db.setMeta(MODEL_KEYS.ttsModel, ttsModel);
  if (ttsPath != null && ttsPath !== "") db.setMeta(MODEL_KEYS.ttsPath, ttsPath);
  if (ttsVoice != null && ttsVoice !== "") db.setMeta(MODEL_KEYS.ttsVoice, ttsVoice);
  if (ttsFormat != null && ttsFormat !== "") db.setMeta(MODEL_KEYS.ttsFormat, ttsFormat);
  if (asrModel != null && asrModel !== "") db.setMeta(MODEL_KEYS.asrModel, asrModel);
  if (asrPath != null && asrPath !== "") db.setMeta(MODEL_KEYS.asrPath, asrPath);
}

// 语音能力自述:嵌入式 widget 据此决定用「真实 SenseAudio 语音」还是「浏览器本地语音」
function voiceCaps() {
  const cfg = modelConfig();
  const live = cfg.mode === "live";
  return {
    mode: cfg.mode,               // live | builtin
    serverVoice: live,            // true=可走服务端真实 TTS/ASR
    tts: live, asr: live,
    provider: live ? "SenseAudio V2.0" : "browser",
    ttsModel: cfg.ttsModel, asrModel: cfg.asrModel,
    note: live
      ? "已接入 SenseAudio 实时语音端点:录音走真实 ASR,播报走真实 TTS。"
      : "未配置端点 · 使用浏览器本地语音(Web Speech);在「SenseAudio 接入」页粘贴 API Key 即自动升级为真实语音。",
  };
}

async function health() {
  const cfg = modelConfig();
  if (cfg.mode === "builtin") {
    return { ok: true, mode: "builtin", latencyMs: 0, note: "内置对话引擎(离线)已就绪 —— 可直接体验语音+文本全双工;配置真实端点后自动切换 live" };
  }
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const key = db.getMeta(MODEL_KEYS.apiKey, "");
    const res = await fetch(cfg.endpoint.replace(/\/$/, "") + "/health", {
      method: "GET", signal: ctrl.signal,
      headers: key ? { Authorization: "Bearer " + key } : {},
    });
    clearTimeout(timer);
    return { ok: res.ok, mode: "live", status: res.status, latencyMs: Date.now() - t0, endpoint: cfg.endpoint };
  } catch (e) {
    return { ok: false, mode: "live", latencyMs: Date.now() - t0, endpoint: cfg.endpoint, error: String(e.message || e) };
  }
}

// ---- 内置对话引擎:检索 + 编排 ---------------------------------------------
const NEG = ["投诉", "差评", "太差", "生气", "垃圾", "骗", "起诉", "曝光", "complaint", "angry", "terrible", "sue", "worst", "rubbish"];
const HANDOFF = ["人工", "转人工", "真人", "客服经理", "human", "agent", "representative", "real person"];

function detectLang(text) {
  if (/[一-鿿]/.test(text)) return "zh";
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (/[ก-๙]/.test(text)) return "th";
  return "en";
}

// 给定用户话术,在场景知识库/话术中做朴素检索(词面重合 + 关键词)
function retrieve(data, scenario, text) {
  const t = String(text || "").toLowerCase();
  // scenario==="all"(全渠道统一 omni):跨全部场景检索同一套知识库
  const kbs = (data.knowledge || []).filter((k) => scenario === "all" || k.scenario === scenario || k.scenario === "*");
  let best = null, bestScore = 0;
  for (const k of kbs) {
    const hay = (k.title + " " + (k.keywords || []).join(" ") + " " + (k.answer || "")).toLowerCase();
    let score = 0;
    for (const kw of (k.keywords || [])) if (t.includes(String(kw).toLowerCase())) score += 3;
    for (const w of t.split(/[\s，。,.?？!！]+/).filter((x) => x.length > 1)) if (hay.includes(w)) score += 1;
    if (score > bestScore) { bestScore = score; best = k; }
  }
  return bestScore >= 2 ? best : null;
}

function builtinReply({ scenario, mode, agentName, history = [], text, lang }, sourceTag) {
  const { data } = db.getData();
  const L = lang || detectLang(text || "");
  const t = String(text || "");
  const lower = t.toLowerCase();
  const t0 = Date.now();

  const wantHuman = HANDOFF.some((k) => lower.includes(k));
  const negative = NEG.some((k) => lower.includes(k));
  const turnNo = history.filter((h) => h.role === "user").length + 1;

  let out, intent, transfer = false, sop = null, sentiment = negative ? "negative" : "neutral";

  const greet = { zh: "您好,这里是声渡智能语音助手,很高兴为您服务。", en: "Hi, this is the VoxOne AI voice assistant — happy to help.", ar: "مرحبًا، أنا مساعد VoxOne الصوتي.", th: "สวัสดีค่ะ นี่คือผู้ช่วยเสียง VoxOne ค่ะ" };

  if (wantHuman) {
    transfer = true;
    intent = "转人工";
    out = { zh: "好的,正在为您接入人工坐席,已把本次对话的完整上下文同步过去,请稍候。", en: "Sure — connecting you to a human agent now, with the full context handed over. One moment.", ar: "حسنًا، سأحوّلك إلى وكيل بشري الآن مع كامل سياق المحادثة.", th: "ได้ค่ะ กำลังโอนสายให้เจ้าหน้าที่พร้อมบริบทการสนทนาทั้งหมดค่ะ" }[L];
  } else if (turnNo === 1 && t.length < 6) {
    intent = "开场";
    out = greet[L] + (mode === "outbound" ? (L === "zh" ? "耽误您一分钟,想跟您同步一个与您账户相关的信息。" : " This will take a minute regarding your account.") : "");
  } else {
    const hit = retrieve(data, mode === "omni" ? "all" : scenario, t);
    if (hit) {
      intent = hit.title;
      sop = hit.sopId ? { id: hit.sopId, title: hit.sopTitle || hit.title } : null;
      out = L === "zh" ? hit.answer : (hit.answer_i18n && hit.answer_i18n[L]) || hit.answer + (L === "en" ? "" : "");
      if (L !== "zh" && !(hit.answer_i18n && hit.answer_i18n[L])) {
        // 无对应语种译文时,声明将以该语种作答(内置引擎演示口径)
        out = "[" + L.toUpperCase() + "] " + hit.answer;
      }
    } else {
      intent = "一般咨询";
      out = {
        zh: "我理解您的问题。为准确处理,请补充一下具体的订单号/账户信息;同时我已记录您的诉求,可随时为您转接人工。",
        en: "I understand. To help accurately, could you share the order/account reference? I've logged your request and can transfer to a human anytime.",
        ar: "أفهم طلبك. لمساعدتك بدقة، شاركني رقم الطلب/الحساب. سجّلت طلبك ويمكنني التحويل لوكيل بشري.",
        th: "เข้าใจค่ะ ขอเลขคำสั่งซื้อ/บัญชีเพื่อช่วยได้แม่นยำขึ้น และสามารถโอนหาเจ้าหน้าที่ได้ตลอดค่ะ",
      }[L];
    }
    if (negative) {
      sentiment = "negative";
      out = (L === "zh" ? "非常抱歉给您带来困扰,我会优先为您处理。" : "I'm sorry for the trouble — I'll prioritize this. ") + out;
      if (turnNo >= 2) transfer = true;
    }
  }

  // 内置引擎模拟端到端低延迟(SenseAudio Realtime 目标区间)
  const latencyMs = 240 + Math.floor(((t.length * 7 + turnNo * 13) % 260));
  return {
    text: out, intent, transfer, sop, sentiment, lang: L, turn: turnNo,
    latencyMs, source: sourceTag || modelConfig().mode, engineMs: Date.now() - t0,
  };
}

// ---- 真实端点(SenseNova 日日新 / OpenAI 兼容 chat-completions)----------------
//  以场景知识库 + SOP 作 RAG 上下文,拼 system prompt 交由真实大模型作答。
function buildMessages({ scenario, mode, history = [], text, lang }) {
  const { data } = db.getData();
  const hit = retrieve(data, mode === "omni" ? "all" : scenario, text);
  const sop = hit && hit.sopId ? (data.scripts || []).find((s) => s.id === hit.sopId) : null;
  const sc = { ecom: "跨境电商/零售", app: "出海App/游戏", fintech: "金融科技/跨境支付", local: "本地生活/教育", auto: "汽车/保险" }[scenario] || scenario;
  const modeName = { service: "AI 客服(解决问题)", sales: "AI 销售(促成转化)", outbound: "AI 外呼(主动触达)", omni: "全渠道统一 AI(售前答疑 + 售后服务一体,跨语音/文本多渠道,同一套知识库)" }[mode] || mode;
  const langName = { zh: "简体中文", yue: "粤语", en: "English", ar: "Arabic", th: "Thai", es: "Spanish", id: "Bahasa Indonesia" }[lang] || "用户所用语言";
  let sys = `你是「声渡 VoxOne」——商汤科技的语音原生 AI 助手,当前服务【${sc}】场景,担任【${modeName}】。\n`
    + `规则:①用${langName}作答;②口语化、简洁(将用于语音播报,一般不超过 3 句);③礼貌专业、必要时安抚情绪;`
    + `④如用户要求人工、或问题复杂/涉及授权无法自助,则明确表示将转接人工坐席;⑤严格依据下方知识作答,不编造。\n`;
  if (hit) sys += `\n【可用知识:${hit.title}】\n${hit.answer}\n`;
  if (sop) sys += `\n【处理步骤 SOP:${sop.title}】\n${(sop.steps || []).map((s, i) => (i + 1) + ". " + s).join("\n")}\n`;
  const msgs = [{ role: "system", content: sys }];
  for (const h of history.slice(-8)) msgs.push({ role: h.role === "ai" ? "assistant" : "user", content: h.text });
  msgs.push({ role: "user", content: text || "你好" });
  return { msgs, intent: hit ? hit.title : "一般咨询", sop: hit && hit.sopId ? { id: hit.sopId, title: hit.sopTitle || hit.title } : null };
}

async function liveReply(params) {
  const cfg = modelConfig();
  const key = db.getMeta(MODEL_KEYS.apiKey, "");
  const { msgs, intent, sop } = buildMessages(params);
  const L = params.lang || detectLang(params.text || "");
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const url = cfg.endpoint.replace(/\/$/, "") + cfg.chatPath;
    const res = await fetch(url, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: "Bearer " + key } : {}) },
      body: JSON.stringify({ model: cfg.chatModel, messages: msgs, temperature: 0.4, max_tokens: 512, stream: false }),
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    // 兼容 OpenAI / SenseNova 返回结构
    const out = (j.choices && j.choices[0] && (j.choices[0].message && j.choices[0].message.content))
      || (j.data && j.data.choices && j.data.choices[0] && j.data.choices[0].message && j.data.choices[0].message.content)
      || (j.choices && j.choices[0] && j.choices[0].text) || "";
    if (!out) throw new Error("空回复");
    const lower = out.toLowerCase();
    const transfer = /转人工|人工坐席|human agent|transfer/.test(lower) || HANDOFF.some((k) => (params.text || "").toLowerCase().includes(k));
    const negative = NEG.some((k) => (params.text || "").toLowerCase().includes(k));
    return { text: out.trim(), intent, transfer, sop, sentiment: negative ? "negative" : "neutral", lang: L,
      turn: (params.history || []).filter((h) => h.role === "user").length + 1, latencyMs: Date.now() - t0, source: "live", model: cfg.chatModel };
  } catch (e) {
    clearTimeout(timer);
    // 真实端点异常 → 回退内置引擎,保证不中断服务
    const r = builtinReply(params, "builtin-fallback");
    r.fallbackError = String(e.message || e);
    return r;
  }
}

// 统一入口:配置了真实端点走 live,否则内置引擎
async function reply(params) {
  return modelConfig().mode === "live" ? liveReply(params) : builtinReply(params);
}

// ---- 拉取端点在线模型列表(OpenAI 兼容 GET /models)——用于货架连通状态灯 ----
async function listModels() {
  const cfg = modelConfig();
  if (cfg.mode !== "live") return { ok: false, mode: "builtin", models: [], note: "未配置端点 · 货架为静态目录;配置真实端点 + Key 后可拉取在线模型列表并逐项点亮" };
  const key = db.getMeta(MODEL_KEYS.apiKey, "");
  const t0 = Date.now();
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(cfg.endpoint.replace(/\/$/, "") + "/models", { headers: key ? { Authorization: "Bearer " + key } : {}, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, mode: "live", status: res.status, models: [], latencyMs: Date.now() - t0, error: "HTTP " + res.status };
    const j = await res.json();
    const models = (j.data || j.models || []).map((m) => (typeof m === "string" ? m : m.id)).filter(Boolean);
    return { ok: true, mode: "live", models, latencyMs: Date.now() - t0 };
  } catch (e) { return { ok: false, mode: "live", models: [], latencyMs: Date.now() - t0, error: String(e.message || e) }; }
}

// ---- 真实 TTS:文字 → 语音(OpenAI 兼容 POST /audio/speech,路径/模型/音色可配)----
async function tts({ text, voice, model, format, lang }) {
  const cfg = modelConfig();
  if (cfg.mode !== "live") return { ok: false, fallback: true, note: "未配置端点 · 使用浏览器本地合成试听" };
  const key = db.getMeta(MODEL_KEYS.apiKey, "");
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(cfg.endpoint.replace(/\/$/, "") + cfg.ttsPath, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: "Bearer " + key } : {}) },
      body: JSON.stringify({
        model: model || cfg.ttsModel,
        input: String(text || "").slice(0, 800),
        voice: voice || cfg.ttsVoice,
        response_format: format || cfg.ttsFormat,
        ...(lang ? { language: lang } : {}),
      }),
    });
    clearTimeout(timer);
    if (!res.ok) { let e = ""; try { e = (await res.json()).error?.message; } catch {} return { ok: false, fallback: true, error: e || ("HTTP " + res.status) }; }
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, audioBase64: buf.toString("base64"), contentType: res.headers.get("content-type") || "audio/mpeg", model: model || cfg.ttsModel };
  } catch (e) { return { ok: false, fallback: true, error: String(e.message || e) }; }
}

// ---- 真实 ASR:语音 → 文字(OpenAI 兼容 POST /audio/transcriptions, multipart)----
async function asr({ audioBase64, contentType, filename, model, lang }) {
  const cfg = modelConfig();
  if (cfg.mode !== "live") return { ok: false, fallback: true, note: "未配置端点 · 请用浏览器识别" };
  const key = db.getMeta(MODEL_KEYS.apiKey, "");
  try {
    const bytes = Buffer.from(audioBase64 || "", "base64");
    const fd = new FormData();
    fd.append("file", new Blob([bytes], { type: contentType || "audio/webm" }), filename || "audio.webm");
    fd.append("model", model || cfg.asrModel);
    if (lang) fd.append("language", lang);
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(cfg.endpoint.replace(/\/$/, "") + cfg.asrPath, { method: "POST", signal: ctrl.signal, headers: key ? { Authorization: "Bearer " + key } : {}, body: fd });
    clearTimeout(timer);
    // 端点未提供该 ASR 接口 / 报错 → fallback:true,widget 据此本会话回退浏览器识别,不中断
    if (!res.ok) { let e = ""; try { e = (await res.json()).error?.message; } catch {} return { ok: false, fallback: true, error: e || ("HTTP " + res.status) }; }
    const j = await res.json();
    return { ok: true, text: j.text || j.result || "", model: model || cfg.asrModel };
  } catch (e) { return { ok: false, fallback: true, error: String(e.message || e) }; }
}

module.exports = { modelConfig, setModelCreds, health, reply, builtinReply, liveReply, listModels, tts, asr, voiceCaps, MODEL_KEYS };
