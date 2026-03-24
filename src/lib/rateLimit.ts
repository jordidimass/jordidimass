// Simple in-memory sliding-window rate limiter.
// Per-IP: 10 requests per 60 seconds.
// Works in both Node and Edge runtimes (no external deps).

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;

const store = new Map<string, number[]>();

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (store.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    store.set(ip, timestamps);
    return false; // rate limited
  }

  timestamps.push(now);
  store.set(ip, timestamps);
  return true; // allowed
}
