/**
 * GeoPulse 360 - Weather & Atmospheric Intelligence Module
 * Fetches Open-Meteo Weather and Air Quality data, decodes WMO codes, and renders metrics.
 */
class WeatherController {
  constructor() {
    this.currentCity = 'Chennai, Tamil Nadu';
    this.currentLat = 13.0827;
    this.currentLon = 80.2707;
    this.searchTimeout = null;
  }

  // WMO Weather Interpretation Codes (WW)
  getWeatherInfo(code, isDay = true) {
    const table = {
      0: { text: 'Clear Sky', icon: isDay ? '☀️' : '🌙' },
      1: { text: 'Mainly Clear', icon: isDay ? '🌤️' : '🌤️' },
      2: { text: 'Partly Cloudy', icon: '⛅' },
      3: { text: 'Overcast', icon: '☁️' },
      45: { text: 'Fog', icon: '🌫️' },
      48: { text: 'Depositing Rime Fog', icon: '🌫️' },
      51: { text: 'Light Drizzle', icon: '🌦️' },
      53: { text: 'Moderate Drizzle', icon: '🌦️' },
      55: { text: 'Dense Drizzle', icon: '🌧️' },
      61: { text: 'Slight Rain', icon: '🌧️' },
      63: { text: 'Moderate Rain', icon: '🌧️' },
      65: { text: 'Heavy Rain', icon: '⛈️' },
      71: { text: 'Slight Snow Fall', icon: '🌨️' },
      73: { text: 'Moderate Snow Fall', icon: '❄️' },
      75: { text: 'Heavy Snow Fall', icon: '❄️' },
      77: { text: 'Snow Grains', icon: '❄️' },
      80: { text: 'Slight Rain Showers', icon: '🌦️' },
      81: { text: 'Moderate Showers', icon: '🌧️' },
      82: { text: 'Violent Showers', icon: '⛈️' },
      85: { text: 'Slight Snow Showers', icon: '🌨️' },
      86: { text: 'Heavy Snow Showers', icon: '❄️' },
      95: { text: 'Thunderstorm', icon: '⚡' },
      96: { text: 'Thunderstorm with Slight Hail', icon: '⛈️' },
      99: { text: 'Thunderstorm with Heavy Hail', icon: '⛈️' }
    };

    return table[code] || { text: 'Atmospheric Conditions', icon: '🌡️' };
  }

  // AQI Rating based on US EPA standards
  getAqiRating(aqiVal) {
    if (!aqiVal && aqiVal !== 0) return { label: 'N/A', color: '#94a3b8', badge: 'neutral' };
    if (aqiVal <= 50) return { label: 'Good', color: '#10b981', badge: 'safe' };
    if (aqiVal <= 100) return { label: 'Moderate', color: '#f59e0b', badge: 'warning' };
    if (aqiVal <= 150) return { label: 'Unhealthy (Sensitive)', color: '#f97316', badge: 'caution' };
    if (aqiVal <= 200) return { label: 'Unhealthy', color: '#ef4444', badge: 'danger' };
    if (aqiVal <= 300) return { label: 'Very Unhealthy', color: '#a855f7', badge: 'critical' };
    return { label: 'Hazardous', color: '#881337', badge: 'catastrophic' };
  }

  async loadWeather(lat, lon, cityName = '') {
    this.currentLat = lat;
    this.currentLon = lon;
    if (cityName) this.currentCity = cityName;

    const weatherCard = document.getElementById('weatherTelemetryCard');
    if (weatherCard) weatherCard.classList.add('loading-skeleton');

    try {
      // First try local server API; if running standalone, fallback to direct Open-Meteo
      let data = null;
      try {
        const resp = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        if (resp.ok) {
          const resJson = await resp.json();
          if (resJson.success) data = resJson.data;
        }
      } catch (e) {
        // standalone browser fallback
      }

      if (!data) {
        // Direct Open-Meteo fallback
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7`;
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=auto`;
        const [wRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl).catch(() => null)]);
        const wJson = await wRes.json();
        const aJson = aRes && aRes.ok ? await aRes.json() : null;

        data = {
          coordinates: { latitude: lat, longitude: lon },
          timezone: wJson.timezone,
          current: {
            temperature: wJson.current.temperature_2m,
            feelsLike: wJson.current.apparent_temperature,
            humidity: wJson.current.relative_humidity_2m,
            precipitation: wJson.current.precipitation,
            weatherCode: wJson.current.weather_code,
            windSpeed: wJson.current.wind_speed_10m,
            windDirection: wJson.current.wind_direction_10m,
            pressureHpa: wJson.current.surface_pressure,
            isDay: wJson.current.is_day === 1
          },
          airQuality: aJson && aJson.current ? {
            usAqi: aJson.current.us_aqi,
            pm2_5: aJson.current.pm2_5,
            pm10: aJson.current.pm10,
            ozone: aJson.current.ozone,
            nitrogenDioxide: aJson.current.nitrogen_dioxide
          } : null,
          hourly: {
            times: (wJson.hourly.time || []).slice(0, 24),
            temperatures: (wJson.hourly.temperature_2m || []).slice(0, 24),
            precipProb: (wJson.hourly.precipitation_probability || []).slice(0, 24)
          },
          daily: {
            times: wJson.daily.time || [],
            tempMax: wJson.daily.temperature_2m_max || [],
            tempMin: wJson.daily.temperature_2m_min || [],
            weatherCodes: wJson.daily.weather_code || []
          }
        };
      }

      this.renderWeather(data);
      if (window.telemetryCharts && data.hourly) {
        window.telemetryCharts.updateWeatherHourlyChart('weatherChart', data.hourly);
      }
    } catch (err) {
      console.error('Failed to load weather:', err);
    } finally {
      if (weatherCard) weatherCard.classList.remove('loading-skeleton');
    }
  }

  renderWeather(data) {
    const cur = data.current;
    const aqi = data.airQuality;
    const info = this.getWeatherInfo(cur.weatherCode, cur.isDay);
    const aqiRating = aqi ? this.getAqiRating(aqi.usAqi) : { label: 'Unavailable', color: '#94a3b8' };

    // Update location name
    const titleEl = document.getElementById('weatherCityTitle');
    if (titleEl) titleEl.innerText = this.currentCity;

    const coordsEl = document.getElementById('weatherCoords');
    if (coordsEl) coordsEl.innerText = `${data.coordinates.latitude.toFixed(2)}°N, ${data.coordinates.longitude.toFixed(2)}°E (${data.timezone || 'UTC'})`;

    // Big temperature & icon
    const tempEl = document.getElementById('weatherTempLarge');
    if (tempEl) tempEl.innerHTML = `${Math.round(cur.temperature)}<span class="temp-unit">°C</span>`;

    const iconEl = document.getElementById('weatherIconLarge');
    if (iconEl) iconEl.innerText = info.icon;

    const condEl = document.getElementById('weatherConditionText');
    if (condEl) condEl.innerText = info.text;

    const feelsEl = document.getElementById('weatherFeelsLike');
    if (feelsEl) feelsEl.innerText = `Feels like ${Math.round(cur.feelsLike)}°C`;

    // Metrics grid
    const windEl = document.getElementById('weatherWindSpeed');
    if (windEl) windEl.innerText = `${cur.windSpeed} km/h`;

    const humidityEl = document.getElementById('weatherHumidity');
    if (humidityEl) humidityEl.innerText = `${cur.humidity}%`;

    const pressureEl = document.getElementById('weatherPressure');
    if (pressureEl) pressureEl.innerText = `${Math.round(cur.pressureHpa)} hPa`;

    const precipEl = document.getElementById('weatherPrecip');
    if (precipEl) precipEl.innerText = `${cur.precipitation} mm`;

    // Air Quality badge
    const aqiValEl = document.getElementById('weatherAqiValue');
    if (aqiValEl && aqi) {
      aqiValEl.innerText = `${aqi.usAqi || '--'} (${aqiRating.label})`;
      aqiValEl.style.color = aqiRating.color;
    }

    const pm25El = document.getElementById('weatherPm25');
    if (pm25El && aqi) pm25El.innerText = `${aqi.pm2_5 || '--'} µg/m³`;

    const pm10El = document.getElementById('weatherPm10');
    if (pm10El && aqi) pm10El.innerText = `${aqi.pm10 || '--'} µg/m³`;

    // Mini 5-day forecast
    const forecastContainer = document.getElementById('weatherMiniForecast');
    if (forecastContainer && data.daily && data.daily.times) {
      const days = data.daily.times.slice(1, 6).map((timeStr, idx) => {
        const d = new Date(timeStr);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const max = Math.round(data.daily.tempMax[idx + 1] || 0);
        const min = Math.round(data.daily.tempMin[idx + 1] || 0);
        const code = data.daily.weatherCodes[idx + 1] || 0;
        const icon = this.getWeatherInfo(code).icon;

        return `
          <div class="mini-forecast-col">
            <span class="day-label">${dayName}</span>
            <span class="day-icon">${icon}</span>
            <span class="day-temps"><strong>${max}°</strong> / ${min}°</span>
          </div>
        `;
      });
      forecastContainer.innerHTML = days.join('');
    }
  }

  // Geocoding auto-suggest
  setupSearchInput(inputEl, resultsEl) {
    if (!inputEl || !resultsEl) return;

    inputEl.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(this.searchTimeout);

      if (q.length < 2) {
        resultsEl.innerHTML = '';
        resultsEl.classList.remove('active');
        return;
      }

      this.searchTimeout = setTimeout(async () => {
        try {
          let results = [];
          try {
            const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
            if (res.ok) {
              const j = await res.json();
              if (j.success) results = j.results;
            }
          } catch (e) {}

          if (results.length === 0) {
            // direct fallback
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
            const j = await res.json();
            results = (j.results || []).map(item => ({
              name: item.name,
              latitude: item.latitude,
              longitude: item.longitude,
              country: item.country || '',
              display: [item.name, item.admin1, item.country].filter(Boolean).join(', ')
            }));
          }

          if (results.length > 0) {
            resultsEl.innerHTML = results.map(r => `
              <div class="suggest-item" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${r.display}">
                <strong>${r.name}</strong> <small>${r.country || ''}</small>
              </div>
            `).join('');
            resultsEl.classList.add('active');
          } else {
            resultsEl.innerHTML = '<div class="suggest-empty">No locations found</div>';
            resultsEl.classList.add('active');
          }
        } catch (err) {
          console.error(err);
        }
      }, 300);
    });

    resultsEl.addEventListener('click', (e) => {
      const item = e.target.closest('.suggest-item');
      if (!item) return;

      const lat = parseFloat(item.getAttribute('data-lat'));
      const lon = parseFloat(item.getAttribute('data-lon'));
      const name = item.getAttribute('data-name');

      inputEl.value = name;
      resultsEl.classList.remove('active');
      resultsEl.innerHTML = '';

      this.loadWeather(lat, lon, name);
      if (window.telemetryMap) {
        window.telemetryMap.flyToCoordinates(lat, lon, 8);
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!inputEl.contains(e.target) && !resultsEl.contains(e.target)) {
        resultsEl.classList.remove('active');
      }
    });
  }
}

window.weatherController = new WeatherController();
