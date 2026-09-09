import { localKey } from "./child/selection";
import { cloud, requestJson } from "./cloud";
export type Activity = {
  category: string;
  word: string;
  seconds: number;
  at: string;
};
const KEY = "lumi.activities.v1";
export function readActivities(): Activity[] {
  if (cloud.enabled) return cloud.activities;
  try {
    const data = JSON.parse(localStorage.getItem(localKey(KEY)) || "[]");
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
  if (cloud.enabled) {
    const version = cloud.version;
    return requestJson("/api/activities", "POST", {
      id: crypto.randomUUID(),
      category,
      word,
      seconds,
    }).then((result) => {
      if (version === cloud.version)
        cloud.activities = [...cloud.activities, result.activity].slice(-500);
    });
  }
  const list = readActivities();
  list.push({ category, word, seconds, at: new Date().toISOString() });
  localStorage.setItem(localKey(KEY), JSON.stringify(list.slice(-500)));
}
export function clearActivities() {
  if (cloud.enabled) {
    const version = cloud.version;
    return requestJson("/api/activities", "DELETE").then(() => {
      if (version === cloud.version) cloud.activities = [];
    });
  }
  localStorage.removeItem(localKey(KEY));
}
