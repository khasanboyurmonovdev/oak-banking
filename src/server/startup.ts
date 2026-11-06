import { getEnv } from "./env";

/**
 * Validates the environment at server start. In production a bad environment
 * stops the process instead of leaving a server up that only answers 500s.
 */
export function assertEnvironment(): void {
  try {
    getEnv();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") throw error;
    console.error(`[oak] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
