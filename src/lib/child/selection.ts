// Session storage keeps two tabs free to use different children.
export function localChildId() {
  const selected = sessionStorage.getItem("lumi.local-child") || "default";
  const raw = localStorage.getItem("lumi.children.v1");
  if (!raw) return "default";
  const ids: unknown = JSON.parse(raw);
  return Array.isArray(ids) && ids.includes(selected)
    ? selected
    : Array.isArray(ids) && typeof ids[0] === "string"
      ? ids[0]
      : "default";
}
export function localKey(base: string) {
  const id = localChildId();
  return id === "default" ? base : `${base}.${id}`;
}
