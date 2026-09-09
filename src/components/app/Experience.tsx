"use client";
import { cloud } from "@/lib/cloud";
import { Icon } from "./Icon";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Mascot } from "./Mascot";
import {
  readActivities,
  recordActivity,
  clearActivities,
  type Activity,
} from "@/lib/activity";
import { clearProfile } from "@/lib/child/storage";

export const screens = [
  "boas-vindas",
  "publico",
  "objetivos",
  "inicio",
  "familia",
  "sons",
  "palavras",
  "animais",
  "objetos",
  "historias",
  "musicas",
  "progresso",
  "conquistas",
  "responsaveis",
  "configuracoes",
];
const categories = [
  ["sons", "🔤", "Sons e Letras"],
  ["palavras", "🐨", "Palavras"],
  ["animais", "🐸", "Animais"],
  ["objetos", "🧸", "Objetos"],
  ["musicas", "♫", "Músicas"],
  ["historias", "📖", "Histórias"],
];
export function Back({ href = "/inicio" }: { href?: string }) {
  return (
    <Link className="back-round" href={href} aria-label="Voltar">
      ←
    </Link>
  );
}
export function Experience({ screen }: { screen: string }) {
  return <Surface screen={screen} />;
}
function Surface({ screen }: { screen: string }) {
  const router = useRouter();
  const [selection, setSelection] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  if (screen === "splash")
    return (
      <main className="ref-screen splash">
        <div className="star-field" aria-hidden="true">
          ✦　　✧　　✦
          <br />
          　✧　　　　　✦
        </div>
        <h1 className="lumi-logo">
          Lumi<span>★</span>
        </h1>
        <p>
          Pequenas palavras
          <br />
          Grandes conexões
        </p>
        <Mascot />
        <Link className="button primary bottom-action" href="/inicio">
          Começar <span>→</span>
        </Link>
      </main>
    );
  if (screen === "boas-vindas")
    return (
      <main className="ref-screen welcome-screen">
        <Mascot />
        <h1>Olá!</h1>
        <p>
          Eu sou o Lumi!
          <br />
          Vamos aprender e brincar
          <br />
          com a sua voz?
        </p>
        <div className="page-dots" aria-label="Etapa 1 de 4">
          ● ○ ○ ○
        </div>
        <Link className="button primary bottom-action" href="/inicio">
          Vamos lá!
        </Link>
      </main>
    );
  if (screen === "publico" || screen === "objetivos") {
    const audience = screen === "publico";
    const options = audience
      ? [
          "Criança|2 a 6 anos|🧒",
          "Criança|6 a 10 anos|👧",
          "Uso terapêutico|Com fonoaudiólogo|👩‍⚕️",
        ]
      : [
          "Estimular a fala",
          "Ampliar o vocabulário",
          "Melhorar a pronúncia",
          "Desenvolver a comunicação",
          "Usar em suporte terapêutico",
        ];
    return (
      <main className="ref-screen setup-screen">
        <Back href={audience ? "/boas-vindas" : "/publico"} />
        <h1>
          {audience ? (
            <>
              Para quem
              <br />é o app?
            </>
          ) : (
            <>
              Qual o principal
              <br />
              objetivo?
            </>
          )}
        </h1>
        <p>
          {audience
            ? "Escolha quem vai usar o Lumi para personalizarmos a experiência."
            : "Você pode escolher mais de um."}
        </p>
        <div className="choice-list">
          {options.map((option, i) => {
            const [label, sub, emoji] = option.split("|");
            return (
              <button
                key={option}
                className={`choice ${selection.includes(option) ? "selected" : ""}`}
                aria-pressed={selection.includes(option)}
                onClick={() => {
                  setMessage("");
                  setSelection(
                    audience
                      ? [option]
                      : selection.includes(option)
                        ? selection.filter((x) => x !== option)
                        : [...selection, option],
                  );
                }}
              >
                {emoji ? (
                  <span className="avatar-emoji">{emoji}</span>
                ) : (
                  <span className="check-mark">
                    {selection.includes(option) ? "✓" : ""}
                  </span>
                )}
                <span>
                  <strong>{label}</strong>
                  {sub && <small>{sub}</small>}
                </span>
                <span>
                  {audience ? "›" : selection.includes(option) ? "✓" : ""}
                </span>
                {audience && i > 0 && (
                  <span className="sr-only">
                    Ainda não disponível nesta versão
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {message && (
          <p role="status" className="fine">
            {message}
          </p>
        )}
        <button
          className="button primary bottom-action"
          disabled={!selection.length}
          onClick={() => {
            if (audience && selection[0] !== options[0]) {
              setMessage(
                "Esta versão oferece brincadeiras para 2 a 4 anos, testadas por adultos. As outras faixas e o uso terapêutico ainda não estão disponíveis.",
              );
              return;
            }
            try {
              localStorage.setItem(
                audience ? "lumi.audience" : "lumi.goals",
                JSON.stringify(selection),
              );
              router.push(audience ? "/objetivos" : "/onboarding");
            } catch {
              setMessage("Permita o armazenamento local para continuar.");
            }
          }}
        >
          Continuar
        </button>
      </main>
    );
  }
  if (screen === "inicio")
    return (
      <main className="ref-screen home-screen">
        <div className="home-hero">
          <Link
            className="back-round"
            href="/familia"
            aria-label="Área da família"
          >
            ♙
          </Link>
          <h1>
            Olá, pequeno(a)
            <br />
            explorador(a)!
          </h1>
          <p>
            Hoje é um ótimo dia
            <br />
            para soltar a sua voz!
          </p>
          <Mascot />
        </div>
        <Link className="play-banner" href="/conversar">
          <span className="play-symbol">▶</span>
          <span>
            <strong>Vamos brincar?</strong>
            <small>Uma conversa com o Lumi</small>
          </span>
          <span>›</span>
        </Link>
        <div className="category-grid">
          {categories.map(([route, emoji, label], i) => (
            <Link
              className={`category pastel-${i}`}
              key={route}
              href={`/${route}`}
            >
              <span>{emoji}</span>
              <strong>{label}</strong>
            </Link>
          ))}
        </div>
        <p className="fine centered">Cada tentativa é uma descoberta ✦</p>
      </main>
    );
  if (["sons", "palavras", "animais", "objetos"].includes(screen))
    return <Library category={screen} />;
  if (screen === "historias") return <Stories />;
  if (screen === "musicas") return <Music />;
  if (screen === "progresso" || screen === "familia")
    return <Progress family={screen === "familia"} />;
  if (screen === "conquistas") return <Achievements />;
  if (screen === "responsaveis" || screen === "configuracoes")
    return <Settings parents={screen === "responsaveis"} />;
  return (
    <main className="ref-screen">
      <Back />
      <h1>Vamos explorar?</h1>
      <Link href="/inicio">Voltar ao início</Link>
    </main>
  );
}

const animals = [
  ["🐶", "Cachorro", "Pets", "Au au!"],
  ["🐱", "Gato", "Pets", "Miau!"],
  ["🐮", "Vaca", "Fazenda", "Muuu!"],
  ["🦁", "Leão", "Selva", "Roaaar!"],
  ["🐸", "Sapo", "Selva", "Coax coax!"],
  ["🐤", "Pato", "Fazenda", "Quá quá!"],
  ["🐘", "Elefante", "Selva", "Olha a tromba!"],
  ["🐵", "Macaco", "Selva", "Uh uh ah ah!"],
  ["🐦", "Passarinho", "Pets", "Piu piu!"],
  ["🐬", "Golfinho", "Marinhos", "O golfinho pula!"],
];
const words = [
  ["🍎", "Maçã", "Frutas", "Maçã. Ma-çã!"],
  ["⚽", "Bola", "Brinquedos", "Bola grande!"],
  ["💧", "Água", "Dia a dia", "Água fresquinha!"],
  ["🍌", "Banana", "Frutas", "Banana amarela!"],
  ["🏠", "Casa", "Dia a dia", "Uma casa!"],
  ["🚗", "Carro", "Brinquedos", "Carro. Brum brum!"],
];
function Library({ category }: { category: string }) {
  const [filter, setFilter] = useState("Todos");
  const [chosen, setChosen] = useState<string[] | null>(null);
  const title = categories.find((x) => x[0] === category)?.[2] ?? "Palavras";
  const filters =
    category === "sons"
      ? ["Todos", "Vogais", "Consoantes", "Sílabas"]
      : category === "animais"
        ? ["Todos", "Fazenda", "Selva", "Pets", "Marinhos"]
        : ["Todos", "Frutas", "Brinquedos", "Dia a dia"];
  const items =
    category === "sons"
      ? (filter === "Sílabas"
          ? ["MA", "PA", "BA", "LA", "MO", "PI"]
          : ["A", "E", "I", "O", "U", "P", "B", "M", "T", "D", "F", "S", "R"]
        ).map((x) => [
          x,
          x,
          "AEIOU".includes(x)
            ? "Vogais"
            : x.length === 2
              ? "Sílabas"
              : "Consoantes",
          x,
        ])
      : category === "animais"
        ? animals
        : category === "objetos"
          ? words.filter((x) => x[2] !== "Frutas")
          : words;
  if (chosen)
    return (
      <Practice
        item={chosen}
        category={category}
        onBack={() => setChosen(null)}
      />
    );
  return (
    <main className="ref-screen library">
      <Back />
      <div className="section-heading">
        <h1>{title}</h1>
        <p>
          {category === "sons"
            ? "Vamos fazer os sons juntos!"
            : category === "animais"
              ? "Quem faz esse som?"
              : "Vamos dizer juntos?"}
        </p>
        <Mascot />
      </div>
      <div className="filter-tabs" aria-label="Filtrar atividades">
        {filters.map((x) => (
          <button
            key={x}
            aria-pressed={filter === x}
            onClick={() => setFilter(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <div className={`tile-grid ${category === "sons" ? "letters" : ""}`}>
        {items
          .filter((x) => filter === "Todos" || x[2] === filter)
          .map(([emoji, label, group, sound], i) => (
            <button
              className={`activity-tile pastel-${i % 6}`}
              key={label}
              onClick={() => setChosen([emoji, label, group, sound])}
            >
              <span>{emoji}</span>
              {category !== "sons" && <strong>{label}</strong>}
            </button>
          ))}
      </div>
      {!items.some((x) => filter === "Todos" || x[2] === filter) && (
        <p className="panel">
          Nenhuma atividade nesta categoria. Escolha outra aba.
        </p>
      )}
    </main>
  );
}

function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef({ value: 0 });
  useEffect(() => {
    const token = generation.current;
    const hide = () => {
      if (document.hidden) {
        token.value++;
        window.speechSynthesis?.cancel();
        setSpeaking(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      token.value++;
      window.speechSynthesis?.cancel();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  function stop() {
    generation.current.value++;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }
  function speak(text: string) {
    setError("");
    if (!("speechSynthesis" in window)) {
      setError("A leitura em voz alta não está disponível neste navegador.");
      return;
    }
    let muted = false;
    try {
      muted = localStorage.getItem("lumi.sound") === "off";
    } catch {}
    if (muted) {
      setError("O som está desativado nas configurações.");
      return;
    }
    stop();
    const current = generation.current.value;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 0.8;
    utterance.onend = () => {
      if (current === generation.current.value) setSpeaking(false);
    };
    utterance.onerror = () => {
      if (current !== generation.current.value) return;
      setSpeaking(false);
      setError("Não foi possível reproduzir. Tente novamente.");
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }
  return { speak, stop, speaking, error };
}
function Practice({
  item,
  category,
  onBack,
}: {
  item: string[];
  category: string;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState("example");
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0);
  const [mirror, setMirror] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const speech = useSpeech();
  const resources = useRef<{
    stream?: MediaStream;
    context?: AudioContext;
    frame?: number;
    timer?: ReturnType<typeof setTimeout>;
    generation: number;
  }>({ generation: 0 });
  function cleanup() {
    const r = resources.current;
    r.generation++;
    r.stream?.getTracks().forEach((t) => t.stop());
    void r.context?.close().catch(() => {});
    if (r.frame) cancelAnimationFrame(r.frame);
    clearTimeout(r.timer);
    r.stream = undefined;
    r.context = undefined;
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        cleanup();
        setPhase("example");
        setLevel(0);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      cleanup();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(() => {
    if (video.current && phase === "listening")
      video.current.srcObject = resources.current.stream ?? null;
  }, [phase, mirror]);
  async function listen() {
    speech.stop();
    setError("");
    cleanup();
    const generation = resources.current.generation;
    setPhase("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mirror ? { facingMode: "user" } : false,
      });
      if (generation !== resources.current.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      resources.current.stream = stream;
      const context = new AudioContext();
      resources.current.context = context;
      await context.resume();
      if (generation !== resources.current.generation) return;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      setPhase("listening");
      const tick = () => {
        if (generation !== resources.current.generation) return;
        analyser.getFloatTimeDomainData(data);
        setLevel(
          Math.min(
            1,
            Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length) *
              8,
          ),
        );
        resources.current.frame = requestAnimationFrame(tick);
      };
      tick();
      resources.current.timer = setTimeout(async () => {
        cleanup();
        setLevel(0);
        try {
          await recordActivity(category, item[1], 8);
        } catch {
          setError(
            "A atividade terminou, mas o navegador não permitiu salvar o progresso.",
          );
        }
        setPhase("success");
      }, 8000);
    } catch {
      if (generation !== resources.current.generation) return;
      cleanup();
      setPhase("example");
      setError(
        "Não foi possível abrir o microfone. Confira a permissão e tente novamente.",
      );
    }
  }
  return (
    <main className="ref-screen practice">
      <div className="practice-top">
        <button
          className="back-round"
          aria-label="Voltar para atividades"
          onClick={() => {
            cleanup();
            speech.stop();
            onBack();
          }}
        >
          ←
        </button>
        <progress
          value={phase === "success" ? 3 : phase === "listening" ? 2 : 1}
          max={3}
          aria-label="Etapas da brincadeira"
        />
        <button
          className="back-round"
          aria-label="Encerrar atividade"
          onClick={() => {
            cleanup();
            onBack();
          }}
        >
          ×
        </button>
      </div>
      <h1>
        {phase === "success"
          ? "Uau!"
          : phase === "listening"
            ? "Agora é a sua vez!"
            : phase === "connecting"
              ? "Preparando o microfone…"
              : category === "sons"
                ? "Vamos falar a letra…"
                : "Vamos dizer juntos?"}
      </h1>
      {phase === "success" ? (
        <>
          <Mascot />
          <h2>Adorei brincar com você!</h2>
          <div className="reward-stars" aria-hidden="true">
            ★ ★ ★
          </div>
          <p>Cada tentativa é uma descoberta.</p>
          <button
            className="button secondary"
            onClick={() => setPhase("example")}
          >
            Tentar outra vez
          </button>
          <button className="button primary" onClick={onBack}>
            Próxima atividade
          </button>
        </>
      ) : phase === "listening" || phase === "connecting" ? (
        <>
          <div className="listening-bubble">
            {mirror && phase === "listening" ? (
              <video
                ref={video}
                autoPlay
                muted
                playsInline
                aria-label="Sua câmera ao vivo, sem gravação"
              />
            ) : (
              <Mascot />
            )}
          </div>
          <p role="status">
            {phase === "listening"
              ? "Estou ouvindo… Continue!"
              : "Aguardando a permissão do microfone."}
          </p>
          <div className="real-wave" aria-hidden="true">
            {Array.from({ length: 21 }, (_, i) => (
              <i
                key={i}
                style={{ height: `${8 + level * (20 + (i % 5) * 10)}px` }}
              />
            ))}
          </div>
          <button
            className="button secondary"
            onClick={() => {
              cleanup();
              setPhase("example");
            }}
          >
            Parar
          </button>
          <p className="fine">O som fica neste aparelho e não é gravado.</p>
        </>
      ) : (
        <>
          <div className={category === "sons" ? "letter-orb" : "word-card"}>
            <span>{item[0]}</span>
            {category !== "sons" && (
              <h2>{item[1].toLocaleUpperCase("pt-BR")}</h2>
            )}
          </div>
          <Mascot className="practice-mascot" />
          <p>
            {category === "sons"
              ? "Abra bem a boca com o Lumi!"
              : "Muito bem! Agora é a sua vez."}
          </p>
          <div className="practice-actions">
            <button
              className="round-audio"
              aria-label="Ouvir exemplo"
              onClick={() => speech.speak(item[3])}
            >
              <Icon name="sound" />
            </button>
            <button
              className="mic-orb"
              aria-label="Começar minha vez"
              onClick={listen}
            >
              <Icon name="mic" size={29} />
            </button>
          </div>
          <label className="voice-consent">
            <input
              type="checkbox"
              checked={mirror}
              onChange={(e) => setMirror(e.target.checked)}
            />
            <span>
              Mostrar meu rosto durante a brincadeira. Câmera opcional, sem
              gravação.
            </span>
          </label>
          <Link className="text-link" href="/conversar">
            Conversar com a voz do Lumi →
          </Link>
        </>
      )}
      {(error || speech.error) && (
        <p role="alert" className="error-box">
          {error || speech.error}
        </p>
      )}
      <p className="fine">
        Brincadeira de participação, sem avaliar a pronúncia.
      </p>
    </main>
  );
}

const tales = [
  {
    title: "O Patinho Curioso",
    emoji: "🐤",
    className: "duck-story",
    text: "O patinho Pip viu uma flor na beira do lago. Quá quá! Quem mora aqui? Uma borboleta pousou pertinho. Os dois olharam as nuvens e encontraram uma nuvem em forma de pato! Qual som faz o patinho?",
  },
  {
    title: "Avião nas Nuvens",
    emoji: "✈️",
    className: "plane-story",
    text: "Um avião azul passeava entre as nuvens. Lá embaixo, as casas pareciam pequeninas. Vruuum! Uma nuvem parecia uma bola, outra parecia um gatinho. O avião voltou para casa bem devagar. Que forma você imagina nas nuvens?",
  },
  {
    title: "A Festa dos Animais",
    emoji: "🐵 🦊 🐰",
    className: "forest-story",
    text: "O coelho convidou os amigos para brincar. O macaco trouxe uma banana, a raposa trouxe uma bola. Cada amigo fez seu som. Piu piu, cantou o passarinho! Todos brincaram juntos. Qual animal você quer imitar?",
  },
];
function Stories() {
  const [selected, setSelected] = useState<number | null>(null);
  const speech = useSpeech();
  return (
    <main className="ref-screen">
      <Back />
      <div className="section-heading">
        <h1>Histórias</h1>
        <p>Vamos contar juntos?</p>
        <Mascot />
      </div>
      {selected === null ? (
        tales.map((t, i) => (
          <button
            key={t.title}
            className={`story-card ${t.className}`}
            onClick={() => setSelected(i)}
          >
            <span className="sr-only">{t.emoji}</span>
            <strong>{t.title}</strong>
          </button>
        ))
      ) : (
        <>
          <div className={`story-card ${tales[selected].className}`}>
            <span className="sr-only">{tales[selected].emoji}</span>
          </div>
          <h2>{tales[selected].title}</h2>
          <p className="story-text">{tales[selected].text}</p>
          <button
            className="button primary"
            onClick={() =>
              speech.speaking
                ? speech.stop()
                : speech.speak(tales[selected].text)
            }
          >
            {speech.speaking ? "Parar leitura" : "Ouvir história"}
          </button>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await recordActivity("historias", tales[selected].title, 0);
              } catch {}
              speech.stop();
              setSelected(null);
            }}
          >
            Concluir e escolher outra
          </button>
        </>
      )}
      {speech.error && <p role="status">{speech.error}</p>}
    </main>
  );
}
const songs = [
  {
    title: "A canoa virou",
    text: "A canoa virou, pois deixaram ela virar. Foi por causa da brincadeira, que fez a canoa balançar.",
  },
  {
    title: "Se essa rua fosse minha",
    text: "Se essa rua, se essa rua fosse minha, eu mandava, eu mandava ladrilhar. Com pedrinhas, com pedrinhas de brilhante, para o meu, para o meu amor passar.",
  },
  {
    title: "Cabeça, ombro, joelho e pé",
    text: "Cabeça, ombro, joelho e pé, joelho e pé. Olhos, ouvidos, boca e nariz. Cabeça, ombro, joelho e pé.",
  },
  {
    title: "Parabéns pra você",
    text: "Hoje é dia de festa. Vamos juntos celebrar. Uma palma, um sorriso, e uma música cantar!",
  },
];
function Music() {
  const [index, setIndex] = useState(0);
  const speech = useSpeech();
  return (
    <main className="ref-screen">
      <Back />
      <h1>Músicas</h1>
      <p>Cante e fale com o Lumi!</p>
      <div className="music-cover">
        <strong>♫ {songs[index].title}</strong>
        <Image
          src="/lumi/lumi-canoe.png"
          alt="Lumi passeando de canoa em um lago azul"
          width={768}
          height={512}
        />
      </div>
      <div className="music-controls">
        <button
          aria-label="Música anterior"
          onClick={() => {
            speech.stop();
            setIndex((index + songs.length - 1) % songs.length);
          }}
        >
          ↤
        </button>
        <button
          className="mic-orb"
          aria-label={speech.speaking ? "Pausar" : "Ouvir letra"}
          onClick={() =>
            speech.speaking ? speech.stop() : speech.speak(songs[index].text)
          }
        >
          {speech.speaking ? "Ⅱ" : "▶"}
        </button>
        <button
          aria-label="Próxima música"
          onClick={() => {
            speech.stop();
            setIndex((index + 1) % songs.length);
          }}
        >
          ↦
        </button>
      </div>
      <p className="fine">
        Leitura da letra para cantar juntos, sem acompanhamento musical.
      </p>
      <div className="menu-list">
        {songs.map((song, i) => (
          <button
            key={song.title}
            aria-pressed={index === i}
            onClick={() => {
              speech.stop();
              setIndex(i);
            }}
          >
            <span>♫</span>
            {song.title}
            <span>›</span>
          </button>
        ))}
      </div>
      {speech.error && <p role="status">{speech.error}</p>}
    </main>
  );
}

function useActivities() {
  const [data, setData] = useState<Activity[]>([]);
  useEffect(() => {
    const refresh = () => setData(readActivities());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  return data;
}
function Progress({ family = false }: { family?: boolean }) {
  const all = useActivities();
  const [period, setPeriod] = useState(7);
  const today = new Date();
  const data = all.filter(
    (x) => Date.parse(x.at) >= today.getTime() - period * 86400000,
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - 6 + i);
    return {
      label: date
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", ""),
      count: all.filter(
        (x) => new Date(x.at).toDateString() === date.toDateString(),
      ).length,
    };
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <main className="ref-screen progress-screen">
      {family && (
        <div className="family-top">
          <span>👩</span>
          <Link
            className="back-round"
            href="/configuracoes"
            aria-label="Configurações"
          >
            ⚙
          </Link>
        </div>
      )}
      <h1>{family ? "Olá, família!" : "Progresso"}</h1>
      {family ? (
        <div className="family-message">
          <p>
            Lumi está pronto para
            <br />
            mais uma aventura!
          </p>
          <Mascot />
        </div>
      ) : (
        <div className="filter-tabs period-tabs">
          {[
            [7, "Semana"],
            [30, "Mês"],
            [365, "Ano"],
          ].map(([n, label]) => (
            <button
              key={n}
              aria-pressed={period === n}
              onClick={() => setPeriod(Number(n))}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <section className="chart-panel">
        <h2>
          {family ? "Progresso da semana" : "Atividades nos últimos 7 dias"}
        </h2>
        <div className="bar-chart">
          {days.map((day, i) => (
            <div key={i}>
              <span className="bar-value">{day.count}</span>
              <i
                style={{ height: `${Math.max(3, (day.count / max) * 110)}px` }}
              />
              <small>{day.label}</small>
            </div>
          ))}
        </div>
      </section>
      {!family && (
        <div className="metric-grid">
          <div>
            <strong>{data.length}</strong>
            <small>Atividades</small>
          </div>
          <div>
            <strong>
              {
                new Set(
                  data
                    .filter((x) => x.category !== "historias")
                    .map((x) => x.word),
                ).size
              }
            </strong>
            <small>Itens explorados</small>
          </div>
          <div>
            <strong>
              {Math.round(data.reduce((s, x) => s + x.seconds, 0) / 60)} min
            </strong>
            <small>De prática</small>
          </div>
        </div>
      )}
      <div className="tip-card">
        <span>🌟</span>
        <div>
          <strong>
            {family ? "Dica do Lumi" : "Sua voz faz a diferença!"}
          </strong>
          <p>
            {all.length
              ? "Pequenos momentos juntos fazem parte das grandes descobertas."
              : "As atividades concluídas aparecerão aqui. Vamos começar uma brincadeira?"}
          </p>
        </div>
      </div>
      <p className="fine">
        {cloud.enabled
          ? "Descobertas salvas para este navegador."
          : "Registros deste aparelho."}{" "}
        Não medimos fala ou desenvolvimento.
      </p>
      <Link className="button primary" href="/inicio">
        Continuar explorando
      </Link>
      {family && (
        <Link className="button secondary" href="/responsaveis">
          Área dos responsáveis
        </Link>
      )}
    </main>
  );
}
function Achievements() {
  const data = useActivities();
  const achievements = [
    ["🌟", "Primeira brincadeira", data.length >= 1],
    ["🐾", "Explorador de sons", data.some((x) => x.category === "sons")],
    ["✨", "Artista da voz", data.length >= 10],
    ["🐘", "Falo com os animais", data.some((x) => x.category === "animais")],
    ["♫", "Pequeno explorador", new Set(data.map((x) => x.category)).size >= 3],
    ["📖", "Histórias incríveis", data.some((x) => x.category === "historias")],
  ];
  return (
    <main className="ref-screen">
      <h1>Conquistas</h1>
      <div className="achievement-grid">
        {achievements.map(([emoji, label, unlocked]) => (
          <div key={String(label)} className={unlocked ? "unlocked" : "locked"}>
            <span className="medal">{emoji}</span>
            <strong>{label}</strong>
            <small>{unlocked ? "Conquistado!" : "A descobrir"}</small>
          </div>
        ))}
      </div>
      <div className="family-message">
        <Mascot />
        <p>Cada tentativa é uma grande conquista!</p>
      </div>
      <p className="fine">
        Medalhas celebram participação, sem avaliar habilidades.
      </p>
    </main>
  );
}
function Settings({ parents }: { parents: boolean }) {
  const router = useRouter();
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState("");
  const [sound, setSound] = useState(() => {
    try {
      return localStorage.getItem("lumi.sound") !== "off";
    } catch {
      return true;
    }
  });
  const [large, setLarge] = useState(() => {
    try {
      return localStorage.getItem("lumi.large") === "on";
    } catch {
      return false;
    }
  });
  const menus = parents
    ? [
        "Relatórios de progresso",
        "Configurar rotina",
        "Dicas e orientações",
        "Conteúdo personalizado",
        "Conectar com fonoaudiólogo",
        "Gerenciar perfil da criança",
      ]
    : [
        "Perfil da criança",
        "Idioma",
        "Som e voz",
        "Acessibilidade",
        "Tempo de uso",
        "Privacidade e segurança",
        "Sobre o Lumi",
      ];
  return (
    <main className="ref-screen settings-screen">
      <Back href="/familia" />
      <h1>{parents ? "Área dos Responsáveis" : "Configurações"}</h1>
      <div className="menu-list">
        {menus.map((label, i) => (
          <button
            key={label}
            onClick={() => {
              setMessage("");
              if (label.includes("perfil") || label === "Perfil da criança")
                router.push("/onboarding");
              else if (label === "Relatórios de progresso")
                router.push("/progresso");
              else setDetail(detail === label ? "" : label);
            }}
          >
            <span>{["♙", "◷", "♫", "✧", "◴", "♧", "ⓘ"][i]}</span>
            {label}
            <span>›</span>
          </button>
        ))}
      </div>
      {detail && (
        <section className="panel settings-detail">
          <h2>{detail}</h2>
          {detail === "Som e voz" ? (
            <label className="toggle-setting">
              Leitura em voz alta
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => {
                  try {
                    localStorage.setItem(
                      "lumi.sound",
                      e.target.checked ? "on" : "off",
                    );
                    setSound(e.target.checked);
                    if (!e.target.checked) window.speechSynthesis?.cancel();
                  } catch {
                    setMessage("Não foi possível salvar esta preferência.");
                  }
                }}
              />
            </label>
          ) : detail === "Acessibilidade" ? (
            <label className="toggle-setting">
              Texto ampliado
              <input
                type="checkbox"
                checked={large}
                onChange={(e) => {
                  try {
                    localStorage.setItem(
                      "lumi.large",
                      e.target.checked ? "on" : "off",
                    );
                    setLarge(e.target.checked);
                    document.documentElement.classList.toggle(
                      "large-text",
                      e.target.checked,
                    );
                  } catch {
                    setMessage("Não foi possível salvar esta preferência.");
                  }
                }}
              />
            </label>
          ) : detail === "Privacidade e segurança" ? (
            <>
              <p>
                O perfil é opcional. No site, perfil e participação ficam salvos
                no servidor, vinculados a este navegador. Exercícios usam o
                microfone sem gravar. Na conversa ao vivo, sua voz é enviada ao
                Google Gemini ao tocar no microfone.
              </p>
              <button
                className="button secondary"
                onClick={() => setMessage("confirm-delete")}
              >
                Apagar perfil e progresso
              </button>
              {message === "confirm-delete" && (
                <>
                  <p>
                    Apagar perfil e progresso? Esta ação não pode ser desfeita.
                  </p>
                  <button
                    className="button primary"
                    onClick={async () => {
                      try {
                        await clearProfile();
                        await clearActivities();
                        setMessage("Perfil e progresso apagados.");
                      } catch {
                        setMessage("Não foi possível apagar os dados.");
                      }
                    }}
                  >
                    Confirmar exclusão
                  </button>
                  <button className="text-link" onClick={() => setMessage("")}>
                    Cancelar
                  </button>
                </>
              )}
            </>
          ) : (
            <p>
              {detail === "Idioma"
                ? "Português (Brasil). Outros idiomas ainda não estão disponíveis."
                : detail === "Tempo de uso"
                  ? "Conversas de até 3 minutos ou 10 respostas, com pausa após 1 minuto sem interação. As pausas são automáticas."
                  : detail === "Configurar rotina"
                    ? "Brinquem por alguns minutos, com pausas. Lembretes automáticos ainda não estão disponíveis."
                    : detail === "Conectar com fonoaudiólogo"
                      ? "Esta versão não possui conexão com profissionais. O Lumi não oferece terapia, diagnóstico ou avaliação."
                      : detail === "Conteúdo personalizado"
                        ? "Escolha uma categoria no início ou edite os interesses no perfil. O perfil não é enviado ao Gemini."
                        : detail === "Dicas e orientações"
                          ? "Escute com calma, dê tempo para responder e valorize a participação. Não é preciso corrigir nem cobrar acertos."
                          : "Lumi · Sua amiguinha de luz. Brincadeiras inspiradas em pequenas descobertas."}
            </p>
          )}
        </section>
      )}
      {message && message !== "confirm-delete" && (
        <p role="status">{message}</p>
      )}
      {parents && (
        <div className="family-message">
          <Mascot />
          <p>Juntos por grandes conversas!</p>
        </div>
      )}
      <button
        className="button primary bottom-action"
        onClick={async () => {
          try {
            router.push("/inicio");
          } catch {
            setMessage("Não foi possível sair. Tente novamente.");
          }
        }}
      >
        Voltar ao início
      </button>
    </main>
  );
}
