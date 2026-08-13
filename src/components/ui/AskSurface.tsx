"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { isTextUIPart, isStaticToolUIPart, getToolName, type UIMessage, type ToolUIPart } from "ai";
import { EASE_OUT } from "@/lib/motion";
import { TerminalMarkdown } from "./TerminalMarkdown";
import { C } from "./vesper";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_STILL = "⠿";

const SUGGESTIONS = [
  "take me to your photos",
  "what are you building?",
  "put some music on",
];

const textOf = (m: UIMessage) =>
  m.parts.filter(isTextUIPart).map((p) => p.text).join("");

const toolsOf = (m: UIMessage) => m.parts.filter(isStaticToolUIPart);

/** One legible line per tool call, from the argument that matters. */
function describeTool(part: ToolUIPart): string {
  const name = getToolName(part);
  const input = (part.input ?? {}) as Record<string, unknown>;
  if (name === "navigate") return `navigate ${input.path ?? ""}`.trim();
  if (name === "music") {
    return `music ${[input.action, input.track].filter(Boolean).join(" ")}`.trim();
  }
  if (name === "setAnimations") return `animations ${input.enabled ? "on" : "off"}`;
  return name;
}

function ToolStep({
  part,
  motionEnabled,
}: {
  part: ToolUIPart;
  motionEnabled: boolean;
}) {
  const pending = part.state === "input-streaming" || part.state === "input-available";
  const failed = part.state === "output-error";
  const frame = useSpinner(pending, motionEnabled);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14, ease: EASE_OUT }}
      className="flex items-center gap-2 leading-5"
      style={{ fontSize: 11, paddingLeft: 12, color: C.muted }}
    >
      <span style={{ color: failed ? C.muted : C.accent, width: 10, flexShrink: 0 }} aria-hidden>
        {pending ? frame : failed ? "×" : "✓"}
      </span>
      <span className={pending ? "jd-ask-shimmer" : undefined}>{describeTool(part)}</span>
    </motion.div>
  );
}

/** Braille ticker. Interval rather than rAF — it advances 11×/s, not 60×/s. */
function useSpinner(active: boolean, motionEnabled: boolean) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active || !motionEnabled) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER.length), 90);
    return () => clearInterval(id);
  }, [active, motionEnabled]);
  return motionEnabled ? SPINNER[frame] : SPINNER_STILL;
}

function Caret() {
  return (
    <span
      className="jd-ask-caret"
      style={{ color: C.accent, marginLeft: 1 }}
      aria-hidden
    >
      ▌
    </span>
  );
}

function EmptyState({
  motionEnabled,
  onSend,
}: {
  motionEnabled: boolean;
  onSend: (text: string) => void;
}) {
  const rise = motionEnabled ? 6 : 0;
  return (
    <div className="flex flex-col gap-3">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: EASE_OUT }}
        className="leading-5"
        style={{ fontSize: 12, color: C.muted }}
      >
        ask me anything, or tell me where to go — i can move you around the
        site, put music on and change how it behaves.
      </motion.p>
      <div className="flex flex-col items-start gap-1.5">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: rise }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT, delay: Math.min(i, 3) * 0.04 }}
            onClick={() => onSend(s)}
            className="jd-pressable text-left"
            style={{
              fontSize: 11,
              color: C.muted,
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              padding: "3px 10px",
              transition: "color 150ms var(--ease-out), border-color 150ms var(--ease-out)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = C.text;
              e.currentTarget.style.borderColor = C.dim;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = C.muted;
              e.currentTarget.style.borderColor = C.border;
            }}
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function UserTurn({ text, motionEnabled }: { text: string; motionEnabled: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: motionEnabled ? 6 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
      className="flex flex-col items-end"
      style={{ paddingLeft: "15%" }}
    >
      <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em" }}>
        you ▸
      </span>
      <div
        className="leading-5 whitespace-pre-wrap break-words text-right"
        style={{ fontSize: 12, color: C.text }}
      >
        {text}
      </div>
    </motion.div>
  );
}

function AssistantLabel() {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14, ease: EASE_OUT }}
      style={{ fontSize: 10, color: C.accent, letterSpacing: "0.08em" }}
    >
      ▸ jordi
    </motion.span>
  );
}

/**
 * `withLabel` is set while no assistant message exists yet, so the label lands
 * here first and AssistantTurn takes it over once the message arrives — the
 * anchor never moves between the two.
 */
function ThinkingRow({
  motionEnabled,
  withLabel,
}: {
  motionEnabled: boolean;
  withLabel: boolean;
}) {
  const frame = useSpinner(true, motionEnabled);
  return (
    <motion.div
      key="thinking"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: motionEnabled ? -4 : 0 }}
      transition={{ duration: 0.12, ease: EASE_OUT }}
      className="flex flex-col gap-0.5"
      aria-live="polite"
      aria-label="generating response"
    >
      {withLabel ? <AssistantLabel /> : null}
      <div
        className="flex items-center gap-2 leading-5"
        style={{ fontSize: 12, paddingLeft: 12 }}
      >
        <span style={{ color: C.accent, width: 10 }} aria-hidden>{frame}</span>
        <span className="jd-ask-shimmer">thinking</span>
      </div>
    </motion.div>
  );
}

/**
 * The assistant label mounts the instant the request goes out and never moves
 * afterwards — it is the anchor the answer grows from. The body fades in
 * through a short blur so the swap from spinner to text reads as one object
 * changing rather than two objects crossing.
 */
function AssistantTurn({
  text,
  tools,
  streaming,
  motionEnabled,
}: {
  text: string;
  tools: ToolUIPart[];
  streaming: boolean;
  motionEnabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <AssistantLabel />
      {tools.map((part) => (
        <ToolStep key={part.toolCallId} part={part} motionEnabled={motionEnabled} />
      ))}
      {text ? (
        <motion.div
          initial={
            motionEnabled
              ? { opacity: 0, filter: "blur(2px)" }
              : { opacity: 0 }
          }
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.15, ease: EASE_OUT }}
          style={{ paddingLeft: 12 }}
        >
          <TerminalMarkdown text={text} trailing={streaming ? <Caret /> : null} />
        </motion.div>
      ) : null}
    </div>
  );
}

export default function AskSurface({
  messages,
  status,
  motionEnabled,
  onSend,
}: {
  messages: UIMessage[];
  status: string;
  motionEnabled: boolean;
  onSend: (text: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Only follow the stream while the reader is already at the bottom. Yanking
  // someone back down mid-scroll is the fastest way to make a stream unreadable.
  const pinned = useRef(true);

  const last = messages[messages.length - 1];
  const lastIsAssistant = last?.role === "assistant";
  const lastText = lastIsAssistant ? textOf(last) : "";
  const lastTools = lastIsAssistant ? toolsOf(last) : [];
  const busy = status === "submitted" || status === "streaming";
  // Once a tool step is on screen it is the progress indicator; two spinners
  // running at once reads as two things happening.
  const showThinking =
    busy && (!lastIsAssistant || (lastText.length === 0 && lastTools.length === 0));

  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
      // The panel sets user-select: none so dragging it never selects text.
      // An answer you cannot copy is useless, so opt back in here.
      style={{ scrollbarWidth: "none", userSelect: "text" }}
    >
      {messages.length === 0 ? (
        <EmptyState motionEnabled={motionEnabled} onSend={onSend} />
      ) : null}

      {messages.map((m, i) => {
        const text = textOf(m);
        if (m.role === "user") {
          return <UserTurn key={m.id} text={text} motionEnabled={motionEnabled} />;
        }
        if (m.role !== "assistant") return null;
        const isLast = i === messages.length - 1;
        return (
          <AssistantTurn
            key={m.id}
            text={text}
            tools={toolsOf(m)}
            streaming={isLast && status === "streaming"}
            motionEnabled={motionEnabled}
          />
        );
      })}

      <AnimatePresence>
        {showThinking ? (
          <ThinkingRow motionEnabled={motionEnabled} withLabel={!lastIsAssistant} />
        ) : null}
      </AnimatePresence>

      {status === "error" ? (
        <div className="leading-5" style={{ fontSize: 12, color: C.muted }}>
          something went wrong. try again, or press esc to go back.
        </div>
      ) : null}
    </div>
  );
}
