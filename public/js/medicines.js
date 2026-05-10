/* ============================================================
   HealthBridge AI — Medicine Information Center
   Uses the public openFDA Drug Label API to fetch real label
   information. No API key required for basic queries.
   Docs: https://open.fda.gov/apis/drug/label/
   ============================================================ */

(function () {
  'use strict';

  const FDA = 'https://api.fda.gov/drug/label.json';

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('medSearch');
    const btn = document.getElementById('medSearchBtn');
    const grid = document.getElementById('medGrid');
    const filters = document.querySelectorAll('#medFilters .filter');
    let activeCat = 'all';

    btn.addEventListener('click', search);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });

    /* Category presets — each runs a representative search */
    const CAT = {
      all: '',
      pain: 'ibuprofen',
      fever: 'paracetamol',
      allergy: 'cetirizine',
      cough: 'dextromethorphan'
    };
    filters.forEach(f => f.addEventListener('click', () => {
      filters.forEach(x => x.classList.remove('active'));
      f.classList.add('active');
      activeCat = f.dataset.cat;
      if (CAT[activeCat]) { input.value = CAT[activeCat]; search(); }
    }));

    async function search() {
      const q = input.value.trim();
      if (!q) return;
      grid.innerHTML = Array.from({ length: 4 }).map(() => '<div class="skeleton" style="height:160px"></div>').join('');

      const enc = encodeURIComponent(q);
      // Try progressively broader queries so user input like "advil",
      // "tylenol", "cough" or "allergy" all return real results.
      const queries = [
        `openfda.brand_name:"${enc}"+OR+openfda.generic_name:"${enc}"`,
        `openfda.substance_name:"${enc}"`,
        `openfda.brand_name:${enc}*+OR+openfda.generic_name:${enc}*`,
        `purpose:"${enc}"+OR+indications_and_usage:"${enc}"`
      ];

      try {
        let results = [];
        for (const qStr of queries) {
          try {
            const res = await fetch(`${FDA}?search=${qStr}&limit=8`);
            if (!res.ok) continue;
            const data = await res.json();
            if (data.results && data.results.length) { results = data.results; break; }
          } catch (_) { /* try next */ }
        }
        if (!results.length) throw new Error('not found');
        renderResults(results);
      } catch (e) {
        grid.innerHTML = `<div class="empty-state full"><i data-lucide="pill-off"></i><p>No results found for "<strong>${escapeHtml(q)}</strong>". Try another spelling or a generic name (e.g. ibuprofen, acetaminophen, loratadine).</p></div>`;
        window.HBA_refreshIcons();
      }
    }

    function pickName(r) {
      return (r.openfda?.brand_name?.[0]) || (r.openfda?.generic_name?.[0]) || 'Unknown medicine';
    }
    function pickShort(r) {
      return first(r.purpose) || first(r.indications_and_usage) || first(r.description) || 'No description available.';
    }
    function first(arr) {
      if (!arr || !arr.length) return '';
      return String(arr[0]).slice(0, 220);
    }

    function renderResults(list) {
      if (!list.length) {
        grid.innerHTML = `<div class="empty-state full"><i data-lucide="pill-off"></i><p>No results.</p></div>`;
        window.HBA_refreshIcons(); return;
      }
      grid.innerHTML = list.map((r, i) => `
        <article class="med-card" data-i="${i}">
          <div class="pill-icon"><i data-lucide="pill"></i></div>
          <h4>${escapeHtml(pickName(r))}</h4>
          <p>${escapeHtml(pickShort(r))}</p>
        </article>
      `).join('');
      window.HBA_refreshIcons();

      grid.querySelectorAll('.med-card').forEach((card, i) => {
        card.addEventListener('click', () => openModal(list[i]));
      });
    }

    function openModal(r) {
      const sections = [
        ['Purpose', join(r.purpose)],
        ['Uses / Indications', join(r.indications_and_usage)],
        ['Dosage & Administration', join(r.dosage_and_administration)],
        ['Warnings', join(r.warnings)],
        ['Side Effects', join(r.adverse_reactions)],
        ['Do not use if', join(r.do_not_use)],
        ['Active Ingredient', join(r.active_ingredient)]
      ].filter(([, v]) => v);

      const html = `
        <div class="modal" role="dialog" aria-modal="true">
          <button class="modal-close" id="modalClose">✕ Close</button>
          <h3>${escapeHtml(pickName(r))}</h3>
          <p style="color:var(--text-muted);font-size:.85rem">Source: openFDA drug label</p>
          ${sections.map(([h, t]) => `<section><h5>${h}</h5><p>${escapeHtml(t)}</p></section>`).join('')}
          <p class="disclaimer" style="margin-top:1.5rem"><i data-lucide="info"></i> Always consult a healthcare professional before taking any medication.</p>
        </div>`;

      let backdrop = document.getElementById('medModal');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'medModal';
        backdrop.className = 'modal-backdrop';
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('show'); });
      }
      backdrop.innerHTML = html;
      backdrop.classList.add('show');
      backdrop.querySelector('#modalClose').addEventListener('click', () => backdrop.classList.remove('show'));
      window.HBA_refreshIcons();
    }

    function join(arr) { return (arr && arr.length) ? String(arr[0]).slice(0, 1500) : ''; }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  });
})();
