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
    if (!navigator.geolocation) { if (!silent) alert('Geolocation not supported on this device.'); return; }
    setListLoading();
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        lastCenter = { lat: latitude, lng: longitude };
        map.setView([latitude, longitude], 14);
        if (userMarker) userMarker.remove();
        userMarker = L.marker([latitude, longitude], { title: 'You are here' })
          .addTo(map).bindPopup('You are here').openPopup();
        loadPlaces(latitude, longitude);
      },
      () => {
        if (!silent) alert('Unable to get location. Please search a city instead.');
        loadPlaces(lastCenter.lat, lastCenter.lng);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function searchPlace() {
    const q = document.getElementById('placeSearch').value.trim();
    if (!q) return;
    setListLoading();
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const data = await res.json();
      if (!data.length) { renderError('Location not found. Try another query.'); return; }
      const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
      lastCenter = { lat, lng };
      map.setView([lat, lng], 13);
      loadPlaces(lat, lng);
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

  async function loadPlaces(lat, lng) {
    setListLoading();
    layer.clearLayers();
    const radius = 4000; // meters
    const filter = AMENITY[currentFilter] || AMENITY.hospital;
    const query = `[out:json][timeout:20];(node${filter}(around:${radius},${lat},${lng});way${filter}(around:${radius},${lat},${lng});relation${filter}(around:${radius},${lat},${lng}););out center 30;`;
    const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('overpass');
      const data = await res.json();
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
