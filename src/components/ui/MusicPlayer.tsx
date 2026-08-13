"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Minus, X } from "lucide-react";
import { TRACKS, TRACK_ORDER, type TrackKey } from "@/config/music";
import { EASE_OUT } from "@/lib/motion";
import { useScrollLock } from "@/hooks/useScrollLock";
import { C } from "./vesper";

const ENTER = { duration: 0.18, ease: EASE_OUT };
const EXIT = { duration: 0.12, ease: EASE_OUT };

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
  useScrollLock(isMobile && expanded);

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

  const [scrub, setScrub] = useState<number | null>(null);
  const scrubbing = useRef(false);

  const fractionAt = (clientX: number) => {
    const el = barRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const onScrubDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    scrubbing.current = true;
    setScrub(fractionAt(e.clientX));
  };

  const onScrubMove = (e: React.PointerEvent) => {
    if (!scrubbing.current) return;
    setScrub(fractionAt(e.clientX));
  };

  const onScrubUp = (e: React.PointerEvent) => {
    if (!scrubbing.current) return;
    scrubbing.current = false;
    const fraction = fractionAt(e.clientX);
    setScrub(fraction);
    seek(fraction);
  };

  const played = scrub ?? (isFinite(progress) ? progress / 100 : 0);

  useEffect(() => {
    if (scrub === null || scrubbing.current) return;
    if (Math.abs(progress / 100 - scrub) < 0.015) {
      setScrub(null);
      return;
    }
    const t = setTimeout(() => setScrub(null), 700);
    return () => clearTimeout(t);
  }, [progress, scrub]);

  const elapsed = scrub !== null
    ? scrub * duration
    : Math.max(0, duration - remaining);

  const enter = motionEnabled ? ENTER : { duration: 0 };
  const exit = motionEnabled ? EXIT : { duration: 0 };
  const rise = motionEnabled ? 6 : 0;

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
            className="fixed inset-0 z-[62]"
            style={{ background: "rgba(0,0,0,0.45)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: exit }}
            transition={enter}
            onClick={() => onExpandedChange(false)}
          />
        )}
      </AnimatePresence>

      <div ref={rootRef} className="fixed z-[65] pointer-events-none" style={outerStyle}>
        <AnimatePresence mode="wait" initial={false}>
            {expanded ? (
              <motion.div
                key="panel"
                initial={{ opacity: 0, y: rise }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: rise, transition: exit }}
                transition={enter}
                className="pointer-events-auto overflow-hidden"
                style={{
                  width: isMobile ? "100%" : 260,
                  background: C.bg,
                  border: `1px solid ${C.dim}`,
                  borderRadius: 14,
                  boxShadow: "0 18px 60px rgba(0,0,0,0.8)",
                }}
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

                <div className="px-3 pt-2">
                  <div
                    onPointerDown={onScrubDown}
                    onPointerMove={onScrubMove}
                    onPointerUp={onScrubUp}
                    onPointerCancel={onScrubUp}
                    className="flex items-center cursor-pointer"
                    style={{ height: isMobile ? 28 : 20, touchAction: "none" }}
                    role="slider"
                    aria-label="Seek"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(played * 100)}
                    tabIndex={0}
                  >
                    <div
                      ref={barRef}
                      className="relative w-full"
                      style={{
                        height: scrub !== null ? 6 : 4,
                        background: C.dim,
                        borderRadius: 3,
                        transition: "height 120ms var(--ease-out)",
                      }}
                    >
                      <div
                        style={{
                          width: `${played * 100}%`,
                          height: "100%",
                          background: C.accent,
                          borderRadius: 3,
                        }}
                      />
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: `${played * 100}%`,
                          width: 12,
                          height: 12,
                          marginLeft: -6,
                          marginTop: -6,
                          borderRadius: 999,
                          background: C.accent,
                          opacity: scrub !== null ? 1 : 0,
                          transform: `scale(${scrub !== null ? 1 : 0.9})`,
                          transition: "opacity 120ms var(--ease-out), transform 120ms var(--ease-out)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between" style={{ fontSize: 10, color: C.muted }}>
                    <span style={{ color: scrub !== null ? C.text : C.muted }}>{fmtTime(elapsed)}</span>
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: exit }}
                transition={enter}
                className="pointer-events-auto flex items-center overflow-hidden"
                style={{
                  padding: "6px 6px 6px 12px",
                  maxWidth: isMobile ? "calc(100vw - 144px)" : 260,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 999,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
                }}
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
      </div>
    </>
  );
}
