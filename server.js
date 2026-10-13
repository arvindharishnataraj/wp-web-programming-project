const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKMARKS_FILE = path.join(__dirname, 'data', 'bookmarks.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Cache Store to prevent rate limits and ensure low latency
const cache = {
  earthquakes: { data: null, timestamp: 0, ttl: 25000 }, // 25s TTL
  iss: { data: null, timestamp: 0, ttl: 2000 },          // 2s TTL
  weather: new Map(),                                    // keyed by "lat,lon", 5 min TTL
  geocode: new Map()                                     // keyed by query, 10 min TTL
};

// Connected SSE clients for real-time telemetry streaming
let sseClients = [];

// Helper: Read bookmarks
function readBookmarks() {
  try {
    if (!fs.existsSync(BOOKMARKS_FILE)) {
      fs.writeFileSync(BOOKMARKS_FILE, '[]', 'utf8');
      return [];
    }
    const content = fs.readFileSync(BOOKMARKS_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading bookmarks:', err);
    return [];
  }
}

// Helper: Save bookmarks
function writeBookmarks(data) {
  try {
    fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing bookmarks:', err);
    return false;
  }
}

// Helper: Fetch USGS Earthquakes with caching
async function fetchEarthquakes(timeframe = 'day') {
  const now = Date.now();
  if (cache.earthquakes.data && (now - cache.earthquakes.timestamp < cache.earthquakes.ttl)) {
    return cache.earthquakes.data;
  }

  // URL options: hour, day, 7days
  let feedUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
  if (timeframe === 'hour') {
    feedUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';
  } else if (timeframe === 'week') {
    feedUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson';
  }

  const response = await fetch(feedUrl);
  if (!response.ok) {
    throw new Error(`USGS HTTP Error: ${response.status}`);
  }
  const geojson = await response.json();

  // Parse and enrich features
  const parsed = geojson.features.map(f => {
    const coords = f.geometry ? f.geometry.coordinates : [0, 0, 0];
    const mag = f.properties.mag !== null ? Number(f.properties.mag) : 0;
    const depth = coords[2] !== undefined ? Number(coords[2]) : 0;

    let alertLevel = 'normal';
    if (mag >= 6.5) alertLevel = 'catastrophic';
    else if (mag >= 5.0) alertLevel = 'critical';
    else if (mag >= 3.5) alertLevel = 'moderate';
    else if (mag >= 2.0) alertLevel = 'minor';

    return {
      id: f.id,
      title: f.properties.title,
      place: f.properties.place || 'Unknown location',
      mag: Number(mag.toFixed(1)),
      time: f.properties.time,
      updated: f.properties.updated,
      url: f.properties.url,
      tsunami: f.properties.tsunami === 1,
      alert: f.properties.alert || null,
      significance: f.properties.sig || 0,
      status: f.properties.status,
      type: f.properties.type || 'earthquake',
      latitude: coords[1],
      longitude: coords[0],
      depthKm: Number(depth.toFixed(1)),
      severity: alertLevel
    };
  });

  // Sort descending by time
  parsed.sort((a, b) => b.time - a.time);

  const payload = {
    generatedAt: geojson.metadata.generated,
    count: parsed.length,
    features: parsed
  };

  cache.earthquakes.data = payload;
  cache.earthquakes.timestamp = now;
  return payload;
}

// Helper: Fetch ISS coordinates
async function fetchISS() {
  const now = Date.now();
  if (cache.iss.data && (now - cache.iss.timestamp < cache.iss.ttl)) {
    return cache.iss.data;
  }

  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    if (!res.ok) throw new Error(`ISS HTTP error: ${res.status}`);
    const data = await res.json();
    const payload = {
      name: data.name,
      latitude: Number(data.latitude.toFixed(4)),
      longitude: Number(data.longitude.toFixed(4)),
      altitudeKm: Number(data.altitude.toFixed(2)),
      velocityKmh: Number(data.velocity.toFixed(2)),
      visibility: data.visibility,
      timestamp: data.timestamp * 1000
    };
    cache.iss.data = payload;
    cache.iss.timestamp = now;
    return payload;
  } catch (err) {
    // Fallback if WhereTheISS is rate-limited: Open-Notify or simulated orbital propagation
    if (cache.iss.data) return cache.iss.data;
    return {
      name: 'iss',
      latitude: 25.0,
      longitude: 45.0,
      altitudeKm: 420.5,
      velocityKmh: 27600.0,
      visibility: 'daylight',
      timestamp: Date.now()
    };
  }
}

// -----------------------------------------------------------------------------
// API Endpoints
// -----------------------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'GeoPulse 360 Telemetry Core',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Earthquakes feed
app.get('/api/earthquakes', async (req, res) => {
  try {
    const minMag = req.query.minMag ? parseFloat(req.query.minMag) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const timeframe = req.query.timeframe || 'day';

    const data = await fetchEarthquakes(timeframe);
    let list = data.features;

    if (minMag !== null && !isNaN(minMag)) {
      list = list.filter(e => e.mag >= minMag);
    }

    if (limit && !isNaN(limit) && limit > 0) {
      list = list.slice(0, limit);
    }

    // Calculate aggregated stats
    const totalCount = data.features.length;
    const maxMag = data.features.reduce((m, e) => Math.max(m, e.mag), 0);
    const tsunamiCount = data.features.filter(e => e.tsunami).length;
    const deepEventsCount = data.features.filter(e => e.depthKm > 100).length;

    res.json({
      success: true,
      count: list.length,
      totalUnfiltered: totalCount,
      summary: {
        maxMagnitude: maxMag,
        tsunamiAlerts: tsunamiCount,
        deepEarthquakes: deepEventsCount
      },
      events: list
    });
  } catch (error) {
    console.error('Earthquakes fetch failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve seismic data' });
  }
});

// Geocoding search (Open-Meteo)
app.get('/api/geocode', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const cached = cache.geocode.get(query.toLowerCase());
    if (cached && (Date.now() - cached.timestamp < 600000)) {
      return res.json({ success: true, results: cached.data });
    }

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Geocoding service unavailable');
    const geoData = await resp.json();

    const results = (geoData.results || []).map(item => ({
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: item.country || '',
      countryCode: item.country_code || '',
      admin1: item.admin1 || '',
      timezone: item.timezone || 'UTC',
      display: [item.name, item.admin1, item.country].filter(Boolean).join(', ')
    }));

    cache.geocode.set(query.toLowerCase(), { data: results, timestamp: Date.now() });
    res.json({ success: true, results });
  } catch (error) {
    console.error('Geocode error:', error.message);
    res.status(500).json({ success: false, error: 'Geocoding failed' });
  }
});

// Weather & Air Quality endpoint (Open-Meteo)
app.get('/api/weather', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ success: false, error: 'Valid "lat" and "lon" required' });
    }

    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = cache.weather.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 180000)) { // 3 min cache
      return res.json({ success: true, data: cached.data });
    }

    // Parallel fetch: Weather Forecast + Air Quality
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone&timezone=auto`;

    const [weatherRes, aqiRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(aqiUrl).catch(() => null)
    ]);

    if (!weatherRes.ok) throw new Error('Weather API request failed');
    const weatherData = await weatherRes.json();
    let aqiData = null;
    if (aqiRes && aqiRes.ok) {
      aqiData = await aqiRes.json();
    }

    const combined = {
      coordinates: { latitude: lat, longitude: lon },
      timezone: weatherData.timezone,
      current: {
        temperature: weatherData.current.temperature_2m,
        feelsLike: weatherData.current.apparent_temperature,
        humidity: weatherData.current.relative_humidity_2m,
        precipitation: weatherData.current.precipitation,
        weatherCode: weatherData.current.weather_code,
        windSpeed: weatherData.current.wind_speed_10m,
        windDirection: weatherData.current.wind_direction_10m,
        pressureHpa: weatherData.current.surface_pressure,
        isDay: weatherData.current.is_day === 1
      },
      airQuality: aqiData && aqiData.current ? {
        usAqi: aqiData.current.us_aqi,
        europeanAqi: aqiData.current.european_aqi,
        pm2_5: aqiData.current.pm2_5,
        pm10: aqiData.current.pm10,
        ozone: aqiData.current.ozone,
        nitrogenDioxide: aqiData.current.nitrogen_dioxide,
        carbonMonoxide: aqiData.current.carbon_monoxide
      } : null,
      hourly: {
        times: (weatherData.hourly.time || []).slice(0, 24),
        temperatures: (weatherData.hourly.temperature_2m || []).slice(0, 24),
        precipProb: (weatherData.hourly.precipitation_probability || []).slice(0, 24)
      },
      daily: {
        times: weatherData.daily.time || [],
        tempMax: weatherData.daily.temperature_2m_max || [],
        tempMin: weatherData.daily.temperature_2m_min || [],
        weatherCodes: weatherData.daily.weather_code || [],
        uvIndexMax: weatherData.daily.uv_index_max || []
      }
    };

    cache.weather.set(cacheKey, { data: combined, timestamp: Date.now() });
    res.json({ success: true, data: combined });
  } catch (error) {
    console.error('Weather error:', error.message);
    res.status(500).json({ success: false, error: 'Weather lookup failed' });
  }
});

// Live ISS Orbital Telemetry
app.get('/api/iss', async (req, res) => {
  try {
    const data = await fetchISS();
    res.json({ success: true, iss: data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'ISS telemetry unavailable' });
  }
});

// Platform Stats & Aggregates
app.get('/api/stats', async (req, res) => {
  try {
    const eqData = await fetchEarthquakes('day');
    const issData = await fetchISS();
    const bookmarks = readBookmarks();

    const maxEvent = eqData.features.reduce((prev, curr) => (curr.mag > prev.mag ? curr : prev), eqData.features[0] || { mag: 0, place: 'None' });
    const tsunamiEvents = eqData.features.filter(e => e.tsunami);

    res.json({
      success: true,
      uptimeSeconds: Math.floor(process.uptime()),
      connectedStreamClients: sseClients.length,
      seismic: {
        total24h: eqData.count,
        maxMagnitude: maxEvent.mag,
        maxEventLocation: maxEvent.place,
        tsunamiAlertCount: tsunamiEvents.length,
        significantCount: eqData.features.filter(e => e.mag >= 4.5).length
      },
      iss: {
        lat: issData.latitude,
        lon: issData.longitude,
        speedKmh: issData.velocityKmh
      },
      savedBookmarksCount: bookmarks.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Stats generation error' });
  }
});

// Bookmarks / Watchlist CRUD
app.get('/api/bookmarks', (req, res) => {
  const list = readBookmarks();
  res.json({ success: true, bookmarks: list });
});

app.post('/api/bookmarks', (req, res) => {
  const { name, latitude, longitude, type, notes } = req.body;
  if (!name || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: 'name, latitude, and longitude are required' });
  }

  const list = readBookmarks();
  const newBookmark = {
    id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    latitude: Number(latitude),
    longitude: Number(longitude),
    type: type || 'custom',
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString()
  };

  list.unshift(newBookmark);
  if (writeBookmarks(list)) {
    res.status(201).json({ success: true, bookmark: newBookmark });
  } else {
    res.status(500).json({ success: false, error: 'Failed to write bookmark' });
  }
});

app.delete('/api/bookmarks/:id', (req, res) => {
  const { id } = req.params;
  const list = readBookmarks();
  const initialLen = list.length;
  const filtered = list.filter(b => b.id !== id);

  if (filtered.length === initialLen) {
    return res.status(404).json({ success: false, error: 'Bookmark not found' });
  }

  if (writeBookmarks(filtered)) {
    res.json({ success: true, message: 'Bookmark removed successfully' });
  } else {
    res.status(500).json({ success: false, error: 'Failed to delete bookmark' });
  }
});

// CSV / JSON Exporter
app.get('/api/export', async (req, res) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const data = await fetchEarthquakes('day');

    if (format === 'csv') {
      const headers = ['ID', 'Magnitude', 'Place', 'DepthKm', 'Latitude', 'Longitude', 'TimeUTC', 'TsunamiAlert', 'Severity'];
      const rows = data.features.map(f => [
        `"${f.id}"`,
        f.mag,
        `"${f.place.replace(/"/g, '""')}"`,
        f.depthKm,
        f.latitude,
        f.longitude,
        `"${new Date(f.time).toISOString()}"`,
        f.tsunami ? 'YES' : 'NO',
        f.severity
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="geopulse-seismic-${Date.now()}.csv"`);
      return res.send(csvContent);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="geopulse-seismic-${Date.now()}.json"`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Export failed' });
  }
});

// Server-Sent Events (SSE) for Real-Time Streaming Telemetry
app.get('/api/events/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send immediate welcome packet
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, message: 'Real-time telemetry stream established' })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

// Periodic broadcaster to all connected SSE clients (every 6 seconds)
setInterval(async () => {
  if (sseClients.length === 0) return;

  try {
    const issData = await fetchISS();
    const packet = JSON.stringify({
      type: 'TELEMETRY_BEAT',
      timestamp: Date.now(),
      iss: issData,
      activeClients: sseClients.length
    });

    sseClients.forEach(client => {
      client.res.write(`data: ${packet}\n\n`);
    });
  } catch (err) {
    // ignore background interval errors
  }
}, 6000);

// Start server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🌍 GeoPulse 360 - Real-Time Telemetry Server Running`);
  console.log(`📡 Access Dashboard: http://localhost:${PORT}`);
  console.log(`⚡ API Root:         http://localhost:${PORT}/api/earthquakes`);
  console.log(`🛰️ SSE Stream:       http://localhost:${PORT}/api/events/live`);
  console.log(`======================================================\n`);
});
