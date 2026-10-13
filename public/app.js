/**
 * GeoPulse 360 - Main Application Controller
 * Handles state orchestration, real-time SSE stream, timers, search/filter, and CRUD operations.
 */
class GeoPulseApp {
  constructor() {
    this.events = [];
    this.filteredEvents = [];
    this.bookmarks = [];
    this.issData = null;
    this.activeFilter = { minMag: 0, query: '', tsunamiOnly: false };
    this.refreshIntervalSec = 30;
    this.countdownSec = 30;
    this.timerId = null;
    this.sseSource = null;
    this.lastKnownMaxMag = 0;
  }

  async init() {
    console.log('🚀 Initializing GeoPulse 360 Platform...');

    // 1. Initialize Map
    if (window.telemetryMap) {
      window.telemetryMap.init('map');
    }

    // 2. Set Up Theme
    this.initTheme();

    // 3. Set Up Audio state
    this.initSoundToggle();

    // 4. Set Up Real-Time Event Stream (SSE)
    this.connectSSE();

    // 5. Initial Data Load
    await this.fetchData();

    // 6. Initial Weather Load (Chennai, South India by default)
    if (window.weatherController) {
      window.weatherController.loadWeather(13.0827, 80.2707, 'Chennai, Tamil Nadu');
      window.weatherController.setupSearchInput(
        document.getElementById('citySearchInput'),
        document.getElementById('citySearchResults')
      );
    }

    // 7. Load Bookmarks
    await this.loadBookmarks();

    // 8. Setup Auto-Refresh Countdown
    this.startCountdownTimer();

    // 9. Setup UI Event Listeners
    this.bindEvents();

    // 10. Start Clock
    this.startClock();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('geopulse_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeButton(savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('geopulse_theme', next);

    this.updateThemeButton(next);
    if (window.telemetryMap) {
      window.telemetryMap.setBasemap(next === 'dark' ? 'dark' : 'light');
    }
    if (window.telemetryCharts) {
      window.telemetryCharts.refreshTheme(this.events, null);
    }
    if (window.soundManager) window.soundManager.playTactileClick();
  }

  updateThemeButton(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    btn.innerHTML = theme === 'dark' ? '☀️ Light Mode' : '🌙 Tactical Dark';
  }

  initSoundToggle() {
    const btn = document.getElementById('soundToggleBtn');
    if (!btn) return;
    const isEnabled = window.soundManager.enabled;
    btn.innerHTML = isEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    btn.classList.toggle('active-pill', isEnabled);
  }

  handleSoundToggle() {
    const state = window.soundManager.toggle();
    const btn = document.getElementById('soundToggleBtn');
    if (btn) {
      btn.innerHTML = state ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      btn.classList.toggle('active-pill', state);
    }
  }

  connectSSE() {
    if (typeof EventSource === 'undefined') {
      console.warn('SSE not supported, running in polling mode.');
      return;
    }

    try {
      this.sseSource = new EventSource('/api/events/live');

      this.sseSource.onopen = () => {
        const badge = document.getElementById('streamStatusBadge');
        if (badge) {
          badge.className = 'status-badge online';
          badge.innerHTML = '<span class="status-pulse"></span> LIVE SSE STREAM';
        }
      };

      this.sseSource.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (packet.type === 'TELEMETRY_BEAT' && packet.iss) {
            this.issData = packet.iss;
            if (window.telemetryMap) {
              window.telemetryMap.updateISS(packet.iss);
            }
            this.updateIssKpi(packet.iss);
          }
        } catch (e) {}
      };

      this.sseSource.onerror = () => {
        const badge = document.getElementById('streamStatusBadge');
        if (badge) {
          badge.className = 'status-badge fallback';
          badge.innerHTML = '<span class="status-pulse fallback"></span> AUTO-POLLING';
        }
      };
    } catch (err) {
      console.warn('Could not connect to SSE, fallback to polling');
    }
  }

  async fetchData() {
    const refreshBtn = document.getElementById('manualRefreshBtn');
    if (refreshBtn) refreshBtn.classList.add('spinning');

    try {
      let data = null;
      // Try local backend proxy first
      try {
        const resp = await fetch('/api/earthquakes?timeframe=day');
        if (resp.ok) {
          const json = await resp.json();
          if (json.success) data = json;
        }
      } catch (e) {
        // standalone mode fallback
      }

      // Standalone browser direct fallback
      if (!data) {
        const directResp = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
        const geojson = await directResp.json();
        const parsed = geojson.features.map(f => {
          const coords = f.geometry ? f.geometry.coordinates : [0, 0, 0];
          const mag = f.properties.mag !== null ? Number(f.properties.mag) : 0;
          return {
            id: f.id,
            title: f.properties.title,
            place: f.properties.place || 'Unknown location',
            mag: Number(mag.toFixed(1)),
            time: f.properties.time,
            url: f.properties.url,
            tsunami: f.properties.tsunami === 1,
            latitude: coords[1],
            longitude: coords[0],
            depthKm: Number((coords[2] || 0).toFixed(1)),
            severity: mag >= 6.5 ? 'catastrophic' : mag >= 5 ? 'critical' : mag >= 3.5 ? 'moderate' : 'minor'
          };
        });
        parsed.sort((a, b) => b.time - a.time);
        data = {
          count: parsed.length,
          events: parsed,
          summary: {
            maxMagnitude: parsed.reduce((m, e) => Math.max(m, e.mag), 0),
            tsunamiAlerts: parsed.filter(e => e.tsunami).length,
            deepEarthquakes: parsed.filter(e => e.depthKm > 100).length
          }
        };
      }

      this.events = data.events || [];

      // Check for high magnitude new alert
      const currentMax = data.summary ? data.summary.maxMagnitude : 0;
      if (this.lastKnownMaxMag > 0 && currentMax > this.lastKnownMaxMag && currentMax >= 5.0) {
        if (window.soundManager) window.soundManager.playCriticalAlert();
        this.showToast(`🚨 HIGH MAGNITUDE DETECTED: M${currentMax} seismic event recorded!`, 'danger');
      }
      this.lastKnownMaxMag = currentMax;

      // Update KPIs
      this.updateKpis(data);

      // Apply current filters
      this.applyFilters();

      // Update Map
      if (window.telemetryMap) {
        window.telemetryMap.updateEarthquakes(this.events);
      }

      // Update Charts
      if (window.telemetryCharts) {
        window.telemetryCharts.initMagnitudeChart('magnitudeChart', this.events);
        window.telemetryCharts.initDepthChart('depthChart', this.events);
      }

      // Also refresh ISS if not connected via SSE
      if (!this.sseSource || this.sseSource.readyState !== EventSource.OPEN) {
        this.fetchIssTelemetry();
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      this.showToast('⚠️ Could not update live telemetry feed', 'warning');
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('spinning');
      this.countdownSec = this.refreshIntervalSec;
    }
  }

  async fetchIssTelemetry() {
    try {
      let iss = null;
      try {
        const r = await fetch('/api/iss');
        if (r.ok) {
          const j = await r.json();
          if (j.success) iss = j.iss;
        }
      } catch (e) {}

      if (!iss) {
        const r = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        const j = await r.json();
        iss = {
          latitude: Number(j.latitude.toFixed(4)),
          longitude: Number(j.longitude.toFixed(4)),
          altitudeKm: Number(j.altitude.toFixed(2)),
          velocityKmh: Number(j.velocity.toFixed(2))
        };
      }

      this.issData = iss;
      if (window.telemetryMap) window.telemetryMap.updateISS(iss);
      this.updateIssKpi(iss);
    } catch (e) {}
  }

  updateKpis(data) {
    const totalEl = document.getElementById('kpiTotalQuakes');
    if (totalEl) totalEl.innerText = (data.events ? data.events.length : 0).toLocaleString();

    const maxEl = document.getElementById('kpiMaxMag');
    if (maxEl && data.summary) maxEl.innerText = `M ${data.summary.maxMagnitude.toFixed(1)}`;

    const tsunamiEl = document.getElementById('kpiTsunami');
    if (tsunamiEl && data.summary) tsunamiEl.innerText = data.summary.tsunamiAlerts;

    const deepEl = document.getElementById('kpiDeepQuakes');
    if (deepEl && data.summary) deepEl.innerText = data.summary.deepEarthquakes;
  }

  updateIssKpi(iss) {
    const altEl = document.getElementById('kpiIssAltitude');
    if (altEl) altEl.innerText = `${Math.round(iss.altitudeKm)} km`;

    const velEl = document.getElementById('kpiIssVelocity');
    if (velEl) velEl.innerText = `${Math.round(iss.velocityKmh).toLocaleString()} km/h`;
  }

  applyFilters() {
    const query = this.activeFilter.query.toLowerCase();
    const minMag = this.activeFilter.minMag;
    const tsunamiOnly = this.activeFilter.tsunamiOnly;
    const indianOceanOnly = this.activeFilter.indianOceanOnly;

    this.filteredEvents = this.events.filter(e => {
      if (minMag > 0 && e.mag < minMag) return false;
      if (tsunamiOnly && !e.tsunami) return false;
      if (indianOceanOnly) {
        // South Asia, Bay of Bengal, Arabian Sea, Indian Ocean, Andaman Trench bounds
        const inRegion = e.latitude >= -20 && e.latitude <= 35 && e.longitude >= 50 && e.longitude <= 110;
        if (!inRegion) return false;
      }
      if (query && !e.place.toLowerCase().includes(query)) return false;
      return true;
    });

    this.renderAlertFeed(this.filteredEvents);

    const countLabel = document.getElementById('feedCountBadge');
    if (countLabel) {
      countLabel.innerText = `${this.filteredEvents.length} shown`;
    }
  }

  renderAlertFeed(list) {
    const container = document.getElementById('alertFeedList');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-feed-card">
          <p>No seismic events matching your active filter criteria.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.slice(0, 50).map(e => {
      let severityClass = 'badge-minor';
      if (e.mag >= 6.5) severityClass = 'badge-catastrophic';
      else if (e.mag >= 5.0) severityClass = 'badge-critical';
      else if (e.mag >= 4.0) severityClass = 'badge-moderate';
      else if (e.mag >= 2.5) severityClass = 'badge-light';

      const timeAgo = this.formatTimeAgo(e.time);

      return `
        <div class="alert-feed-card" onclick="window.app.focusEventOnMap(${e.latitude}, ${e.longitude}, '${escape(e.place)}')">
          <div class="card-left">
            <span class="mag-badge ${severityClass}">M${e.mag}</span>
          </div>
          <div class="card-content">
            <div class="card-title">${e.place}</div>
            <div class="card-meta">
              <span>⏱️ ${timeAgo}</span>
              <span>📍 ${e.depthKm} km depth</span>
              ${e.tsunami ? '<span class="tsunami-tag">⚠️ TSUNAMI RISK</span>' : ''}
            </div>
          </div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="icon-action-btn" title="Inspect Weather at Epicenter" onclick="window.app.inspectCoordinatesWeather(${e.latitude}, ${e.longitude}, '${escape(e.place)}')">
              🌤️
            </button>
            <a href="${e.url}" target="_blank" rel="noopener" class="icon-action-btn" title="USGS Page">
              ↗
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  focusEventOnMap(lat, lon, title) {
    if (window.telemetryMap) {
      window.telemetryMap.flyToCoordinates(lat, lon, 6);
    }
    if (window.soundManager) window.soundManager.playTactileClick();
  }

  inspectCoordinatesWeather(lat, lon, placeName) {
    const unescaped = unescape(placeName);
    if (window.weatherController) {
      window.weatherController.loadWeather(lat, lon, unescaped);
    }
    if (window.telemetryMap) {
      window.telemetryMap.flyToCoordinates(lat, lon, 7);
    }
    this.showToast(`🌤️ Loaded meteorological telemetry for: ${unescaped}`, 'info');
  }

  formatTimeAgo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  startCountdownTimer() {
    clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      if (this.refreshIntervalSec === 0) return; // Paused

      this.countdownSec--;
      const countdownEl = document.getElementById('countdownDisplay');
      if (countdownEl) {
        countdownEl.innerText = `${this.countdownSec}s`;
      }

      if (this.countdownSec <= 0) {
        if (window.soundManager) window.soundManager.playSonarPing();
        this.fetchData();
      }
    }, 1000);
  }

  setRefreshInterval(seconds) {
    this.refreshIntervalSec = seconds;
    this.countdownSec = seconds;
    const countdownEl = document.getElementById('countdownDisplay');
    if (countdownEl) {
      countdownEl.innerText = seconds === 0 ? 'PAUSED' : `${seconds}s`;
    }
    if (window.soundManager) window.soundManager.playTactileClick();
  }

  startClock() {
    const clockEl = document.getElementById('liveClockUtc');
    if (!clockEl) return;
    const update = () => {
      const d = new Date();
      clockEl.innerText = `${d.toUTCString().slice(17, 25)} UTC`;
    };
    update();
    setInterval(update, 1000);
  }

  // Bookmarks CRUD
  async loadBookmarks() {
    try {
      let list = [];
      try {
        const resp = await fetch('/api/bookmarks');
        if (resp.ok) {
          const j = await resp.json();
          if (j.success) list = j.bookmarks;
        }
      } catch (e) {}

      if (list.length === 0) {
        // LocalStorage fallback
        list = JSON.parse(localStorage.getItem('geopulse_bookmarks') || '[]');
      }

      this.bookmarks = list;
      this.renderBookmarks();
    } catch (e) {}
  }

  async addBookmark(name, lat, lon, notes = '') {
    const newBm = {
      id: `bm-${Date.now()}`,
      name: name || 'Custom Location',
      latitude: Number(lat),
      longitude: Number(lon),
      notes: notes || 'Watchlist Observation Station',
      createdAt: new Date().toISOString()
    };

    // Try server post
    let saved = false;
    try {
      const resp = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBm)
      });
      if (resp.ok) saved = true;
    } catch (e) {}

    this.bookmarks.unshift(newBm);
    localStorage.setItem('geopulse_bookmarks', JSON.stringify(this.bookmarks));
    this.renderBookmarks();
    this.showToast(`📌 Added "${name}" to Watchlist`, 'info');
  }

  async deleteBookmark(id) {
    try {
      await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
    } catch (e) {}

    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    localStorage.setItem('geopulse_bookmarks', JSON.stringify(this.bookmarks));
    this.renderBookmarks();
    this.showToast('Bookmark removed', 'info');
  }

  renderBookmarks() {
    const listEl = document.getElementById('watchlistItemsList');
    if (!listEl) return;

    if (this.bookmarks.length === 0) {
      listEl.innerHTML = '<div class="empty-feed-card"><p>No saved watchlist locations yet.</p></div>';
      return;
    }

    listEl.innerHTML = this.bookmarks.map(b => `
      <div class="watchlist-card" onclick="window.app.inspectCoordinatesWeather(${b.latitude}, ${b.longitude}, '${escape(b.name)}')">
        <div class="wl-info">
          <strong>${b.name}</strong>
          <small>${b.latitude.toFixed(2)}°, ${b.longitude.toFixed(2)}° • ${b.notes || 'Station'}</small>
        </div>
        <button class="wl-del-btn" title="Remove" onclick="event.stopPropagation(); window.app.deleteBookmark('${b.id}')">✕</button>
      </div>
    `).join('');
  }

  // Export CSV
  exportCSV() {
    if (this.events.length === 0) {
      this.showToast('No data available to export', 'warning');
      return;
    }

    const headers = ['ID', 'Magnitude', 'Place', 'DepthKm', 'Latitude', 'Longitude', 'TimeUTC', 'TsunamiAlert'];
    const rows = this.events.map(f => [
      `"${f.id}"`,
      f.mag,
      `"${f.place.replace(/"/g, '""')}"`,
      f.depthKm,
      f.latitude,
      f.longitude,
      `"${new Date(f.time).toISOString()}"`,
      f.tsunami ? 'YES' : 'NO'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GeoPulse-Earthquakes-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('📥 CSV incident telemetry report exported successfully', 'info');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `tactical-toast toast-${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  bindEvents() {
    // Theme toggle
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());

    // Sound toggle
    document.getElementById('soundToggleBtn')?.addEventListener('click', () => this.handleSoundToggle());

    // Refresh button
    document.getElementById('manualRefreshBtn')?.addEventListener('click', () => {
      if (window.soundManager) window.soundManager.playTactileClick();
      this.fetchData();
    });

    // Refresh interval selector
    document.querySelectorAll('.interval-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.interval-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        const sec = parseInt(e.target.getAttribute('data-sec'), 10);
        this.setRefreshInterval(sec);
      });
    });

    // Basemap selector buttons
    document.querySelectorAll('.basemap-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.basemap-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const mapType = e.target.getAttribute('data-basemap');
        if (window.telemetryMap) window.telemetryMap.setBasemap(mapType);
      });
    });

    // Filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');

        const mag = parseFloat(e.target.getAttribute('data-mag') || '0');
        const tsunami = e.target.getAttribute('data-tsunami') === 'true';
        const indianOcean = e.target.getAttribute('data-indianocean') === 'true';

        this.activeFilter.minMag = isNaN(mag) ? 0 : mag;
        this.activeFilter.tsunamiOnly = tsunami;
        this.activeFilter.indianOceanOnly = indianOcean;
        this.applyFilters();
        if (window.soundManager) window.soundManager.playTactileClick();
      });
    });

    // South India station jump buttons
    document.querySelectorAll('.station-jump-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.station-jump-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        const station = e.target.getAttribute('data-station');
        if (window.telemetryMap) window.telemetryMap.focusPresetStation(station);
        if (window.soundManager) window.soundManager.playTactileClick();
      });
    });

    // Search input for alert feed
    const searchInput = document.getElementById('alertSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.activeFilter.query = e.target.value.trim();
        this.applyFilters();
      });
    }

    // Map helpers
    document.getElementById('mapCenterUserBtn')?.addEventListener('click', () => {
      if (window.telemetryMap) window.telemetryMap.centerUserLocation();
    });

    document.getElementById('mapSouthIndiaBtn')?.addEventListener('click', () => {
      if (window.telemetryMap) window.telemetryMap.focusSouthIndia();
    });

    document.getElementById('mapResetBtn')?.addEventListener('click', () => {
      if (window.telemetryMap) window.telemetryMap.resetGlobalView();
    });

    // Add to watchlist button
    document.getElementById('addCurrentToWatchlistBtn')?.addEventListener('click', () => {
      if (window.weatherController) {
        this.addBookmark(
          window.weatherController.currentCity,
          window.weatherController.currentLat,
          window.weatherController.currentLon,
          'Monitored Station'
        );
      }
    });

    // Export CSV button
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => this.exportCSV());

    // Print button
    document.getElementById('printReportBtn')?.addEventListener('click', () => window.print());
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new GeoPulseApp();
  window.app.init();
});
