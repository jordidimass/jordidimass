"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { motion, AnimatePresence } from "motion/react";
import { X, SkipBack, SkipForward, Pause, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { TerminalIcon, type TerminalIconHandle } from "./TerminalIcon";
import MusicPlayer from "./MusicPlayer";
import AskSurface from "./AskSurface";
import MobileAskDock from "./MobileAskDock";
import { parseInlineLinks } from "./TerminalMarkdown";
import { C, MONO } from "./vesper";
import { profileData } from "@/config/profile";
import { useMotionContext } from "@/components/MotionProvider";
import { isInternalRoute } from "@/lib/siteRoutes";
import { slugFromKey } from "@/lib/gallery";
import { execute, completionsFor, lookup, signature, type CommandContext, type OutputLine } from "@/lib/commands";
import { EASE_OUT } from "@/lib/motion";
import { TRACKS, TRACK_ORDER, type TrackKey } from "@/config/music";

// ─── Output lines ──────────────────────────────────────────────────────────────
type TextLine = { id: number; type: "text"; text: string; dim?: boolean };
type LinkLine = { id: number; type: "link"; label: string; href: string; external?: boolean };
type Line = TextLine | LinkLine;

let _id = 0;
const mkLine = (text: string, dim = false): TextLine => ({ id: _id++, type: "text", text, dim });
const mkLink = (label: string, href: string, external = false): LinkLine => ({ id: _id++, type: "link", label, href, external });

const toLine = (o: OutputLine): Line => {
  if (o.kind === "link") return mkLink(o.label, o.href, o.external);
  if (o.kind === "action") return mkLine(o.label);
  return mkLine(o.text, o.dim);
};

const BOOT: Line[] = [
  mkLine("jordidimas terminal", true),
  mkLine('type "help" for available commands.', true),
];

// ─── Desktop sizes ─────────────────────────────────────────────────────────────
const MIN_W = 340;
const MIN_H = 220;
const DEFAULT_W = 500;
const DEFAULT_H = 380;

// ─── Stable transport ──────────────────────────────────────────────────────────
const transport = new DefaultChatTransport({ api: "/api/terminal" });

// ─── Site tools (executed here, in the browser) ───────────────────────────────
type ClientToolName = "navigate" | "runCommand" | "openExternal";

type SiteOps = {
  navigate: (path: string) => string;
  runCommand: (command: string) => Promise<string>;
  openExternal: (input: { url: string; label: string }) => string;
};

/**
 * The model only ever gets to move the visitor around this site. Anything that
 * is not a same-origin path is refused before it reaches the router, so a bad
 * or hallucinated argument cannot turn into an off-site redirect.
 */
function safeInternalPath(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.trim();
  if (!isInternalRoute(path)) return null;
  try {
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

function findTrack(query: string): TrackKey | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    TRACK_ORDER.find((k) => TRACKS[k].title.toLowerCase() === q) ??
    TRACK_ORDER.find((k) => TRACKS[k].title.toLowerCase().includes(q)) ??
    null
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function pickRandomTrack(exclude: TrackKey): TrackKey {
  const pool = TRACK_ORDER.filter((k) => k !== exclude);
  if (pool.length === 0) return exclude;
  return pool[Math.floor(Math.random() * pool.length)];
}

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return "--:--";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// ─── Shared output + input (used by both layouts) ─────────────────────────────
function LogRows({ lines }: { lines: Line[] }) {
  const router = useRouter();
  return (
    <>
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
    </>
  );
}

function OutputArea({
  lines, outputRef, onScroll,
}: {
  lines: Line[];
  outputRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}) {
  return (
    <div
      ref={outputRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-4 py-3"
      style={{ scrollbarWidth: "none" }}
    >
      <LogRows lines={lines} />
    </div>
  );
}

function MusicBar({
  playing, trackDisplay, remaining, progress, switchTrack, togglePlay, onSelectTrack,
}: {
  playing: boolean;
  trackDisplay: TrackKey;
  remaining: number;
  progress: number;
  switchTrack: (dir: 1 | -1) => void;
  togglePlay: () => void;
  onSelectTrack: (key: TrackKey) => void;
}) {
  const [open, setOpen] = useState(false);
  // Nothing to fold away once the bar is gone.
  useEffect(() => { if (!playing) setOpen(false); }, [playing]);
  if (!playing) return null;
  return (
    <>
      {/* Unfolds upward off the bar, same accordion as the blog's mobile TOC. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="shrink-0 overflow-hidden"
            style={{ borderTop: `1px solid ${C.border}` }}
          >
            <div className="overflow-y-auto" style={{ maxHeight: 132, scrollbarWidth: "none" }}>
              {TRACK_ORDER.map((key) => {
                const active = key === trackDisplay;
                return (
                  <button
                    key={key}
                    onClick={(e) => { e.stopPropagation(); onSelectTrack(key); }}
                    className="w-full flex items-center gap-2 px-4 py-1.5 text-left"
                    style={{ fontSize: 11, color: active ? C.accent : C.muted }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = C.text; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = C.muted; }}
                  >
                    <span style={{ width: 10, flexShrink: 0 }}>{active ? "▸" : ""}</span>
                    <span className="truncate">{TRACKS[key].title}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          aria-expanded={open}
          aria-label={open ? "Hide playlist" : "Show playlist"}
          className="flex-1 min-w-0 flex items-center gap-1.5 text-left"
          style={{ fontSize: 10, color: open ? C.text : C.muted, transition: "color 150ms var(--ease-out)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = open ? C.text : C.muted)}
        >
          <span className="truncate">{TRACKS[trackDisplay].title}</span>
          <ChevronDown
            size={9}
            className={`transition-transform duration-200 ${open ? "" : "rotate-180"}`}
            style={{ flexShrink: 0 }}
          />
        </button>
        <span style={{ fontSize: 10, color: C.muted }}>{fmtTime(remaining)}</span>
      </div>
      <div className="h-px w-full shrink-0" style={{ background: C.dim }}>
        <div style={{ width: `${progress}%`, height: "100%", background: C.accent }} />
      </div>
    </>
  );
}

function InputRow({
  input, setInput, onKey, onSubmit, inputRef, isMobile, askMode, hint, completions, histSearch,
}: {
  input: string;
  setInput: (v: string) => void;
  onKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isMobile: boolean;
  askMode: boolean;
  hint?: string | null;
  completions?: string[];
  histSearch?: string | null;
}) {
  return (
    <div className="shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
    {completions && completions.length > 0 && (
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 pt-2" style={{ fontSize: 11, color: C.muted }}>
        {completions.map((c) => <span key={c}>{c}</span>)}
      </div>
    )}
    {hint && (
      <div className="px-4 pt-2 truncate" style={{ fontSize: 11, color: C.muted }}>{hint}</div>
    )}
    {histSearch !== null && histSearch !== undefined && (
      <div className="px-4 pt-2" style={{ fontSize: 11, color: C.accent }}>
        history search: {histSearch || "…"}  <span style={{ color: C.muted }}>enter to run · esc to cancel</span>
      </div>
    )}
    <div
      className="flex items-center gap-2 px-4 py-2"
      style={{ ...(isMobile && { height: "60px" }) }}
    >
      {/* λ is the matrix terminal's mark — same glyph, terminal accent. */}
      <span
        style={{
          fontSize: askMode ? 14 : 12,
          lineHeight: 1,
          color: C.accent,
          userSelect: "none",
          transition: "opacity 140ms var(--ease-out)",
        }}
      >
        {askMode ? "λ" : ">"}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        className="flex-1 bg-transparent border-none outline-none"
        style={{ fontSize: 16, color: C.text, caretColor: C.accent }}
        placeholder={askMode ? "ask a follow-up…" : ""}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={askMode ? "Ask input" : "Terminal input"}
      />
      {askMode && !isMobile && (
        <span
          className="flex items-center gap-1.5"
          style={{ fontSize: 10, color: C.muted, userSelect: "none", flexShrink: 0 }}
        >
          esc ·<span style={{ fontSize: 15, lineHeight: 1 }}>⏎</span>
        </span>
      )}
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
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function FloatingTerminal() {
  const pathname = usePathname();
  const router = useRouter();
  const { motionEnabled, toggleMotion } = useMotionContext();

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
  const bootCleared = useRef(false);
  useEffect(() => {
    if (!isMobile || bootCleared.current) return;
    bootCleared.current = true;
    setLines((prev) => (prev === BOOT ? [] : prev));
  }, [isMobile]);
  // Ask mode swaps the whole output surface for the chat view. The terminal log
  // is kept intact underneath and comes back on exit.
  const [askMode, setAskMode] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [completions, setCompletions] = useState<string[]>([]);
  const [histSearch, setHistSearch] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("jd-cmd-history");
      if (saved) setCmdHistory(JSON.parse(saved).slice(-100));
    } catch {}
  }, []);

  useEffect(() => {
    if (!cmdHistory.length) return;
    try {
      localStorage.setItem("jd-cmd-history", JSON.stringify(cmdHistory.slice(-100)));
    } catch {}
  }, [cmdHistory]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key && !postsRef.current.length) {
      fetch(`${url}/rest/v1/posts?select=slug,title,date&order=date.desc`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: { slug: string; title: string }[]) => {
          if (!cancelled) postsRef.current = rows ?? [];
        })
        .catch(() => {});
    }

    const worker = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL;
    if (worker && !photoSlugsRef.current.length) {
      fetch(worker)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { images?: { key: string }[] } | null) => {
          if (!cancelled && data?.images) {
            photoSlugsRef.current = data.images.map((i) => slugFromKey(i.key));
          }
        })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, [isOpen]);

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
  const trackRef = useRef<TrackKey>(TRACK_ORDER[0]);
  const [trackDisplay, setTrackDisplay] = useState<TrackKey>(TRACK_ORDER[0]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [duration, setDuration] = useState(0);
  const [musicStarted, setMusicStarted] = useState(false);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  useEffect(() => {
    if (isOpen || !musicStarted) setPlayerExpanded(false);
  }, [isOpen, musicStarted]);
  useEffect(() => { if (playing) setMusicStarted(true); }, [playing]);
  const [shuffle, setShuffle] = useState(false);
  const shuffleRef = useRef(false);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  const shuffleHistoryRef = useRef<TrackKey[]>([]);
  const [loop, setLoop] = useState(false);
  const loopRef = useRef(false);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  const panelRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<TerminalIconHandle>(null);
  const outputPinned = useRef(true);
  const photoSlugsRef = useRef<string[]>([]);
  const postsRef = useRef<{ slug: string; title: string }[]>([]);

  // The tool handlers below need callbacks that are defined further down this
  // component. useChat captures onToolCall once, so it reads them through a ref
  // that every render keeps current.
  const siteOpsRef = useRef<SiteOps | null>(null);

  const { messages, sendMessage, status, addToolOutput, addToolApprovalResponse } = useChat({
    id: "ft",
    transport,
    sendAutomaticallyWhen: ({ messages }) =>
      lastAssistantMessageIsCompleteWithToolCalls({ messages }) ||
      lastAssistantMessageIsCompleteWithApprovalResponses({ messages }),
    onToolCall: async ({ toolCall }): Promise<void> => {
      const ops = siteOpsRef.current;
      const name = toolCall.toolName as ClientToolName;
      const toolCallId = toolCall.toolCallId;
      const fail = (errorText: string): void => {
        addToolOutput({ state: "output-error", tool: name, toolCallId, errorText });
      };
      const done = (output: string): void => {
        addToolOutput({ tool: name, toolCallId, output });
      };

      if (!ops) { fail("terminal not ready"); return; }

      try {
        if (name === "navigate") {
          done(ops.navigate((toolCall.input as { path: string }).path));
        } else if (name === "runCommand") {
          done(await ops.runCommand((toolCall.input as { command: string }).command));
        } else if (name === "openExternal") {
          done(ops.openExternal(toolCall.input as { url: string; label: string }));
        } else {
          fail(`unknown tool: ${String(name)}`);
        }
      } catch (err) {
        fail(err instanceof Error ? err.message : "tool failed");
      }
    },
  });

  const ensureAudioSrc = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return null;
    if (!audio.src) {
      audio.src = TRACKS[trackRef.current].src;
      audio.load();
    }
    return audio;
  }, []);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  // Follow new output only while the reader is already at the bottom.
  useEffect(() => {
    const el = outputRef.current;
    if (el && outputPinned.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const onOutputScroll = useCallback(() => {
    const el = outputRef.current;
    if (!el) return;
    outputPinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  }, []);

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

  // ── Keybinds: Cmd/Ctrl+K → clear; Escape → leave ask mode, then close ──────
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
      } else if (e.key === "Escape") {
        // In ask mode the first Escape steps back to the terminal; only the
        // second one closes the panel.
        if (askMode) {
          e.preventDefault();
          setAskMode(false);
          return;
        }
        setInstantClose(true);
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, askMode]);

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
      setDuration(audio.duration || 0);
    };
    const onMeta = () => { setRemaining(audio.duration); setDuration(audio.duration || 0); };
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
      const current = trackRef.current;
      let next: TrackKey;
      if (shuffleRef.current) {
        shuffleHistoryRef.current.push(current);
        next = pickRandomTrack(current);
      } else {
        const idx = TRACK_ORDER.indexOf(current);
        const isLast = idx === TRACK_ORDER.length - 1;
        if (isLast && !loopRef.current) {
          setPlaying(false);
          return;
        }
        next = TRACK_ORDER[(idx + 1) % TRACK_ORDER.length];
      }
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
    else { ensureAudioSrc(); audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }, [playing]);

  const switchTrack = useCallback(async (dir: 1 | -1): Promise<TrackKey> => {
    const audio = audioRef.current;
    if (!audio) return trackRef.current;
    const wasPlaying = playing;
    const current = trackRef.current;
    let next: TrackKey;
    if (shuffleRef.current) {
      if (dir === 1) {
        shuffleHistoryRef.current.push(current);
        next = pickRandomTrack(current);
      } else {
        next = shuffleHistoryRef.current.pop() ?? pickRandomTrack(current);
      }
    } else {
      const idx = TRACK_ORDER.indexOf(current);
      next = TRACK_ORDER[(idx + dir + TRACK_ORDER.length) % TRACK_ORDER.length];
    }
    audio.pause(); setPlaying(false);
    trackRef.current = next; setTrackDisplay(next);
    audio.src = TRACKS[next].src; audio.load();
    if (wasPlaying) {
      try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
    }
    return next;
  }, [playing]);

  const playTrack = useCallback((key: TrackKey) => {
    const audio = audioRef.current;
    if (!audio || !TRACKS[key]) return;
    if (shuffleRef.current && trackRef.current !== key) shuffleHistoryRef.current.push(trackRef.current);
    audio.pause(); setPlaying(false);
    trackRef.current = key; setTrackDisplay(key);
    audio.src = TRACKS[key].src; audio.load();
    audio.play().then(() => setPlaying(true)).catch(() => {});
  }, []);

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = fraction * audio.duration;
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const toggleLoop = useCallback(() => setLoop((l) => !l), []);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    setPlaying(false);
    setMusicStarted(false);
  }, []);

  const commandCtx = useCallback((): CommandContext => ({
    navigate: (path) => router.push(path),
    openExternal: (url) => window.open(url, "_blank", "noopener,noreferrer"),
    print: (out) => setLines((prev) => [...prev, ...out.map(toLine)]),
    clear: () => setLines([]),
    closeTerminal: () => setIsOpen(false),
    enterAsk: (question) => {
      setAskMode(true);
      if (question) sendMessage({ text: question });
    },
    runCommand: (input) => execute(input, commandCtx()),
    music: {
      play: async () => {
        const audio = audioRef.current;
        if (!audio) return "the player is not available";
        if (playing) return `already playing ${TRACKS[trackRef.current].title}`;
        if (!musicStarted) {
          playTrack(TRACK_ORDER[0]);
          return `playing ${TRACKS[TRACK_ORDER[0]].title}`;
        }
        ensureAudioSrc();
        await audio.play().then(() => setPlaying(true)).catch(() => {});
        return `playing ${TRACKS[trackRef.current].title}`;
      },
      pause: () => {
        if (playing) togglePlay();
        return "paused";
      },
      next: async () => TRACKS[await switchTrack(1)].title,
      prev: async () => TRACKS[await switchTrack(-1)].title,
      select: (key) => { playTrack(key); return `playing ${TRACKS[key].title}`; },
      current: () => trackRef.current,
      playing: () => playing,
    },
    motion: { enabled: () => motionEnabled, toggle: toggleMotion },
    photoSlugs: () => photoSlugsRef.current,
    postSlugs: () => postsRef.current,
  }), [router, playing, musicStarted, playTrack, switchTrack, togglePlay, ensureAudioSrc, motionEnabled, toggleMotion, sendMessage]);

  useEffect(() => {
    siteOpsRef.current = {
      navigate: (path) => {
        const safe = safeInternalPath(path);
        if (!safe) return `refused: "${path}" is not a real page on this site. valid: / /blog /gallery /about /connect /matrix /posts/<slug> /gallery/<slug>`;
        router.push(safe);
        return `navigated to ${safe}`;
      },
      runCommand: async (command) => {
        setLines((prev) => [...prev, mkLine(`> ${command}`, true)]);
        return execute(command, commandCtx());
      },
      openExternal: ({ url, label }) => {
        if (!/^https:\/\//i.test(url)) return `refused: "${url}" is not an https link`;
        window.open(url, "_blank", "noopener,noreferrer");
        return `opened ${label}`;
      },
    };
  }, [router, commandCtx]);

  // ── Command processor ─────────────────────────────────────────────────────────
  const run = useCallback(async (raw: string) => {
    const line = raw.trim();
    if (!line) return;
    setCmdHistory((h) => (h[h.length - 1] === line ? h : [...h, line]));
    setHistIdx(-1);
    setLines((prev) => [...prev, mkLine(`> ${line}`)]);

    for (const step of line.split("&&").map((p) => p.trim()).filter(Boolean)) {
      try {
        await execute(step, commandCtx());
      } catch (err) {
        setLines((prev) => [...prev, mkLine(err instanceof Error ? err.message : "command failed", true)]);
        return;
      }
    }
  }, [commandCtx]);

  // ── Submit ────────────────────────────────────────────────────────────────────
  // In ask mode a bare line is a question. A leading "/" escapes back to the
  // command processor, so `/clear` and `/help` stay reachable without leaving.
  const submit = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) return;
    if (!askMode) { run(value); return; }
    if (value.startsWith("/")) { run(value.slice(1)); return; }
    setCmdHistory((h) => [...h, value]);
    setHistIdx(-1);
    sendMessage({ text: value });
  }, [askMode, run, sendMessage]);

  // ── Keyboard handler ──────────────────────────────────────────────────────────
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (askMode && !input.startsWith("/")) return;
      const raw = askMode ? input.slice(1) : input;
      const matches = completionsFor(raw, commandCtx());
      if (!matches.length) return;
      const parts = raw.split(/\s+/);
      const head = parts.length <= 1 ? "" : `${parts[0]} `;
      if (matches.length === 1) {
        setInput(`${askMode ? "/" : ""}${head}${matches[0]} `);
      } else {
        setCompletions(matches.slice(0, 12));
        const common = matches.reduce((acc, m) => {
          let i = 0;
          while (i < acc.length && i < m.length && acc[i].toLowerCase() === m[i].toLowerCase()) i++;
          return acc.slice(0, i);
        });
        if (common.length) setInput(`${askMode ? "/" : ""}${head}${common}`);
      }
      return;
    }

    if (e.ctrlKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      setHistSearch((v) => (v === null ? "" : v));
      return;
    }

    if (histSearch !== null) {
      if (e.key === "Escape") { e.preventDefault(); setHistSearch(null); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const hit = [...cmdHistory].reverse().find((c) => c.includes(histSearch));
        setHistSearch(null);
        if (hit) { submit(hit); setInput(""); }
        return;
      }
    }

    if (e.key === "ArrowUp") {
      if (!cmdHistory.length) return;
      e.preventDefault();
      const idx = histIdx === -1 ? cmdHistory.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx); setInput(cmdHistory[idx]);
    } else if (e.key === "ArrowDown") {
      if (histIdx === -1) return;
      e.preventDefault();
      const idx = histIdx + 1;
      if (idx >= cmdHistory.length) { setHistIdx(-1); setInput(""); }
      else { setHistIdx(idx); setInput(cmdHistory[idx]); }
    } else if (e.key === "Enter") {
      setCompletions([]);
      submit(input);
      setInput("");
    } else {
      setCompletions([]);
    }
  };

  const onSubmit = () => { if (input.trim()) { submit(input); setInput(""); } };

  useEffect(() => {
    const handler = (e: Event) => {
      const command = (e as CustomEvent<{ command?: string }>).detail?.command;
      if (!command) return;
      setIsOpen(true);
      void run(command);
    };
    window.addEventListener("terminal-run", handler);
    return () => window.removeEventListener("terminal-run", handler);
  }, [run]);

  const commandHint = (() => {
    const raw = askMode ? (input.startsWith("/") ? input.slice(1) : "") : input;
    const name = raw.trim().split(/\s+/)[0];
    if (!name) return null;
    const cmd = lookup(name);
    return cmd ? `${signature(cmd)} — ${cmd.summary}` : null;
  })();

  // Suggestion chips and the empty state send straight through.
  const onAskSend = useCallback((text: string) => {
    sendMessage({ text });
  }, [sendMessage]);

  const onApprove = useCallback((id: string, approved: boolean) => {
    addToolApprovalResponse({ id, approved });
  }, [addToolApprovalResponse]);

  const onRunCommand = useCallback((command: string) => {
    void run(command);
  }, [run]);

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
    // Mirrors Escape on desktop: the first swipe steps out of ask mode, the
    // next one dismisses the sheet.
    if (dy > 80) {
      if (askMode) setAskMode(false);
      else setIsOpen(false);
    }
    swipeStartY.current = null;
  };

  // ── Hide on /matrix ───────────────────────────────────────────────────────────
  if (pathname === "/matrix") return null;

  const sharedPanelStyle: React.CSSProperties = { background: C.bg, fontFamily: MONO, userSelect: "none" };

  const desktopPanelStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : { right: 24, bottom: 80 };

  const busy = status === "submitted" || status === "streaming";

  // Both layouts share the same header label and output surface.
  const titleNode = (
    <div className="flex items-center gap-2 min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={askMode ? "ask" : "terminal"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: EASE_OUT }}
          style={{ color: askMode ? C.text : C.muted, fontSize: 11, letterSpacing: "0.1em" }}
        >
          {askMode ? "ask mode" : "terminal"}
        </motion.span>
      </AnimatePresence>
      {askMode && (
        <motion.span
          aria-hidden
          animate={busy ? { opacity: [1, 0.35, 1] } : { opacity: 0.35 }}
          transition={busy
            ? { duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            : { duration: 0.14, ease: EASE_OUT }}
          style={{ width: 5, height: 5, borderRadius: 999, background: C.accent, flexShrink: 0 }}
        />
      )}
    </div>
  );

  const surface = (
    <AnimatePresence mode="wait" initial={false}>
      {askMode ? (
        <motion.div
          key="ask"
          initial={{ opacity: 0, y: motionEnabled ? 6 : 0, filter: motionEnabled ? "blur(2px)" : "blur(0px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{
            opacity: 0,
            filter: motionEnabled ? "blur(2px)" : "blur(0px)",
            transition: { duration: 0.14, ease: EASE_OUT },
          }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="flex-1 flex flex-col min-h-0"
        >
          <AskSurface
            messages={messages}
            status={status}
            motionEnabled={motionEnabled}
            onSend={onAskSend}
            onRunCommand={onRunCommand}
            onApprove={onApprove}
          />
        </motion.div>
      ) : (
        <motion.div
          key="log"
          initial={{ opacity: 0, y: motionEnabled ? 6 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="flex-1 flex flex-col min-h-0"
        >
          <OutputArea lines={lines} outputRef={outputRef} onScroll={onOutputScroll} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* ── Toggle button (desktop only) ── */}
      {!isMobile && (
        <button
          onClick={() => {
            setInstantClose(false);
            setIsOpen((o) => !o);
          }}
          className="jd-pressable fixed bottom-6 right-6 z-50 hover:text-neutral-200 transition-colors duration-200"
          style={{ color: "rgba(255, 136, 0, 1)", lineHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Toggle terminal"
        >
          <TerminalIcon ref={iconRef} size={22} />
        </button>
      )}

      {isMobile && (
        <MobileAskDock
          open={isOpen}
          onOpen={() => { setInstantClose(false); setIsOpen(true); }}
          onClose={() => setIsOpen(false)}
          messages={messages}
          status={status}
          motionEnabled={motionEnabled}
          onSend={onAskSend}
          onCommand={run}
          onApprove={onApprove}
          lead={lines.length ? <LogRows lines={lines} /> : null}
          hideTrigger={playerExpanded}
        />
      )}

      {/* ── Floating music player (hidden while the terminal panel is open) ── */}
      {musicStarted && !isOpen && (
        <MusicPlayer
          playing={playing}
          trackKey={trackDisplay}
          progress={progress}
          remaining={remaining}
          duration={duration}
          shuffle={shuffle}
          loop={loop}
          togglePlay={togglePlay}
          switchTrack={switchTrack}
          onSelectTrack={playTrack}
          onToggleShuffle={toggleShuffle}
          onToggleLoop={toggleLoop}
          onClose={closePlayer}
          seek={seek}
          isMobile={isMobile}
          expanded={playerExpanded}
          onExpandedChange={setPlayerExpanded}
          motionEnabled={motionEnabled}
        />
      )}

      <AnimatePresence>
        {isOpen && !isMobile && (
          <>
            {
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
                  {titleNode}
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

                {surface}
                <MusicBar playing={playing} trackDisplay={trackDisplay} remaining={remaining} progress={progress} switchTrack={switchTrack} togglePlay={togglePlay} onSelectTrack={playTrack} />
                <InputRow input={histSearch !== null ? histSearch : input} setInput={histSearch !== null ? setHistSearch : setInput} onKey={onKey} onSubmit={onSubmit} inputRef={inputRef} isMobile={isMobile} askMode={askMode} hint={commandHint} completions={completions} histSearch={histSearch} />

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
            }
          </>
        )}
      </AnimatePresence>

      {/* Audio — no src prop, managed imperatively */}
      <audio ref={audioRef} preload="none" />
    </>
  );
}
