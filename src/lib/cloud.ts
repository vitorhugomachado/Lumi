import type { ChildProfile } from "./child/profile";
import type { Activity } from "./activity";
export const cloud = {
  enabled: false,
  version: 0,
  profile: null as ChildProfile | null,
  activities: [] as Activity[],
};
export async function requestJson(
  path: string,
  method = "GET",
  data?: unknown,
) {
  const version = cloud.version;
  const response = await fetch(path, {
    method,
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await response
    .json()
    .catch(() => ({ error: "Resposta inválida do servidor." }));
  if (!response.ok) {
    if (response.status === 401 && version === cloud.version)
      window.dispatchEvent(new Event("lumi-session-expired"));
    throw new Error(
      result.error || "Não foi possível salvar. Tente novamente.",
    );
  }
  return result;
}
export async function hydrateCloud() {
  const version = ++cloud.version;
  const [profile, activities] = await Promise.all([
    requestJson("/api/profile"),
    requestJson("/api/activities"),
  ]);
  if (version !== cloud.version)
    throw new Error("Sua sessão mudou. Entre novamente.");
  cloud.profile = profile.profile;
  cloud.activities = activities.activities;
}
export async function logoutCloud() {
  if (!cloud.enabled) return;
  await requestJson("/api/account", "POST", { action: "logout" });
  cloud.version++;
  cloud.profile = null;
  cloud.activities = [];
  window.dispatchEvent(new Event("lumi-session-expired"));
}
