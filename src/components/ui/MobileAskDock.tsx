"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "motion/react";
import { X } from "lucide-react";
import type { UIMessage } from "ai";
import { EASE_OUT } from "@/lib/motion";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import AskSurface from "./AskSurface";
import SiteMark from "./SiteMark";
import { C, MONO } from "./vesper";

const EDGE = 20;
const DISMISS_FRACTION = 0.4;
const RUBBER_CONSTANT = 0.55;
const SHEET_SPRING = { type: "spring" as const, bounce: 0.2, duration: 0.3 };

const SLASH_COMMANDS = [
  { cmd: "help", label: "help" },
  { cmd: "whoami", label: "who i am" },
  { cmd: "links", label: "links" },
  { cmd: "pages", label: "pages" },
  { cmd: "neofetch", label: "neofetch" },
  { cmd: "animation", label: "animations" },
  { cmd: "clear", label: "clear" },
  { cmd: "toggle-matrix", label: "matrix" },
];

function project(velocity: number, decelerationRate = 0.998) {
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

function rubberband(overshoot: number, dimension: number) {
  return (
    (overshoot * dimension * RUBBER_CONSTANT) /
    (dimension + RUBBER_CONSTANT * Math.abs(overshoot))
  );
}

export type MobileAskDockProps = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  messages: UIMessage[];
  status: string;
  motionEnabled: boolean;
  onSend: (text: string) => void;
  onCommand: (cmd: string) => void;
  lead?: React.ReactNode;
  hideTrigger?: boolean;
};

export default function MobileAskDock({
  open, onOpen, onClose,
  messages, status, motionEnabled, onSend, onCommand, lead, hideTrigger = false,
}: MobileAskDockProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dragY = useMotionValue(0);
  const viewport = useVisualViewport(open);

  const slashOpen = open && input.startsWith("/");
  const slashQuery = slashOpen ? input.slice(1).trim().toLowerCase() : "";
  const slashMatches = slashOpen
    ? SLASH_COMMANDS.filter((c) => !slashQuery || c.cmd.includes(slashQuery) || c.label.includes(slashQuery))
    : [];

  const viewportHeight = viewport.height || (typeof window !== "undefined" ? window.innerHeight : 0);
  const sheetHeight = viewport.keyboardOpen
    ? Math.max(240, viewportHeight - 8)
    : Math.max(320, Math.round(viewportHeight * 0.78));

  useEffect(() => {
    if (!open) {
      setInput("");
      return;
    }
    dragY.set(0);
    const t = setTimeout(() => inputRef.current?.focus(), 260);
    return () => clearTimeout(t);
  }, [open, dragY]);

  const close = useCallback(() => {
    inputRef.current?.blur();
    onClose();
  }, [onClose]);

  const drag = useRef<{ id: number; startY: number; history: { y: number; t: number }[] } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!open) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, startY: e.clientY, history: [{ y: e.clientY, t: performance.now() }] };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const delta = e.clientY - d.startY;
    d.history.push({ y: e.clientY, t: performance.now() });
    if (d.history.length > 6) d.history.shift();
    dragY.set(delta >= 0 ? delta : -rubberband(-delta, sheetHeight));
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;

    const now = performance.now();
    const recent = d.history.filter((p) => now - p.t < 120);
    const first = recent[0] ?? d.history[0];
    const elapsed = Math.max(1, now - first.t);
    const velocity = ((e.clientY - first.y) / elapsed) * 1000;

    const projected = dragY.get() + project(velocity);

    if (projected > sheetHeight * DISMISS_FRACTION) {
      close();
      animate(dragY, 0, { type: "spring", bounce: 0, duration: 0.3, velocity });
      return;
    }
    animate(dragY, 0, { type: "spring", bounce: 0.2, duration: 0.3, velocity });
  };

  const submit = () => {
    const value = input.trim();
    if (!value) return;
    setInput("");
    if (value.startsWith("/")) {
      onCommand(value.slice(1));
      return;
    }
    onSend(value);
  };

  const transition = motionEnabled ? SHEET_SPRING : { duration: 0 };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="scrim"
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.55)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-50 pointer-events-none">
        <motion.div
          layout
          data-jd-terminal=""
          transition={transition}
          className="absolute pointer-events-auto flex flex-col overflow-hidden"
          style={{
            y: dragY,
            left: open ? 0 : "auto",
            right: open ? 0 : EDGE,
            bottom: open ? viewport.keyboardInset : `calc(${EDGE}px + env(safe-area-inset-bottom))`,
            height: open ? sheetHeight : undefined,
            borderRadius: open ? "18px 18px 0 0" : 999,
            background: open ? C.bg : "rgba(16,16,16,0.6)",
            backdropFilter: open ? "none" : "blur(16px) saturate(180%)",
            WebkitBackdropFilter: open ? "none" : "blur(16px) saturate(180%)",
            border: `1px solid ${C.border}`,
            boxShadow: open ? "0 -10px 48px rgba(0,0,0,0.7)" : "0 4px 20px rgba(0,0,0,0.45)",
            fontFamily: MONO,
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.div
                key="sheet"
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.14, ease: EASE_OUT, delay: 0.04 }}
                className="flex flex-col min-h-0 flex-1"
              >
                <div
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="shrink-0 flex items-center justify-between pl-4 pr-1"
                  style={{ touchAction: "none", minHeight: 42 }}
                >
                  <span className="flex items-center gap-2">
                    <SiteMark size={13} className="text-[#ff8800]" />
                    <span style={{ fontSize: 11, color: C.muted, letterSpacing: "0.1em" }}>ask mode</span>
                  </span>
                  <button
                    onClick={close}
                    aria-label="Close"
                    className="flex items-center justify-center"
                    style={{ color: C.muted, width: 44, height: 42 }}
                  >
                    <X size={15} />
                  </button>
                </div>

                <div style={{ borderTop: `1px solid ${C.border}` }} />

                <AskSurface
                  messages={messages}
                  status={status}
                  motionEnabled={motionEnabled}
                  onSend={onSend}
                  lead={lead}
                />

                <AnimatePresence initial={false}>
                  {slashOpen && slashMatches.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
                      transition={{ duration: 0.25, ease: EASE_OUT }}
                      className="shrink-0 overflow-hidden"
                      style={{ borderTop: `1px solid ${C.border}` }}
                    >
                      <div className="flex flex-wrap gap-1.5 px-4 py-2.5">
                        {slashMatches.map((c, i) => (
                          <motion.button
                            key={c.cmd}
                            initial={{ opacity: 0, y: motionEnabled ? 4 : 0 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, ease: EASE_OUT, delay: Math.min(i, 4) * 0.04 }}
                            onClick={() => { setInput(""); onCommand(c.cmd); }}
                            className="jd-pressable"
                            style={{
                              fontSize: 12,
                              color: C.muted,
                              border: `1px solid ${C.border}`,
                              borderRadius: 999,
                              padding: "7px 12px",
                              minHeight: 34,
                            }}
                          >
                            {c.label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  className="shrink-0 flex items-center gap-2 pl-4 pr-1"
                  style={{
                    borderTop: `1px solid ${C.border}`,
                    minHeight: 54,
                    paddingBottom: viewport.keyboardOpen ? 0 : "env(safe-area-inset-bottom)",
                  }}
                >
                  <span style={{ fontSize: 14, color: C.accent, lineHeight: 1 }}>λ</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                    placeholder="ask me anything…"
                    className="flex-1 bg-transparent border-none outline-none"
                    style={{ fontSize: 16, color: C.text, caretColor: C.accent }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="sentences"
                    spellCheck={false}
                    enterKeyHint="send"
                    aria-label="Ask input"
                  />
                  <button
                    onPointerDown={(e) => { e.preventDefault(); submit(); }}
                    aria-label="Send"
                    className="jd-pressable flex items-center justify-center"
                    style={{
                      color: input.trim() ? C.accent : C.muted,
                      width: 44,
                      height: 44,
                      transition: "color 150ms var(--ease-out)",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7h10M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ) : hideTrigger ? null : (
              <motion.button
                key="bar"
                type="button"
                onClick={onOpen}
                aria-label="Ask anything"
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.14, ease: EASE_OUT, delay: 0.04 }}
                className="jd-pressable flex items-center justify-center"
                style={{ width: 44, height: 44, color: C.accent }}
              >
                <span className="jd-mark-spin flex" style={{ lineHeight: 0 }}>
                  <SiteMark size={19} />
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
