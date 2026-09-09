import { isChildProfile, type ChildProfile } from "./profile";
const KEY = "lumi.profile.v1";
export function loadProfile(): ChildProfile | null {
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
  localStorage.setItem(KEY, JSON.stringify(profile));
}
export function clearProfile() {
  localStorage.removeItem(KEY);
}
