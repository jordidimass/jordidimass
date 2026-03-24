"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";
import { motion, AnimatePresence } from "motion/react";
import { X, SkipBack, SkipForward, Play, Pause } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { TerminalIcon, type TerminalIconHandle } from "./TerminalIcon";

// ─── Vesper palette ────────────────────────────────────────────────────────────
const C = {
  bg: "#101010",
  border: "#1e1e1e",
  text: "#f5f5f5",
  muted: "#4c4c4c",
  accent: "#ff8800",
  dim: "#2a2a2a",
} as const;

// ─── Audio ─────────────────────────────────────────────────────────────────────
type TrackKey =
  | "rave_zion" | "prime_audio_soup" | "happiness" | "clubbed"
  | "spybreak" | "mindfields" | "windowlicker" | "blockrockin" | "places";

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
  "rave_zion", "prime_audio_soup", "happiness", "clubbed",
  "spybreak", "mindfields", "windowlicker", "blockrockin", "places",
];

// ─── Output lines ──────────────────────────────────────────────────────────────
type Line = { id: number; text: string; dim?: boolean };
let _id = 0;
const mkLine = (text: string, dim = false): Line => ({ id: _id++, text, dim });

const BOOT: Line[] = [
  mkLine("jordidimas terminal", true),
  mkLine('type "help" for available commands.', true),
];

// ─── Sizes ─────────────────────────────────────────────────────────────────────
const MIN_W = 340;
const MIN_H = 220;
const DEFAULT_W = 500;
const DEFAULT_H = 380;

// ─── Stable transport instance ─────────────────────────────────────────────────
const transport = new DefaultChatTransport({ api: "/api/terminal" });

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function FloatingTerminal() {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>(BOOT);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  // Position & size
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  // Drag
  const [dragging, setDragging] = useState(false);
  const dragOffRef = useRef({ x: 0, y: 0 });

  // Resize
  const [resizing, setResizing] = useState(false);
  const resizeOrigin = useRef({ mx: 0, my: 0, w: DEFAULT_W, h: DEFAULT_H });

  // Audio — managed fully imperatively; NO src prop on <audio> to avoid React
  // reconciliation conflicts with imperative load/play calls
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<TrackKey>("rave_zion");   // ground-truth track key
  const [trackDisplay, setTrackDisplay] = useState<TrackKey>("rave_zion");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(0);

  // Refs
  const panelRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<TerminalIconHandle>(null);
  const lastMsgId = useRef<string | null>(null);

  const { messages, sendMessage, status } = useChat({ id: "ft", transport });

  // ── Initialise audio src once on mount ──────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = TRACKS[trackRef.current].src;
    audio.load();
  }, []);

  // ── Sync AI stream → terminal lines ─────────────────────────────────────────
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    const text = last.parts.filter(isTextUIPart).map((p) => p.text).join("");
    if (lastMsgId.current !== last.id) {
      lastMsgId.current = last.id;
      setLines((prev) => [...prev, mkLine(text)]);
    } else {
      setLines((prev) => {
        const next = [...prev];
        next[next.length - 1] = mkLine(text);
        return next;
      });
    }
  }, [messages]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [lines]);

  // ── Focus when opened ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Cmd/Ctrl+K → clear (matches /matrix behaviour) ──────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      const mac = navigator.platform.toUpperCase().includes("MAC");
      if ((mac ? e.metaKey : e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setLines([]);
        lastMsgId.current = null;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // ── Icon blink while open ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) iconRef.current?.startAnimation();
    else iconRef.current?.stopAnimation();
  }, [isOpen]);

  // ── Audio: progress & remaining ─────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
      setRemaining(audio.duration - audio.currentTime);
    };
    const onMeta = () => setRemaining(audio.duration);
    audio.addEventListener("timeupdate", update);
    audio.addEventListener("loadedmetadata", onMeta);
    return () => {
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  // ── Audio: auto-advance on track end ────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = async () => {
      const idx = TRACK_ORDER.indexOf(trackRef.current);
      const next = TRACK_ORDER[(idx + 1) % TRACK_ORDER.length];
      trackRef.current = next;
      setTrackDisplay(next);
      audio.src = TRACKS[next].src;
      audio.load();
      try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
    };
    audio.addEventListener("ended", onEnd);
    return () => audio.removeEventListener("ended", onEnd);
  }, []);

  // ── Unified drag & resize mouse listeners ───────────────────────────────────
  useEffect(() => {
    if (!dragging && !resizing) return;
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        setPos({ x: e.clientX - dragOffRef.current.x, y: e.clientY - dragOffRef.current.y });
      } else {
        const { mx, my, w, h } = resizeOrigin.current;
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

  // ── Audio helpers ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  // Returns the new track key after switching
  const switchTrack = useCallback(async (dir: 1 | -1): Promise<TrackKey> => {
    const audio = audioRef.current;
    if (!audio) return trackRef.current;

    const wasPlaying = playing;
    const idx = TRACK_ORDER.indexOf(trackRef.current);
    const next = TRACK_ORDER[(idx + dir + TRACK_ORDER.length) % TRACK_ORDER.length];

    // Stop current playback
    audio.pause();
    setPlaying(false);

    // Load new track imperatively — no React src prop involved
    trackRef.current = next;
    setTrackDisplay(next);
    audio.src = TRACKS[next].src;
    audio.load();

    if (wasPlaying) {
      // play() returns a Promise and internally waits for enough buffered data
      try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
    }
    return next;
  }, [playing]);

  // ── Command processor ────────────────────────────────────────────────────────
  const run = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;

    setCmdHistory((h) => [...h, cmd]);
    setHistIdx(-1);
    setLines((prev) => [...prev, mkLine(`> ${cmd}`)]);

    const lo = cmd.toLowerCase();

    if (lo === "help") {
      setLines((prev) => [
        ...prev,
        mkLine("available commands:", true),
        mkLine("  ask <query>      ask the AI a question"),
        mkLine("  neofetch         system info"),
        mkLine("  whoami           about jordi"),
        mkLine("  play             start audio playback"),
        mkLine("  pause            pause playback"),
        mkLine("  next             next track"),
        mkLine("  prev             previous track"),
        mkLine("  toggle-matrix    open the matrix"),
        mkLine("  clear            clear terminal  (Cmd/Ctrl+K)"),
        mkLine("  exit             close terminal"),
      ]);
      return;
    }

    if (lo === "whoami") {
      setLines((prev) => [
        ...prev,
        mkLine("jordi dimas"),
        mkLine("software developer from guatemala, with a deep fascination for physics,"),
        mkLine("systems theory, and the intricate world of computer science."),
        mkLine(""),
        mkLine("i believe in the power of continuous learning and the beauty of elegant"),
        mkLine("solutions. every line of code is an opportunity to create something"),
        mkLine("meaningful, and every project is a chance to push the boundaries of"),
        mkLine("what's possible."),
        mkLine(""),
        mkLine("always open to collaborating on innovative projects and connecting with"),
        mkLine("fellow developers who share a passion for crafting exceptional digital"),
        mkLine("experiences."),
      ]);
      return;
    }

    if (lo === "clear") {
      setLines([]);
      lastMsgId.current = null;
      return;
    }

    if (lo === "exit") {
      setLines((prev) => [...prev, mkLine("closing terminal...", true)]);
      setTimeout(() => setIsOpen(false), 600);
      return;
    }

    if (lo === "toggle-matrix") {
      setLines((prev) => [...prev, mkLine("entering the matrix...", true)]);
      setTimeout(() => router.push("/matrix"), 700);
      return;
    }

    if (lo === "play") {
      const audio = audioRef.current;
      if (!audio) return;
      if (!playing) {
        audio.play().then(() => setPlaying(true)).catch(() => {});
      }
      setLines((prev) => [...prev, mkLine(`playing: ${TRACKS[trackRef.current].title}`)]);
      return;
    }

    if (lo === "pause") {
      if (playing) togglePlay();
      setLines((prev) => [...prev, mkLine("paused")]);
      return;
    }

    if (lo === "next") {
      const next = await switchTrack(1);
      setLines((prev) => [...prev, mkLine(`→ ${TRACKS[next].title}`)]);
      return;
    }

    if (lo === "prev") {
      const prev = await switchTrack(-1);
      setLines((prev2) => [...prev2, mkLine(`→ ${TRACKS[prev].title}`)]);
      return;
    }

    if (lo === "neofetch") {
      const art = [
        "                    λ",
        "                   λλ",
        "                  λλλ",
        "                 λλλλ",
        "                λλλλλ",
        "               λλλλλλ",
        "              λλλλλλλ",
      ];
      const info = [
        "jordidimas@web",
        "--------------",
        "OS     Next.js App Router",
        "Shell  React 19",
        "DE     Tailwind CSS v4",
        "AI     Vercel AI SDK v6",
        "DB     Supabase",
      ];
      const rows = art.map((a, i) => `${a.padEnd(24)}  ${info[i] ?? ""}`);
      setLines((prev) => [
        ...prev,
        ...rows.map((t) => mkLine(t)),
        mkLine(""),
        mkLine("Host   jordidimas.dev", true),
      ]);
      return;
    }

    if (lo.startsWith("ask ")) {
      const q = cmd.slice(4).trim();
      if (!q) {
        setLines((prev) => [...prev, mkLine("usage: ask <your question>", true)]);
        return;
      }
      sendMessage({ text: q });
      return;
    }

    setLines((prev) => [...prev, mkLine(`command not found: ${cmd}`, true)]);
  }, [playing, switchTrack, togglePlay, sendMessage, router]);

  // ── Keyboard handler ─────────────────────────────────────────────────────────
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      if (!cmdHistory.length) return;
      const idx = histIdx === -1 ? cmdHistory.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx);
      setInput(cmdHistory[idx]);
    } else if (e.key === "ArrowDown") {
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= cmdHistory.length) { setHistIdx(-1); setInput(""); }
      else { setHistIdx(idx); setInput(cmdHistory[idx]); }
    } else if (e.key === "Enter") {
      run(input);
      setInput("");
    }
  };

  // ── Drag start ───────────────────────────────────────────────────────────────
  const onDragStart = (e: React.MouseEvent) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    // First drag: snap to absolute coords so subsequent moves are predictable
    setPos((p) => p ?? { x: rect.left, y: rect.top });
    dragOffRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };

  // ── Resize start ─────────────────────────────────────────────────────────────
  const onResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeOrigin.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    setResizing(true);
  };

  // ── Don't render on /matrix (full terminal already there) ───────────────────
  if (pathname === "/matrix") return null;

  const panelStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : { right: 24, bottom: 80 };

  return (
    <>
      {/* ── Toggle button — just the icon, nothing else ── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 text-neutral-500 hover:text-neutral-200 transition-colors duration-200"
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
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="fixed z-50 flex flex-col"
            style={{
              ...panelStyle,
              width: size.w,
              height: size.h,
              background: C.bg,
              border: `1px solid ${C.border}`,
              boxShadow: "0 16px 56px rgba(0,0,0,0.75)",
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              userSelect: "none",
            }}
            onClick={() => inputRef.current?.focus()}
          >
            {/* ── Header / drag handle ── */}
            <div
              className="flex items-center justify-between px-4 py-2 cursor-move shrink-0"
              style={{ borderBottom: `1px solid ${C.border}` }}
              onMouseDown={onDragStart}
            >
              <span style={{ color: C.muted, fontSize: 11, letterSpacing: "0.1em" }}>
                terminal
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
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
                  className="leading-5 whitespace-pre-wrap break-words"
                  style={{ fontSize: 12, color: l.dim ? C.muted : C.text }}
                >
                  {l.text}
                </div>
              ))}
              {status === "streaming" && (
                <span className="animate-pulse" style={{ fontSize: 12, color: C.muted }}>▌</span>
              )}
            </div>

            {/* ── Music bar — only when audio active ── */}
            {playing && (
              <>
                <div
                  className="shrink-0 px-4 py-1.5 flex items-center gap-3"
                  style={{ borderTop: `1px solid ${C.border}` }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); switchTrack(-1); }}
                    style={{ color: C.muted, lineHeight: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                  >
                    <SkipBack size={10} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    style={{ color: C.accent, lineHeight: 0 }}
                  >
                    <Pause size={10} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); switchTrack(1); }}
                    style={{ color: C.muted, lineHeight: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                  >
                    <SkipForward size={10} />
                  </button>
                  <span className="flex-1 truncate" style={{ fontSize: 10, color: C.muted }}>
                    {TRACKS[trackDisplay].title}
                  </span>
                  <span style={{ fontSize: 10, color: C.muted }}>{fmtTime(remaining)}</span>
                </div>
                {/* progress bar */}
                <div className="h-px w-full shrink-0" style={{ background: C.dim }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: C.accent }} />
                </div>
              </>
            )}

            {/* ── Input row ── */}
            <div
              className="flex items-center gap-2 px-4 py-2 shrink-0"
              style={{ borderTop: `1px solid ${C.border}` }}
            >
              <span style={{ fontSize: 12, color: C.accent, userSelect: "none" }}>&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                className="flex-1 bg-transparent border-none outline-none"
                style={{ fontSize: 13, color: C.text, caretColor: C.accent }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Terminal input"
              />
            </div>

            {/* ── Resize handle — visible grip in bottom-right corner ── */}
            <div
              className="absolute bottom-0 right-0 cursor-se-resize flex items-end justify-end p-1"
              style={{ width: 20, height: 20 }}
              onMouseDown={onResizeStart}
            >
              {/* 3-dot grip pattern */}
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <circle cx="7.5" cy="7.5" r="1" fill={C.muted} />
                <circle cx="4.5" cy="7.5" r="1" fill={C.muted} />
                <circle cx="7.5" cy="4.5" r="1" fill={C.muted} />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio element — NO src prop; managed fully via audioRef imperatively */}
      <audio ref={audioRef} />
    </>
  );
}
