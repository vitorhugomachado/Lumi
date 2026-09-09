import { cloud, requestJson } from "../cloud";
import { isChildProfile, type ChildProfile } from "./profile";
const KEY = "lumi.profile.v1";
export function loadProfile(): ChildProfile | null {
  if (cloud.enabled) return cloud.profile;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isChildProfile(value) ? value : null;
  } catch {
    return null;
  }
}
export function saveProfile(profile: ChildProfile) {
  if (!isChildProfile(profile)) throw new Error("Confira os dados do perfil.");
  if (cloud.enabled) {
    const version = cloud.version;
    return requestJson("/api/profile", "PUT", profile).then((result) => {
      if (version === cloud.version) cloud.profile = result.profile;
    });
  }
  localStorage.setItem(KEY, JSON.stringify(profile));
}
export function clearProfile() {
  if (cloud.enabled) {
    const version = cloud.version;
    return requestJson("/api/profile", "DELETE").then(() => {
      if (version === cloud.version) cloud.profile = null;
    });
  }
  localStorage.removeItem(KEY);
}
