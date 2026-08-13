"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
import { X, SkipBack, SkipForward, Pause } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { TerminalIcon, type TerminalIconHandle } from "./TerminalIcon";
import MusicPlayer from "./MusicPlayer";
import AskSurface from "./AskSurface";
import { parseInlineLinks } from "./TerminalMarkdown";
import { C, MONO } from "./vesper";
import { profileData } from "@/config/profile";
import { useMotionContext } from "@/components/MotionProvider";
import { EASE_OUT } from "@/lib/motion";
import { TRACKS, TRACK_ORDER, type TrackKey } from "@/config/music";

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

// ─── Desktop sizes ─────────────────────────────────────────────────────────────
const MIN_W = 340;
const MIN_H = 220;
const DEFAULT_W = 500;
const DEFAULT_H = 380;
const PULL_CUE_HEIGHT = 140;

// ─── Stable transport ──────────────────────────────────────────────────────────
const transport = new DefaultChatTransport({ api: "/api/terminal" });

// ─── Site tools (executed here, in the browser) ───────────────────────────────
type MusicToolInput = { action: "play" | "pause" | "next" | "previous"; track?: string };

type SiteOps = {
  navigate: (path: string) => string;
  music: (input: MusicToolInput) => Promise<string>;
  setAnimations: (enabled: boolean) => string;
};

/**
 * The model only ever gets to move the visitor around this site. Anything that
 * is not a same-origin path is refused before it reaches the router, so a bad
 * or hallucinated argument cannot turn into an off-site redirect.
 */
function safeInternalPath(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return null;
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
function OutputArea({
  lines, outputRef, onScroll,
}: {
  lines: Line[];
  outputRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}) {
  const router = useRouter();
  return (
    <div
      ref={outputRef}
      onScroll={onScroll}
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
  input, setInput, onKey, onSubmit, inputRef, isMobile, askMode,
}: {
  input: string;
  setInput: (v: string) => void;
  onKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isMobile: boolean;
  askMode: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 shrink-0"
      style={{ borderTop: `1px solid ${C.border}`, ...(isMobile && { height: "60px" }) }}
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
  // Ask mode swaps the whole output surface for the chat view. The terminal log
  // is kept intact underneath and comes back on exit.
  const [askMode, setAskMode] = useState(false);
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
  const trackRef = useRef<TrackKey>("volumes_dream");
  const [trackDisplay, setTrackDisplay] = useState<TrackKey>("volumes_dream");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [duration, setDuration] = useState(0);
  const [musicStarted, setMusicStarted] = useState(false);
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

  // The tool handlers below need callbacks that are defined further down this
  // component. useChat captures onToolCall once, so it reads them through a ref
  // that every render keeps current.
  const siteOpsRef = useRef<SiteOps | null>(null);

  const { messages, sendMessage, status, addToolResult } = useChat({
    id: "ft",
    transport,
    // Hand the tool output back and let the model speak after seeing it.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      const ops = siteOpsRef.current;
      const name = toolCall.toolName as keyof SiteOps;
      const done = (output: string) =>
        addToolResult({ tool: name, toolCallId: toolCall.toolCallId, output });

      if (!ops) {
        addToolResult({
          state: "output-error",
          tool: name,
          toolCallId: toolCall.toolCallId,
          errorText: "terminal not ready",
        });
        return;
      }

      try {
        switch (name) {
          case "navigate":
            done(ops.navigate((toolCall.input as { path: string }).path));
            return;
          case "music":
            done(await ops.music(toolCall.input as MusicToolInput));
            return;
          case "setAnimations":
            done(ops.setAnimations((toolCall.input as { enabled: boolean }).enabled));
            return;
          default:
            addToolResult({
              state: "output-error",
              tool: name,
              toolCallId: toolCall.toolCallId,
              errorText: `unknown tool: ${String(name)}`,
            });
        }
      } catch (err) {
        addToolResult({
          state: "output-error",
          tool: name,
          toolCallId: toolCall.toolCallId,
          errorText: err instanceof Error ? err.message : "tool failed",
        });
      }
    },
  });

  // ── Mobile: bottom-edge pull → open terminal (release to trigger) ───────────
  const vPullRaw = useMotionValue(0);
  const vPull = useSpring(vPullRaw, { stiffness: 520, damping: 44, mass: 0.8 });
  const vPullBottomH = useTransform(vPull, (v) => Math.max(0, Math.min(PULL_CUE_HEIGHT, -v)));
  const vPullBottomOpacity = useTransform(vPullBottomH, (h) => Math.min(0.95, h / 60));
  const vPullBottomY = useTransform(vPullBottomH, (h) => PULL_CUE_HEIGHT - h);
  const pullStart = useRef<{ x: number; y: number } | null>(null);
  const pullLastDy = useRef(0);
  const pullActiveDy = useRef(0);
  const pullDecided = useRef<"h" | "v" | null>(null);
  const vPullScrollEl = useRef<HTMLElement | null>(null);
  const vPullScrollMax = useRef(0);

  useEffect(() => {
    if (!isMobile) return;
    if (isOpen) return;

    const isEditableTarget = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName;
      return (el as HTMLElement).isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const getScrollableYAncestor = (el: Element | null): HTMLElement | null => {
      let cur: Element | null = el;
      while (cur && cur !== document.body) {
        const style = window.getComputedStyle(cur);
        const overflowY = style.overflowY;
        const node = cur as HTMLElement;
        if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
          return node;
        }
        cur = cur.parentElement;
      }

      const root = document.scrollingElement as HTMLElement | null;
      if (root && root.scrollHeight > root.clientHeight) return root;
      return null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (document.querySelector("[cmdk-dialog]")) return;
      if (document.querySelector("[data-jd-terminal]")) return;

      const target = e.target instanceof Element ? e.target : null;
      if (isEditableTarget(target)) return;

      const vScrollEl = getScrollableYAncestor(target);
      vPullScrollEl.current = vScrollEl;
      vPullScrollMax.current = vScrollEl ? Math.max(0, vScrollEl.scrollHeight - vScrollEl.clientHeight) : 0;

      const t = e.touches[0];
      pullStart.current = { x: t.clientX, y: t.clientY };
      pullLastDy.current = 0;
      pullActiveDy.current = 0;
      pullDecided.current = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pullStart.current) return;
      const t = e.touches[0];
      const dx = t.clientX - pullStart.current.x;
      const dy = t.clientY - pullStart.current.y;
      pullLastDy.current = dy;

      if (!pullDecided.current) {
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if (adx < 10 && ady < 10) return;
        pullDecided.current = adx > ady ? "h" : "v";
      }
      // Only act on vertical intent.
      if (pullDecided.current !== "v") return;

      const scrollEl = vPullScrollEl.current;
      if (scrollEl) {
        const max = vPullScrollMax.current;
        const top = scrollEl.scrollTop;
        const atBottom = top >= max - 0.5;
        const wantsPull = dy < 0 && atBottom;
        if (!wantsPull) {
          pullActiveDy.current = 0;
          vPullRaw.set(0);
          return;
        }
      } else {
        // No vertical scroll container: treat as already at the end.
        if (dy >= 0) {
          pullActiveDy.current = 0;
          vPullRaw.set(0);
          return;
        }
      }

      pullActiveDy.current = dy;
      vPullRaw.set(Math.max(-PULL_CUE_HEIGHT, Math.min(0, dy)));
    };

    const finish = () => {
      if (!pullStart.current) return;
      const dy = pullActiveDy.current;
      const shouldOpenY = pullDecided.current === "v" && Math.abs(dy) >= 120;
      const shouldOpen = shouldOpenY;
      pullStart.current = null;
      pullDecided.current = null;
      pullLastDy.current = 0;
      pullActiveDy.current = 0;
      vPullScrollEl.current = null;
      vPullScrollMax.current = 0;
      vPullRaw.set(0);
      if (shouldOpen) window.dispatchEvent(new CustomEvent("open-terminal"));
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", finish, { passive: true });
    window.addEventListener("touchcancel", finish, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", finish);
      window.removeEventListener("touchcancel", finish);
    };
  }, [isMobile, isOpen, vPullRaw]);

  // Apply a subtle global "rubber band" transform to the page while pulling.
  useEffect(() => {
    if (!isMobile) return;
    const main = document.querySelector("main");
    if (!(main instanceof HTMLElement)) return;

    const apply = (h: number) => {
      if (h <= 0) {
        main.style.transform = "";
        main.style.willChange = "";
        return;
      }
      const shift = Math.round(h * 0.22);
      const scale = Math.max(0.94, 1 - h / 1100);
      main.style.willChange = "transform";
      main.style.transform = `translate3d(0, ${-shift}px, 0) scaleY(${scale})`;
    };

    apply(0);
    const unsub = vPullBottomH.on("change", apply);
    return () => {
      unsub();
      main.style.transform = "";
      main.style.willChange = "";
    };
  }, [isMobile, vPullBottomH]);

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

  // ── Site tools, executed for real ────────────────────────────────────────────
  // Kept in a ref because useChat captured onToolCall on its first render.
  useEffect(() => {
    siteOpsRef.current = {
      navigate: (path) => {
        const safe = safeInternalPath(path);
        if (!safe) return `refused: "${path}" is not a page on this site`;
        router.push(safe);
        return `navigated to ${safe}`;
      },

      music: async ({ action, track }) => {
        const audio = audioRef.current;
        if (!audio) return "the player is not available";

        if (action === "pause") {
          if (!playing) return "already paused";
          togglePlay();
          return "paused";
        }
        if (action === "next") {
          const key = await switchTrack(1);
          return `playing ${TRACKS[key].title}`;
        }
        if (action === "previous") {
          const key = await switchTrack(-1);
          return `playing ${TRACKS[key].title}`;
        }

        if (track) {
          const key = findTrack(track);
          if (!key) return `no track matching "${track}". playlist: ${TRACK_ORDER.map((k) => TRACKS[k].title).join(", ")}`;
          playTrack(key);
          return `playing ${TRACKS[key].title}`;
        }
        if (playing) return `already playing ${TRACKS[trackRef.current].title}`;
        ensureAudioSrc();
        await audio.play().then(() => setPlaying(true)).catch(() => {});
        return `playing ${TRACKS[trackRef.current].title}`;
      },

      setAnimations: (enabled) => {
        if (enabled === motionEnabled) return `animations were already ${enabled ? "on" : "off"}`;
        toggleMotion();
        return `animations ${enabled ? "on" : "off"}`;
      },
    };
  }, [router, playing, togglePlay, switchTrack, playTrack, ensureAudioSrc, motionEnabled, toggleMotion]);

  // ── Music control events from CommandPalette ─────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => { ensureAudioSrc(); audio.play().then(() => setPlaying(true)).catch(() => {}); };
    const onPause = () => { audio.pause(); setPlaying(false); };
    const onNext = () => switchTrack(1);
    const onPrev = () => switchTrack(-1);
    const onTrack = (e: Event) => {
      const key = (e as CustomEvent<{ track: TrackKey }>).detail?.track;
      if (!key) return;
      playTrack(key);
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
  }, [switchTrack, playTrack]);

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
        mkLine("  ask              start a conversation  (esc to leave)"),
        mkLine("  ask <query>      start one with a question"),
        mkLine("  links            show social & profile links"),
        mkLine("  neofetch         system info"),
        mkLine("  whoami           who i am"),
        mkLine("  play             start audio playback"),
        mkLine("  pause            pause playback"),
        mkLine("  next             next track"),
        mkLine("  prev             previous track"),
        mkLine("  pages            show all site pages"),
        mkLine("  toggle-matrix    open the matrix"),
        mkLine("  animation        toggle animations on/off"),
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
    if (lo === "clear") { setLines([]); return; }
    if (lo === "exit") {
      setLines((prev) => [...prev, mkLine("closing terminal...", true)]);
      setTimeout(() => setIsOpen(false), 600); return;
    }
    if (lo === "toggle-matrix") {
      setLines((prev) => [...prev, mkLine("entering the matrix...", true)]);
      setTimeout(() => router.push("/matrix"), 700); return;
    }
    if (lo === "animation") {
      toggleMotion();
      const next = !motionEnabled;
      setLines((prev) => [...prev, mkLine(`animations ${next ? "on" : "off"}`, true)]);
      return;
    }
    if (lo === "play") {
      const audio = audioRef.current;
      if (!audio) return;
      if (!playing) { ensureAudioSrc(); audio.play().then(() => setPlaying(true)).catch(() => {}); }
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
    if (lo === "ask") { setAskMode(true); return; }
    if (lo.startsWith("ask ")) {
      const q = cmd.slice(4).trim();
      if (!q) { setAskMode(true); return; }
      setAskMode(true);
      sendMessage({ text: q });
      return;
    }
    setLines((prev) => [
      ...prev,
      mkLine(`command not found: ${cmd}`, true),
      mkLine('type "help" for available commands.', true),
    ]);
  }, [playing, switchTrack, togglePlay, sendMessage, router, motionEnabled, toggleMotion]);

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
    if (e.key === "ArrowUp") {
      if (!cmdHistory.length) return;
      const idx = histIdx === -1 ? cmdHistory.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx); setInput(cmdHistory[idx]);
    } else if (e.key === "ArrowDown") {
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= cmdHistory.length) { setHistIdx(-1); setInput(""); }
      else { setHistIdx(idx); setInput(cmdHistory[idx]); }
    } else if (e.key === "Enter") { submit(input); setInput(""); }
  };

  const onSubmit = () => { if (input.trim()) { submit(input); setInput(""); } };

  // Suggestion chips and the empty state send straight through.
  const onAskSend = useCallback((text: string) => {
    sendMessage({ text });
  }, [sendMessage]);

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
          {askMode ? "ask · nano" : "terminal"}
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

      {/* ── Mobile pull-stretch cue ── */}
      {isMobile && !isOpen && (
        <>
          <motion.div
            aria-hidden="true"
            className="fixed left-0 right-0 bottom-0 z-30 pointer-events-none"
            style={{
              height: PULL_CUE_HEIGHT,
              y: vPullBottomY,
              opacity: vPullBottomOpacity,
              background: "linear-gradient(0deg, rgba(17,16,16,0.92), rgba(17,16,16,0.25), rgba(17,16,16,0.00))",
              borderTop: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 -18px 60px rgba(0,0,0,0.55)",
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
            }}
          />
        </>
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
        />
      )}

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
                  {titleNode}
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

                {surface}
                <MusicBar playing={playing} trackDisplay={trackDisplay} remaining={remaining} progress={progress} switchTrack={switchTrack} togglePlay={togglePlay} />
                <InputRow input={input} setInput={setInput} onKey={onKey} onSubmit={onSubmit} inputRef={inputRef} isMobile={isMobile} askMode={askMode} />
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
                <MusicBar playing={playing} trackDisplay={trackDisplay} remaining={remaining} progress={progress} switchTrack={switchTrack} togglePlay={togglePlay} />
                <InputRow input={input} setInput={setInput} onKey={onKey} onSubmit={onSubmit} inputRef={inputRef} isMobile={isMobile} askMode={askMode} />

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
      <audio ref={audioRef} preload="none" />
    </>
  );
}
