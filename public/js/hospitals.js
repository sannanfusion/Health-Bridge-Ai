/* ============================================================
   HealthBridge AI — Hospitals & Map
   Uses Leaflet + OpenStreetMap + Overpass API to fetch REAL
   nearby healthcare amenities. Browser geolocation + Nominatim
   for city/area search. No API key required.
   ============================================================ */

(function () {
  'use strict';

  let map, userMarker, layer;
  let currentFilter = 'hospital';
  let lastCenter = { lat: 19.0760, lng: 72.8777 }; // default Mumbai

  document.addEventListener('DOMContentLoaded', () => {
    /* Wait for Leaflet to load (script is deferred) */
    const start = setInterval(() => {
      if (window.L) { clearInterval(start); init(); }
    }, 50);
  });

  function init() {
    map = L.map('map', { zoomControl: true }).setView([lastCenter.lat, lastCenter.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    layer = L.layerGroup().addTo(map);

    document.getElementById('locateBtn').addEventListener('click', useGeolocation);
    document.getElementById('searchBtn').addEventListener('click', searchPlace);
    document.getElementById('placeSearch').addEventListener('keydown', e => { if (e.key === 'Enter') searchPlace(); });
    document.querySelectorAll('.map-toolbar .filter').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.map-toolbar .filter').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        currentFilter = b.dataset.filter;
        loadPlaces(lastCenter.lat, lastCenter.lng);
      });
    });

    /* Try auto-locate on load (silent fail) */
    useGeolocation(true);
  }

  function useGeolocation(silent) {
    setListLoading();
    const btn = document.getElementById('locateBtn');
    const originalLabel = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader"></i> Locating…';
      window.HBA_refreshIcons();
    }
    const restore = () => {
      if (btn) { btn.disabled = false; btn.innerHTML = originalLabel; window.HBA_refreshIcons(); }
    };

    // Inside cross-origin iframes (preview / embed) the geolocation prompt is
    // often silently blocked, so fall straight back to IP-based lookup.
    const inIframe = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
    if (!navigator.geolocation || inIframe) {
      ipFallback(silent).finally(restore);
      return;
    }

    let done = false;
    const timer = setTimeout(() => {
      if (done) return; done = true;
      ipFallback(silent).finally(restore);
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      pos => {
        if (done) return; done = true; clearTimeout(timer);
        applyCenter(pos.coords.latitude, pos.coords.longitude, 'You are here');
        restore();
      },
      () => {
        if (done) return; done = true; clearTimeout(timer);
        ipFallback(silent).finally(restore);
      },
      { enableHighAccuracy: true, timeout: 5500, maximumAge: 60000 }
    );
  }

  /* IP-based location fallback (multi-provider, works inside iframes) */
  async function ipFallback(silent) {
    const providers = [
      async () => { const r = await fetch('https://ipwho.is/'); const d = await r.json(); if (!d.success) throw 0; return { lat: d.latitude, lng: d.longitude, label: `${d.city || ''} ${d.country || ''}`.trim() }; },
      async () => { const r = await fetch('https://ipapi.co/json/'); if (!r.ok) throw 0; const d = await r.json(); return { lat: d.latitude, lng: d.longitude, label: `${d.city || ''} ${d.country_name || ''}`.trim() }; },
      async () => { const r = await fetch('https://get.geojs.io/v1/ip/geo.json'); if (!r.ok) throw 0; const d = await r.json(); return { lat: parseFloat(d.latitude), lng: parseFloat(d.longitude), label: `${d.city || ''} ${d.country || ''}`.trim() }; }
    ];
    for (const p of providers) {
      try {
        const { lat, lng, label } = await p();
        if (lat && lng) { applyCenter(lat, lng, 'Approximate: ' + (label || 'your area')); return; }
      } catch (_) { /* try next */ }
    }
    if (!silent) renderError('Could not detect your location. Please type a city in the search box (e.g. "Mumbai", "New York").');
    else loadPlaces(lastCenter.lat, lastCenter.lng);
  }

  function applyCenter(lat, lng, label) {
    lastCenter = { lat, lng };
    map.setView([lat, lng], 14);
    if (userMarker) userMarker.remove();
    userMarker = L.marker([lat, lng], { title: label })
      .addTo(map).bindPopup(label).openPopup();
    loadPlaces(lat, lng);
  }

  async function searchPlace() {
    const q = document.getElementById('placeSearch').value.trim();
    if (!q) return;
    setListLoading();
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await res.json();
      if (!data.length) { renderError('Location not found. Try another query.'); return; }
      const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
      applyCenter(lat, lng, data[0].display_name?.split(',')[0] || 'Searched location');
    } catch (e) {
      renderError('Search failed. Please check your connection.');
    }
  }

  /* Filter -> Overpass amenity tag mapping */
  const AMENITY = {
    hospital: '["amenity"="hospital"]',
    clinic: '["amenity"="clinic"]',
    pharmacy: '["amenity"="pharmacy"]',
    emergency: '["emergency"="yes"]'
  };

  const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter'
  ];

  async function fetchOverpass(query) {
    let lastErr;
    for (const base of OVERPASS_MIRRORS) {
      try {
        const res = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query)
        });
        if (!res.ok) throw new Error('http ' + res.status);
        return await res.json();
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('All Overpass mirrors failed');
  }

  async function loadPlaces(lat, lng) {
    setListLoading();
    layer.clearLayers();
    const radius = 5000; // meters
    const filter = AMENITY[currentFilter] || AMENITY.hospital;
    const query = `[out:json][timeout:25];(node${filter}(around:${radius},${lat},${lng});way${filter}(around:${radius},${lat},${lng});relation${filter}(around:${radius},${lat},${lng}););out center 40;`;
    try {
      const data = await fetchOverpass(query);
      const places = (data.elements || []).map(el => ({
        id: el.id,
        name: (el.tags && (el.tags.name || el.tags['name:en'])) || `${cap(currentFilter)} (unnamed)`,
        type: currentFilter,
        lat: el.lat ?? el.center?.lat,
        lng: el.lon ?? el.center?.lon,
        addr: buildAddress(el.tags || {}),
        phone: el.tags?.phone || el.tags?.['contact:phone'] || ''
      })).filter(p => p.lat && p.lng);

      places.forEach(p => p.distance = haversine(lat, lng, p.lat, p.lng));
      places.sort((a, b) => a.distance - b.distance);

      /* Update hero stat */
      const stat = document.getElementById('statHospitals');
      if (stat) stat.textContent = places.length;

      renderPlaces(places.slice(0, 25));
    } catch (e) {
      renderError('Could not load nearby places. Please try again.');
    }
  }

  function renderPlaces(places) {
    const list = document.getElementById('placesList');
    if (!places.length) { renderError('No places found nearby. Try another filter or a wider area.'); return; }
    list.innerHTML = places.map((p, i) => `
      <article class="place-card" data-i="${i}">
        <span class="place-tag">${p.type}</span>
        <h4>${escapeHtml(p.name)}</h4>
        <div class="meta">
          <span><i data-lucide="map-pin"></i> ${p.distance.toFixed(2)} km</span>
          ${p.phone ? `<span><i data-lucide="phone"></i> ${escapeHtml(p.phone)}</span>` : ''}
        </div>
        ${p.addr ? `<p style="margin:.4rem 0 0;font-size:.82rem;color:var(--text-muted)">${escapeHtml(p.addr)}</p>` : ''}
      </article>
    `).join('');
    window.HBA_refreshIcons();

    places.forEach((p, i) => {
      const m = L.marker([p.lat, p.lng]).addTo(layer);
      m.bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>${p.distance.toFixed(2)} km away`);
      const card = list.querySelector(`[data-i="${i}"]`);
      card?.addEventListener('click', () => {
        map.setView([p.lat, p.lng], 16);
        m.openPopup();
      });
    });
  }

  function setListLoading() {
    const list = document.getElementById('placesList');
    list.innerHTML = Array.from({ length: 4 }).map(() => '<div class="skeleton"></div>').join('');
  }
  function renderError(msg) {
    document.getElementById('placesList').innerHTML =
      `<div class="empty-state"><i data-lucide="map-off"></i><p>${msg}</p></div>`;
    window.HBA_refreshIcons();
  }

  function buildAddress(t) {
    const parts = [t['addr:housenumber'], t['addr:street'], t['addr:city'], t['addr:postcode']].filter(Boolean);
    return parts.join(', ');
  }
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371, toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
})();
