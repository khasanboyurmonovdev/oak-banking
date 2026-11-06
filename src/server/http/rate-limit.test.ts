import { describe, expect, it } from "vitest";
import { clientIp, TokenBucketLimiter } from "./rate-limit";

describe("TokenBucketLimiter", () => {
  it("allows a burst up to capacity, then refills over time", () => {
    let time = 0;
    const limiter = new TokenBucketLimiter(3, 0.5, () => time);
    expect([1, 2, 3].map(() => limiter.take("a").allowed)).toEqual([true, true, true]);
    expect(limiter.take("a")).toEqual({ allowed: false, retryAfterSeconds: 2 });

    time += 1_000; // half a token
    expect(limiter.take("a")).toEqual({ allowed: false, retryAfterSeconds: 1 });
    time += 1_000;
    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(false);
  });

  it("keeps a separate bucket per key", () => {
    const limiter = new TokenBucketLimiter(1, 1, () => 0);
    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(false);
    expect(limiter.take("b").allowed).toBe(true);
  });

  it("never refills past capacity and bounds the number of tracked keys", () => {
    let time = 0;
    const limiter = new TokenBucketLimiter(2, 1, () => time, 2);
    limiter.take("a");
    time += 60_000;
    expect([1, 2, 3].map(() => limiter.take("a").allowed)).toEqual([true, true, false]);

    limiter.take("b");
    limiter.take("c"); // evicts "a", the stalest key
    expect(limiter.take("a").allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the first forwarded address", () => {
    expect(clientIp(new Request("http://x/", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } }))).toBe(
      "203.0.113.7",
    );
    expect(clientIp(new Request("http://x/", { headers: { "x-real-ip": "198.51.100.2" } }))).toBe("198.51.100.2");
    expect(clientIp(new Request("http://x/"))).toBe("unknown");
  });
});
