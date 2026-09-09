import { SAFETY_LIMITS } from "./rules";
export type ParentAccess = Readonly<{ unlocked: boolean; message: string }>;
export const LOCKED_ACCESS: ParentAccess = Object.freeze({
  unlocked: false,
  message: "",
});

/** A local interaction barrier, not authentication. Never persisted in storage. */
export class ParentAccessStore {
  private value: ParentAccess = LOCKED_ACCESS;
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  getSnapshot = () => this.value;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private emit(value: ParentAccess) {
    this.value = Object.freeze(value);
    this.listeners.forEach((fn) => fn());
  }
  unlock() {
    clearTimeout(this.timer);
    this.emit({ unlocked: true, message: "" });
    this.timer = setTimeout(
      () => this.lock("Para continuar, chame um responsável."),
      SAFETY_LIMITS.parentAccessMs,
    );
  }
  lock(message = "") {
    clearTimeout(this.timer);
    this.emit({ unlocked: false, message });
  }
}

export function makeChallenge() {
  const values = crypto.getRandomValues(new Uint32Array(2));
  return { a: 13 + (values[0] % 24), b: 7 + (values[1] % 13) };
}
export function checkChallenge(
  challenge: { a: number; b: number },
  answer: string,
) {
  return (
    /^\d{1,3}$/.test(answer.trim()) &&
    Number(answer) === challenge.a + challenge.b
  );
}
