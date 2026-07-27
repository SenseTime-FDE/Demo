/* ============================================================
   HubChat · 微信/企微 语音 Agent 对话原型引擎（承接 peihu 引擎）
   HubChat.mount(el, {
     contact:{ name, corp, sub }, user:{ name, avatar },
     scenarios:[ { id, title, chip?, intro?, steps:[step] } ],
     onScenarioEnd:(scene)=>{}   // 场景播放结束回调（用于写语音留痕）
   })
   step: { from:'agent'|'user', voice, dur, text, html, sys, delay, think }
   ============================================================ */
(function () {
  'use strict';
  function el(tag, cls, html) { const d = document.createElement(tag); if (cls) d.className = cls; if (html != null) d.innerHTML = html; return d; }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function phoneSkeleton(contact) {
    const wrap = el('div', 'phone');
    wrap.innerHTML =
      '<div class="notch"></div><div class="screen">' +
      '<div class="statusbar"><span>9:41</span><span class="right">●●●●● 5G ▮▮▮</span></div>' +
      '<div class="wx-header"><div class="back">‹</div><div class="title"><b>' + contact.name +
      (contact.corp ? ' <span class="corp">' + contact.corp + '</span>' : '') + '</b><span>' + (contact.sub || '') + '</span></div><div class="more">···</div></div>' +
      '<div class="wx-chat"></div>' +
      '<div class="wx-footer"><div class="wx-chips"></div>' +
      '<div class="wx-inputbar"><div class="mic">🎙</div><div class="holdbar">按住 说话</div><div class="plus">＋</div></div></div>' +
      '</div>';
    return wrap;
  }
  function voiceBubbleHTML(dur, me) {
    const waves = '<span class="waves"><i></i><i></i><i></i><i></i><i></i></span>';
    return me ? '<span class="dur">' + dur + '″</span>' + waves : waves + '<span class="dur">' + dur + '″</span>';
  }

  function Chat(root, cfg) {
    this.root = root; this.cfg = cfg; this.playToken = 0;
    root.appendChild((this.phone = phoneSkeleton(cfg.contact)));
    this.chatEl = this.phone.querySelector('.wx-chat');
    this.chipsEl = this.phone.querySelector('.wx-chips');
    this.holdbar = this.phone.querySelector('.holdbar');
    this.buildSceneBar();
    if (cfg.scenarios && cfg.scenarios.length) this.play(cfg.scenarios[0].id);
    if (cfg.live && window.Hub) this.enableLive();
  }

  // 实时真实对话：底部输入条可用（打字/🎙听写）→ Hub.aiReply(声渡真实端点优先→灵犀模型) → 拟真人朗读 + 留痕
  Chat.prototype.enableLive = function () {
    const self = this, cfg = this.cfg, live = cfg.live === true ? {} : cfg.live, H = window.Hub;
    const biz = H.curBusiness, B = biz && H.business(biz);
    const flagshipModel = (biz && (H.agentsOf(biz) || []).map(a => a.model).find(Boolean)) || null;
    const model = live.model || flagshipModel || (H.data && H.data.modelConfig && H.data.modelConfig.default) || 'deepseek-v4-flash';
    const voiceDesc = (B && B.voxone && B.voxone.voice) || '';
    const system = live.system || ('你是「' + cfg.contact.name + '」，' + (B ? B.name : '') + ' 场景的一线 AI 助理。用简洁、口语化、可执行的中文回答；需要时给要点或可直接用的话术，避免空话套话。');
    const history = this.liveHistory = [];
    const bar = this.phone.querySelector('.wx-inputbar');
    bar.innerHTML =
      '<div class="mic live-mic" title="点击说话（真实听写）">🎙</div>' +
      '<input class="live-input" placeholder="输入，或点 🎙 说话 · 真实模型应答">' +
      '<div class="live-send">发送</div>';
    const micEl = bar.querySelector('.live-mic'), inputEl = bar.querySelector('.live-input'), sendEl = bar.querySelector('.live-send');

    async function send(text, fromVoice) {
      text = (text || '').trim(); if (!text || self._busy) return;
      self._busy = true; inputEl.value = '';
      if (fromVoice) {
        const vb = el('div', 'wx-bubble wx-voice', voiceBubbleHTML(Math.max(2, Math.round(text.length / 4)), true));
        const { body } = self.addRow('user', vb);
        body.appendChild(el('div', 'wx-transcript', '<span class="t-label">语音转文字 · ASR</span>' + text));
      } else self.addRow('user', el('div', 'wx-bubble', text));
      self.scroll();
      const typing = el('div', 'wx-bubble wx-typing', '<i></i><i></i><i></i>');
      const t = self.addRow('agent', typing);
      try {
        const r = await H.aiReply({ text, history: history.slice(), scenario: biz, model, system, intent: '一线Agent实时对话', agentId: live.agentId || '', agentName: cfg.contact.name });
        t.row.remove();
        const ar = self.addRow('agent', el('div', 'wx-bubble', r.reply));
        ar.body.appendChild(el('div', 'live-meta', (r.voice ? '🔊 声渡拟真人 · ' : '🔊 ') + (r.via || '')));
        history.push({ role: 'user', content: text }, { role: 'assistant', content: r.reply });
        self.scroll();
        if (window.HubVoice) HubVoice.speak(r.reply, voiceDesc);
      } catch (e) {
        t.row.remove();
        self.addRow('agent', el('div', 'wx-bubble', '⚠️ ' + (e.message || '调用失败')));
      } finally { self._busy = false; }
    }
    sendEl.onclick = () => send(inputEl.value, false);
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(inputEl.value, false); } });
    let rec = null;
    micEl.onclick = () => {
      if (rec) { rec.stop(); rec = null; micEl.classList.remove('rec'); return; }
      if (!window.HubVoice || !HubVoice.sttSupported()) { inputEl.placeholder = '此浏览器不支持语音听写，请打字（建议 Chrome）'; return; }
      micEl.classList.add('rec'); inputEl.placeholder = '🎙 请说话…';
      rec = HubVoice.listen(
        (partial) => { inputEl.value = partial; },
        (finalText, err) => { micEl.classList.remove('rec'); rec = null; inputEl.placeholder = '输入，或点 🎙 说话 · 真实模型应答'; if (finalText) send(finalText, true); }
      );
    };
  };
  Chat.prototype.buildSceneBar = function () {
    const bar = el('div', 'scene-bar');
    this.cfg.scenarios.forEach((s) => { const b = el('button', 'scene-btn', s.title); b.onclick = () => this.play(s.id); b.dataset.id = s.id; bar.appendChild(b); });
    this.root.insertBefore(bar, this.phone); this.sceneBar = bar;
  };
  Chat.prototype.scroll = function () { this.chatEl.scrollTop = this.chatEl.scrollHeight + 400; };
  Chat.prototype.addRow = function (who, inner) {
    const me = who === 'user';
    const row = el('div', 'wx-row' + (me ? ' me' : ''));
    const av = this.cfg[me ? 'user' : 'agent'] || {};
    row.appendChild(el('div', 'wx-avatar ' + (me ? 'user' : 'agent'), me ? (av.avatar || '我') : (av.avatar || 'S')));
    const body = el('div', 'wx-body');
    if (!me) body.appendChild(el('div', 'wx-name', (this.cfg.agent && this.cfg.agent.name) || this.cfg.contact.name));
    body.appendChild(inner); row.appendChild(body); this.chatEl.appendChild(row); this.scroll();
    return { row, body };
  };
  Chat.prototype.renderStep = async function (step, token) {
    const me = step.from === 'user';
    if (step.sys) { this.chatEl.appendChild(el('div', 'wx-sys', step.sys)); this.scroll(); await sleep(step.delay || 650); return; }
    if (me && step.voice != null) {
      this.holdbar.classList.add('rec'); this.holdbar.textContent = '松开 发送';
      await sleep(Math.min(1400, 300 + (step.dur || 5) * 60)); if (token !== this.playToken) return;
      this.holdbar.classList.remove('rec'); this.holdbar.textContent = '按住 说话';
    }
    if (step.voice != null) {
      const vb = el('div', 'wx-bubble wx-voice playing', voiceBubbleHTML(step.dur || 6, me));
      const { body } = this.addRow(step.from, vb); await sleep(900); if (token !== this.playToken) return;
      vb.classList.remove('playing');
      body.appendChild(el('div', 'wx-transcript', '<span class="t-label">语音转文字 · ASR</span>' + step.voice));
      this.scroll(); await sleep(step.delay || 700); return;
    }
    if (!me) { const typing = el('div', 'wx-bubble wx-typing', '<i></i><i></i><i></i>'); const t = this.addRow('agent', typing); await sleep(step.think || 700); if (token !== this.playToken) { t.row.remove(); return; } t.row.remove(); }
    if (step.text != null) { this.addRow(step.from, el('div', 'wx-bubble', step.text)); await sleep(step.delay || 760); return; }
    if (step.html != null) { const h = el('div'); h.innerHTML = step.html; this.addRow(step.from, h.firstElementChild || h); await sleep(step.delay || 950); }
  };
  Chat.prototype.play = async function (id) {
    const sc = this.cfg.scenarios.find((s) => s.id === id); if (!sc) return;
    const token = ++this.playToken;
    this.sceneBar.querySelectorAll('.scene-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
    this.chatEl.innerHTML = ''; this.chipsEl.innerHTML = '';
    this.chatEl.appendChild(el('div', 'wx-time', '<span>今天 9:41</span>'));
    if (sc.intro) this.chatEl.appendChild(el('div', 'wx-sys', sc.intro));
    this.cfg.scenarios.forEach((s) => { if (s.id === id) return; const c = el('button', 'wx-chip', '🎙 ' + (s.chip || s.title)); c.onclick = () => this.play(s.id); this.chipsEl.appendChild(c); });
    for (const step of sc.steps) { if (token !== this.playToken) return; await this.renderStep(step, token); }
    if (token !== this.playToken) return;
    const replay = el('button', 'wx-chip', '↻ 重播'); replay.onclick = () => this.play(id); this.chipsEl.insertBefore(replay, this.chipsEl.firstChild);
    if (typeof this.cfg.onScenarioEnd === 'function') { try { this.cfg.onScenarioEnd(sc); } catch (e) {} }
  };
  window.HubChat = { mount: (rootEl, cfg) => new Chat(rootEl, cfg) };
})();
