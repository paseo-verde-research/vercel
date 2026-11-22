window.STATLITE_DEMO_TARGETS.statlite = {
  name: "statlite-self",
  type: "statlite-metrics",
  endpoint: "http://127.0.0.1:9090/statlite/metrics",
  seed: 1621,
  pollSecond: 26,
  baseRequests: 5,
  peakRequests: 0,
  latencyMs: 8,
  heapMiB: 15,
  baseCPU: 0.009,
  loadCPU: 0.006,
  probeChance: 0.001,
  host: true
};
