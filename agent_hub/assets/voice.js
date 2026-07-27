/* ============================================================================
   HubVoice · 端到端语音（浏览器原生 Web Speech：真实 STT 听写 + TTS 朗读）
   —— 用户「说」→ SpeechRecognition 转文字；助理「答」→ SpeechSynthesis 朗读，
      音色按业务的声渡配置（男声/女声/适老慢速）挑选，尽量拟真人。
   Chrome/Edge 支持最佳；不支持时优雅降级（可打字、可静默）。
   ============================================================================ */
(function () {
  'use strict';
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function zhVoices() {
    try { return (speechSynthesis.getVoices() || []).filter(v => /zh|cmn|chinese/i.test(v.lang + ' ' + v.name)); }
    catch (e) { return []; }
  }
  // 依据声渡音色描述（如「专业男声·新闻播报」「亲切女声·适老慢速」）挑一个 TTS voice + 语速
  function pick(desc) {
    const d = String(desc || '');
    const vs = zhVoices();
    const male = /男|male|Yun|Kang|云|Wang/i, female = /女|female|Xiao|Ting|Mei|婷|小|Hui/i;
    let voice = vs[0] || null;
    if (/男/.test(d)) voice = vs.find(v => male.test(v.name)) || vs.find(v => !female.test(v.name)) || vs[0] || null;
    else if (/女/.test(d)) voice = vs.find(v => female.test(v.name)) || vs.find(v => !male.test(v.name)) || vs[0] || null;
    const rate = /慢速|适老|老/.test(d) ? 0.82 : /快/.test(d) ? 1.12 : 1.0;
    const pitch = /女|female/.test(d) ? 1.06 : /男|male/.test(d) ? 0.94 : 1.0;
    return { voice, rate, pitch };
  }

  const HubVoice = {
    sttSupported: () => !!SR,
    ttsSupported: () => 'speechSynthesis' in window,

    // 朗读一段文本（拟真人音色）。返回是否已朗读。
    speak(text, desc, onEnd) {
      if (!this.ttsSupported() || !text) { onEnd && onEnd(); return false; }
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text));
        const p = pick(desc);
        if (p.voice) u.voice = p.voice;
        u.lang = (p.voice && p.voice.lang) || 'zh-CN';
        u.rate = p.rate; u.pitch = p.pitch;
        u.onend = () => onEnd && onEnd();
        u.onerror = () => onEnd && onEnd();
        speechSynthesis.speak(u);
        return true;
      } catch (e) { onEnd && onEnd(); return false; }
    },
    stop() { try { speechSynthesis.cancel(); } catch (e) {} },

    // 开始听写。onPartial(text, isFinal) 实时回调；onDone(finalText, err) 结束回调。
    // 返回一个 { stop() } 句柄；不支持时 onDone(null,'unsupported')。
    listen(onPartial, onDone) {
      if (!SR) { onDone && onDone(null, 'unsupported'); return { stop() {} }; }
      const r = new SR();
      r.lang = 'zh-CN'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      let finalText = '';
      r.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t; else interim += t;
        }
        onPartial && onPartial(finalText + interim, !!finalText);
      };
      r.onerror = (e) => onDone && onDone(finalText || null, e.error || 'error');
      r.onend = () => onDone && onDone(finalText || null, finalText ? null : 'no-speech');
      try { r.start(); } catch (e) { onDone && onDone(null, String(e)); }
      return { stop() { try { r.stop(); } catch (e) {} } };
    },
  };

  // 有些浏览器 voices 异步加载，触发一次预热
  try { if ('speechSynthesis' in window) speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch (e) {}
  window.HubVoice = HubVoice;
})();
