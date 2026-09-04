// This file owns the dependency-free StatLite dashboard behavior.

const state = {
  range: "24h",
  target: "spring",
  charts: {},
  fixtures: {},
  sessionNow: null
};

const palette = {
  requests: "#60a5fa",
  latency: "#2fd36b",
  heap: "#60a5fa",
  cpu: "#2fd36b",
  total: "#f59e0b",
  http404: "#f59e0b",
  http4xx: "#a78bfa",
  http5xx: "#ef4444",
  grid: "rgba(148, 163, 184, 0.14)",
  ticks: "#8b949e",
  text: "#e5e7eb"
};

const lineStyle = {
  borderWidth: 3,
  pointRadius: 2,
  pointHoverRadius: 5,
  pointHitRadius: 8
};

function attachInteractions() {
  document.querySelectorAll("[data-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.range = button.dataset.range;
      renderRangeSelection();
      updateURL();
      renderFixture();
    });
  });

  document.getElementById("target-select").addEventListener("change", (event) => {
    state.target = event.target.value;
    updateURL();
    renderFixture();
  });

  document.querySelectorAll(".help").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = button.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
      document.querySelectorAll(".help.open").forEach((item) => {
        if (item !== button) closeHelp(item);
      });
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".help.open").forEach(closeHelp);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(".help.open").forEach(closeHelp);
    }
  });
}

function renderRangeSelection() {
  document.querySelectorAll("[data-range]").forEach((button) => {
    const active = button.dataset.range === state.range;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function closeHelp(button) {
  button.classList.remove("open");
  button.setAttribute("aria-expanded", "false");
}

function buildCharts() {
  state.charts.requests = new Chart(document.getElementById("requests-chart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Requests", unit: "requests", data: [], borderColor: palette.requests, backgroundColor: "rgba(96, 165, 250, 0.12)", ...lineStyle, tension: 0.25, spanGaps: false }] },
    options: chartOptions()
  });
  state.charts.errors = new Chart(document.getElementById("errors-chart"), {
    type: "line",
    data: { labels: [], datasets: [
      { label: "404", unit: "responses", data: [], borderColor: palette.http404, ...lineStyle, tension: 0.25, spanGaps: false },
      { label: "4xx", unit: "responses", data: [], borderColor: palette.http4xx, ...lineStyle, tension: 0.25, spanGaps: false },
      { label: "5xx", unit: "responses", data: [], borderColor: palette.http5xx, ...lineStyle, tension: 0.25, spanGaps: false }
    ] },
    options: chartOptions()
  });
  state.charts.latency = new Chart(document.getElementById("latency-chart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Latency", unit: "ms", data: [], borderColor: palette.latency, backgroundColor: "rgba(47, 211, 107, 0.12)", ...lineStyle, tension: 0.25, spanGaps: false }] },
    options: latencyOptions()
  });
  state.charts.runtime = new Chart(document.getElementById("runtime-chart"), {
    type: "line",
    data: { labels: [], datasets: [
      { label: "Runtime memory MB", unit: "mb", data: [], borderColor: palette.heap, ...lineStyle, yAxisID: "y", tension: 0.25, spanGaps: false },
      { label: "Process CPU", unit: "percent", data: [], borderColor: palette.cpu, ...lineStyle, yAxisID: "y1", tension: 0.25, spanGaps: false }
    ] },
    options: runtimeOptions()
  });
  state.charts.hostRuntime = new Chart(document.getElementById("host-runtime-chart"), {
    type: "line",
    data: { labels: [], datasets: [
      { label: "RAM used", unit: "gb", data: [], borderColor: palette.heap, ...lineStyle, yAxisID: "y", tension: 0.25, spanGaps: false },
      { label: "RAM total", unit: "gb", data: [], borderColor: palette.total, ...lineStyle, yAxisID: "y", tension: 0.25, spanGaps: false },
      { label: "Host CPU", unit: "percent", data: [], borderColor: palette.cpu, ...lineStyle, yAxisID: "y1", tension: 0.25, spanGaps: false }
    ] },
    options: resourceOptions()
  });
  state.charts.hostDisk = resourceChart("host-disk-chart", "Disk");
}

function resourceChart(id, label) {
  return new Chart(document.getElementById(id), {
    type: "line",
    data: { labels: [], datasets: [
      { label: label + " used", unit: "gb", data: [], borderColor: palette.heap, ...lineStyle, yAxisID: "y", tension: 0.25, spanGaps: false },
      { label: label + " total", unit: "gb", data: [], borderColor: palette.total, ...lineStyle, yAxisID: "y", tension: 0.25, spanGaps: false },
      { label: label + " usage", unit: "percent", data: [], borderColor: palette.cpu, ...lineStyle, yAxisID: "y1", tension: 0.25, spanGaps: false }
    ] },
    options: resourceOptions()
  });
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: true, labels: { boxWidth: 32, boxHeight: 8, usePointStyle: true, pointStyle: "line", color: palette.text } },
      tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ": " + formatValue(ctx.parsed.y, ctx.dataset.unit) } }
    },
    scales: {
      x: { ticks: { color: palette.ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: palette.ticks, precision: 0 }, grid: { color: palette.grid } }
    }
  };
}

function latencyOptions() {
  const options = chartOptions();
  options.scales = {
    x: { ticks: { color: palette.ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
    y: { beginAtZero: true, title: { display: true, text: "ms", color: palette.ticks }, ticks: { color: palette.ticks }, grid: { color: palette.grid } }
  };
  return options;
}

function runtimeOptions() {
  const options = chartOptions();
  options.scales = {
    x: { ticks: { color: palette.ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
    y: { beginAtZero: true, position: "left", title: { display: true, text: "MB", color: palette.ticks }, ticks: { color: palette.ticks }, grid: { color: palette.grid } },
    y1: { beginAtZero: true, position: "right", title: { display: true, text: "%", color: palette.ticks }, ticks: { color: palette.ticks }, grid: { drawOnChartArea: false } }
  };
  return options;
}

function resourceOptions() {
  const options = chartOptions();
  options.scales = {
    x: { ticks: { color: palette.ticks, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
    y: { beginAtZero: true, position: "left", title: { display: true, text: "GB", color: palette.ticks }, ticks: { color: palette.ticks }, grid: { color: palette.grid } },
    y1: { beginAtZero: true, max: 100, position: "right", title: { display: true, text: "%", color: palette.ticks }, ticks: { color: palette.ticks }, grid: { drawOnChartArea: false } }
  };
  return options;
}

function selectedFixture() {
  return state.fixtures[state.target] || state.fixtures.spring;
}

function updateURL() {
  const params = new URLSearchParams(window.location.search);
  if (state.target) params.set("target", state.target);
  params.set("range", state.range);
  const next = window.location.pathname + "?" + params.toString();
  if (next !== window.location.pathname + window.location.search) {
    window.history.replaceState(null, "", next);
  }
}

function renderFixture() {
  const fixture = selectedFixture();
  const targets = Object.entries(state.fixtures).map(([key, item]) => ({
    metadata: Object.assign({ demo_key: key }, item.summary.selected_target),
    latest: item.summary.latest
  }));
  const summary = Object.assign({}, fixture.summary, { targets });
  renderSummary(summary);
  renderSeries(fixture.ranges[state.range] || fixture.series);
  renderEvents(window.STATLITE_DEMO.eventsInRange(fixture.events, state.range, state.sessionNow));
  document.getElementById("latest-json").textContent = JSON.stringify(fixture.summary.latest || {}, null, 2);
}

function renderSummary(summary) {
  const latest = summary.latest || {};
  const result = latest.result || {};
  const monitor = summary.monitor || {};
  const selected = summary.selected_target || {};
  const targets = summary.targets || [];
  renderTargetContext(targets, selected);
  renderFooterSummary(targets, state.sessionNow);
  setPill("health", result.health_status);
  setPill("db-health", result.db_health_status);
  setText("process-start", formatDateTime(result.process_start_time));
  renderRestart(summary);
  setText("last-success", formatDateTime(monitor.last_successful_poll_at));
  setText("failures", String(monitor.consecutive_poll_failures || 0));
  renderPollStatus(monitor);
}

function renderFooterSummary(targets, now) {
  const ok = targets.filter((target) => {
    const health = (((target.latest || {}).result || {}).health_status) || "";
    return statusTone(health) === "ok";
  }).length;
  setText("footer-targets", String(targets.length));
  setText("footer-up", String(ok));
  setText("footer-refresh", now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
}

function renderPollStatus(monitor) {
  const status = document.getElementById("poll-status-state");
  const time = document.getElementById("poll-status-time");
  const error = document.getElementById("poll-error");
  const failed = (monitor.consecutive_poll_failures || 0) > 0;
  const when = formatDateTime(monitor.last_poll_at);

  if (failed) {
    status.textContent = "Failed";
    status.className = "poll-status-state bad";
    time.textContent = " · " + when;
    const summary = monitor.last_poll_error_summary || "Poll failed";
    error.textContent = summary;
    error.title = summary;
    error.hidden = false;
    return;
  }

  status.textContent = monitor.last_poll_at ? "Successful" : "Not yet polled";
  status.className = "poll-status-state ok";
  time.textContent = monitor.last_poll_at ? " · " + when : "";
  error.textContent = "";
  error.title = "";
  error.hidden = true;
}

function renderRestart(summary) {
  const restart = window.STATLITE_DEMO.restartInRange(summary, state.range, state.sessionNow);
  if (!restart) {
    setText("restart-detected", "None");
    return;
  }
  switch (summary.latest_restart_status) {
    case "found":
      setText("restart-detected", formatDateTime(restart));
      break;
    case "none":
      setText("restart-detected", "None");
      break;
    case "invalid_range":
      setText("restart-detected", "Invalid range");
      break;
    case "unavailable":
      setText("restart-detected", "Unavailable");
      break;
    default:
      setText("restart-detected", formatDateTime(summary.latest_restart));
  }
}

function renderTargetContext(targets, selected) {
  const select = document.getElementById("target-select");
  const name = selected.name || "Unavailable";
  const endpoint = selected.endpoint || "Endpoint unavailable";
  const multiple = targets.length > 1;
  const selectedSummary = targets.find((target) => (target.metadata || {}).name === selected.name) || {};
  const selectedHealth = (((selectedSummary.latest || {}).result || {}).health_status) || "";
  const targetStatus = document.getElementById("target-status");
  const targetStatusLabel = statusLabel(selectedHealth);

  targetStatus.className = "target-status " + statusTone(selectedHealth);
  targetStatus.title = targetStatusLabel;
  targetStatus.setAttribute("aria-label", targetStatusLabel);
  document.getElementById("target-name").textContent = name;
  document.getElementById("target-name").classList.toggle("hidden", multiple);
  document.getElementById("target-endpoint").textContent = endpoint;
  document.getElementById("target-endpoint").title = endpoint;
  document.getElementById("target-type").textContent = selected.type || "target";
  document.getElementById("target-type-tooltip").textContent = targetTypeHelp(selected.type);
  document.getElementById("runtime-tooltip").textContent = runtimeHelp(selected.type);
  select.classList.toggle("hidden", !multiple);

  if (!multiple) return;

  select.innerHTML = "";
  targets.forEach((target) => {
    const metadata = target.metadata || {};
    const health = (((target.latest || {}).result || {}).health_status) || "";
    const option = document.createElement("option");
    option.value = metadata.demo_key || metadata.name || "";
    option.selected = metadata.name === selected.name;
    option.textContent = (metadata.name || "Unnamed target") + "  " + statusPrefix(health);
    select.appendChild(option);
  });
}

function renderSeries(series) {
  const points = series.points || [];
  const labels = points.map((point) => formatTick(point.timestamp));
  updateChart(state.charts.requests, labels, [points.map((point) => point.requests)]);
  updateChart(state.charts.errors, labels, [
    points.map((point) => point.http_404),
    points.map((point) => point.http_4xx),
    points.map((point) => point.http_5xx)
  ]);
  updateChart(state.charts.latency, labels, [points.map((point) => point.average_latency_seconds == null ? null : point.average_latency_seconds * 1000)]);
  updateChart(state.charts.runtime, labels, [
    points.map((point) => point.heap_used_bytes == null ? null : point.heap_used_bytes / 1024 / 1024),
    points.map((point) => point.process_cpu_usage == null ? null : point.process_cpu_usage * 100)
  ]);
  updateChart(state.charts.hostRuntime, labels, [
    points.map((point) => bytesToGB(point.host_memory_used_bytes)),
    points.map((point) => bytesToGB(point.host_memory_total_bytes)),
    points.map((point) => point.host_cpu_usage == null ? null : point.host_cpu_usage * 100)
  ]);
  updateChart(state.charts.hostDisk, labels, [
    points.map((point) => bytesToGB(point.host_disk_used_bytes)),
    points.map((point) => bytesToGB(point.host_disk_total_bytes)),
    points.map((point) => point.host_disk_usage == null ? null : point.host_disk_usage * 100)
  ]);

  const capabilities = detectCapabilities(points);
  setSectionVisible("application-section", capabilities.application);
  setSectionVisible("process-section", capabilities.process);
  setSectionVisible("host-section", capabilities.host);
  setSectionVisible("host-runtime-chart-card", capabilities.hostCPU || capabilities.hostMemory);
  setSectionVisible("host-disk-chart-card", capabilities.hostDisk);
  setNote("requests-note", capabilities.requests);
  setNote("errors-note", capabilities.errors);
  setNote("latency-note", capabilities.latency);
  setCurrentResourceNote("host-disk-note", series.current_host_disk, "Disk");
}

function detectCapabilities(points) {
  const requests = points.some((point) => point.requests != null);
  const errors = points.some((point) => point.http_404 != null || point.http_4xx != null || point.http_5xx != null);
  const latency = points.some((point) => point.average_latency_seconds != null);
  const process = points.some((point) => point.heap_used_bytes != null || point.process_cpu_usage != null);
  const hostCPU = points.some((point) => point.host_cpu_usage != null);
  const hostMemory = points.some((point) => point.host_memory_used_bytes != null || point.host_memory_total_bytes != null);
  const hostDisk = points.some(validDiskPoint);
  return { requests, errors, latency, process, hostCPU, hostMemory, hostDisk, application: requests || errors || latency, host: hostCPU || hostMemory || hostDisk };
}

function setSectionVisible(id, visible) {
  document.getElementById(id).hidden = !visible;
}

function validDiskPoint(point) {
  return Number.isFinite(point.host_disk_usage) &&
    Number.isFinite(point.host_disk_used_bytes) &&
    Number.isFinite(point.host_disk_total_bytes) &&
    point.host_disk_usage >= 0 && point.host_disk_usage <= 1 &&
    point.host_disk_used_bytes >= 0 && point.host_disk_total_bytes > 0 &&
    point.host_disk_used_bytes <= point.host_disk_total_bytes;
}

function setCurrentResourceNote(id, point, label) {
  const note = document.getElementById(id);
  note.textContent = formatCurrentResource(point, label);
}

function formatCurrentResource(point, label) {
  if (!point) return "No data";
  return label + ": " + formatBytes(point.used_bytes) + " / " + formatBytes(point.total_bytes) + " · " + formatValue(point.usage * 100, "percent");
}

function bytesToGB(value) {
  return value == null ? null : value / 1024 / 1024 / 1024;
}

function updateChart(chart, labels, values) {
  chart.data.labels = labels;
  values.forEach((datasetValues, index) => {
    chart.data.datasets[index].data = datasetValues;
  });
  chart.update();
}

function renderEvents(events) {
  const root = document.getElementById("events");
  root.innerHTML = "";
  if (!events || events.length === 0) {
    root.innerHTML = '<div class="empty">No recent events</div>';
    return;
  }
  events.forEach((event) => root.appendChild(createEventRow(event)));
}

function createEventRow(event) {
  const row = document.createElement("div");
  row.className = "event";
  row.innerHTML = '<div class="event-time"></div><div class="event-kind"></div><div class="event-message"></div>';
  row.children[0].textContent = formatDateTime(event.timestamp);
  row.children[1].textContent = event.severity + " / " + event.type;
  row.children[2].textContent = event.metric_key ? event.metric_key + ": " + event.message : event.message;
  return row;
}

function setPill(id, value) {
  document.getElementById(id).innerHTML = pillHTML(value);
}

function pillHTML(value) {
  const text = value || "Unknown";
  return '<span class="pill ' + statusTone(text) + '">' + escapeHTML(text) + '</span>';
}

function statusTone(value) {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "UP" || normalized === "OK") return "ok";
  if (normalized === "DOWN" || normalized === "ERROR") return "bad";
  return "warn";
}

function statusPrefix(value) {
  const tone = statusTone(value);
  if (tone === "ok") return "\u{1F7E2} UP";
  if (tone === "bad") return "\u{1F534} DOWN";
  return "\u{26AA} UNKNOWN";
}

function statusLabel(value) {
  const normalized = String(value || "").toUpperCase();
  if (!normalized) return "Target health unknown";
  return "Target health: " + normalized;
}

function targetTypeHelp(value) {
  switch (String(value || "").toLowerCase()) {
  case "spring":
    return "Monitors a Spring Boot application through its Actuator endpoint.";
  case "quarkus":
    return "Monitors a Quarkus application through its Quarkus metrics endpoint.";
  case "statlite-metrics":
    return "Monitors an app that exposes metrics in StatLite’s standard format.";
  default:
    return "Collector details are unavailable for this target type.";
  }
}

function runtimeHelp(value) {
  const help = "Process CPU usage and current managed runtime heap or allocator usage.";
  if (String(value || "").toLowerCase() === "spring") {
    return help + " For this Spring Boot target, Runtime memory is current JVM heap usage.";
  }
  return help;
}

function setText(id, value) {
  document.getElementById(id).textContent = value || "Unknown";
}

function setNote(id, available) {
  document.getElementById(id).textContent = available ? "" : "No data";
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function formatDateTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatTick(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (state.range === "30d" || state.range === "7d") {
    return date.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit" });
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatValue(value, unit) {
  if (value == null || !Number.isFinite(value)) return "Unknown";
  if (unit === "ms") return value.toFixed(0) + " ms";
  if (unit === "seconds") return value.toFixed(3) + " s";
  if (unit === "percent") return value.toFixed(1) + "%";
  if (unit === "mb") return value.toFixed(1) + " MB";
  if (unit === "gb") return value.toFixed(1) + " GB";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatBytes(value) {
  if (value == null || !Number.isFinite(value)) return "Unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return (unit === 0 ? String(Math.round(size)) : size.toFixed(1)) + " " + units[unit];
}

function initializeFromURL() {
  const params = new URLSearchParams(window.location.search);
  const target = params.get("target");
  if (target && state.fixtures[target]) {
    state.target = target;
  } else if (target) {
    const match = Object.entries(state.fixtures).find(([, fixture]) => fixture.summary.selected_target.name === target);
    if (match) state.target = match[0];
  }
  if (["1h", "24h", "7d", "30d"].includes(params.get("range"))) state.range = params.get("range");
  renderRangeSelection();
}

function initDashboard() {
  state.sessionNow = new Date();
  state.fixtures = Object.fromEntries(Object.entries(window.STATLITE_DEMO_FIXTURES).map(([key, fixture]) => [
    key,
    window.STATLITE_DEMO.rebaseFixture(fixture, state.sessionNow)
  ]));
  attachInteractions();
  initializeFromURL();
  buildCharts();
  updateURL();
  renderFixture();
}

if (typeof document !== "undefined") initDashboard();
