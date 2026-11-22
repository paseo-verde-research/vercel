(function () {
  const MIB = 1024 ** 2;
  const GIB = 1024 ** 3;
  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const POLL = 30_000;
  const RANGES = {
    "1h": { duration: HOUR },
    "24h": { duration: DAY, bucket: 5 * MINUTE },
    "7d": { duration: 7 * DAY, bucket: 30 * MINUTE },
    "30d": { duration: 30 * DAY, bucket: 2 * HOUR }
  };

  function mulberry32(seed) {
    return () => {
      let value = seed = (seed + 0x6D2B79F5) | 0;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function localLoad(time, peakHour) {
    const hour = time.getHours() + time.getMinutes() / 60;
    const cycle = (1 + Math.cos((hour - peakHour) * Math.PI / 12)) / 2;
    const weekend = time.getDay() === 0 || time.getDay() === 6;
    return cycle ** 2 * (weekend ? 0.48 : 1);
  }

  const COUNTS = ["requests", "http_404", "http_4xx", "http_5xx"];
  const GAUGES = [
    "heap_used_bytes", "process_cpu_usage", "host_cpu_usage", "host_memory_used_bytes",
    "host_memory_total_bytes", "host_disk_used_bytes", "host_disk_total_bytes", "host_disk_usage"
  ];

  function bucketSeries(start, width, host) {
    const gauges = host ? GAUGES : GAUGES.slice(0, 2);
    const fields = COUNTS.concat(gauges);
    const sums = new Float64Array(fields.length);
    const counts = new Uint16Array(fields.length);
    const points = [];
    let bucket;
    let weightedLatency = 0;
    let latencyRequests = 0;

    function flush() {
      if (bucket === undefined) return;
      const point = { timestamp: new Date(bucket).toISOString() };
      fields.forEach((key, index) => {
        if (counts[index]) {
          point[key] = index < COUNTS.length ? sums[index] : sums[index] / counts[index];
        }
      });
      point.average_latency_seconds = latencyRequests ? weightedLatency / latencyRequests : null;
      points.push(point);
      bucket = undefined;
      sums.fill(0);
      counts.fill(0);
      weightedLatency = 0;
      latencyRequests = 0;
    }

    return {
      add(time, metrics) {
        if (time < start) return;
        const aligned = Math.max(start, Math.floor(time / width) * width);
        if (bucket !== aligned) {
          flush();
          bucket = aligned;
        }
        for (let index = 0; index < fields.length; index++) {
          const value = metrics[fields[index]];
          if (value != null) {
            sums[index] += value;
            counts[index]++;
          }
        }
        if (metrics.average_latency_seconds != null && metrics.requests > 0) {
          weightedLatency += metrics.average_latency_seconds * metrics.requests;
          latencyRequests += metrics.requests;
        }
      },
      finish() {
        flush();
        return points;
      }
    };
  }

  function timeline(config, now) {
    const random = mulberry32(config.seed);
    const noise = () => (random() + random() + random() - 1.5) * 2;
    const phase = config.pollSecond * 1000;
    const end = Math.floor((now.getTime() - phase) / POLL) * POLL + phase;
    const start = end - RANGES["30d"].duration;
    const restartPoll = end - config.restartHoursAgo * HOUR;
    const processStart = Number.isFinite(restartPoll) ? restartPoll - 13_000 : start - 6 * DAY;
    const incident = end - config.incidentHoursAgo * HOUR;
    const slowStarts = (config.slowHoursAgo || []).map((hours) =>
      end - Math.round(hours * HOUR / POLL) * POLL
    );
    const idleHeap = config.heapMiB;
    let heap = idleHeap;
    let heapFloor = idleHeap;
    let gcThreshold = config.gcMiB;
    let cpuLoad = 0;
    const nativePoints = [];
    const nativeStart = end - RANGES["1h"].duration;
    let restart = null;
    const rollups = Object.fromEntries(Object.entries(RANGES)
      .filter(([, settings]) => settings.bucket)
      .map(([range, { duration, bucket }]) =>
        [range, bucketSeries(end - duration, bucket, config.host)]));
    const buckets = Object.values(rollups);
    const metrics = {};
    const localTime = new Date(start);
    let load = 0;
    let loadUntil = start;

    for (let time = start; time <= end; time += POLL) {
      const age = time - restartPoll;
      // Failed polls have no metric sample to add to the dashboard series.
      if (age === -2 * POLL || age === -POLL) continue;

      const warming = age >= 0 && age < 18 * MINUTE ? Math.exp(-age / (5 * MINUTE)) : 0;
      if (config.peakHour != null && time >= loadUntil) {
        localTime.setTime(time);
        load = localLoad(localTime, config.peakHour);
        loadUntil = Math.floor(time / MINUTE) * MINUTE + MINUTE;
      }
      const expected = (config.baseRequests + config.peakRequests * load) *
        (1 + 0.10 * noise()) * (1 - 0.75 * warming);
      const requests = Math.max(0, Math.round(expected + Math.sqrt(expected) * noise()));
      cpuLoad += (requests / (config.baseRequests + config.peakRequests) - cpuLoad) * 0.23;

      let gc = false;
      if (config.gcMiB) {
        if (age === 0) {
          heap = idleHeap * 0.49;
          heapFloor = heap;
        } else {
          heapFloor = Math.min(idleHeap + 16, heapFloor + (heapFloor < idleHeap ? 0.65 : 0.0004));
          heap = Math.max(heapFloor, heap) + config.allocationMiB * (0.65 + 1.35 * load + 0.16 * noise());
          if (heap >= heapFloor + gcThreshold) {
            heap = heapFloor + 4 * random();
            gcThreshold = config.gcMiB * (0.8 + 0.4 * random());
            gc = true;
          }
        }
      } else {
        heap = idleHeap + 0.18 * noise();
      }

      const inIncident = time >= incident && time < incident + 5 * MINUTE;
      const http404 = requests > 0 && random() < config.probeChance ? 1 : 0;
      const http5xx = Math.min(requests - http404,
        inIncident ? 1 + Math.floor(random() * 3) : 0);
      const http4xx = requests > http404 + http5xx && random() < config.probeChance / 4 ? 1 : 0;

      const slow = slowStarts.some((start) => time >= start && time < start + 3 * MINUTE);
      metrics.requests = requests;
      metrics.http_404 = http404;
      metrics.http_4xx = http4xx;
      metrics.http_5xx = http5xx;
      metrics.average_latency_seconds = requests > 0 ? Math.max(1, config.latencyMs +
        5 * load + (3 + 14 / Math.sqrt(requests)) * noise() +
        37 * slow + 24 * inIncident + 55 * warming) / 1000 : null;
      metrics.heap_used_bytes = Math.round(heap * MIB);
      metrics.process_cpu_usage = Math.max(0.004, config.baseCPU + config.loadCPU * cpuLoad +
        0.013 * noise() + 0.032 * gc + 0.21 * warming);
      if (config.host) {
        const days = (time - start) / DAY;
        const disk = 38.52 + 0.068 * days - 0.08 * Math.floor(days / 4);
        metrics.host_cpu_usage = 0.086 + 0.013 * noise();
        metrics.host_memory_used_bytes = Math.round((0.9 + 0.00875 * noise()) * GIB);
        metrics.host_memory_total_bytes = 2 * GIB;
        metrics.host_disk_used_bytes = Math.round(disk * GIB);
        metrics.host_disk_total_bytes = 80 * GIB;
        metrics.host_disk_usage = metrics.host_disk_used_bytes / metrics.host_disk_total_bytes;
      }
      for (const bucket of buckets) bucket.add(time, metrics);

      if (age === 0) restart = new Date(time).toISOString();
      if (time >= nativeStart) {
        nativePoints.push({ timestamp: new Date(time).toISOString(), ...metrics });
      }
    }
    return { nativePoints, rollups, processStart, restart };
  }

  function series(points, last) {
    return {
      points,
      current_host_disk: last.host_disk_usage == null ? null : {
        used_bytes: last.host_disk_used_bytes,
        total_bytes: last.host_disk_total_bytes,
        usage: last.host_disk_usage
      }
    };
  }

  function isInRange(timestamp, range, sessionNow) {
    const value = Date.parse(timestamp);
    const end = sessionNow.getTime();
    const { duration } = RANGES[range] || RANGES["24h"];
    return value >= end - duration && value <= end;
  }

  function eventsInRange(events, range, sessionNow) {
    return events.filter((event) => isInRange(event.timestamp, range, sessionNow));
  }

  function restartInRange(summary, range, sessionNow) {
    if (!summary || summary.latest_restart_status !== "found") return null;
    return isInRange(summary.latest_restart, range, sessionNow) ? summary.latest_restart : null;
  }

  function fixture(config, now) {
    const { nativePoints, rollups, processStart, restart } = timeline(config, now);
    const last = nativePoints.at(-1);
    const ranges = Object.fromEntries(Object.keys(RANGES).map((range) =>
      [range, series(rollups[range]?.finish() ?? nativePoints, last)]
    ));
    const { timestamp, ...metrics } = last;
    const latest = {
      timestamp,
      status: "ok",
      result: {
        ...metrics,
        health_status: "UP",
        db_health_status: "UP",
        process_start_time: new Date(processStart).toISOString()
      }
    };
    const metadata = { name: config.name, type: config.type, endpoint: config.endpoint };
    const monitor = {
      last_successful_poll_at: timestamp,
      last_poll_at: timestamp,
      consecutive_poll_failures: 0,
      last_poll_error_summary: ""
    };
    return {
      summary: {
        selected_target: metadata,
        targets: [{ metadata, status: monitor, latest }],
        latest,
        latest_restart_status: restart ? "found" : "none",
        latest_restart: restart,
        monitor
      },
      series: ranges["24h"],
      ranges,
      events: restart ? [{
        timestamp: restart,
        severity: "warning",
        type: "restart_detected",
        metric_key: "",
        message: "process.start.time changed"
      }] : []
    };
  }

  window.STATLITE_DEMO = { eventsInRange, fixture, restartInRange };
  window.STATLITE_DEMO_TARGETS = {};
}());
