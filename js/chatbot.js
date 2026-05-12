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

        // 3) Body-part / generic "pain in X" handler
        if (!replies.length) {
          const BODY = {
            eye: ['eye','eyes','vision','sight'],
            leg: ['leg','legs','calf','thigh','knee','knees','ankle','foot','feet','shin'],
            arm: ['arm','arms','elbow','wrist','shoulder','shoulders'],
            back: ['back','spine','lower back','upper back'],
            neck: ['neck'],
            stomach: ['stomach','belly','abdomen','tummy','gut'],
            chest: ['chest','heart'],
            head: ['head','forehead','temple','temples'],
            ear: ['ear','ears'],
            tooth: ['tooth','teeth','gum','gums','jaw'],
            throat: ['throat'],
            skin: ['skin','rash','itch','itching']
          };
          const PAIN = ['pain','ache','hurt','hurts','hurting','sore','soreness','burning','stiff','stiffness','swelling','swollen','cramp','cramps'];
          const hasPain = PAIN.some(w => tokens.has(w));
          let part = null;
          for (const [name, words] of Object.entries(BODY)) {
            if (words.some(w => t.includes(' ' + w + ' '))) { part = name; break; }
          }
          if (hasPain && part) {
            const tips = {
              eye: "Rest your eyes (20-20-20 rule: every 20 min look 20 ft away for 20 sec). Reduce screen brightness, blink often, and use lubricating drops if dry. See an eye doctor if pain is severe, sudden, or with vision changes.",
              leg: "Rest the leg, elevate it, and apply a cold pack for 15 min. Gentle stretching and hydration help muscle cramps. Seek care if there's swelling, redness, warmth, or the pain followed an injury.",
              arm: "Rest the arm and avoid the activity that triggered it. Ice for 15 min, then gentle range-of-motion stretches. See a doctor if pain is severe, with numbness, or after a fall.",
              back: "Avoid prolonged sitting, try gentle stretching (cat-cow, knee-to-chest), and apply a warm compress. See a doctor if pain radiates down a leg or comes with numbness.",
              neck: "Relax your shoulders, do slow neck rolls, and check your screen height (top of monitor at eye level). A warm compress and 5-min stretch breaks help a lot.",
              stomach: "Sip warm water or ginger tea, eat small bland meals, and avoid spicy/fatty food for a few hours. See a doctor if pain is severe, persistent over 24h, or with fever or blood.",
              chest: "⚠ Chest pain can be serious. Stop activity and sit down. If pain spreads to arm/jaw, comes with shortness of breath, sweating, or nausea — call emergency services immediately.",
              head: "Drink water, rest in a dim quiet room, and try a cool compress on your forehead. Limit screens. Seek urgent care for sudden, severe, or 'worst-ever' headaches.",
              ear: "Avoid inserting anything into the ear. A warm compress can ease discomfort. See a doctor if pain is severe, with fever, drainage, or hearing loss.",
              tooth: "Rinse with warm salt water, floss gently to dislodge debris, and avoid very hot/cold foods. See a dentist soon — tooth pain rarely resolves on its own.",
              throat: "Gargle warm salt water, sip warm fluids with honey, and rest your voice. See a doctor if pain is severe, with high fever, or lasts more than a few days.",
              skin: "Keep the area clean and dry, avoid scratching, and try a fragrance-free moisturizer or cold compress. See a doctor if it spreads, blisters, or comes with fever."
            };
            replies.push(`Sorry to hear about your ${part} pain. ${tips[part]}`);
          } else if (hasPain) {
            replies.push("Sorry you're in pain. General relief: rest the area, apply a cold pack for 15 min (or warm compress for muscle stiffness), stay hydrated, and avoid activity that worsens it. If pain is severe, sudden, or doesn't improve in 24–48h, please see a doctor. Could you tell me where it hurts?");
          } else if (part) {
            replies.push(`I can share general guidance about your ${part}. Could you describe what's happening — pain, swelling, itching, numbness, or something else?`);
          }
        }

        // 4) Final default — echo back so it feels like the bot read it
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
