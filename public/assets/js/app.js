/* Chart bootstrapping: every <canvas class="chart" data-chart="..."> is turned
 * into a Chart.js chart. The palette mirrors the CSS custom properties so
 * light/dark stay in sync with the stylesheet. */
(function () {
  if (typeof Chart === 'undefined') return;

  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  const SERIES = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v('--series-' + i));

  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  Chart.defaults.color = v('--text-muted');
  Chart.defaults.borderColor = v('--grid');
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = 'rectRounded';
  Chart.defaults.plugins.tooltip.backgroundColor = v('--surface-1');
  Chart.defaults.plugins.tooltip.titleColor = v('--text-primary');
  Chart.defaults.plugins.tooltip.bodyColor = v('--text-secondary');
  Chart.defaults.plugins.tooltip.borderColor = v('--baseline');
  Chart.defaults.plugins.tooltip.borderWidth = 1;

  const hexToRgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  function buildDataset(ds, i, type) {
    const color = ds.color || SERIES[i % SERIES.length];
    const base = {
      label: ds.label,
      data: ds.data,
      borderColor: color,
      backgroundColor: type === 'bar' || type === 'doughnut'
        ? (Array.isArray(ds.colors) ? ds.colors : color)
        : hexToRgba(color, 0.08),
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: color,
      tension: 0.3,
      fill: !!ds.fill,
      yAxisID: ds.axis || 'y',
      borderDash: ds.dashed ? [5, 4] : undefined,
    };
    if (type === 'bar') {
      base.borderWidth = 0;
      base.borderRadius = 4;
      base.borderSkipped = 'start';
      base.maxBarThickness = 26;
    }
    return base;
  }

  document.querySelectorAll('canvas.chart').forEach((canvas) => {
    let cfg;
    try { cfg = JSON.parse(canvas.dataset.chart); } catch (e) { return; }
    const type = cfg.type || 'line';

    if (type === 'doughnut') {
      new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: cfg.labels,
          datasets: [{
            data: cfg.data,
            backgroundColor: cfg.labels.map((_, i) => SERIES[i % SERIES.length]),
            borderColor: v('--surface-1'),
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: { legend: { position: 'right' } },
        },
      });
      return;
    }

    new Chart(canvas, {
      type: type,
      data: {
        labels: cfg.labels,
        datasets: (cfg.datasets || []).map((ds, i) => buildDataset(ds, i, type)),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        stacked: false,
        plugins: {
          legend: { display: (cfg.datasets || []).length > 1, position: 'top', align: 'end' },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: v('--baseline') },
            ticks: { maxTicksLimit: 10, maxRotation: 0 },
          },
          y: {
            beginAtZero: !cfg.inverted,
            reverse: !!cfg.inverted,   /* rank charts: position 1 on top */
            grid: { color: v('--grid') },
            border: { display: false },
            ticks: { maxTicksLimit: 6, callback: (val) => fmtTick(val) },
          },
        },
      },
    });
  });

  function fmtTick(val) {
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(val) >= 1e4) return (val / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return val;
  }
})();
