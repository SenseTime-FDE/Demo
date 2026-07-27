// ============================================================================
//  统一 Agent 运营中台 · 后端服务（Node 内置，零依赖）
//  启动：node server/server.js  （端口默认 5180，可用 PORT 覆盖）
//  能力：静态托管 + 账号登录鉴权 + RBAC(角色×场景) + 共享 SQLite + 语音留痕 + 审计
// ============================================================================
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const db = require("./db.js");
const auth = require("./auth.js");
const llm = require("./llm.js");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 5180);
const SECRET = db.secret();
// 外部平台(如 声渡 VoxOne)对接:接入密钥(首启生成并持久化)
if (!db.getMeta("ingest_key")) db.setMeta("ingest_key", "hub_" + require("node:crypto").randomBytes(16).toString("hex"));

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp" };

const send = (res, code, obj, headers) => {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...(headers || {}) });
  res.end(body);
};
const readBody = (req) => new Promise((resolve) => {
  let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } });
});

// ---- 鉴权上下文 ------------------------------------------------------------
function ctxOf(req) {
  const h = req.headers["authorization"] || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  const payload = auth.verifyToken(tok, SECRET);
  if (!payload) return null;
  const u = db.getUser(payload.u);
  if (!u) return null;
  return { username: u.username, role: u.role, name: u.name, scenarios: u.scenarios || [], tenantId: u.tenantId || null, mustChange: !!u.mustChange, perms: auth.permsFor(u.role) };
}
const canScene = (ctx, scenario) => auth.inScenario(ctx.scenarios, scenario);
const canTenant = (ctx, tenantId) => !ctx.tenantId || ctx.tenantId === tenantId; // 租户级用户仅限本租户

// 按 业务×租户 裁剪 bootstrap 数据（平台运营/观察员看全部）
function scopeData(ctx, data) {
  if (ctx.perms.viewAll) return data;
  const d = { ...data };
  d.businesses = (data.businesses || []).filter((b) => canScene(ctx, b.id));
  d.tenants = (data.tenants || []).filter((t) => canScene(ctx, t.businessId) && canTenant(ctx, t.id));
  d.agents = (data.agents || []).filter((a) => canScene(ctx, a.scenario) && canTenant(ctx, a.tenantId));
  return d;
}

// ---- 局部改：按 kind 做 RBAC 校验（Agent / 知识库 / SOP / 场景业务）--------
function applyChange(ctx, kind, payload) {
  const P = ctx.perms;
  const need = (cond, msg) => { if (!cond) throw { code: 403, msg }; };
  // 场景归属校验：payload.scenario 必须在用户可操作范围
  const sc = payload.scenario;
  const sceneOk = sc ? canScene(ctx, sc) : true;

  return db.mutate(ctx.username, "change:" + kind, (D) => {
    switch (kind) {
      // ---- Agent 管理（编排 / 上下架 / 绑定 / 分配到租户）----
      case "agent.upsert": {
        need(P.manageAgents && sceneOk, "无权管理该业务 Agent");
        const a = payload.agent; a.businessId = a.businessId || a.scenario;
        if (ctx.tenantId) a.tenantId = ctx.tenantId;          // 租户管理员：强制本租户
        need(canTenant(ctx, a.tenantId), "只能管理本租户的 Agent");
        const ex = D.agents.find((x) => x.id === a.id);
        if (ex) { need(canTenant(ctx, ex.tenantId), "只能管理本租户的 Agent"); Object.assign(ex, a); }
        else D.agents.unshift({ calls: 0, ...a });
        return a.name;
      }
      case "agent.toggle": {
        need(P.manageAgents, "无权上下架 Agent");
        const a = D.agents.find((x) => x.id === payload.id); if (!a) throw { code: 404, msg: "Agent 不存在" };
        need(canScene(ctx, a.scenario) && canTenant(ctx, a.tenantId), "无权操作该 Agent");
        a.status = a.status === "on" ? "off" : "on";
        return a.name + "→" + a.status;
      }
      case "agent.delete": {
        need(P.manageAgents, "无权删除 Agent");
        const a = D.agents.find((x) => x.id === payload.id); if (!a) return "";
        need(canScene(ctx, a.scenario) && canTenant(ctx, a.tenantId), "无权操作该 Agent");
        D.agents = D.agents.filter((x) => x.id !== payload.id);
        return a.name;
      }
      case "agent.assign": {   // 业务管理员把 Agent 分配到某租户
        need(P.manageTenants, "无权分配 Agent 到租户");
        const a = D.agents.find((x) => x.id === payload.id); if (!a) throw { code: 404, msg: "Agent 不存在" };
        need(canScene(ctx, a.scenario), "无权操作该业务 Agent");
        const t = (D.tenants || []).find((x) => x.id === payload.tenantId);
        need(t && t.businessId === a.scenario, "目标租户不属于该业务");
        a.tenantId = payload.tenantId;
        return a.name + "→" + t.name;
      }
      // ---- 租户管理（业务管理员 / 平台运营）----
      case "tenant.upsert": {
        need(P.manageTenants && sceneOk, "无权管理该业务租户");
        const t = payload.tenant; t.businessId = t.businessId || sc;
        need(canScene(ctx, t.businessId), "无权在该业务下建租户");
        if (!D.tenants) D.tenants = [];
        const ex = D.tenants.find((x) => x.id === t.id);
        if (ex) Object.assign(ex, t); else D.tenants.push(t);
        return t.name;
      }
      case "tenant.delete": {
        need(P.manageTenants, "无权删除租户");
        const t = (D.tenants || []).find((x) => x.id === payload.id); if (!t) return "";
        need(canScene(ctx, t.businessId), "无权删除该业务租户");
        D.tenants = D.tenants.filter((x) => x.id !== payload.id);
        D.agents = (D.agents || []).filter((a) => a.tenantId !== payload.id); // 连带其 Agent
        return t.name;
      }
      // ---- 声渡（拟真人语音）接入配置：一个业务一套 ----
      case "voxone.config": {
        need(P.manageVoxone && sceneOk, "无权配置该业务声渡");
        const b = (D.businesses || []).find((x) => x.id === payload.businessId);
        need(b && canScene(ctx, b.id), "业务不存在或无权");
        b.voxone = { ...(b.voxone || {}), ...(payload.voxone || {}) };
        return b.name + " 声渡";
      }
      // ---- 知识库 ----
      case "kb.upsert": {
        need(P.editConfig && sceneOk, "无权维护该场景知识库");
        const k = payload.kb; const ex = D.kbs.find((x) => x.id === k.id);
        if (ex) Object.assign(ex, k); else D.kbs.unshift(k);
        return k.name;
      }
      case "kb.delete": {
        need(P.editConfig, "无权删除知识库");
        const k = D.kbs.find((x) => x.id === payload.id); if (!k) return "";
        need(canScene(ctx, k.scenario), "无权操作该场景知识库");
        D.kbs = D.kbs.filter((x) => x.id !== payload.id);
        return k.name;
      }
      // ---- SOP ----
      case "sop.upsert": {
        need(P.editConfig && sceneOk, "无权维护该场景 SOP");
        const s = payload.sop; const ex = D.sops.find((x) => x.id === s.id);
        if (ex) Object.assign(ex, s); else D.sops.unshift({ pushCount: 0, ...s });
        return s.title;
      }
      case "sop.delete": {
        need(P.editConfig, "无权删除 SOP");
        const s = D.sops.find((x) => x.id === payload.id); if (!s) return "";
        need(canScene(ctx, s.scenario), "无权操作该场景 SOP");
        D.sops = D.sops.filter((x) => x.id !== payload.id);
        return s.title;
      }
      case "sop.push": {
        need(P.pushSop, "无权推送 SOP");
        const s = D.sops.find((x) => x.id === payload.id); if (!s) throw { code: 404, msg: "SOP 不存在" };
        need(canScene(ctx, s.scenario), "无权推送该场景 SOP");
        s.pushCount = (s.pushCount || 0) + 1;
        if (!D.pushLog) D.pushLog = [];
        D.pushLog.unshift({ ts: new Date().toISOString(), sopId: s.id, title: s.title, scenario: s.scenario, by: ctx.name || ctx.username, to: payload.to || "全体坐席" });
        D.pushLog = D.pushLog.slice(0, 200);
        return s.title;
      }
      // ---- 场景业务数据（内容/分发/舆情/关键词/…）----
      case "scene.patch": {
        need(P.editConfig && sceneOk, "无权编辑该场景数据");
        const { scenario, path: keyPath, value } = payload;
        let node = D[scenario]; if (!node) throw { code: 404, msg: "场景不存在" };
        const parts = keyPath.split(".");
        for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]] = node[parts[i]] || {};
        node[parts[parts.length - 1]] = value;
        return scenario + "." + keyPath;
      }
      case "scene.listUpsert": {
        need(P.editConfig && sceneOk, "无权编辑该场景数据");
        const { scenario, list, record } = payload;
        const arr = D[scenario][list] = D[scenario][list] || [];
        const ex = arr.find((x) => x.id === record.id);
        if (ex) Object.assign(ex, record); else arr.unshift(record);
        return scenario + "/" + list;
      }
      case "scene.listDelete": {
        need(P.editConfig && sceneOk, "无权编辑该场景数据");
        const { scenario, list, id } = payload;
        D[scenario][list] = (D[scenario][list] || []).filter((x) => x.id !== id);
        return scenario + "/" + list;
      }
      // ---- 模型接入配置（启停某模型 / 设默认聊天模型）----
      case "model.config": {
        need(P.manageAgents, "无权配置模型接入");
        D.modelConfig = { ...(D.modelConfig || { enabled: {}, default: "" }), ...(payload.config || {}) };
        if (payload.config && payload.config.enabled) D.modelConfig.enabled = { ...(D.modelConfig.enabled || {}), ...payload.config.enabled };
        return "model.config";
      }
      default:
        throw { code: 400, msg: "未知操作 " + kind };
    }
  });
}

// ---- 路由 ------------------------------------------------------------------
async function api(req, res, url) {
  const p = url.pathname;

  if (p === "/api/login" && req.method === "POST") {
    const { username, password } = await readBody(req);
    const u = db.getUser(String(username || "").trim());
    if (!u || !auth.verifyPw(password, u.pass)) return send(res, 401, { error: "账号或密码错误" });
    const token = auth.signToken({ u: u.username, r: u.role }, SECRET);
    db.logAudit(u.username, "login", "");
    return send(res, 200, { token, me: meOf({ username: u.username, role: u.role, name: u.name, scenarios: u.scenarios, tenantId: u.tenantId || null, mustChange: !!u.mustChange, perms: auth.permsFor(u.role) }) });
  }

  // —— 外部平台注册(如 声渡 VoxOne);接入密钥鉴权,不走登录会话 ——
  if (p === "/api/external/register" && req.method === "POST") {
    const key = req.headers["x-ingest-key"] || "";
    if (!key || key !== db.getMeta("ingest_key")) return send(res, 401, { error: "接入密钥无效" });
    const b = await readBody(req);
    const src = String(b.source || "external");
    db.mutate("external:" + src, "external.register", (D) => {
      D.external = D.external || {};
      D.external[src] = { source: src, platform: b.platform || src, callbackBase: b.callbackBase || "", gwToken: b.gwToken || "", agents: Array.isArray(b.agents) ? b.agents : [], ts: new Date().toISOString() };
    });
    db.logAudit("external:" + src, "external.register", (b.platform || src) + " · " + ((b.agents || []).length) + " 个 Agent");
    return send(res, 200, { ok: true, registered: (b.agents || []).length });
  }

  const ctx = ctxOf(req);
  if (!ctx) return send(res, 401, { error: "未登录或会话过期" });

  if (p === "/api/bootstrap" && req.method === "GET") {
    const { data, ver } = db.getData();
    const out = { me: meOf(ctx), data: scopeData(ctx, data), ver, stats: db.traceStats(ctx.perms.viewAll ? null : firstScene(ctx)) };
    if (ctx.perms.manageUsers) out.users = db.listUsers();
    return send(res, 200, out);
  }

  if (p === "/api/password" && req.method === "POST") {
    const { current, next } = await readBody(req);
    const u = db.getUser(ctx.username);
    if (!auth.verifyPw(current, u.pass)) return send(res, 400, { error: "当前密码不正确" });
    if (!next || String(next).length < 6) return send(res, 400, { error: "新密码至少 6 位" });
    if (next === db.DEFAULT_PW) return send(res, 400, { error: "新密码不能与初始密码相同" });
    db.setPassword(ctx.username, next, 0);
    return send(res, 200, { ok: true });
  }

  if (p === "/api/change" && req.method === "POST") {
    const { kind, payload } = await readBody(req);
    try { const r = applyChange(ctx, kind, payload || {}); return send(res, 200, { ok: true, ver: r.ver }); }
    catch (e) { return send(res, e.code || 500, { error: e.msg || String(e.message || e) }); }
  }

  // ---- 语音留痕 ----
  if (p === "/api/trace" && req.method === "POST") {
    if (!ctx.perms.useAgent) return send(res, 403, { error: "无权产生会话留痕" });
    const t = await readBody(req);
    if (t.scenario && !canScene(ctx, t.scenario)) return send(res, 403, { error: "无权在该场景产生留痕" });
    const id = db.insertTrace({ ...t, actor: ctx.username, actorName: ctx.name || ctx.username });
    db.logAudit(ctx.username, "trace.add", (t.scenario || "") + "/" + (t.agentName || ""));
    return send(res, 200, { ok: true, id });
  }
  if (p === "/api/traces" && req.method === "GET") {
    const scenario = url.searchParams.get("scenario") || null;
    if (scenario && !ctx.perms.viewAll && !canScene(ctx, scenario)) return send(res, 403, { error: "无权查看该场景留痕" });
    const filter = { scenario, agentId: url.searchParams.get("agentId") || null, q: url.searchParams.get("q") || null, limit: 300 };
    // 非全局可见者：仅限本人所属场景
    let rows = db.listTraces(filter);
    if (!ctx.perms.viewAll) rows = rows.filter((r) => canScene(ctx, r.scenario));
    return send(res, 200, { traces: rows, stats: db.traceStats(ctx.perms.viewAll ? scenario : firstScene(ctx)) });
  }

  if (p === "/api/reset" && req.method === "POST") {
    if (ctx.role !== "superadmin") return send(res, 403, { error: "仅平台管理员可重置" });
    const ver = db.resetData();
    return send(res, 200, { ok: true, ver });
  }

  // ---- 账号与权限管理 ----
  if (p === "/api/users" && req.method === "GET") {
    if (!ctx.perms.manageUsers) return send(res, 403, { error: "无权限" });
    return send(res, 200, { users: db.listUsers() });
  }
  if (p === "/api/users" && req.method === "POST") {
    if (!ctx.perms.manageUsers) return send(res, 403, { error: "无权限" });
    const u = await readBody(req); db.upsertUser(u); db.logAudit(ctx.username, "user.upsert", u.username);
    return send(res, 200, { ok: true, users: db.listUsers() });
  }
  if (p === "/api/users/delete" && req.method === "POST") {
    if (!ctx.perms.manageUsers) return send(res, 403, { error: "无权限" });
    const { username } = await readBody(req);
    if (username === "admin") return send(res, 400, { error: "不可删除平台管理员" });
    db.deleteUser(username); db.logAudit(ctx.username, "user.delete", username);
    return send(res, 200, { ok: true, users: db.listUsers() });
  }
  if (p === "/api/users/resetpw" && req.method === "POST") {
    if (!ctx.perms.manageUsers) return send(res, 403, { error: "无权限" });
    const { username } = await readBody(req); db.setPassword(username, db.DEFAULT_PW, 1);
    db.logAudit(ctx.username, "user.resetpw", username);
    return send(res, 200, { ok: true, defaultPw: db.DEFAULT_PW });
  }
  if (p === "/api/audit" && req.method === "GET") {
    if (!ctx.perms.manageUsers) return send(res, 403, { error: "无权限" });
    return send(res, 200, { audit: db.recentAudit(80) });
  }

  // —— 外部平台对接(接入的语音 Agent 平台,如 声渡 VoxOne)——
  if (p === "/api/external" && req.method === "GET") {
    const { data } = db.getData();
    const out = { external: data.external || {} };
    if (ctx.perms.manageUsers) { out.ingestKey = db.getMeta("ingest_key"); out.registerPath = "/api/external/register"; }
    return send(res, 200, out);
  }
  if (p === "/api/external/invoke" && req.method === "POST") {
    const { data } = db.getData();
    const b = await readBody(req);
    const ext = (data.external || {})[b.source || "voxone"];
    if (!ext || !ext.callbackBase) return send(res, 404, { error: "该外部平台未注册或缺回调地址" });
    try {
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(ext.callbackBase.replace(/\/$/, "") + "/api/agent-gateway/invoke?token=" + encodeURIComponent(ext.gwToken || ""), {
        method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: b.scenario, mode: b.mode, text: b.text, history: b.history || [], lang: b.lang, from: "灵犀·统一Agent中台" }),
      });
      clearTimeout(timer);
      const j = await r.json();
      db.logAudit(ctx.username, "external.invoke", (ext.platform || b.source) + " · " + (b.scenario || ""));
      return send(res, r.ok ? 200 : 502, j);
    } catch (e) { return send(res, 502, { error: "调用外部平台失败:" + String(e.message || e) }); }
  }

  // —— 模型接入（SenseAudio 等 OpenAI 兼容端点）——
  if (p === "/api/models" && req.method === "GET") {
    const { data } = db.getData();
    return send(res, 200, { config: llm.maskedConfig(), modelConfig: data.modelConfig || { enabled: {}, default: "" } });
  }
  if (p === "/api/llm/health" && req.method === "GET") {
    if (!ctx.perms.manageAgents && !ctx.perms.useAgent) return send(res, 403, { error: "无权限" });
    const h = await llm.health();
    return send(res, 200, h);
  }
  if (p === "/api/llm/chat" && req.method === "POST") {
    if (!ctx.perms.useAgent) return send(res, 403, { error: "无权调用模型（需可使用 Agent 的角色）" });
    const b = await readBody(req);
    if (!Array.isArray(b.messages) || !b.messages.length) return send(res, 400, { error: "messages 不能为空" });
    try {
      const out = await llm.chat({ model: b.model, messages: b.messages, temperature: b.temperature, max_tokens: b.max_tokens });
      db.logAudit(ctx.username, "llm.chat", (out.model || b.model || "") + " · " + (out.usage ? (out.usage.total_tokens + "tok") : ""));
      // 可选：把本次真实对话写入语音/会话留痕
      if (b.trace && b.scenario && canScene(ctx, b.scenario)) {
        db.insertTrace({
          ts: new Date().toISOString(), scenario: b.scenario, agentId: b.agentId || "", agentName: b.agentName || ("模型·" + (out.model || "")),
          actor: ctx.username, actorName: ctx.name || ctx.username, channel: "text", intent: b.intent || "真实模型对话",
          duration: Math.round((out.ms || 0) / 1000), result: "模型应答(" + (out.model || "") + ")",
          transcript: [...b.messages.filter((m) => m.role !== "system").map((m) => ({ who: m.role === "user" ? "user" : "agent", text: m.content })), { who: "agent", text: out.content }],
        });
      }
      return send(res, 200, out);
    } catch (e) { return send(res, e.code || 502, { error: e.msg || String(e.message || e) }); }
  }

  return send(res, 404, { error: "未知接口" });
}

function meOf(ctx) {
  return { username: ctx.username, role: ctx.role, roleLabel: ctx.perms.label, name: ctx.name || ctx.username,
    scenarios: ctx.scenarios, businessId: firstScene(ctx), tenantId: ctx.tenantId || null,
    scope: ctx.perms.scope, home: ctx.perms.home, mustChange: ctx.mustChange, perms: ctx.perms };
}
function firstScene(ctx) {
  const s = (ctx.scenarios || []).filter((x) => x !== "*");
  return s[0] || null;
}

// ---- 静态托管（cleanUrls：无扩展名回退 .html）------------------------------
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/login.html";
  if (rel.indexOf("..") >= 0 || rel.startsWith("/server")) return send(res, 403, { error: "forbidden" });
  const file = path.join(ROOT, rel);
  fs.readFile(file, (err, buf) => {
    if (err) {
      if (!path.extname(rel)) {
        return fs.readFile(path.join(ROOT, rel + ".html"), (e2, b2) => {
          if (e2) return send(res, 404, "Not found");
          res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" }); res.end(b2);
        });
      }
      return send(res, 404, "Not found");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) return api(req, res, url).catch((e) => send(res, 500, { error: String(e.message || e) }));
  serveStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`统一 Agent 运营中台 · backend on http://localhost:${PORT}  (DB: server/hub.db · 默认密码 ${db.DEFAULT_PW})`);
});
