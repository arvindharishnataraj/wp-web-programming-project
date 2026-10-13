/**
 * GeoPulse 360 - Interactive Leaflet Map Controller
 * Free, unwatermarked basemaps with South India and Global Telemetry.
 */
class TelemetryMap {
  constructor() {
    this.map = null;
    this.earthquakeLayer = null;
    this.issMarker = null;
    this.baseLayers = {};
    this.tectonicLayers = [];
    this.currentTileLayer = null;
  }

  init(containerId = 'map') {
    if (this.map) return;

    // Centered primarily on South India (Tamil Nadu, Karnataka, Kerala, AP, Telangana & Indian Ocean)
    this.map = L.map(containerId, {
      center: [13.2, 79.5],
      zoom: 5.5,
      minZoom: 1.8,
      maxZoom: 16,
      zoomControl: false,
      worldCopyJump: true
    });

    // Custom Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // 100% Free, Unwatermarked Basemaps (No API Keys Required)
    const esriDark = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16
    });

    const osmStandard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    });

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri, Maxar, Earthstar Geographics',
      maxZoom: 18
    });

    const topoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri &copy; OpenStreetMap contributors',
      maxZoom: 18
    });

    this.baseLayers = {
      dark: esriDark,
      street: osmStandard,
      satellite: satellite,
      topo: topoMap
    };

    // Choose base layer according to theme
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    this.currentTileLayer = isDark ? esriDark : osmStandard;
    this.currentTileLayer.addTo(this.map);

    // Layer groups
    this.earthquakeLayer = L.layerGroup().addTo(this.map);

    // Draw Tectonic Fault Lines (Pacific Rim & Andaman-Sumatra Subduction Arc)
    this.drawTectonicPlates();
  }

  setBasemap(type) {
    if (!this.baseLayers[type]) return;
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }
    this.currentTileLayer = this.baseLayers[type];
    this.currentTileLayer.addTo(this.map);
  }

  drawTectonicPlates() {
    // 1. Pacific Ring of Fire
    const ringOfFirePoints = [
      [-55, -70], [-40, -73], [-20, -70], [0, -80], [15, -95], [25, -110],
      [38, -123], [54, -160], [60, -170], [55, 160], [45, 150], [35, 140],
      [15, 145], [-5, 150], [-20, 175], [-45, 170], [-55, 170]
    ];

    const rof = L.polyline(ringOfFirePoints, {
      color: '#ff0055',
      weight: 1.5,
      opacity: 0.55,
      dashArray: '6, 8'
    }).addTo(this.map);
    rof.bindTooltip('Pacific Ring of Fire Fault Arc', { sticky: true });
    this.tectonicLayers.push(rof);

    // 2. Andaman - Sumatra Subduction Trench (Indian Ocean / Bay of Bengal Tsunami Zone)
    const andamanArcPoints = [
      [26.0, 95.5], [22.0, 93.8], [15.5, 93.2], [11.5, 92.8], [6.0, 94.5],
      [1.0, 98.0], [-3.5, 101.5], [-7.0, 106.0], [-9.0, 115.0]
    ];

    const andamanArc = L.polyline(andamanArcPoints, {
      color: '#00f3ff',
      weight: 2,
      opacity: 0.8,
      dashArray: '5, 6'
    }).addTo(this.map);
    andamanArc.bindTooltip('⚠️ Andaman-Sumatra Subduction Trench (Bay of Bengal & Indian Ocean Tsunami Risk Arc)', {
      sticky: true
    });
    this.tectonicLayers.push(andamanArc);
  }

  updateEarthquakes(events) {
    if (!this.map || !this.earthquakeLayer) return;
    this.earthquakeLayer.clearLayers();

    events.forEach(eq => {
      const { latitude, longitude, mag, place, depthKm, time, tsunami, url } = eq;
      if (latitude === undefined || longitude === undefined) return;

      // Color coding & size by magnitude
      let color = '#10b981'; // Green
      let ringClass = 'pulse-minor';
      let radius = 6;

      if (mag >= 6.5) {
        color = '#a855f7'; // Violent purple
        ringClass = 'pulse-catastrophic';
        radius = 18;
      } else if (mag >= 5.0) {
        color = '#ef4444'; // Red
        ringClass = 'pulse-critical';
        radius = 14;
      } else if (mag >= 4.0) {
        color = '#f59e0b'; // Amber
        ringClass = 'pulse-moderate';
        radius = 10;
      } else if (mag >= 2.5) {
        color = '#38bdf8'; // Cyan
        ringClass = 'pulse-light';
        radius = 7;
      }

      // Custom pulsing HTML marker
      const iconHtml = `
        <div class="quake-marker-wrapper">
          <div class="quake-pulse ${ringClass}"></div>
          <div class="quake-core" style="background-color: ${color}; width: ${radius}px; height: ${radius}px;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-quake-div-icon',
        html: iconHtml,
        iconSize: [radius * 2, radius * 2],
        iconAnchor: [radius, radius]
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon });

      // Popup HTML
      const eventDate = new Date(time).toUTCString();
      const popupHtml = `
        <div class="map-popup-card">
          <div class="popup-header" style="border-left: 4px solid ${color};">
            <span class="popup-mag" style="background:${color}22; color:${color}; border: 1px solid ${color};">M ${mag}</span>
            <div class="popup-title">${place}</div>
          </div>
          <div class="popup-details">
            <div class="detail-row"><span>Time (UTC):</span><strong>${eventDate}</strong></div>
            <div class="detail-row"><span>Depth:</span><strong>${depthKm} km</strong></div>
            <div class="detail-row"><span>Coordinates:</span><strong>${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°</strong></div>
            ${tsunami ? '<div class="detail-row tsunami-warning">⚠️ TSUNAMI ADVISORY ACTIVE</div>' : ''}
          </div>
          <div class="popup-actions">
            <button class="popup-btn weather-inspect-btn" onclick="window.app.inspectCoordinatesWeather(${latitude}, ${longitude}, '${escape(place)}')">
              🌤️ Epicenter Weather
            </button>
            <a href="${url}" target="_blank" rel="noopener" class="popup-btn usgs-link-btn">
              USGS Official ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300, className: 'tactical-popup' });
      marker.bindTooltip(`M${mag} - ${place}`, { direction: 'top', offset: [0, -radius] });
      marker.addTo(this.earthquakeLayer);
    });
  }

  updateISS(issData) {
    if (!this.map || !issData) return;

    const { latitude, longitude, altitudeKm, velocityKmh } = issData;

    const issIconHtml = `
      <div class="iss-marker-pulse">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="#00f3ff">
          <path d="M12 2L9 9l-7 3 7 3 3 7 3-7 7-3-7-3z"/>
        </svg>
      </div>
    `;

    const issIcon = L.divIcon({
      className: 'custom-iss-icon',
      html: issIconHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (!this.issMarker) {
      this.issMarker = L.marker([latitude, longitude], { icon: issIcon }).addTo(this.map);
      this.issMarker.bindTooltip('🛰️ ISS (International Space Station) Live', { permanent: false, direction: 'top' });
    } else {
      this.issMarker.setLatLng([latitude, longitude]);
    }

    const popupContent = `
      <div class="map-popup-card">
        <div class="popup-header" style="border-left: 4px solid #00f3ff;">
          <span class="popup-mag" style="background:rgba(0,243,255,0.15); color:#00f3ff; border: 1px solid #00f3ff;">ISS</span>
          <div class="popup-title">International Space Station</div>
        </div>
        <div class="popup-details">
          <div class="detail-row"><span>Position:</span><strong>${latitude}°, ${longitude}°</strong></div>
          <div class="detail-row"><span>Altitude:</span><strong>${altitudeKm} km</strong></div>
          <div class="detail-row"><span>Orbital Speed:</span><strong>${velocityKmh} km/h</strong></div>
        </div>
      </div>
    `;
    this.issMarker.bindPopup(popupContent, { maxWidth: 280, className: 'tactical-popup' });
  }

  flyToCoordinates(lat, lon, zoom = 6) {
    if (!this.map) return;
    this.map.flyTo([lat, lon], zoom, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }

  focusSouthIndia() {
    if (!this.map) return;
    this.map.flyTo([13.2, 79.5], 5.5, { duration: 1.2 });
  }

  resetGlobalView() {
    if (!this.map) return;
    this.map.flyTo([20, 0], 2.2, { duration: 1.2 });
  }

  focusPresetStation(stationKey) {
    const coords = {
      chennai: { lat: 13.0827, lon: 80.2707, zoom: 8, name: 'Chennai, Tamil Nadu' },
      bengaluru: { lat: 12.9716, lon: 77.5946, zoom: 8, name: 'Bengaluru, Karnataka' },
      hyderabad: { lat: 17.3850, lon: 78.4867, zoom: 8, name: 'Hyderabad, Telangana' },
      kochi: { lat: 9.9312, lon: 76.2673, zoom: 8, name: 'Kochi, Kerala' },
      vizag: { lat: 17.6868, lon: 83.2185, zoom: 8, name: 'Visakhapatnam, Andhra Pradesh' },
      andaman: { lat: 11.6234, lon: 92.7265, zoom: 7, name: 'Port Blair, Andaman & Nicobar' }
    };

    if (coords[stationKey]) {
      const s = coords[stationKey];
      this.flyToCoordinates(s.lat, s.lon, s.zoom);
      if (window.weatherController) {
        window.weatherController.loadWeather(s.lat, s.lon, s.name);
      }
    }
  }

  centerUserLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.flyToCoordinates(latitude, longitude, 8);
        L.circleMarker([latitude, longitude], {
          radius: 8,
          color: '#00f3ff',
          fillColor: '#00f3ff',
          fillOpacity: 0.8
        }).addTo(this.map).bindPopup('📍 Your Current Observation Station').openPopup();
      },
      (err) => {
        alert('Could not determine your location: ' + err.message);
      }
    );
  }
}

window.telemetryMap = new TelemetryMap();
