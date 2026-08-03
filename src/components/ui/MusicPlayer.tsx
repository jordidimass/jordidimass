"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Minus, X } from "lucide-react";
import { TRACKS, TRACK_ORDER, type TrackKey } from "@/config/music";

// ─── Vesper palette (matches FloatingTerminal / matrixComponent) ──────────────
const C = {
  bg: "#101010",
  border: "#1e1e1e",
  text: "#f5f5f5",
  muted: "#4c4c4c",
  accent: "#ff8800",
  dim: "#2a2a2a",
} as const;

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function MusicPlayer({
  playing, trackKey, progress, remaining, duration, shuffle, loop,
  togglePlay, switchTrack, onSelectTrack, onToggleShuffle, onToggleLoop, onClose, seek, isMobile,
}: {
  playing: boolean;
  trackKey: TrackKey;
  progress: number;
  remaining: number;
  duration: number;
  shuffle: boolean;
  loop: boolean;
  togglePlay: () => void;
  switchTrack: (dir: 1 | -1) => void;
  onSelectTrack: (key: TrackKey) => void;
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  onClose: () => void;
  seek: (fraction: number) => void;
  isMobile: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Collapse when clicking/tapping outside the expanded panel.
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [expanded]);

  // Esc minimizes the expanded panel back to the pill.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const elapsed = Math.max(0, duration - remaining);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(fraction);
  };

  return (
    <div
      ref={rootRef}
      className="fixed z-50"
      style={{ right: 24, bottom: isMobile ? 24 : 76 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{
              width: 260,
              maxWidth: "calc(100vw - 48px)",
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              boxShadow: "0 16px 56px rgba(0,0,0,0.75)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderBottom: `1px solid ${C.border}` }}
            >
              <span className="truncate" style={{ fontSize: 12, color: C.text, paddingRight: 8 }}>
                {TRACKS[trackKey].title}
              </span>
              <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                <button
                  onClick={() => setExpanded(false)}
                  style={{ color: C.muted, lineHeight: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                  aria-label="Minimize player"
                >
                  <Minus size={12} />
                </button>
                <button
                  onClick={onClose}
                  style={{ color: C.muted, lineHeight: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                  aria-label="Close player"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Scrubber */}
            <div className="px-3 pt-3">
              <div
                ref={barRef}
                onClick={handleSeek}
                className="cursor-pointer"
                style={{ height: 4, background: C.dim, borderRadius: 2 }}
              >
                <div style={{ width: `${progress}%`, height: "100%", background: C.accent, borderRadius: 2 }} />
              </div>
              <div className="flex justify-between" style={{ marginTop: 6, fontSize: 10, color: C.muted }}>
                <span>{fmtTime(elapsed)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
            </div>

            {/* Transport */}
            <div className="flex items-center justify-center gap-5 py-3">
              <button
                onClick={onToggleShuffle}
                style={{ color: shuffle ? C.accent : C.muted, lineHeight: 0 }}
                onMouseEnter={(e) => { if (!shuffle) e.currentTarget.style.color = C.text; }}
                onMouseLeave={(e) => { if (!shuffle) e.currentTarget.style.color = C.muted; }}
                aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
                aria-pressed={shuffle}
              >
                <Shuffle size={13} />
              </button>
              <button
                onClick={() => switchTrack(-1)}
                style={{ color: C.muted, lineHeight: 0 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                aria-label="Previous track"
              >
                <SkipBack size={14} />
              </button>
              <button
                onClick={togglePlay}
                style={{ color: C.accent, lineHeight: 0 }}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={() => switchTrack(1)}
                style={{ color: C.muted, lineHeight: 0 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                aria-label="Next track"
              >
                <SkipForward size={14} />
              </button>
              <button
                onClick={onToggleLoop}
                style={{ color: loop ? C.accent : C.muted, lineHeight: 0 }}
                onMouseEnter={(e) => { if (!loop) e.currentTarget.style.color = C.text; }}
                onMouseLeave={(e) => { if (!loop) e.currentTarget.style.color = C.muted; }}
                aria-label={loop ? "Disable repeat" : "Enable repeat"}
                aria-pressed={loop}
              >
                <Repeat size={13} />
              </button>
            </div>

            <div style={{ borderTop: `1px solid ${C.border}` }} />

            {/* Track list */}
            <div className="overflow-y-auto" style={{ maxHeight: 176, scrollbarWidth: "none" }}>
              {TRACK_ORDER.map((key) => {
                const active = key === trackKey;
                return (
                  <button
                    key={key}
                    onClick={() => onSelectTrack(key)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
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
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="flex items-center"
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              padding: "6px 6px 6px 12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              maxWidth: isMobile ? 220 : 260,
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              style={{ color: playing ? C.accent : C.muted, lineHeight: 0, flexShrink: 0 }}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause size={11} /> : <Play size={11} />}
            </button>
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center gap-2 min-w-0"
              style={{ flex: 1, marginLeft: 8 }}
              aria-label="Expand music player"
            >
              <span className="truncate" style={{ fontSize: 11, color: C.muted }}>
                {TRACKS[trackKey].title}
              </span>
              {playing && (
                <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{fmtTime(remaining)}</span>
              )}
            </button>
            <button
              onClick={onClose}
              style={{ color: C.muted, lineHeight: 0, flexShrink: 0, marginLeft: 8 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
              aria-label="Close player"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
