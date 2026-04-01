"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";
import { motion, AnimatePresence } from "motion/react";
import { X, SkipBack, SkipForward, Pause } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { TerminalIcon, type TerminalIconHandle } from "./TerminalIcon";
import { profileData } from "@/config/profile";

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
type TextLine = { id: number; type: "text"; text: string; dim?: boolean };
type LinkLine = { id: number; type: "link"; label: string; href: string; external?: boolean };
type Line = TextLine | LinkLine;

let _id = 0;
const mkLine = (text: string, dim = false): TextLine => ({ id: _id++, type: "text", text, dim });
const mkLink = (label: string, href: string, external = false): LinkLine => ({ id: _id++, type: "link", label, href, external });

const BOOT: Line[] = [
  mkLine("jordidimas terminal", true),
  mkLine('type "help" for available commands.', true),
];

// ─── Inline link parser ([label](url) markdown → React nodes) ─────────────────
function parseInlineLinks(text: string, router: ReturnType<typeof useRouter>): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!m) return <span key={i}>{part}</span>;
    const [, label, href] = m;
    const external = href.startsWith("http");
    return (
      <a key={i} href={href}
        target={external ? "_blank" : "_self"}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={external ? undefined : (e) => { e.preventDefault(); router.push(href); }}
        style={{ color: C.accent, textDecoration: "none" }}
        className="hover:underline hover:opacity-75 transition-opacity duration-150 cursor-pointer"
      >{label}</a>
    );
  });
}

// ─── Desktop sizes ─────────────────────────────────────────────────────────────
const MIN_W = 340;
const MIN_H = 220;
const DEFAULT_W = 500;
const DEFAULT_H = 380;

// ─── Stable transport ──────────────────────────────────────────────────────────
const transport = new DefaultChatTransport({ api: "/api/terminal" });

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// ─── Shared output + input (used by both layouts) ─────────────────────────────
function OutputArea({
  lines, status, outputRef,
}: {
  lines: Line[];
  status: string;
  outputRef: React.RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  return (
    <div
      ref={outputRef}
      className="flex-1 overflow-y-auto px-4 py-3"
      style={{ scrollbarWidth: "none" }}
    >
      {lines.map((l) => {
        if (l.type === "link") {
          return (
            <a
              key={l.id}
              href={l.href}
              target={l.external ? "_blank" : "_self"}
              rel={l.external ? "noopener noreferrer" : undefined}
              onClick={l.external ? undefined : (e) => { e.preventDefault(); router.push(l.href); }}
              style={{ color: C.accent, textDecoration: "none", display: "block", fontSize: 12 }}
              className="hover:underline hover:opacity-75 transition-opacity duration-150 cursor-pointer leading-5"
            >
              {l.label}
            </a>
          );
        }
        return (
          <div
            key={l.id}
            className="leading-5 whitespace-pre-wrap break-words"
            style={{ fontSize: 12, color: l.dim ? C.muted : C.text }}
          >
            {parseInlineLinks(l.text, router)}
          </div>
        );
      })}
      {status === "streaming" && (
        <span className="animate-pulse" style={{ fontSize: 12, color: C.muted }}>▌</span>
      )}
    </div>
  );
}

function MusicBar({
  playing, trackDisplay, remaining, progress, switchTrack, togglePlay,
}: {
  playing: boolean;
  trackDisplay: TrackKey;
  remaining: number;
  progress: number;
  switchTrack: (dir: 1 | -1) => void;
  togglePlay: () => void;
}) {
  if (!playing) return null;
  return (
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
          <SkipBack size={10} style={{ transform: "scaleX(-1)" }} />
        </button>
        <span className="flex-1 truncate" style={{ fontSize: 10, color: C.muted }}>
          {TRACKS[trackDisplay].title}
        </span>
        <span style={{ fontSize: 10, color: C.muted }}>{fmtTime(remaining)}</span>
      </div>
      <div className="h-px w-full shrink-0" style={{ background: C.dim }}>
        <div style={{ width: `${progress}%`, height: "100%", background: C.accent }} />
      </div>
    </>
  );
}

function InputRow({
  input, setInput, onKey, onSubmit, inputRef, isMobile,
}: {
  input: string;
  setInput: (v: string) => void;
  onKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isMobile: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 shrink-0"
      style={{ borderTop: `1px solid ${C.border}`, ...(isMobile && { height: "60px" }) }}
    >
      <span style={{ fontSize: 12, color: C.accent, userSelect: "none" }}>&gt;</span>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        className="flex-1 bg-transparent border-none outline-none"
        style={{ fontSize: 16, color: C.text, caretColor: C.accent }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Terminal input"
      />
      {isMobile && (
        <button
          onPointerDown={(e) => { e.preventDefault(); onSubmit(); }}
          style={{ color: input.trim() ? C.accent : C.muted, lineHeight: 0, transition: "color 150ms", padding: "6px 2px", width: "21px" }}
          aria-label="Submit"
        >
          <svg width="24" height="24" viewBox="0 0 14 14" fill="none">
            <path d="M1 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function FloatingTerminal() {
  const pathname = usePathname();
  const router = useRouter();

  // ── Mobile detection (same pattern as matrixComponent) ──────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  // When the user closes via Escape, skip exit animation.
  const [instantClose, setInstantClose] = useState(false);
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Line[]>(BOOT);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  // Desktop: position & size
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  // Desktop: drag
  const [dragging, setDragging] = useState(false);
  const dragOffRef = useRef({ x: 0, y: 0 });

  // Desktop: resize
  const [resizing, setResizing] = useState(false);
  const resizeOrigin = useRef({ mx: 0, my: 0, w: DEFAULT_W, h: DEFAULT_H });

  // Mobile: swipe-to-dismiss
  const swipeStartY = useRef<number | null>(null);

  // Audio — fully imperative, no src prop on <audio>
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<TrackKey>("rave_zion");
  const [trackDisplay, setTrackDisplay] = useState<TrackKey>("rave_zion");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<TerminalIconHandle>(null);
  const lastMsgId = useRef<string | null>(null);

  const { messages, sendMessage, status } = useChat({ id: "ft", transport });

  // ── Audio init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = TRACKS[trackRef.current].src;
    audio.load();
  }, []);

  // ── AI stream → lines ────────────────────────────────────────────────────────
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

  // ── Focus on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── open-terminal event ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("open-terminal", handler);
    return () => window.removeEventListener("open-terminal", handler);
  }, []);

  // ── Global toggle: Cmd+Shift+K / Ctrl+Shift+K ───────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mac = navigator.platform.toUpperCase().includes("MAC");
      const isToggle = (mac ? e.metaKey : e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k";
      if (!isToggle) return;

      // Don't steal the shortcut while typing or when cmdk is open.
      if (document.querySelector("[cmdk-dialog]")) return;
      const el = (e.target instanceof Element ? e.target : null) ?? (document.activeElement instanceof Element ? document.activeElement : null);
      if (el) {
        const tag = el.tagName;
        const isEditable = (el as HTMLElement).isContentEditable;
        if (isEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }

      e.preventDefault();
      setInstantClose(false);
      setIsOpen((v) => !v);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Clear instant-close flag when opened.
  useEffect(() => {
    if (isOpen) setInstantClose(false);
  }, [isOpen]);

  // ── Keybinds: Cmd/Ctrl+K → clear; Escape → close ───────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      const mac = navigator.platform.toUpperCase().includes("MAC");
      if ((mac ? e.metaKey : e.ctrlKey) && e.key === "k") {
        const el = (e.target instanceof Element ? e.target : null) ?? (document.activeElement instanceof Element ? document.activeElement : null);
        // Only clear when the keystroke came from inside the terminal UI.
        if (!el?.closest?.("[data-jd-terminal]")) return;
        // Let the command palette intercept Cmd+K when it's open
        if (document.querySelector("[cmdk-dialog]")) return;
        e.preventDefault();
        setLines([]);
        lastMsgId.current = null;
      } else if (e.key === "Escape") {
        setInstantClose(true);
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // ── Icon blink ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) iconRef.current?.startAnimation();
    else iconRef.current?.stopAnimation();
  }, [isOpen]);

  // ── Audio progress ───────────────────────────────────────────────────────────
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

  // ── Audio auto-advance ───────────────────────────────────────────────────────
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

  // ── Desktop: unified drag & resize ───────────────────────────────────────────
  useEffect(() => {
    if (!dragging && !resizing) return;
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        setPos({ x: e.clientX - dragOffRef.current.x, y: e.clientY - dragOffRef.current.y });
      } else {
        const { mx, my, w, h } = resizeOrigin.current;
        setSize({ w: Math.max(MIN_W, w + (e.clientX - mx)), h: Math.max(MIN_H, h + (e.clientY - my)) });
      }
    };
    const onUp = () => { setDragging(false); setResizing(false); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [dragging, resizing]);

  // ── Audio helpers ─────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }, [playing]);

  const switchTrack = useCallback(async (dir: 1 | -1): Promise<TrackKey> => {
    const audio = audioRef.current;
    if (!audio) return trackRef.current;
    const wasPlaying = playing;
    const idx = TRACK_ORDER.indexOf(trackRef.current);
    const next = TRACK_ORDER[(idx + dir + TRACK_ORDER.length) % TRACK_ORDER.length];
    audio.pause(); setPlaying(false);
    trackRef.current = next; setTrackDisplay(next);
    audio.src = TRACKS[next].src; audio.load();
    if (wasPlaying) {
      try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
    }
    return next;
  }, [playing]);

  // ── Music control events from CommandPalette ─────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => { audio.play().then(() => setPlaying(true)).catch(() => {}); };
    const onPause = () => { audio.pause(); setPlaying(false); };
    const onNext = () => switchTrack(1);
    const onPrev = () => switchTrack(-1);
    const onTrack = (e: Event) => {
      const key = (e as CustomEvent<{ track: TrackKey }>).detail?.track;
      if (!key || !TRACKS[key]) return;
      audio.pause(); setPlaying(false);
      trackRef.current = key; setTrackDisplay(key);
      audio.src = TRACKS[key].src; audio.load();
      audio.play().then(() => setPlaying(true)).catch(() => {});
    };

    window.addEventListener("music-play", onPlay);
    window.addEventListener("music-pause", onPause);
    window.addEventListener("music-next", onNext);
    window.addEventListener("music-prev", onPrev);
    window.addEventListener("music-track", onTrack);
    return () => {
      window.removeEventListener("music-play", onPlay);
      window.removeEventListener("music-pause", onPause);
      window.removeEventListener("music-next", onNext);
      window.removeEventListener("music-prev", onPrev);
      window.removeEventListener("music-track", onTrack);
    };
  }, [switchTrack]);

  // ── Command processor ─────────────────────────────────────────────────────────
  const run = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    setCmdHistory((h) => [...h, cmd]);
    setHistIdx(-1);
    setLines((prev) => [...prev, mkLine(`> ${cmd}`)]);
    const lo = cmd.toLowerCase();

    if (lo === "help") {
      setLines((prev) => [...prev,
        mkLine("available commands:", true),
        mkLine("  ask <query>      ask the AI a question"),
        mkLine("  links            show social & profile links"),
        mkLine("  neofetch         system info"),
        mkLine("  whoami           about jordi"),
        mkLine("  play             start audio playback"),
        mkLine("  pause            pause playback"),
        mkLine("  next             next track"),
        mkLine("  prev             previous track"),
        mkLine("  pages            show all site pages"),
        mkLine("  toggle-matrix    open the matrix"),
        mkLine("  clear            clear terminal  (Cmd/Ctrl+K)"),
        mkLine("  exit             close terminal"),
      ]); return;
    }
    if (lo === "pages") {
      setLines((prev) => [...prev,
        mkLine("site pages:", true),
        mkLink("  home", "/"),
        mkLink("  blog", "/blog"),
        mkLink("  gallery", "/gallery"),
        mkLink("  about", "/about"),
        mkLink("  connect", "/connect"),
      ]); return;
    }
    if (lo === "links") {
      setLines((prev) => [...prev,
        mkLine("social:", true),
        ...profileData.socials.map((s) => mkLink(`  ${s.title}`, s.href, true)),
        mkLine(""),
        mkLine("around the web:", true),
        ...profileData.links.map((l) => mkLink(`  ${l.title}`, l.href, true)),
      ]); return;
    }
    if (lo === "whoami") {
      setLines((prev) => [...prev,
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
      ]); return;
    }
    if (lo === "clear") { setLines([]); lastMsgId.current = null; return; }
    if (lo === "exit") {
      setLines((prev) => [...prev, mkLine("closing terminal...", true)]);
      setTimeout(() => setIsOpen(false), 600); return;
    }
    if (lo === "toggle-matrix") {
      setLines((prev) => [...prev, mkLine("entering the matrix...", true)]);
      setTimeout(() => router.push("/matrix"), 700); return;
    }
    if (lo === "play") {
      const audio = audioRef.current;
      if (!audio) return;
      if (!playing) audio.play().then(() => setPlaying(true)).catch(() => {});
      setLines((prev) => [...prev, mkLine(`playing: ${TRACKS[trackRef.current].title}`)]); return;
    }
    if (lo === "pause") {
      if (playing) togglePlay();
      setLines((prev) => [...prev, mkLine("paused")]); return;
    }
    if (lo === "next") {
      const next = await switchTrack(1);
      setLines((prev) => [...prev, mkLine(`→ ${TRACKS[next].title}`)]); return;
    }
    if (lo === "prev") {
      const prev = await switchTrack(-1);
      setLines((prev2) => [...prev2, mkLine(`→ ${TRACKS[prev].title}`)]); return;
    }
    if (lo === "neofetch") {
      const art = ["                    λ","                   λλ","                  λλλ","                 λλλλ","                λλλλλ","               λλλλλλ","              λλλλλλλ"];
      const info = ["jordidimas@web","--------------","OS     Next.js App Router","Shell  React 19","DE     Tailwind CSS v4","AI     Vercel AI SDK v6","DB     Supabase"];
      setLines((prev) => [...prev, ...art.map((a, i) => mkLine(`${a.padEnd(24)}  ${info[i] ?? ""}`)), mkLine(""), mkLine("Host   jordidimas.dev", true)]);
      return;
    }
    if (lo.startsWith("ask ")) {
      const q = cmd.slice(4).trim();
      if (!q) { setLines((prev) => [...prev, mkLine("usage: ask <your question>", true)]); return; }
      sendMessage({ text: q }); return;
    }
    setLines((prev) => [
      ...prev,
      mkLine(`command not found: ${cmd}`, true),
      mkLine('type "help" for available commands.', true),
    ]);
  }, [playing, switchTrack, togglePlay, sendMessage, router]);

  // ── Keyboard handler ──────────────────────────────────────────────────────────
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      if (!cmdHistory.length) return;
      const idx = histIdx === -1 ? cmdHistory.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx); setInput(cmdHistory[idx]);
    } else if (e.key === "ArrowDown") {
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= cmdHistory.length) { setHistIdx(-1); setInput(""); }
      else { setHistIdx(idx); setInput(cmdHistory[idx]); }
    } else if (e.key === "Enter") { run(input); setInput(""); }
  };

  const onSubmit = () => { if (input.trim()) { run(input); setInput(""); } };

  // ── Desktop drag/resize starters ─────────────────────────────────────────────
  const onDragStart = (e: React.MouseEvent) => {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos((p) => p ?? { x: rect.left, y: rect.top });
    dragOffRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };
  const onResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizeOrigin.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    setResizing(true);
  };

  // ── Mobile swipe-to-dismiss ───────────────────────────────────────────────────
  const onPillTouchStart = (e: React.TouchEvent) => {
    swipeStartY.current = e.touches[0].clientY;
  };
  const onPillTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - swipeStartY.current;
    if (dy > 80) setIsOpen(false); // swipe down > 80px → close
    swipeStartY.current = null;
  };

  // ── Hide on /matrix ───────────────────────────────────────────────────────────
  if (pathname === "/matrix") return null;

  const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  const sharedPanelStyle: React.CSSProperties = { background: C.bg, fontFamily: mono, userSelect: "none" };

  const desktopPanelStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : { right: 24, bottom: 80 };

  return (
    <>
      {/* ── Toggle button ── */}
      <button
        onClick={() => {
          setInstantClose(false);
          setIsOpen((o) => !o);
        }}
        className="fixed bottom-6 right-6 z-50 hover:text-neutral-200 transition-colors duration-200"
        style={{ color: "rgba(255, 136, 0, 1)", lineHeight: 0, minWidth: isMobile ? 44 : undefined, minHeight: isMobile ? 44 : undefined, display: "flex", alignItems: "center", justifyContent: "center" }}
        aria-label="Toggle terminal"
      >
        <TerminalIcon ref={iconRef} size={22} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* ── Mobile backdrop ── */}
              {isMobile && (
                <motion.div
                  key="backdrop"
                  className="fixed inset-0 z-40"
                  style={{ background: "rgba(0,0,0,0.5)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={instantClose ? { duration: 0 } : { duration: 0.2 }}
                  onClick={() => {
                    setInstantClose(false);
                    setIsOpen(false);
                  }}
                />
              )}

             {isMobile ? (
               /* ── Mobile: bottom sheet ──────────────────────────────────────── */
               <motion.div
                 key="sheet"
                 data-jd-terminal=""
                 ref={panelRef}
                 initial={{ y: "100%" }}
                 animate={{ y: 0 }}
                 exit={{ y: "100%" }}
                 transition={instantClose ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 300 }}
                 className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
                 style={{
                   ...sharedPanelStyle,
                   height: "65vh",
                  borderTop: `1px solid ${C.border}`,
                  borderLeft: `1px solid ${C.border}`,
                  borderRight: `1px solid ${C.border}`,
                  borderRadius: "16px 16px 0 0",
                  boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
                }}
                onClick={() => inputRef.current?.focus()}
              >
                {/* Drag pill — swipe down to dismiss */}
                <div
                  className="shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab"
                  onTouchStart={onPillTouchStart}
                  onTouchEnd={onPillTouchEnd}
                >
                  <div
                    className="rounded-full"
                    style={{ width: 36, height: 4, background: C.muted }}
                  />
                </div>

                {/* Title row */}
                <div
                  className="shrink-0 flex items-center justify-between px-5 pb-2"
                >
                  <span style={{ color: C.muted, fontSize: 11, letterSpacing: "0.1em" }}>terminal</span>
                   <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInstantClose(false);
                      setIsOpen(false);
                    }}
                    style={{ color: C.muted, lineHeight: 0 }}
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ borderTop: `1px solid ${C.border}` }} />

                <OutputArea lines={lines} status={status} outputRef={outputRef} />
                <MusicBar playing={playing} trackDisplay={trackDisplay} remaining={remaining} progress={progress} switchTrack={switchTrack} togglePlay={togglePlay} />
                <InputRow input={input} setInput={setInput} onKey={onKey} onSubmit={onSubmit} inputRef={inputRef} isMobile={isMobile} />
              </motion.div>
            ) : (
              /* ── Desktop: floating panel ───────────────────────────────────── */
              <motion.div
                key="panel"
                data-jd-terminal=""
                ref={panelRef}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={instantClose ? { duration: 0 } : { duration: 0.14, ease: "easeOut" }}
                className="fixed z-50 flex flex-col"
                style={{
                  ...sharedPanelStyle,
                  ...desktopPanelStyle,
                  width: size.w,
                  height: size.h,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 16px 56px rgba(0,0,0,0.75)",
                }}
                onClick={() => inputRef.current?.focus()}
              >
                {/* Header / drag handle */}
                <div
                  className="flex items-center justify-between px-4 py-2 cursor-move shrink-0"
                  style={{ borderBottom: `1px solid ${C.border}` }}
                  onMouseDown={onDragStart}
                >
                  <span style={{ color: C.muted, fontSize: 11, letterSpacing: "0.1em" }}>terminal</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInstantClose(false);
                      setIsOpen(false);
                    }}
                    style={{ color: C.muted, lineHeight: 0 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                    aria-label="Close"
                  >
                    <X size={12} />
                  </button>
                </div>

                <OutputArea lines={lines} status={status} outputRef={outputRef} />
                <MusicBar playing={playing} trackDisplay={trackDisplay} remaining={remaining} progress={progress} switchTrack={switchTrack} togglePlay={togglePlay} />
                <InputRow input={input} setInput={setInput} onKey={onKey} onSubmit={onSubmit} inputRef={inputRef} isMobile={isMobile} />

                {/* Resize grip */}
                <div
                  className="absolute bottom-0 right-0 cursor-se-resize flex items-end justify-end p-1"
                  style={{ width: 20, height: 20 }}
                  onMouseDown={onResizeStart}
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <circle cx="7.5" cy="7.5" r="1" fill={C.muted} />
                    <circle cx="4.5" cy="7.5" r="1" fill={C.muted} />
                    <circle cx="7.5" cy="4.5" r="1" fill={C.muted} />
                  </svg>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Audio — no src prop, managed imperatively */}
      <audio ref={audioRef} />
    </>
  );
}
