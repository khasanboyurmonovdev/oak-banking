/** The server's single source of "now". The domain never reads the clock itself. */
export function now(): Date {
  return new Date();
}
