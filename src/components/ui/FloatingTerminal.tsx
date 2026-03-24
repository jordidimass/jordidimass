"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";
import { motion, AnimatePresence } from "motion/react";
import { X, SkipBack, SkipForward, Play, Pause } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { TerminalIcon, type TerminalIconHandle } from "./TerminalIcon";

// ─── Vesper palette ───────────────────────────────────────────────────────────
const C = {
  bg: "#101010",
  surface: "#141414",
  border: "#1e1e1e",
  text: "#f5f5f5",
  muted: "#4c4c4c",
  accent: "#ff8800",
  dim: "#2a2a2a",
} as const;

// ─── Audio ────────────────────────────────────────────────────────────────────
type TrackKey =
  | "rave_zion"
  | "prime_audio_soup"
  | "happiness"
  | "clubbed"
  | "spybreak"
  | "mindfields"
  | "windowlicker"
  | "blockrockin"
  | "places";

const TRACKS: Record<TrackKey, { src: string; title: string }> = {
  clubbed: {
    src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Rob%20Dougan%20-%20Clubbed%20to%20Death%20(The%20Matrix%20Reloaded%20OST)-AgcCQo9iIZ4Quf39BdcSRbyCmwAKKK.mp3",
    title: "Rob Dougan - Clubbed to Death",
  },
  spybreak: {
    src: "https://utfs.io/f/ixJ6E8OWunhtlYqL2pMnvrHn5AoqwhXROGzc49IVFUlbPK2J",
    title: "Propellerheads - Spybreak",
  },
  prime_audio_soup: {
    src: "https://utfs.io/f/ixJ6E8OWunhtKuEuy5NrBRwLmapM3zXlQ6okvxSPEWu5Tf2D",
    title: "Meat Beat Manifesto - Prime Audio Soup",
  },
  mindfields: {
    src: "https://utfs.io/f/ixJ6E8OWunhtmm3vSvRyF8KulPTUo67dnL4INgSpMAQYijsO",
    title: "The Prodigy - Mindfields",
  },
  happiness: {
    src: "https://utfs.io/f/ixJ6E8OWunhtIPXczr8laWqQYFwevXfK7jATzpd4kC8U6nmB",
    title: "Porter Robinson - Is There Really No Happiness",
  },
  windowlicker: {
    src: "https://utfs.io/f/ixJ6E8OWunhtQ0wKJ5dcVUsfKamM5tSYiB4I8WeLb6vdNRH1",
    title: "Aphex Twin - Window Licker",
  },
  blockrockin: {
    src: "https://utfs.io/f/ixJ6E8OWunhtercQIBAJq6FUBPuV5HhcC9ofZYgbwDGz4Rk7",
    title: "The Chemical Brothers - Block Rockin Beats",
  },
  places: {
    src: "https://utfs.io/f/ixJ6E8OWunht7OpTmau8RVJD3Q0PjrEsGu1wmTFiZLUpekCM",
    title: "Fred again.. & Anderson .Paak - places to be",
  },
  rave_zion: {
    src: "https://utfs.io/f/ixJ6E8OWunhtQuO5TVdcVUsfKamM5tSYiB4I8WeLb6vdNRH1",
    title: "Rave Zion",
  },
};

const TRACK_ORDER: TrackKey[] = [
  "rave_zion",
  "prime_audio_soup",
  "happiness",
  "clubbed",
  "spybreak",
  "mindfields",
  "windowlicker",
  "blockrockin",
  "places",
];

// ─── Terminal output ──────────────────────────────────────────────────────────
type Line = { id: number; text: string; dim?: boolean };

let lineCounter = 0;
const line = (text: string, dim = false): Line => ({
  id: lineCounter++,
  text,
  dim,
});

const BOOT: Line[] = [
  line("jordidimas terminal", true),
  line('type "help" for available commands.', true),
];

// ─── Sizes ────────────────────────────────────────────────────────────────────
const MIN_W = 340;
const MIN_H = 220;
const DEFAULT_W = 500;
const DEFAULT_H = 380;

// ─── Shared transport (stable reference) ─────────────────────────────────────
const transport = new DefaultChatTransport({ api: "/api/terminal" });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(s: number) {
  if (!isFinite(s)) return "--:--";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FloatingTerminal() {
  const pathname = usePathname();
  const router = useRouter();

  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>(BOOT);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  // Position & size
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  // Drag
  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Resize
  const [resizing, setResizing] = useState(false);
  const resizeOriginRef = useRef({ mx: 0, my: 0, w: DEFAULT_W, h: DEFAULT_H });

  // Audio
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<TrackKey>("rave_zion");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(0);

  // Refs
  const panelRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<TerminalIconHandle>(null);
  const lastMsgId = useRef<string | null>(null);

  // AI chat
  const { messages, sendMessage, status } = useChat({
    id: "ft",
    transport,
  });

  // ── Sync AI stream → lines ──────────────────────────────────────────────────
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const text = last.parts.filter(isTextUIPart).map((p) => p.text).join("");
    if (lastMsgId.current !== last.id) {
      lastMsgId.current = last.id;
      setLines((prev) => [...prev, line(text)]);
    } else {
      setLines((prev) => {
        const next = [...prev];
        next[next.length - 1] = line(text);
        return next;
      });
    }
  }, [messages]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [lines]);

  // ── Focus on open ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Icon animation sync ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      iconRef.current?.startAnimation();
    } else {
      iconRef.current?.stopAnimation();
    }
  }, [isOpen]);

  // ── Audio progress ──────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
      setRemaining(audio.duration - audio.currentTime);
    };
    const onLoad = () => setRemaining(audio.duration);
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("loadedmetadata", onLoad);
    return () => {
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("loadedmetadata", onLoad);
    };
  }, []);

  // ── Auto-advance track ──────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => {
      const idx = TRACK_ORDER.indexOf(track);
      const next = TRACK_ORDER[(idx + 1) % TRACK_ORDER.length];
      setTrack(next);
      audio.src = TRACKS[next].src;
      audio.load();
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };
    audio.addEventListener("ended", onEnd);
    return () => audio.removeEventListener("ended", onEnd);
  }, [track]);

  // ── Drag & resize unified listener ─────────────────────────────────────────
  useEffect(() => {
    if (!dragging && !resizing) return;
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        setPos({ x: e.clientX - dragOffsetRef.current.x, y: e.clientY - dragOffsetRef.current.y });
      } else {
        const { mx, my, w, h } = resizeOriginRef.current;
        setSize({
          w: Math.max(MIN_W, w + (e.clientX - mx)),
          h: Math.max(MIN_H, h + (e.clientY - my)),
        });
      }
    };
    const onUp = () => { setDragging(false); setResizing(false); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, resizing]);

  // ── Audio helpers ───────────────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  const changeTrack = useCallback(async (dir: 1 | -1) => {
    const audio = audioRef.current;
    if (!audio) return;
    const idx = TRACK_ORDER.indexOf(track);
    const next = TRACK_ORDER[(idx + dir + TRACK_ORDER.length) % TRACK_ORDER.length];
    const wasPlaying = playing;
    setPlaying(false);
    setTrack(next);
    audio.pause();
    audio.src = TRACKS[next].src;
    audio.load();
    if (wasPlaying) {
      try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
    }
    return next;
  }, [track, playing]);

  // ── Command processor ───────────────────────────────────────────────────────
  const run = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    setHistory((h) => [...h, cmd]);
    setHistIdx(-1);
    setLines((prev) => [...prev, line(`> ${cmd}`)]);

    const lo = cmd.toLowerCase();

    if (lo === "help") {
      setLines((prev) => [
        ...prev,
        line("available commands:", true),
        line("  ask <query>      ask the AI a question"),
        line("  neofetch         system info"),
        line("  whoami           about jordi"),
        line("  play             start audio playback"),
        line("  pause            pause playback"),
        line("  next             next track"),
        line("  prev             previous track"),
        line("  toggle-matrix    open the matrix"),
        line("  clear            clear terminal"),
        line("  exit             close terminal"),
      ]);
      return;
    }

    if (lo === "whoami") {
      setLines((prev) => [
        ...prev,
        line("my name is jordi, thanks for visiting my website"),
      ]);
      return;
    }

    if (lo === "clear") {
      setLines([]);
      lastMsgId.current = null;
      return;
    }

    if (lo === "exit") {
      setLines((prev) => [...prev, line("closing terminal...", true)]);
      setTimeout(() => setIsOpen(false), 600);
      return;
    }

    if (lo === "toggle-matrix") {
      setLines((prev) => [...prev, line("entering the matrix...", true)]);
      setTimeout(() => router.push("/matrix"), 800);
      return;
    }

    if (lo === "play") {
      const audio = audioRef.current;
      if (!audio) return;
      if (!playing) {
        audio.play().then(() => setPlaying(true)).catch(() => {});
      }
      setLines((prev) => [...prev, line(`playing: ${TRACKS[track].title}`)]);
      return;
    }

    if (lo === "pause") {
      if (playing) toggleAudio();
      setLines((prev) => [...prev, line("paused")]);
      return;
    }

    if (lo === "next") {
      const next = await changeTrack(1);
      setLines((prev) => [
        ...prev,
        line(`→ ${TRACKS[next ?? track].title}`),
      ]);
      return;
    }

    if (lo === "prev") {
      const prev = await changeTrack(-1);
      setLines((prev2) => [
        ...prev2,
        line(`→ ${TRACKS[prev ?? track].title}`),
      ]);
      return;
    }

    if (lo === "neofetch") {
      const lambdaArt = [
        "                    λ",
        "                   λλ",
        "                  λλλ",
        "                 λλλλ",
        "                λλλλλ",
        "               λλλλλλ",
        "              λλλλλλλ",
      ];
      const info = [
        `jordidimas@web`,
        `--------------`,
        `OS     Next.js App Router`,
        `Shell  React 19`,
        `DE     Tailwind CSS v4`,
        `AI     Vercel AI SDK v6`,
        `DB     Supabase`,
        `Host   jordidimas.dev`,
      ];
      const combined = [
        ...lambdaArt.map((art, i) => `${art.padEnd(24)} ${info[i] ?? ""}`),
        ...(info.length > lambdaArt.length ? info.slice(lambdaArt.length) : []),
      ];
      setLines((prev) => [...prev, ...combined.map((t) => line(t))]);
      return;
    }

    if (lo.startsWith("ask ")) {
      const q = cmd.slice(4).trim();
      if (!q) {
        setLines((prev) => [...prev, line("usage: ask <your question>", true)]);
        return;
      }
      sendMessage({ text: q });
      return;
    }

    setLines((prev) => [
      ...prev,
      line(`command not found: ${cmd}`, true),
    ]);
  }, [playing, track, changeTrack, toggleAudio, sendMessage, router]);

  // ── Keyboard handler ────────────────────────────────────────────────────────
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      if (history.length === 0) return;
      const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setInput(history[idx]);
    } else if (e.key === "ArrowDown") {
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= history.length) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(idx);
        setInput(history[idx]);
      }
    } else if (e.key === "Enter") {
      run(input);
      setInput("");
    }
  };

  // ── Drag start ──────────────────────────────────────────────────────────────
  const onDragStart = (e: React.MouseEvent) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Snap to absolute position on first drag
    setPos((p) => p ?? { x: rect.left, y: rect.top });
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };

  // ── Resize start ────────────────────────────────────────────────────────────
  const onResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeOriginRef.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    setResizing(true);
  };

  // ── Don't render on /matrix ─────────────────────────────────────────────────
  if (pathname === "/matrix") return null;

  const panelStyle: React.CSSProperties =
    pos
      ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
      : { right: 24, bottom: 80 };

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 text-neutral-400 hover:text-neutral-100 transition-colors duration-200"
        aria-label="Toggle terminal"
        style={{ lineHeight: 0 }}
      >
        <TerminalIcon ref={iconRef} size={22} />
      </button>

      {/* ── Terminal panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-50 flex flex-col select-none"
            style={{
              ...panelStyle,
              width: size.w,
              height: size.h,
              background: C.bg,
              border: `1px solid ${C.border}`,
              boxShadow: "0 12px 48px rgba(0,0,0,0.7)",
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            }}
            onClick={() => inputRef.current?.focus()}
          >
            {/* ── Header / drag handle ── */}
            <div
              className="flex items-center justify-between px-4 py-2 cursor-move shrink-0"
              style={{ borderBottom: `1px solid ${C.border}` }}
              onMouseDown={onDragStart}
            >
              <span style={{ color: C.muted, fontSize: 11, letterSpacing: "0.08em" }}>
                terminal
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="transition-colors duration-150"
                style={{ color: C.muted, lineHeight: 0 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                aria-label="Close"
              >
                <X size={12} />
              </button>
            </div>

            {/* ── Output ── */}
            <div
              ref={outputRef}
              className="flex-1 overflow-y-auto px-4 py-3"
              style={{ scrollbarWidth: "none" }}
            >
              {lines.map((l) => (
                <div
                  key={l.id}
                  className="text-xs leading-5 whitespace-pre-wrap break-words"
                  style={{ color: l.dim ? C.muted : C.text }}
                >
                  {l.text}
                </div>
              ))}
              {status === "streaming" && (
                <span
                  className="text-xs animate-pulse"
                  style={{ color: C.muted }}
                >
                  ▌
                </span>
              )}
            </div>

            {/* ── Music bar (visible when audio is active) ── */}
            {playing && (
              <div
                className="shrink-0 px-4 py-1.5 flex items-center gap-3"
                style={{ borderTop: `1px solid ${C.border}` }}
              >
                <button onClick={() => changeTrack(-1)} style={{ color: C.muted, lineHeight: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}>
                  <SkipBack size={10} />
                </button>
                <button onClick={toggleAudio} style={{ color: C.accent, lineHeight: 0 }}>
                  {playing ? <Pause size={10} /> : <Play size={10} />}
                </button>
                <button onClick={() => changeTrack(1)} style={{ color: C.muted, lineHeight: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}>
                  <SkipForward size={10} />
                </button>
                <span className="flex-1 truncate" style={{ color: C.muted, fontSize: 10 }}>
                  {TRACKS[track].title}
                </span>
                <span style={{ color: C.muted, fontSize: 10 }}>
                  {formatTime(remaining)}
                </span>
              </div>
            )}

            {/* ── Progress bar (only when playing) ── */}
            {playing && (
              <div className="shrink-0 h-px w-full" style={{ background: C.dim }}>
                <div
                  className="h-full transition-all"
                  style={{ width: `${progress}%`, background: C.accent }}
                />
              </div>
            )}

            {/* ── Input ── */}
            <div
              className="flex items-center gap-2 px-4 py-2 shrink-0"
              style={{ borderTop: `1px solid ${C.border}` }}
            >
              <span className="text-xs shrink-0" style={{ color: C.accent }}>
                &gt;
              </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                className="flex-1 bg-transparent border-none outline-none text-xs"
                style={{ color: C.text, fontSize: 13, caretColor: C.accent }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Terminal input"
              />
            </div>

            {/* ── Resize handle ── */}
            <div
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
              onMouseDown={onResizeStart}
              style={{ touchAction: "none" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={TRACKS[track].src} />
    </>
  );
}
