/* ============================================================
   HealthBridge AI — Symptom Checker
   Tokenises user input, matches against SYMPTOM_DB, and renders
   a structured, supportive response with severity indicator.
   ============================================================ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('symptomInput');
    const btn = document.getElementById('analyzeBtn');
    const result = document.getElementById('symptomResult');
    const chips = document.querySelectorAll('#symptomChips .chip');

    /* Quick-add chips populate the textarea */
    chips.forEach(c => c.addEventListener('click', () => {
      const v = c.dataset.s;
      const cur = input.value.trim();
      input.value = cur ? `${cur}, ${v}` : v;
      input.focus();
    }));

    btn.addEventListener('click', analyze);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) analyze(); });

    function analyze() {
      const text = input.value.trim().toLowerCase();
      if (!text) { renderEmpty('Please describe at least one symptom.'); return; }

      /* show typing animation */
      result.innerHTML = `<div class="result-card"><div class="typing"><span></span><span></span><span></span></div><p style="margin-top:.4rem;color:var(--text-muted);font-size:.85rem">Analyzing your symptoms…</p></div>`;

      setTimeout(() => {
        const matches = matchSymptoms(text);
        if (!matches.length) {
          renderEmpty("We couldn't identify a known symptom. Try keywords like fever, headache, cough, stress, fatigue.");
          return;
        }
        renderResult(matches);
      }, 900);
    }

    function matchSymptoms(text) {
      const db = window.SYMPTOM_DB;
      const found = [];
      const t = ' ' + text.toLowerCase().replace(/[^a-z\s']/g, ' ').replace(/\s+/g, ' ') + ' ';
      Object.keys(db).forEach(key => {
        const entry = db[key];
        const aliases = entry.aliases || [key.replace(/_/g, ' ')];
        const hit = aliases.some(a => t.includes(' ' + a.toLowerCase() + ' ') || t.includes(a.toLowerCase()));
        if (hit) found.push({ key, ...entry });
      });
      return found;
    }

    function highestSeverity(list) {
      if (list.some(x => x.severity === 'high')) return 'high';
      if (list.some(x => x.severity === 'medium')) return 'medium';
      return 'low';
    }

    function renderEmpty(msg) {
      result.innerHTML = `<div class="empty-state"><i data-lucide="search-x"></i><p>${msg}</p></div>`;
      window.HBA_refreshIcons();
    }

    function renderResult(list) {
      const sev = highestSeverity(list);
      const sevLabel = { low: 'Low Severity', medium: 'Moderate Severity', high: 'High — Seek Care' }[sev];
      const conditions = [...new Set(list.flatMap(x => x.conditions))].slice(0, 6);
      const advice = [...new Set(list.flatMap(x => x.advice))].slice(0, 6);

      result.innerHTML = `
        <div class="result-card">
          <span class="severity ${sev}"><i data-lucide="${sev === 'high' ? 'alert-triangle' : 'activity'}"></i> ${sevLabel}</span>
          <h3><i data-lucide="clipboard-check"></i> AI Guidance</h3>
          <p style="margin:.4rem 0 1rem;color:var(--text-muted);font-size:.9rem">Based on: <strong>${list.map(l => l.key.replace('_',' ')).join(', ')}</strong></p>

          <h4 style="font-size:.95rem;margin:.8rem 0 .3rem">Possible common causes</h4>
          <ul>${conditions.map(c => `<li>${c}</li>`).join('')}</ul>

          <h4 style="font-size:.95rem;margin:.8rem 0 .3rem">Suggested next steps</h4>
          <ul>${advice.map(a => `<li>${a}</li>`).join('')}</ul>

          ${sev === 'high' ? '<p style="color:var(--danger);font-weight:600;margin-top:.8rem">⚠ If symptoms are severe or worsening, seek emergency care immediately.</p>' : ''}

          <p class="disclaimer" style="margin-top:1rem"><i data-lucide="info"></i> This guidance is informational only — not a medical diagnosis.</p>
        </div>`;
      window.HBA_refreshIcons();
    }
  });
})();
