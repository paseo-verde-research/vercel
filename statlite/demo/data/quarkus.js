window.STATLITE_DEMO_TARGETS.quarkus = {
  name: "catalog-api-prod",
  type: "quarkus",
  endpoint: "http://catalog-api-prod:8080/q/metrics",
  seed: 5927,
  pollSecond: 19,
  baseRequests: 9,
  peakRequests: 51,
  peakHour: 16,
  latencyMs: 18,
  heapMiB: 174,
  gcMiB: 34,
  allocationMiB: 1.2,
  baseCPU: 0.014,
  loadCPU: 0.065,
  probeChance: 0.013,
  recentErrorRate: 0.20,
  slowHoursAgo: [4.65]
};
