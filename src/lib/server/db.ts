import { Pool, type PoolClient } from "pg";
const globalDb = globalThis as unknown as { lumiPool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("Database unavailable");
  if (!globalDb.lumiPool) {
    globalDb.lumiPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 10000,
    });
    globalDb.lumiPool.on("error", () =>
      console.error("Database pool connection interrupted."),
    );
  }
  return globalDb.lumiPool;
}
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
