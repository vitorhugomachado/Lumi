export type Activity = {
  category: string;
  word: string;
  seconds: number;
  at: string;
};
const KEY = "lumi.activities.v1";
export function readActivities(): Activity[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data)
      ? data
          .filter(
            (x) =>
              x &&
              typeof x.category === "string" &&
              typeof x.word === "string" &&
              Number.isFinite(x.seconds) &&
              x.seconds >= 0 &&
              typeof x.at === "string" &&
              Number.isFinite(Date.parse(x.at)),
          )
          .slice(-500)
      : [];
  } catch {
    return [];
  }
}
export function recordActivity(
  category: string,
  word: string,
  seconds: number,
) {
  const list = readActivities();
  list.push({ category, word, seconds, at: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(list.slice(-500)));
}
export function clearActivities() {
  localStorage.removeItem(KEY);
}
