import { db } from "@/lib/server/db";
import { json } from "@/lib/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!process.env.DATABASE_URL)
    return json({ status: "ok", database: "disabled" });
  try {
    await db().query("SELECT 1 FROM lumi_migrations LIMIT 1");
    return json({ status: "ok", database: "connected" });
  } catch {
    return json({ status: "unavailable" }, 503);
  }
}
