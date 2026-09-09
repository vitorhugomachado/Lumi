export const INTERESTS = [
  "Animais",
  "Música",
  "Bola",
  "Carros",
  "Dinossauros",
  "Comida",
  "Natureza",
  "Histórias",
] as const;
export type ChildProfile = {
  name: string;
  ageMonths: number;
  interests: string[];
  knownWords: string[];
};
export function isChildProfile(value: unknown): value is ChildProfile {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<ChildProfile>;
  return (
    typeof p.name === "string" &&
    p.name.trim().length > 0 &&
    p.name.length <= 40 &&
    Number.isInteger(p.ageMonths) &&
    p.ageMonths! >= 24 &&
    p.ageMonths! <= 59 &&
    Array.isArray(p.interests) &&
    p.interests.length > 0 &&
    p.interests.length <= 8 &&
    p.interests.every(
      (i) =>
        typeof i === "string" &&
        INTERESTS.includes(i as (typeof INTERESTS)[number]),
    ) &&
    Array.isArray(p.knownWords) &&
    p.knownWords.length <= 30 &&
    p.knownWords.every((w) => typeof w === "string" && w.length <= 40)
  );
}
