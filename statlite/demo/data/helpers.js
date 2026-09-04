// Small fixture helpers. The rows below stay deliberately close to the
// dashboard's series vocabulary while keeping each example easy to edit.
(function () {
  const MB = 1024 * 1024;
  const GB = 1024 * MB;
  const FIXTURE_REFERENCE_TIME = Date.parse("2026-09-02T18:30:00Z");
  const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
  const RANGE_MILLISECONDS = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000
  };

  function points(rows, includeHost) {
    return rows.map((row) => {
      const point = {
        timestamp: row[0],
        requests: row[1],
        http_404: row[2],
        http_4xx: row[3],
        http_5xx: row[4],
        average_latency_seconds: row[5],
        heap_used_bytes: row[6] == null ? null : row[6] * MB,
        process_cpu_usage: row[7] == null ? null : row[7]
      };
      if (includeHost) {
        point.host_cpu_usage = row[8];
        point.host_memory_used_bytes = row[9] * GB;
        point.host_memory_total_bytes = 16 * GB;
        point.host_disk_used_bytes = row[10] * GB;
        point.host_disk_total_bytes = 160 * GB;
        point.host_disk_usage = row[10] / 160;
      }
      return point;
    });
  }

  function series(pointsForRange) {
    const last = pointsForRange[pointsForRange.length - 1];
    return {
      points: pointsForRange,
      current_host_disk: last && last.host_disk_usage != null
        ? {
            used_bytes: last.host_disk_used_bytes,
            total_bytes: last.host_disk_total_bytes,
            usage: last.host_disk_usage
          }
        : null
    };
  }

  function wobble(seed, span) {
    return (seed * 17 + 11) % (span * 2 + 1) - span;
  }

  function interpolatedRange(pointsForDay) {
    const source = pointsForDay.slice(-3);
    const expanded = [];
    const startTimestamp = FIXTURE_REFERENCE_TIME - RANGE_MILLISECONDS["1h"];
    for (let index = 0; index <= 12; index++) {
      const position = index / 6;
      const leftIndex = Math.min(Math.floor(position), source.length - 2);
      const fraction = position - leftIndex;
      const left = source[leftIndex];
      const right = source[leftIndex + 1];
      const point = {};
      Object.keys(left).forEach((key) => {
        if (key === "timestamp") return;
        const leftValue = left[key];
        const rightValue = right[key];
        if (typeof leftValue !== "number" || typeof rightValue !== "number") {
          point[key] = leftValue;
          return;
        }
        const value = leftValue + (rightValue - leftValue) * fraction;
        point[key] = key === "requests" || key.startsWith("http_") ? Math.round(value) : value;
      });
      point.timestamp = new Date(startTimestamp + index * 5 * 60 * 1000).toISOString();
      expanded.push(point);
    }
    return expanded;
  }

  function oneHourRange(pointsForDay) {
    return interpolatedRange(pointsForDay).map((point, index) => {
      const next = Object.assign({}, point);
      const drift = wobble(index, 2);
      if (typeof next.requests === "number") {
        next.requests = Math.max(0, next.requests + drift);
      }
      if (typeof next.process_cpu_usage === "number") {
        next.process_cpu_usage = Math.max(0, next.process_cpu_usage + drift * 0.002);
      }
      if (typeof next.average_latency_seconds === "number") {
        next.average_latency_seconds = Math.max(0.001, next.average_latency_seconds + drift * 0.0005);
      }
      if (typeof next.heap_used_bytes === "number") {
        next.heap_used_bytes *= 1 + (index % 4) * 0.012;
      }
      if (typeof next.host_cpu_usage === "number") {
        next.host_cpu_usage = Math.max(0, next.host_cpu_usage + drift * 0.003);
      }
      next.http_404 = (index === 2 || index === 3) ? 1 : 0;
      next.http_4xx = index === 4 ? 1 : 0;
      next.http_5xx = index === 6 ? 1 : 0;
      return next;
    });
  }

  // Fixture-calendar day variation. After rebase this is not necessarily
  // the weekday shown on the chart.
  function dayScale(timestamp) {
    const day = new Date(timestamp).getUTCDay();
    if (day === 0) return 0.4;
    if (day === 6) return 0.52;
    if (day === 5) return 1.08;
    if (day === 1) return 0.9;
    return 1;
  }

  function scaleTraffic(point, scale, options) {
    const next = Object.assign({}, point);
    if (typeof next.requests === "number") {
      next.requests = Math.max(0, Math.round(next.requests * scale) + wobble(options.seed, 2));
    }
    if (typeof next.average_latency_seconds === "number") {
      next.average_latency_seconds *= 0.97 + 0.07 * Math.min(scale, 1.2);
    }
    if (typeof next.process_cpu_usage === "number") {
      next.process_cpu_usage = Math.max(0.01, next.process_cpu_usage * Math.max(0.45, scale));
    }
    if (typeof next.heap_used_bytes === "number") {
      next.heap_used_bytes *= 0.96 + 0.06 * Math.min(scale, 1.15);
    }
    if (typeof next.host_cpu_usage === "number") {
      next.host_cpu_usage = Math.max(0.03, next.host_cpu_usage * Math.max(0.5, scale));
    }
    if (typeof next.host_memory_used_bytes === "number") {
      next.host_memory_used_bytes *= 0.98 + 0.03 * Math.min(scale, 1.1);
    }
    if (options.clearErrors) {
      next.http_5xx = 0;
      next.http_4xx = 0;
      next.http_404 = options.stray404 ? 1 : 0;
    } else {
      ["http_404", "http_4xx", "http_5xx"].forEach((key) => {
        if (typeof next[key] === "number") next[key] = Math.round(next[key] * Math.max(scale, 0.5));
      });
      if (options.incidentSpike) {
        next.http_5xx = Math.max(next.http_5xx || 0, 1);
        next.http_4xx = Math.max(next.http_4xx || 0, 1);
      }
    }
    if (options.diskUsed != null && Number.isFinite(next.host_disk_total_bytes)) {
      next.host_disk_used_bytes = options.diskUsed;
      next.host_disk_usage = next.host_disk_used_bytes / next.host_disk_total_bytes;
    }
    return next;
  }

  // Longer views reuse the daily shape, with day-to-day variation, one
  // incident day, and disk that grows toward the current sample instead of repeating.
  function expandedRange(pointsForDay, days, pointsPerDay) {
    const expanded = [];
    const sampleIndexes = [0, 7, 13, 20, 27, 34, 40, 47];
    const span = days * DAY_MILLISECONDS;
    const total = days * pointsPerDay;
    const incidentDay = days <= 7 ? days - 2 : Math.round(days * 0.62);
    const lastDisk = pointsForDay[pointsForDay.length - 1].host_disk_used_bytes;
    const diskStart = Number.isFinite(lastDisk)
      ? lastDisk - (days >= 30 ? 8 * GB : 2 * GB)
      : null;
    for (let index = 0; index < total; index++) {
      const dayIndex = Math.floor(index / pointsPerDay);
      const withinDay = index % pointsPerDay;
      const baseIndex = sampleIndexes[withinDay] == null
        ? Math.round(withinDay * (pointsForDay.length - 1) / (pointsPerDay - 1))
        : Math.min(sampleIndexes[withinDay], pointsForDay.length - 1);
      const progress = index / (total - 1);
      const timestamp = FIXTURE_REFERENCE_TIME - span + progress * span;
      let scale = dayScale(timestamp) * (0.94 + (dayIndex * 13 + 7) % 13 / 100);
      if (days >= 30) scale *= 0.88 + 0.24 * (dayIndex / Math.max(days - 1, 1));
      const point = scaleTraffic(Object.assign({}, pointsForDay[baseIndex], {
        timestamp: new Date(timestamp).toISOString()
      }), scale, {
        seed: index + days,
        clearErrors: dayIndex !== incidentDay,
        stray404: dayIndex !== incidentDay && scale > 0.85 && withinDay === 3 && dayIndex % 3 === 0,
        incidentSpike: dayIndex === incidentDay && withinDay === 2,
        diskUsed: diskStart == null ? null : diskStart + (lastDisk - diskStart) * progress
      });
      expanded.push(point);
    }
    return expanded;
  }

  function ranges(pointsForDay) {
    return {
      "1h": series(oneHourRange(pointsForDay)),
      "24h": series(pointsForDay),
      "7d": series(expandedRange(pointsForDay, 7, 8)),
      "30d": series(expandedRange(pointsForDay, 30, 8))
    };
  }

  function shiftTimestamp(value, offset) {
    if (!value) return value;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? value : new Date(timestamp + offset).toISOString();
  }

  function shiftSeries(seriesValue, offset) {
    if (!seriesValue) return seriesValue;
    seriesValue.points.forEach((point) => {
      point.timestamp = shiftTimestamp(point.timestamp, offset);
    });
    return seriesValue;
  }

  function shiftLatest(latest, offset) {
    if (!latest) return latest;
    latest.timestamp = shiftTimestamp(latest.timestamp, offset);
    if (latest.result) latest.result.process_start_time = shiftTimestamp(latest.result.process_start_time, offset);
    return latest;
  }

  function rebaseFixture(source, sessionNow) {
    const fixture = JSON.parse(JSON.stringify(source));
    const offset = sessionNow.getTime() - FIXTURE_REFERENCE_TIME;
    shiftSeries(fixture.series, offset);
    Object.values(fixture.ranges).forEach((rangeSeries) => shiftSeries(rangeSeries, offset));
    fixture.events.forEach((event) => {
      event.timestamp = shiftTimestamp(event.timestamp, offset);
    });
    fixture.summary.latest = shiftLatest(fixture.summary.latest, offset);
    fixture.summary.latest_restart = shiftTimestamp(fixture.summary.latest_restart, offset);
    fixture.summary.monitor.last_successful_poll_at = shiftTimestamp(fixture.summary.monitor.last_successful_poll_at, offset);
    fixture.summary.monitor.last_poll_at = shiftTimestamp(fixture.summary.monitor.last_poll_at, offset);
    fixture.summary.targets.forEach((target) => {
      target.latest = shiftLatest(target.latest, offset);
    });
    return fixture;
  }

  function isInRange(timestamp, range, sessionNow) {
    const value = Date.parse(timestamp);
    const end = sessionNow.getTime();
    const duration = RANGE_MILLISECONDS[range] || RANGE_MILLISECONDS["24h"];
    return !Number.isNaN(value) && value >= end - duration && value <= end;
  }

  function eventsInRange(events, range, sessionNow) {
    return events.filter((event) => isInRange(event.timestamp, range, sessionNow));
  }

  function restartInRange(summary, range, sessionNow) {
    if (!summary || summary.latest_restart_status !== "found") return null;
    return isInRange(summary.latest_restart, range, sessionNow) ? summary.latest_restart : null;
  }

  function fixture(config) {
    const last = config.points[config.points.length - 1];
    const metrics = Object.assign({}, last);
    delete metrics.timestamp;
    const latest = {
      timestamp: last.timestamp,
      result: Object.assign({}, metrics, config.current)
    };
    const metadata = {
      name: config.name,
      type: config.type,
      endpoint: config.endpoint
    };
    return {
      summary: {
        selected_target: metadata,
        targets: [{ metadata, latest }],
        latest,
        latest_restart_status: config.latestRestart ? "found" : "none",
        latest_restart: config.latestRestart || null,
        monitor: {
          last_successful_poll_at: last.timestamp,
          last_poll_at: last.timestamp,
          consecutive_poll_failures: 0,
          last_poll_error_summary: ""
        }
      },
      series: series(config.points),
      ranges: ranges(config.points),
      events: config.events
    };
  }

  window.STATLITE_DEMO = { eventsInRange, fixture, isInRange, points, rebaseFixture, restartInRange };
  window.STATLITE_DEMO_FIXTURES = window.STATLITE_DEMO_FIXTURES || {};
}());
