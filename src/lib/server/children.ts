import { db, transaction } from "./db";
import { ApiError } from "./http";

export async function ensureChild(owner: string) {
  return transaction(async (client) => {
    await client.query("SELECT id FROM lumi_accounts WHERE id=$1 FOR UPDATE", [
      owner,
    ]);
    const found = await client.query(
      "SELECT id FROM lumi_profiles WHERE account_id=$1 ORDER BY created_at,id LIMIT 1",
      [owner],
    );
    if (found.rows[0]) return found.rows[0].id as string;
    const made = await client.query(
      "INSERT INTO lumi_profiles(account_id) VALUES($1) RETURNING id",
      [owner],
    );
    return made.rows[0].id as string;
  });
}

// A selected ID is only a selector. Ownership always comes from the session.
export async function childId(request: Request, owner: string) {
  const id = request.headers.get("x-lumi-child");
  if (!id) return ensureChild(owner);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new ApiError(400, "Perfil inválido.");
  const found = await db().query(
    "SELECT id FROM lumi_profiles WHERE account_id=$1 AND id=$2",
    [owner, id],
  );
  if (!found.rows[0])
    throw new ApiError(
      404,
      "Este perfil não está disponível. Escolha outro na área da família.",
    );
  return id;
}
