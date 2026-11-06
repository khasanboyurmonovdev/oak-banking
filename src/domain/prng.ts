/** Small, pure, seedable random source used by the seed generator. */

/** 32-bit FNV-1a hash of a string. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: returns a generator of floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** True with probability `p`. */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
};

export function createRng(seed: string): Rng {
  const next = mulberry32(hashString(seed));
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    chance: (p) => next() < p,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new RangeError("Cannot pick from an empty list");
      return items[int(0, items.length - 1)];
    },
  };
}

const REFERENCE_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Deterministic, fictional bank reference derived from an id: "OAK-7F3K2Q". */
export function referenceFor(id: string): string {
  const next = mulberry32(hashString(id));
  let code = "";
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[Math.floor(next() * REFERENCE_ALPHABET.length)];
  return `OAK-${code}`;
}
