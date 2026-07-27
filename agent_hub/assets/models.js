/* ============================================================================
   模型货架 · SenseAudio 开放平台（api.senseaudio.cn/v1）—— 前端安全，无密钥
   type: chat=文本对话(可绑定Agent/试一试) · tts/asr/music/video/image=其它能力(独立端点)
   价格为示意（元），in/out 为每百万 Token；语音/音乐/视频/图片单位见 unit。
   ============================================================================ */
window.MODELS = [
  // ——— SenseAudio 自研模型（文本/多模态对话）———
  { id: "senseaudio-s2",        name: "SenseAudio-S2",        group: "自研", type: "chat", in: 5,  out: 30, ctx: "1M",   note: "旗舰 1600B，综合最强" },
  { id: "senseaudio-s2-flash",  name: "SenseAudio-S2-Flash",  group: "自研", type: "chat", in: 2,  out: 12, ctx: "256K", note: "高速高性价比" },
  { id: "senseaudio-s2-lite",   name: "SenseAudio-S2-Lite",   group: "自研", type: "chat", in: 1,  out: 6,  ctx: "256K", note: "轻量低成本" },
  { id: "senseaudio-s1",        name: "SenseAudio-S1",        group: "自研", type: "chat", in: 5,  out: 30, ctx: "1M",   note: "上一代旗舰" },
  { id: "senseaudio-vl-1.0-260319",      name: "SenseAudio-VL-1.0",      group: "自研", type: "chat", in: 5, out: 30, ctx: "1M",   note: "视觉语言多模态" },
  { id: "senseaudio-vl-lite-1.0-260319", name: "SenseAudio-VL-Lite-1.0", group: "自研", type: "chat", in: 1, out: 5,  ctx: "256K", note: "轻量视觉语言" },
  { id: "sensenova-6.7-flash-lite",      name: "SenseNova-6.7-Flash-Lite", group: "自研", type: "chat", in: 5, out: 30, ctx: "256K", note: "日日新 Flash Lite" },

  // ——— 其他通用模型（文本对话）———
  { id: "deepseek-v4-flash",    name: "DeepSeek-V4-Flash", group: "通用", type: "chat", in: 2,   out: 4,    ctx: "1M",   note: "便宜快，默认试用" },
  { id: "deepseek-v4-pro",      name: "DeepSeek-V4-Pro",   group: "通用", type: "chat", in: 12,  out: 24,   ctx: "1M",   note: "强推理" },
  { id: "qwen3.6-27b",          name: "Qwen3.6-27B",       group: "通用", type: "chat", in: 3,   out: 18,   ctx: "256K", note: "通义千问" },
  { id: "qwen3.6-35b-a3b",      name: "Qwen3.6-35B-A3B",   group: "通用", type: "chat", in: 1.8, out: 10.8, ctx: "256K", note: "MoE 高效" },
  { id: "kimi-k2.6",            name: "Kimi K2.6",         group: "通用", type: "chat", in: 6.5, out: 27,   ctx: "256K", note: "长文本" },
  { id: "glm-5.1",              name: "GLM-5.1",           group: "通用", type: "chat", in: 6,   out: 24,   ctx: "200K", note: "智谱，≥32K 阶梯 8/28" },
  { id: "glm-5.2",              name: "GLM-5.2",           group: "通用", type: "chat", in: 6,   out: 24,   ctx: "1M",   note: "智谱新版，≥32K 阶梯 8/28" },
  { id: "minimax-m2.7",         name: "MiniMax-M2.7",      group: "通用", type: "chat", in: 2.1, out: 8.4,  ctx: "200K", note: "海螺" },
  { id: "doubao-seed-2.0-pro-260215", name: "Doubao-Seed-2.0-Pro", group: "通用", type: "chat", in: 3.2, out: 16, ctx: "256K", note: "豆包，按输入长度阶梯计价" },

  // ——— 语音合成 / 识别 / 音乐 / 视频 / 图片（独立端点，非 chat）———
  { id: "senseaudio-tts-1.5-260319",         name: "SenseAudio-TTS-1.5",         group: "语音合成", type: "tts",   price: "3.5 元/万字符", note: "多情绪·多风格·多音字·公式拼读" },
  { id: "senseaudio-asr-lite-1.5-260319",    name: "SenseAudio-ASR-Lite-1.5",    group: "语音识别", type: "asr",   price: "0.9 元/小时",   note: "轻量低成本识别" },
  { id: "senseaudio-asr-1.5-260319",         name: "SenseAudio-ASR-1.5",         group: "语音识别", type: "asr",   price: "1.8 元/小时",   note: "通用识别" },
  { id: "senseaudio-asr-pro-1.5-260319",     name: "SenseAudio-ASR-Pro-1.5",     group: "语音识别", type: "asr",   price: "3.6 元/小时",   note: "专业级高精识别" },
  { id: "senseaudio-asr-deepthink-1.5-260319", name: "SenseAudio-ASR-DeepThink-1.5", group: "语音识别", type: "asr", price: "3.6 元/小时", note: "深度推理增强识别" },
  { id: "senseaudio-asr-check-1.5-260319",   name: "SenseAudio-ASR-Check-1.5",   group: "语音识别", type: "asr",   price: "3 元/小时",     note: "复核/校对场景" },
  { id: "senseaudio-music-1.0-260319",       name: "SenseAudio-Music-1.0",       group: "音乐生成", type: "music", price: "0.5 元/首",     note: "歌词生成·歌曲生成" },
  { id: "doubao-seedance-2.0-260128",        name: "Doubao-Seedance-2.0",        group: "视频生成", type: "video", price: "0.5~3.1 元/秒",  note: "480P/720P/1080P 分级" },
  { id: "senseaudio-image-2.0-260319",       name: "SenseAudio-Image-2.0",       group: "图片生成", type: "image", price: "0.5 元/张",     note: "文生图 2.0" },
  { id: "senseaudio-image-1.0-260319",       name: "SenseAudio-Image-1.0",       group: "图片生成", type: "image", price: "0.2 元/张",     note: "文生图 1.0" },
  { id: "doubao-seedream-5.0-lite",          name: "Doubao-Seedream-5.0-Lite",   group: "图片生成", type: "image", price: "0.22 元/张",    note: "豆包绘图 Lite" },
  { id: "sensenova-u1-fast",                 name: "SenseNova-U1-Fast",          group: "图片生成", type: "image", price: "0.5 元/张",     note: "日日新 U1 Fast" },
];

// 便捷：可用于对话/绑定的文本模型
window.CHAT_MODELS = window.MODELS.filter((m) => m.type === "chat");
