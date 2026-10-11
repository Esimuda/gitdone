export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getSql } = await import("./lib/db/sql");
    await getSql();
  }
}
