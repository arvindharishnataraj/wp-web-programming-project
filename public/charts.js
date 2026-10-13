/**
 * GeoPulse 360 - Chart Controller
 * Manages Chart.js visual telemetry with dynamic theming.
 */
class TelemetryCharts {
  constructor() {
    this.magChart = null;
    this.weatherChart = null;
    this.depthChart = null;
  }

  isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  getThemeColors() {
    const dark = this.isDark();
    return {
      text: dark ? '#94a3b8' : '#475569',
      grid: dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)',
      accent: dark ? '#00f3ff' : '#0284c7',
      accentGlow: dark ? 'rgba(0, 243, 255, 0.2)' : 'rgba(2, 132, 199, 0.2)',
      warning: '#f59e0b',
      danger: '#ef4444',
      purple: '#a855f7',
      green: '#10b981'
    };
  }

  initMagnitudeChart(canvasId, events) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const colors = this.getThemeColors();

    // Group events by magnitude bracket
    const brackets = {
      'Micro (<2.5)': 0,
      'Minor (2.5-3.9)': 0,
      'Light (4.0-4.9)': 0,
      'Moderate (5.0-5.9)': 0,
      'Strong (6.0+)': 0
    };

    events.forEach(e => {
      if (e.mag < 2.5) brackets['Micro (<2.5)']++;
      else if (e.mag < 4.0) brackets['Minor (2.5-3.9)']++;
      else if (e.mag < 5.0) brackets['Light (4.0-4.9)']++;
      else if (e.mag < 6.0) brackets['Moderate (5.0-5.9)']++;
      else brackets['Strong (6.0+)']++;
    });

    if (this.magChart) {
      this.magChart.destroy();
    }

    this.magChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(brackets),
        datasets: [{
          label: 'Earthquake Count (24h)',
          data: Object.values(brackets),
          backgroundColor: [
            'rgba(16, 185, 129, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(168, 85, 247, 0.85)'
          ],
          borderColor: [
            '#10b981',
            '#3b82f6',
            '#f59e0b',
            '#ef4444',
            '#a855f7'
          ],
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#00f3ff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(0, 243, 255, 0.3)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.text, font: { size: 10 } }
          },
          y: {
            grid: { color: colors.grid },
            ticks: { color: colors.text, precision: 0 }
          }
        }
      }
    });
  }

  initDepthChart(canvasId, events) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const colors = this.getThemeColors();

    // Take top 40 most recent events for depth vs mag visualization
    const points = events.slice(0, 45).map(e => ({
      x: e.depthKm,
      y: e.mag,
      title: e.place
    }));

    if (this.depthChart) {
      this.depthChart.destroy();
    }

    this.depthChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Events (Depth vs Mag)',
          data: points,
          backgroundColor: colors.accent,
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const pt = context.raw;
                return `${pt.title}: Mag ${pt.y} @ ${pt.x} km depth`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Depth (km)', color: colors.text, font: { size: 11 } },
            grid: { color: colors.grid },
            ticks: { color: colors.text }
          },
          y: {
            title: { display: true, text: 'Magnitude', color: colors.text, font: { size: 11 } },
            grid: { color: colors.grid },
            ticks: { color: colors.text }
          }
        }
      }
    });
  }

  updateWeatherHourlyChart(canvasId, hourlyData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !hourlyData || !hourlyData.times) return;

    const colors = this.getThemeColors();

    const labels = hourlyData.times.slice(0, 16).map(t => {
      const d = new Date(t);
      return `${d.getHours()}:00`;
    });
    const temps = hourlyData.temperatures.slice(0, 16);
    const rain = (hourlyData.precipProb || []).slice(0, 16);

    if (this.weatherChart) {
      this.weatherChart.destroy();
    }

    this.weatherChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: temps,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y'
          },
          {
            label: 'Rain Probability (%)',
            data: rain,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            fill: false,
            tension: 0.35,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 2,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: colors.text, font: { size: 10 } }
          }
        },
        scales: {
          x: {
            grid: { color: colors.grid },
            ticks: { color: colors.text, font: { size: 9 } }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: colors.grid },
            ticks: { color: colors.text, callback: v => `${v}°` }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#38bdf8', callback: v => `${v}%` },
            min: 0,
            max: 100
          }
        }
      }
    });
  }

  refreshTheme(events, weatherHourly) {
    if (events) {
      this.initMagnitudeChart('magnitudeChart', events);
      this.initDepthChart('depthChart', events);
    }
    if (weatherHourly) {
      this.updateWeatherHourlyChart('weatherChart', weatherHourly);
    }
  }
}

window.telemetryCharts = new TelemetryCharts();
