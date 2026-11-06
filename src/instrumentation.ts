/** Runs once when the server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnvironment } = await import("./server/startup");
    assertEnvironment();
  }
}
