import { cloud, requestJson, type ChildSummary } from "../cloud";
import { isChildProfile, type ChildProfile } from "./profile";

function localIds(): string[] {
  const ids: unknown = JSON.parse(
    localStorage.getItem("lumi.children.v1") || '["default"]',
  );
  return Array.isArray(ids)
    ? ids.filter((x): x is string => typeof x === "string").slice(0, 6)
    : ["default"];
}
export async function listChildren(): Promise<ChildSummary[]> {
  if (cloud.enabled) return (await requestJson("/api/children/")).children;
  return localIds().map((id) => {
    const key = id === "default" ? "lumi.profile.v1" : `lumi.profile.v1.${id}`;
    const profile = JSON.parse(localStorage.getItem(key) || "null");
    return {
      id,
      name: profile?.name ?? null,
      ageMonths: profile?.ageMonths ?? null,
    };
  });
}
export function selectChild(id: string, destination = "/inicio/") {
  sessionStorage.setItem(
    cloud.enabled ? `lumi.child.${cloud.user!.id}` : "lumi.local-child",
    id,
  );
  // Full navigation disposes the microphone, outstanding UI state and caches.
  window.location.assign(destination);
}
export async function addChild(profile: ChildProfile) {
  if (!isChildProfile(profile)) throw new Error("Confira os dados do perfil.");
  if (cloud.enabled)
    return (await requestJson("/api/children/", "POST", profile)).id as string;
  const ids = localIds();
  if (ids.length >= 6) throw new Error("Você pode guardar até 6 perfis.");
  const id = crypto.randomUUID();
  localStorage.setItem(`lumi.profile.v1.${id}`, JSON.stringify(profile));
  localStorage.setItem("lumi.children.v1", JSON.stringify([...ids, id]));
  return id;
}
export async function removeChild(id: string) {
  if (cloud.enabled) {
    await requestJson("/api/children/", "DELETE", { confirm: true }, id);
    if (id === cloud.childId)
      sessionStorage.removeItem(`lumi.child.${cloud.user!.id}`);
  } else {
    const suffix = id === "default" ? "" : `.${id}`;
    localStorage.removeItem(`lumi.profile.v1${suffix}`);
    localStorage.removeItem(`lumi.activities.v1${suffix}`);
    const remaining = localIds().filter((x) => x !== id);
    localStorage.setItem(
      "lumi.children.v1",
      JSON.stringify(remaining.length ? remaining : ["default"]),
    );
    if (sessionStorage.getItem("lumi.local-child") === id)
      sessionStorage.removeItem("lumi.local-child");
  }
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- A full reload clears profile-scoped state and active audio.
  window.location.assign("/perfis/");
}
