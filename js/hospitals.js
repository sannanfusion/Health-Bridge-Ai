/* ============================================================
   HealthBridge AI — Hospitals & Map
   FIXED VERSION FOR VERCEL + CORS SAFE
   ============================================================ */

(function () {
  'use strict';

  let map, userMarker, layer;
  let currentFilter = 'hospital';

  // Default location
  let lastCenter = {
    lat: 33.6844,
    lng: 73.0479
  };

  document.addEventListener('DOMContentLoaded', () => {
    const waitForLeaflet = setInterval(() => {
      if (window.L) {
        clearInterval(waitForLeaflet);
        init();
      }
    }, 100);
  });

  function init() {

    map = L.map('map', {
      zoomControl: true
    }).setView([lastCenter.lat, lastCenter.lng], 13);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }
    ).addTo(map);

    layer = L.layerGroup().addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 500);

    window.addEventListener('resize', () => {
      map.invalidateSize();
    });

    // Buttons
    document
      .getElementById('locateBtn')
      ?.addEventListener('click', () => {
        useGeolocation(false);
      });

    document
      .getElementById('searchBtn')
      ?.addEventListener('click', searchPlace);

    document
      .getElementById('placeSearch')
      ?.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          searchPlace();
        }
      });

    // Filters
    document.querySelectorAll('.map-toolbar .filter').forEach(btn => {

      btn.addEventListener('click', () => {

        document
          .querySelectorAll('.map-toolbar .filter')
          .forEach(x => x.classList.remove('active'));

        btn.classList.add('active');

        currentFilter = btn.dataset.filter;

        loadPlaces(lastCenter.lat, lastCenter.lng);
      });
    });

    // Initial load
    useGeolocation(true);
  }

  /* ============================================================
     GEOLOCATION
     ============================================================ */

  function useGeolocation(silent) {

    setListLoading();

    if (!navigator.geolocation) {

      if (!silent) {
        renderError('Geolocation is not supported.');
      }

      loadPlaces(lastCenter.lat, lastCenter.lng);

      return;
    }

    navigator.geolocation.getCurrentPosition(

      position => {

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        applyCenter(lat, lng, 'You are here');
      },

      () => {

        // fallback to default city
        if (!silent) {
          renderError('Location access denied. Showing default area.');
        }

        applyCenter(lastCenter.lat, lastCenter.lng, 'Default Area');
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  /* ============================================================
     APPLY CENTER
     ============================================================ */

  function applyCenter(lat, lng, label) {

    lastCenter = { lat, lng };

    map.setView([lat, lng], 14);

    if (userMarker) {
      userMarker.remove();
    }

    userMarker = L.marker([lat, lng])
      .addTo(map)
      .bindPopup(label)
      .openPopup();

    loadPlaces(lat, lng);
  }

  /* ============================================================
     SEARCH LOCATION
     ============================================================ */

  async function searchPlace() {

    const input = document.getElementById('placeSearch');

    if (!input) return;

    const q = input.value.trim();

    if (!q) return;

    setListLoading();

    try {

      const response = await fetch(
        `/api/hospitals?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(`Location search error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.length) {

        renderError('Location not found.');

        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      applyCenter(
        lat,
        lng,
        data[0].display_name || 'Searched location'
      );

    } catch (error) {

      renderError('Search failed.');
    }
  }

  /* ============================================================
     FILTERS
     ============================================================ */

  const AMENITY = {

    hospital: '["amenity"="hospital"]',

    clinic: '["amenity"="clinic"]',

    pharmacy: '["amenity"="pharmacy"]',

    emergency: '["emergency"="yes"]'
  };

  /* ============================================================
     LOAD PLACES
     ============================================================ */

  async function loadPlaces(lat, lng) {

    setListLoading();

    layer.clearLayers();

    const radius = 5000;

    const filter =
      AMENITY[currentFilter] || AMENITY.hospital;

    const query = `
      [out:json][timeout:25];
      (
        node${filter}(around:${radius},${lat},${lng});
        way${filter}(around:${radius},${lat},${lng});
        relation${filter}(around:${radius},${lat},${lng});
      );
      out center 40;
    `;

    try {
      const mirrors = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.osm.ch/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
      ];

      let data = null;
      let error = null;

      for (const url of mirrors) {
        try {
          const res = await fetch(url + '?data=' + encodeURIComponent(query));
          if (!res.ok) continue;
          data = await res.json();
          if (data) break;
        } catch (e) {
          error = e;
        }
      }

      if (!data) throw error || new Error('No data from any mirror');

      const places = (data.elements || []).map(el => {

        return {

          id: el.id,

          name:
            el.tags?.name ||
            `${capitalize(currentFilter)} (Unnamed)`,

          lat: el.lat ?? el.center?.lat,

          lng: el.lon ?? el.center?.lon,

          phone:
            el.tags?.phone ||
            el.tags?.['contact:phone'] ||
            '',

          addr: buildAddress(el.tags || {})
        };
      })

      .filter(place => place.lat && place.lng);

      places.forEach(place => {

        place.distance = haversine(
          lat,
          lng,
          place.lat,
          place.lng
        );
      });

      places.sort((a, b) => a.distance - b.distance);

      renderPlaces(places.slice(0, 20));

    } catch (error) {

      console.error(error);

      renderError(
        'Unable to load nearby hospitals.'
      );
    }
  }

  /* ============================================================
     RENDER PLACES
     ============================================================ */

  function renderPlaces(places) {

    const list = document.getElementById('placesList');

    if (!list) return;

    if (!places.length) {

      renderError('No nearby places found.');

      return;
    }

    list.innerHTML = places.map((p, i) => `
      <article class="place-card" data-i="${i}">
        <span class="place-tag">${currentFilter}</span>

        <h4>${escapeHtml(p.name)}</h4>

        <div class="meta">

          <span>
            📍 ${p.distance.toFixed(2)} km
          </span>

          ${
            p.phone
            ? `<span>📞 ${escapeHtml(p.phone)}</span>`
            : ''
          }

        </div>

        ${
          p.addr
          ? `
            <p class="address">
              ${escapeHtml(p.addr)}
            </p>
          `
          : ''
        }

      </article>
    `).join('');

    places.forEach((p, i) => {

      const marker = L.marker([p.lat, p.lng])
        .addTo(layer);

      marker.bindPopup(`
        <strong>${escapeHtml(p.name)}</strong>
        <br>
        ${p.distance.toFixed(2)} km away
      `);

      const card = list.querySelector(`[data-i="${i}"]`);

      card?.addEventListener('click', () => {

        map.setView([p.lat, p.lng], 16);

        marker.openPopup();
      });
    });
  }

  /* ============================================================
     UI HELPERS
     ============================================================ */

  function setListLoading() {

    const list = document.getElementById('placesList');

    if (!list) return;

    list.innerHTML = `
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    `;
  }

  function renderError(message) {

    const list = document.getElementById('placesList');

    if (!list) return;

    list.innerHTML = `
      <div class="empty-state">
        <p>${message}</p>
      </div>
    `;
  }

  /* ============================================================
     UTILITIES
     ============================================================ */

  function buildAddress(tags) {

    return [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city']
    ]
    .filter(Boolean)
    .join(', ');
  }

  function haversine(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const toRad = deg => deg * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    return R * 2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );
  }

  function capitalize(text) {

    return text.charAt(0).toUpperCase() +
           text.slice(1);
  }

  function escapeHtml(str) {

    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

})();