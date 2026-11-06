/**
 * Server configuration, validated once on first use rather than at import,
 * so `next build` never needs runtime secrets.
 */
import { z } from "zod";

const DEV_SESSION_SECRET = "insecure-dev-only-session-secret-never-use-in-production";

const emptyAsUndefined = (value: unknown) => (value === "" ? undefined : value);

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_PATH: z.preprocess(emptyAsUndefined, z.string().default("./data/oak.db")),
  SESSION_SECRET: z.preprocess(
    emptyAsUndefined,
    z.string().min(32, "must be at least 32 characters").optional(),
  ),
  SESSION_TTL_HOURS: z.preprocess(emptyAsUndefined, z.coerce.number().int().min(1).max(720).default(72)),
  MAX_SESSIONS: z.preprocess(emptyAsUndefined, z.coerce.number().int().min(1).max(100_000).default(500)),
});

export type Env = {
  databasePath: string;
  sessionSecret: string;
  sessionTtlHours: number;
  maxSessions: number;
};

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ");
    throw new Error(`Invalid server environment: ${issues}`);
  }
  const env = result.data;
  let sessionSecret = env.SESSION_SECRET;
  if (!sessionSecret) {
    if (env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is required in production (at least 32 characters).");
    }
    // The proxy, route handlers and instrumentation are separate bundles with
    // their own module state, so the "warn once" flag lives on globalThis.
    const flags = globalThis as typeof globalThis & { __oakDevSecretWarned?: boolean };
    if (!flags.__oakDevSecretWarned) {
      flags.__oakDevSecretWarned = true;
      console.warn("[oak] SESSION_SECRET is not set: using an insecure development-only secret.");
    }
    sessionSecret = DEV_SESSION_SECRET;
  }
  cached = {
    databasePath: env.DATABASE_PATH,
    sessionSecret,
    sessionTtlHours: env.SESSION_TTL_HOURS,
    maxSessions: env.MAX_SESSIONS,
  };
  return cached;
}
