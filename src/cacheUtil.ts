import { LRUCache } from "lru-cache";
import prom from "prom-client";

const caches = new Map<string, LRUCache<any, any>>();
const current: prom.Gauge<string> = new prom.Gauge<string>({
  name: `cache_current`,
  help: "How many entries are in this cache",
  labelNames: ["name"],
  collect: () => {
    caches.forEach((val, key) => current.labels(key).set(val.size));
  },
});
const max: prom.Gauge<string> = new prom.Gauge<string>({
  name: `cache_max`,
  help: "How how large is the ache",
  labelNames: ["name"],
  collect: () => caches.forEach((val, key) => max.labels(key).set(val.size)),
});
const occ: prom.Gauge<string> = new prom.Gauge<string>({
  name: `cache_occupation`,
  help: "What's the cache occupation",
  labelNames: ["name"],
  collect: () => caches.forEach((val, key) => occ.labels(key).set(val.size)),
});

const cacheHitCounter: prom.Counter<string> = new prom.Gauge<string>({
  name: `cache_hits`,
  help: "Cache hits",
  labelNames: ["name"],
});
const cacheMissCounter: prom.Counter<string> = new prom.Gauge<string>({
  name: `cache_miss`,
  help: "Count cache misses",
  labelNames: ["name"],
});

export function instrument(cache: LRUCache<any, any>, name: string) {
  caches.set(name, cache);
}

export function cacheHit(name: string) {
  cacheHitCounter.labels(name).inc();
}

export function cacheMiss(name: string) {
  cacheMissCounter.labels(name).inc();
}
