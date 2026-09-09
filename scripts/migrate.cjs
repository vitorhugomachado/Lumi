/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
const fs = require("node:fs");
const path = require("node:path");
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for migrations.");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 15000,
  });
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(78264001)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS lumi_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of fs
      .readdirSync(path.join(__dirname, "../migrations"))
      .filter((x) => x.endsWith(".sql"))
      .sort()) {
      const done = await client.query(
        "SELECT name FROM lumi_migrations WHERE name=$1",
        [name],
      );
      if (done.rowCount) continue;
      await client.query(
        fs.readFileSync(path.join(__dirname, "../migrations", name), "utf8"),
      );
      await client.query("INSERT INTO lumi_migrations(name) VALUES($1)", [
        name,
      ]);
      console.log("Applied migration:", name);
    }
    await client.query("COMMIT");
    console.log("Database migrations ready.");
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Database migration failed. Check database connectivity and migration permissions.",
  );
  process.exitCode = 1;
});
