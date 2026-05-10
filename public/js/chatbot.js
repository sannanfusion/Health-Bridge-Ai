/* ============================================================
   HealthBridge AI — Floating AI Chatbot
   Intent-matching engine over CHAT_INTENTS with typing
   animation and timestamps. No external API required.
   To plug in OpenAI/Gemini, replace `simulate()` with a fetch
   call to your backend (see comment below).
   ============================================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('chatToggle');
    const win = document.getElementById('chatWindow');
    const close = document.getElementById('chatClose');
    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatInput');
    const body = document.getElementById('chatBody');

    function time() {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    function add(role, text) {
      const div = document.createElement('div');
      div.className = `bubble ${role}`;
      const safe = escapeHtml(text).replace(/\n/g, '<br>');
      div.innerHTML = `${safe}<span class="time">${time()}</span>`;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }
    function typing(on) {
      let t = document.getElementById('typingBubble');
      if (on) {
        if (t) return;
        t = document.createElement('div');
        t.id = 'typingBubble';
        t.className = 'bubble bot';
        t.innerHTML = `<div class="typing"><span></span><span></span><span></span></div>`;
        body.appendChild(t);
        body.scrollTop = body.scrollHeight;
      } else if (t) t.remove();
    }

    /* Initial greeting */
    add('bot', "Hi! I'm your HealthBridge assistant. How are you feeling today?");

    toggle.addEventListener('click', () => {
      win.classList.toggle('open');
      win.setAttribute('aria-hidden', String(!win.classList.contains('open')));
      if (win.classList.contains('open')) input.focus();
    });
    close.addEventListener('click', () => win.classList.remove('open'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      add('user', text);
      input.value = '';
      typing(true);
      simulate(text).then(reply => {
        typing(false);
        add('bot', reply);
      });
    });

    /* ---------- Intent simulation ----------
       Replace this function with a real API call to add an LLM:
       async function simulate(t) {
         const r = await fetch('/api/chat', { method:'POST', body: JSON.stringify({ msg: t }) });
         const d = await r.json(); return d.reply;
       }
    */
    function simulate(text) {
      return new Promise(resolve => {
        const t = (' ' + text.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ') + ' ');
        const replies = [];

        // 1) Score-based matching across CHAT_INTENTS — pick top 2 distinct
        const scored = window.CHAT_INTENTS
          .map(i => ({ i, score: i.keys.reduce((s, k) => s + (t.includes(k) ? k.length : 0), 0) }))
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score);
        scored.slice(0, 2).forEach(x => replies.push(x.i.reply));

        // 2) If user mentions a known symptom, append a quick guidance line
        const db = window.SYMPTOM_DB || {};
        const tokens = new Set(t.trim().split(' '));
        const sympHits = [];
        Object.keys(db).forEach(key => {
          const e = db[key];
          const aliases = e.aliases || [key.replace(/_/g, ' ')];
          const phrase = aliases.some(a => t.includes(' ' + a.toLowerCase() + ' '));
          const tokenHit = !phrase && aliases.some(a => {
            const aw = a.toLowerCase().split(' ').filter(Boolean);
            return aw.length === 1 && tokens.has(aw[0]);
          });
          if (phrase || tokenHit) sympHits.push({ key, ...e });
        });
        if (sympHits.length && !replies.length) {
          const s = sympHits[0];
          const tip = (s.advice && s.advice[0]) || 'Rest and stay hydrated.';
          replies.push(`I'm sorry you're dealing with ${s.key.replace(/_/g, ' ')}. ${tip} You can open the Symptom Checker section above for full guidance.`);
        }

        // 3) Default if nothing matched — echo back so it feels like the bot read it
        if (!replies.length) {
          const snippet = text.length > 60 ? text.slice(0, 60) + '…' : text;
          replies.push(`You said: "${snippet}". ${window.CHAT_DEFAULT}`);
        }

        const reply = replies.join('\n\n');
        setTimeout(() => resolve(reply), 600 + Math.random() * 500);
      });
    }

    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  });
})();
