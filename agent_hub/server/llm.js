// ============================================================================
//  LLM 网关 · 服务端转发到 OpenAI 兼容端点（如 SenseAudio api.senseaudio.cn/v1）
//  —— API Key 只存 server/llm.config.json，永不下发前端；前端只拿掩码。
//  仅用 Node 内置（fs / 全局 fetch，Node ≥ 18）。
// ============================================================================
const fs = require("node:fs");
const path = require("node:path");

const CONF_PATH = path.join(__dirname, "llm.config.json");

function getConfig() {
  try { return JSON.parse(fs.readFileSync(CONF_PATH, "utf8")); }
  catch { return { baseURL: "", apiKey: "", defaultModel: "", timeoutMs: 60000 }; }
}
function saveConfig(patch) {
  const c = { ...getConfig(), ...patch };
  fs.writeFileSync(CONF_PATH, JSON.stringify(c, null, 2));
  return c;
}
// 掩码：sk-abcd…c46a（前 5 后 4），前端只看得到这个
function mask(key) {
  const k = String(key || "");
  if (k.length <= 12) return k ? "••••" : "";
  return k.slice(0, 5) + "…" + k.slice(-4);
}
function maskedConfig() {
  const c = getConfig();
  return { baseURL: c.baseURL, defaultModel: c.defaultModel, apiKeyMasked: mask(c.apiKey), configured: !!(c.baseURL && c.apiKey) };
}

// 调用 chat/completions（非流式）
async function chat({ model, messages, temperature = 0.6, max_tokens = 1024 }) {
  const c = getConfig();
  if (!c.baseURL || !c.apiKey) throw { code: 500, msg: "模型接入未配置（缺 baseURL/apiKey）" };
  const url = c.baseURL.replace(/\/$/, "") + "/chat/completions";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), c.timeoutMs || 60000);
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: "POST", signal: ctrl.signal,
      headers: { "Authorization": "Bearer " + c.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model || c.defaultModel, messages, temperature, max_tokens }),
    });
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch { throw { code: 502, msg: "上游返回非 JSON（HTTP " + r.status + "）：" + text.slice(0, 160) }; }
    if (!r.ok) throw { code: r.status, msg: (j.error && (j.error.message || j.error)) || j.message || ("上游错误 HTTP " + r.status) };
    const choice = (j.choices && j.choices[0]) || {};
    return {
      content: (choice.message && choice.message.content) || "",
      finish_reason: choice.finish_reason || "",
      model: j.model || model,
      usage: j.usage || null,
      ms: Date.now() - t0,
    };
  } catch (e) {
    if (e && e.name === "AbortError") throw { code: 504, msg: "模型响应超时" };
    throw e.code ? e : { code: 502, msg: "调用模型失败：" + String(e.message || e) };
  } finally { clearTimeout(timer); }
}

// 连通性自检：拿默认模型问一句极短的话
async function health() {
  const c = getConfig();
  if (!c.baseURL || !c.apiKey) return { ok: false, configured: false, msg: "未配置" };
  try {
    const r = await chat({ model: c.defaultModel, messages: [{ role: "user", content: "ping，请只回复：pong" }], max_tokens: 8, temperature: 0 });
    return { ok: true, configured: true, model: r.model, ms: r.ms, sample: (r.content || "").slice(0, 40) };
  } catch (e) { return { ok: false, configured: true, msg: e.msg || String(e.message || e) }; }
}

module.exports = { getConfig, saveConfig, maskedConfig, mask, chat, health };
