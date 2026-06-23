/**
 * wagas·ai 演示 —— 零依赖本地后端
 * 作用：① 托管网站(index.html + assets) ② 提供 /api/chat 代理给大模型 ③ /api/health 探活
 *
 * 默认接「Ollama 本地模型」：免费、不需要 API key、可离线。
 *   安装 Ollama: https://ollama.com   然后: ollama pull qwen2.5:3b
 * 也可改用云端 API（见底部 OPENAI 配置）。
 *
 * 运行（需 Node 18+）：  node server.js
 * 然后浏览器打开:        http://localhost:5173
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// ===== 配置（可用环境变量覆盖）=====
const PORT  = process.env.PORT || 5173;
const MODE  = process.env.LLM_MODE || 'ollama';            // 'ollama' | 'openai'
// Ollama（本地，免费）
const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';  // 中文友好的小模型
// OpenAI 兼容（云端，需 key）—— 很多服务商都兼容此格式
const OPENAI_URL   = process.env.OPENAI_URL   || 'https://api.openai.com/v1/chat/completions';
const OPENAI_KEY   = process.env.OPENAI_KEY   || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const ROOT = __dirname;
const MIME = {'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css',
  '.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png',
  '.webp':'image/webp','.json':'application/json','.md':'text/markdown;charset=utf-8'};

// ===== 调用模型，返回结构化 JSON =====
async function askModel({system, message, context, menu}){
  const sys = (system||'') + '\n\n可选菜单(JSON，只能从中选择)：' + JSON.stringify(menu||[]);
  const usr = (message||'') + (context ? '\n当前已知条件：' + JSON.stringify(context) : '');

  if (MODE === 'openai') {
    const r = await fetch(OPENAI_URL, {
      method:'POST',
      headers:{'Authorization':'Bearer '+OPENAI_KEY, 'Content-Type':'application/json'},
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        response_format: { type:'json_object' },
        messages: [{role:'system', content:sys}, {role:'user', content:usr}]
      })
    });
    if(!r.ok) throw new Error('OpenAI HTTP '+r.status+' '+await r.text());
    const j = await r.json();
    return parseJson(j.choices?.[0]?.message?.content);
  }

  // 默认：Ollama 本地
  const r = await fetch(OLLAMA_URL, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      model: OLLAMA_MODEL, stream:false, format:'json',
      options:{ temperature:0.3 },
      messages: [{role:'system', content:sys}, {role:'user', content:usr}]
    })
  });
  if(!r.ok) throw new Error('Ollama HTTP '+r.status+' '+await r.text());
  const j = await r.json();
  return parseJson(j.message?.content);
}
function parseJson(s){
  if(!s) return {action:'reply', reply:'（模型无输出）'};
  try { return JSON.parse(s); }
  catch(e){
    const m = s.match(/\{[\s\S]*\}/);            // 容错：截取首个 JSON 块
    if(m){ try { return JSON.parse(m[0]); } catch(_){} }
    return {action:'reply', reply:String(s).slice(0,200)};
  }
}

// ===== HTTP 服务 =====
function readBody(req){ return new Promise(res=>{ let b=''; req.on('data',c=>b+=c); req.on('end',()=>res(b)); }); }

const server = http.createServer(async (req,res)=>{
  const url = req.url.split('?')[0];

  if (url === '/api/health') {
    res.writeHead(200,{'Content-Type':'application/json'});
    return res.end(JSON.stringify({ok:true, mode:MODE, model: MODE==='openai'?OPENAI_MODEL:OLLAMA_MODEL}));
  }

  if (url === '/api/chat' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req) || '{}');
      const data = await askModel(body);
      res.writeHead(200,{'Content-Type':'application/json'});
      return res.end(JSON.stringify(data));
    } catch (e) {
      console.error('[/api/chat]', e.message);
      res.writeHead(502,{'Content-Type':'application/json'});
      return res.end(JSON.stringify({error:e.message}));   // 前端会自动降级到规则版
    }
  }

  // 静态文件
  let file = url === '/' ? '/index.html' : decodeURIComponent(url);
  const fp = path.join(ROOT, file);
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, (err, buf)=>{
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream'});
    res.end(buf);
  });
});

server.listen(PORT, ()=>{
  console.log(`\n  wagas·ai 演示已启动 →  http://localhost:${PORT}`);
  console.log(`  模型模式: ${MODE}  ·  ${MODE==='openai'?OPENAI_MODEL:OLLAMA_MODEL}`);
  if (MODE==='ollama') console.log(`  提示: 需先运行 Ollama 并 \`ollama pull ${OLLAMA_MODEL}\`\n`);
  else console.log(`  提示: 已用云端 API，请确认 OPENAI_KEY 已设置\n`);
});
