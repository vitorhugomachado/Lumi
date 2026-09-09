"use client";
import { useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import { cloud } from "@/lib/cloud";
import { INTERESTS } from "@/lib/child/profile";
import { loadProfile, saveProfile } from "@/lib/child/storage";
const icons = ["🐾", "♫", "⚽", "🚙", "🦕", "🍌", "🌱", "📖"];
const subscribe = () => () => {};
export function ChildProfileForm() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return ready ? (
    <ProfileForm />
  ) : (
    <p role="status">Carregando perfil local...</p>
  );
}
function ProfileForm() {
  const router = useRouter();
  const [initial] = useState(() => {
    try {
      return { profile: loadProfile(), error: "" };
    } catch {
      return {
        profile: null,
        error:
          "O armazenamento está bloqueado. Permita o armazenamento local para continuar.",
      };
    }
  });
  const [name, setName] = useState(initial.profile?.name ?? "");
  const [age, setAge] = useState(initial.profile?.ageMonths ?? 24);
  const [interests, setInterests] = useState<string[]>(
    initial.profile?.interests ?? [],
  );
  const [words, setWords] = useState(
    initial.profile?.knownWords.join(", ") ?? "",
  );
  const [error, setError] = useState(initial.error);
  const [saving, setSaving] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (!interests.length) {
          setError("Escolha pelo menos um interesse.");
          return;
        }
        setSaving(true);
        try {
          await saveProfile({
            name: name.trim(),
            ageMonths: age,
            interests,
            knownWords: words
              .split(",")
              .map((w) => w.trim())
              .filter(Boolean),
          });
          router.push("/inicio");
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Não foi possível salvar. Tente novamente.",
          );
        } finally {
          setSaving(false);
        }
      }}
    >
      <label htmlFor="name">Como seu pequeno se chama?</label>
      <input
        id="name"
        autoComplete="off"
        placeholder="Só o primeiro nome"
        maxLength={40}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label htmlFor="age">Qual a idade?</label>
      <select
        id="age"
        value={age}
        onChange={(e) => setAge(Number(e.target.value))}
      >
        {Array.from({ length: 36 }, (_, i) => i + 24).map((m) => (
          <option key={m} value={m}>
            {Math.floor(m / 12)} anos
            {m % 12 ? ` e ${m % 12} ${m % 12 === 1 ? "mês" : "meses"}` : ""}
          </option>
        ))}
      </select>
      <fieldset>
        <legend>O que faz os olhinhos brilharem?</legend>
        <p className="hint">Pode escolher mais de um.</p>
        <div className="interest-grid">
          {INTERESTS.map((interest, i) => (
            <button
              className={`interest ${interests.includes(interest) ? "selected" : ""}`}
              key={interest}
              type="button"
              aria-pressed={interests.includes(interest)}
              onClick={() =>
                setInterests((prev) =>
                  prev.includes(interest)
                    ? prev.filter((x) => x !== interest)
                    : [...prev, interest],
                )
              }
            >
              <span aria-hidden="true">{icons[i]}</span>
              {interest}
              {interests.includes(interest) && (
                <span className="check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor="words">
        Palavras que já costuma falar <span className="hint">(opcional)</span>
      </label>
      <input
        id="words"
        placeholder="mamãe, água, bola"
        maxLength={300}
        value={words}
        onChange={(e) => setWords(e.target.value)}
      />
      <p className="hint privacy">
        ♡{" "}
        {cloud.enabled
          ? "O perfil será salvo no servidor e vinculado a este navegador."
          : "O perfil fica somente neste navegador."}
      </p>
      {error && (
        <p role="alert" className="error-box">
          {error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={saving}>
        {saving ? "Salvando…" : "Salvar perfil"} <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
