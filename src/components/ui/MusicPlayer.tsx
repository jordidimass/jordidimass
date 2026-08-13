"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Minus, X } from "lucide-react";
import { TRACKS, TRACK_ORDER, type TrackKey } from "@/config/music";
import { EASE_OUT } from "@/lib/motion";
import { C } from "./vesper";

const SHELL_SPRING = { type: "spring" as const, bounce: 0.2, duration: 0.3 };

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function MusicPlayer({
  playing, trackKey, progress, remaining, duration, shuffle, loop,
  togglePlay, switchTrack, onSelectTrack, onToggleShuffle, onToggleLoop, onClose, seek,
  isMobile, expanded, onExpandedChange, motionEnabled,
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
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  motionEnabled: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded || isMobile) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onExpandedChange(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [expanded, isMobile, onExpandedChange]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onExpandedChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, onExpandedChange]);

  const elapsed = Math.max(0, duration - remaining);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(fraction);
  };

  const shellTransition = motionEnabled ? SHELL_SPRING : { duration: 0 };
  const contentTransition = { duration: 0.14, ease: EASE_OUT, delay: 0.04 };

  const outerStyle: React.CSSProperties = isMobile
    ? {
        left: 0,
        right: 0,
        bottom: "calc(28px + env(safe-area-inset-bottom))",
        padding: "0 16px",
        display: "flex",
        justifyContent: "center",
      }
    : { right: 24, bottom: 76, display: "flex", justifyContent: "flex-end" };

  return (
    <>
      <AnimatePresence>
        {isMobile && expanded && (
          <motion.div
            key="player-scrim"
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.45)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            onClick={() => onExpandedChange(false)}
          />
        )}
      </AnimatePresence>

      <div ref={rootRef} className="fixed z-50 pointer-events-none" style={outerStyle}>
        <motion.div
          layout
          transition={shellTransition}
          className="pointer-events-auto overflow-hidden"
          style={{
            width: expanded ? (isMobile ? "100%" : 260) : "auto",
            maxWidth: isMobile ? (expanded ? "100%" : "calc(100vw - 144px)") : 260,
            background: C.bg,
            border: `1px solid ${expanded ? C.dim : C.border}`,
            borderRadius: expanded ? 14 : 999,
            boxShadow: expanded
              ? "0 18px 60px rgba(0,0,0,0.8)"
              : "0 6px 24px rgba(0,0,0,0.55)",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {expanded ? (
              <motion.div
                key="panel"
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={contentTransition}
              >
                <div
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{ borderBottom: `1px solid ${C.border}` }}
                >
                  <span className="truncate" style={{ fontSize: 12, color: C.text, paddingRight: 8 }}>
                    {TRACKS[trackKey].title}
                  </span>
                  <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                    <button
                      onClick={() => onExpandedChange(false)}
                      className="flex items-center justify-center"
                      style={{ color: C.muted, width: isMobile ? 40 : 20, height: isMobile ? 40 : 20 }}
                      aria-label="Minimize player"
                    >
                      <Minus size={13} />
                    </button>
                    <button
                      onClick={onClose}
                      className="flex items-center justify-center"
                      style={{ color: C.muted, width: isMobile ? 40 : 20, height: isMobile ? 40 : 20 }}
                      aria-label="Close player"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                <div className="px-3 pt-3">
                  <div
                    ref={barRef}
                    onClick={handleSeek}
                    className="cursor-pointer"
                    style={{ height: isMobile ? 6 : 4, background: C.dim, borderRadius: 3 }}
                  >
                    <div style={{ width: `${progress}%`, height: "100%", background: C.accent, borderRadius: 3 }} />
                  </div>
                  <div className="flex justify-between" style={{ marginTop: 6, fontSize: 10, color: C.muted }}>
                    <span>{fmtTime(elapsed)}</span>
                    <span>{fmtTime(duration)}</span>
                  </div>
                </div>

                <div className={`flex items-center justify-center ${isMobile ? "gap-7 py-2" : "gap-5 py-3"}`}>
                  <button
                    onClick={onToggleShuffle}
                    className="flex items-center justify-center"
                    style={{ color: shuffle ? C.accent : C.muted, width: isMobile ? 44 : 20, height: isMobile ? 44 : 20 }}
                    aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
                    aria-pressed={shuffle}
                  >
                    <Shuffle size={14} />
                  </button>
                  <button
                    onClick={() => switchTrack(-1)}
                    className="flex items-center justify-center"
                    style={{ color: C.muted, width: isMobile ? 44 : 20, height: isMobile ? 44 : 20 }}
                    aria-label="Previous track"
                  >
                    <SkipBack size={15} />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="jd-pressable flex items-center justify-center"
                    style={{ color: C.accent, width: isMobile ? 44 : 22, height: isMobile ? 44 : 22 }}
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    onClick={() => switchTrack(1)}
                    className="flex items-center justify-center"
                    style={{ color: C.muted, width: isMobile ? 44 : 20, height: isMobile ? 44 : 20 }}
                    aria-label="Next track"
                  >
                    <SkipForward size={15} />
                  </button>
                  <button
                    onClick={onToggleLoop}
                    className="flex items-center justify-center"
                    style={{ color: loop ? C.accent : C.muted, width: isMobile ? 44 : 20, height: isMobile ? 44 : 20 }}
                    aria-label={loop ? "Disable repeat" : "Enable repeat"}
                    aria-pressed={loop}
                  >
                    <Repeat size={14} />
                  </button>
                </div>

                <div style={{ borderTop: `1px solid ${C.border}` }} />

                <div className="overflow-y-auto" style={{ maxHeight: isMobile ? 200 : 176, scrollbarWidth: "none" }}>
                  {TRACK_ORDER.map((key) => {
                    const active = key === trackKey;
                    return (
                      <button
                        key={key}
                        onClick={() => onSelectTrack(key)}
                        className="w-full flex items-center gap-2 px-3 text-left"
                        style={{
                          fontSize: isMobile ? 13 : 11,
                          color: active ? C.accent : C.muted,
                          minHeight: isMobile ? 40 : 26,
                        }}
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
                key="pill"
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={contentTransition}
                className="flex items-center"
                style={{ padding: "6px 6px 6px 12px" }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="jd-pressable"
                  style={{ color: playing ? C.accent : C.muted, lineHeight: 0, flexShrink: 0 }}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause size={11} /> : <Play size={11} />}
                </button>
                <button
                  onClick={() => onExpandedChange(true)}
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
        </motion.div>
      </div>
    </>
  );
}
