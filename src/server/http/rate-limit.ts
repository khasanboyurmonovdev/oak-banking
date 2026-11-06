/**
 * In-memory token bucket. State lives in this process only: with several
 * server processes or replicas each would enforce its own limit, and a restart
 * resets every bucket. That is acceptable for this single-container demo; a
 * shared store (e.g. Redis) would be needed to scale out.
 */

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Bucket = { tokens: number; updatedAt: number };

export class TokenBucketLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly clock: () => number = () => performance.now(),
    private readonly maxKeys = 10_000,
  ) {}

  take(key: string): RateLimitDecision {
    const time = this.clock();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: time };
    bucket.tokens = Math.min(this.capacity, bucket.tokens + ((time - bucket.updatedAt) / 1000) * this.refillPerSecond);
    bucket.updatedAt = time;

    // Re-insert so Map order tracks recency; drop the stalest key when full.
    this.buckets.delete(key);
    this.buckets.set(key, bucket);
    if (this.buckets.size > this.maxKeys) {
      const stalest = this.buckets.keys().next().value;
      if (stalest !== undefined) this.buckets.delete(stalest);
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true };
    }
    return { allowed: false, retryAfterSeconds: Math.ceil((1 - bucket.tokens) / this.refillPerSecond) };
  }
}

/** Mutations: bursts of 20, then one every 2 seconds, per session (or IP). */
export const mutationLimiter = new TokenBucketLimiter(20, 0.5);

/**
 * Trusted only behind the loopback-bound deployment: Nginx overwrites
 * `X-Forwarded-For` with `$remote_addr`, so the first value is the real peer.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
