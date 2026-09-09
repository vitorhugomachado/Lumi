import type { ChildProfile } from "./child/profile";
import type { Activity } from "./activity";
export type ChildSummary = {
  id: string;
  name: string | null;
  ageMonths: number | null;
};
export const cloud = {
  childId: null as string | null,
  enabled: false,
  user: null as {
    id: string;
    email: string | null;
    is_guest: boolean;
    display_name?: string | null;
    email_verified_at?: string | null;
  } | null,
  version: 0,
  profile: null as ChildProfile | null,
  activities: [] as Activity[],
};
export async function requestJson(
  path: string,
  method = "GET",
  data?: unknown,
  selectedChild = cloud.childId,
) {
  const version = cloud.version;
  const response = await fetch(path, {
    method,
    headers: {
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
      ...(selectedChild ? { "x-lumi-child": selectedChild } : {}),
    },
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
  const list = await requestJson("/api/children/", "GET", undefined, null);
  if (version !== cloud.version) throw new Error("Sua sessão mudou.");
  let remembered: string | null = null;
  try {
    remembered = sessionStorage.getItem(`lumi.child.${cloud.user!.id}`);
  } catch {
    /* Default profile remains usable if preferences are blocked. */
  }
  cloud.childId =
    list.children.find((child: ChildSummary) => child.id === remembered)?.id ??
    list.children[0]?.id ??
    null;
  const [profile, activities] = await Promise.all([
    requestJson("/api/profile"),
    requestJson("/api/activities"),
  ]);
  if (version !== cloud.version)
    throw new Error("Sua sessão mudou. Atualize a página para continuar.");
  cloud.profile = profile.profile;
  cloud.activities = activities.activities;
}
export async function logoutCloud() {
  if (!cloud.enabled) return;
  await requestJson("/api/account", "POST", { action: "logout" });
  cloud.version++;
  cloud.user = null;
  cloud.childId = null;
  cloud.profile = null;
  cloud.activities = [];
  window.dispatchEvent(new Event("lumi-session-expired"));
}
