import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export const SESSION_COOKIE = "lumi_session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await derive(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, encoded] = hash.split(":");
  if (
    !/^[a-f0-9]{32}$/.test(salt ?? "") ||
    !/^[a-f0-9]{128}$/.test(encoded ?? "")
  )
    return false;
  const key = (await derive(password, salt, 64)) as Buffer;
  return timingSafeEqual(key, Buffer.from(encoded, "hex"));
}
export function newSessionToken() {
  return randomBytes(32).toString("hex");
}
export function sessionToken(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export function cookie(token: string, clear = false) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_SECONDS}${process.env.APP_ORIGIN?.startsWith("https:") ? "; Secure" : ""}`;
}
export function validOrigin(
  request: Request,
  configured = process.env.APP_ORIGIN,
) {
  if (!configured) return false;
  try {
    const expected = new URL(configured);
    return (
      expected.origin === configured &&
      request.headers.get("origin") === expected.origin &&
      request.headers.get("sec-fetch-site") !== "cross-site"
    );
  } catch {
    return false;
  }
}
export function validCredentials(
  value: unknown,
): value is {
  email: string;
  password: string;
  action: "register" | "login" | "logout";
} {
  if (!value || typeof value !== "object") return false;
  const x = value as Record<string, unknown>;
  return (
    (x.action === "register" || x.action === "login") &&
    typeof x.email === "string" &&
    x.email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email) &&
    typeof x.password === "string" &&
    x.password.length >= 10 &&
    x.password.length <= 128
  );
}
export function validActivity(
  value: unknown,
): value is { id: string; category: string; word: string; seconds: number } {
  if (!value || typeof value !== "object") return false;
  const x = value as Record<string, unknown>;
  return (
    typeof x.id === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      x.id,
    ) &&
    typeof x.category === "string" &&
    ["sons", "palavras", "animais", "objetos", "historias", "musicas"].includes(
      x.category,
    ) &&
    typeof x.word === "string" &&
    x.word.trim().length > 0 &&
    x.word.length <= 80 &&
    Number.isInteger(x.seconds) &&
    Number(x.seconds) >= 0 &&
    Number(x.seconds) <= 180
  );
}
