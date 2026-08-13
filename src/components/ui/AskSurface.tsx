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
  if (name === "readPost") return `read ${input.slug ?? "post"}`;
  if (name === "nowPlaying") return "checking last.fm";
  if (name === "topMusic") return `top ${input.kind ?? "artists"}`;
  if (name === "music") {
    return `music ${[input.action, input.track].filter(Boolean).join(" ")}`.trim();
  }
  if (name === "setAnimations") return `animations ${input.enabled ? "on" : "off"}`;
  return name;
}

type Scrobble = {
  ok: true;
  nowPlaying: boolean;
  track: string;
  artist: string;
  album: string | null;
  url: string | null;
  image: string | null;
  playedAt: number | null;
};

type TopEntry = { name: string; detail: string | null; plays: number; url: string | null };
type TopMusic = { ok: true; kind: "artists" | "albums" | "tracks"; period: string; entries: TopEntry[] };

const PERIOD_LABEL: Record<string, string> = {
  "7day": "last 7 days",
  "1month": "last month",
  "3month": "last 3 months",
  "6month": "last 6 months",
  "12month": "last year",
  overall: "all time",
};

function topMusicOf(part: ToolUIPart): TopMusic | null {
  if (getToolName(part) !== "topMusic") return null;
  if (part.state !== "output-available") return null;
  const out = part.output as TopMusic | { ok: false } | undefined;
  return out && out.ok ? (out as TopMusic) : null;
}

function TopMusicCard({ data, motionEnabled }: { data: TopMusic; motionEnabled: boolean }) {
  const max = Math.max(...data.entries.map((e) => e.plays), 1);
  return (
    <motion.div
      initial={motionEnabled ? { opacity: 0, y: 6, filter: "blur(2px)" } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
      className="flex flex-col"
      style={{
        marginLeft: 12,
        marginTop: 2,
        padding: "8px 10px 10px",
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: C.bg,
      }}
    >
      <span style={{ fontSize: 10, color: C.accent, letterSpacing: "0.08em", marginBottom: 6 }}>
        top {data.kind} · {PERIOD_LABEL[data.period] ?? data.period}
      </span>
      {data.entries.map((entry, i) => (
        <motion.div
          key={`${entry.name}-${i}`}
          initial={{ opacity: 0, y: motionEnabled ? 4 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT, delay: Math.min(i, 4) * 0.04 }}
          className="flex items-baseline gap-2"
          style={{ paddingTop: i === 0 ? 0 : 4 }}
        >
          <span style={{ fontSize: 10, color: C.muted, width: 12, flexShrink: 0 }}>{i + 1}</span>
          <span className="truncate min-w-0" style={{ fontSize: 12, color: C.text, flex: 1 }}>
            {entry.url ? (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: C.text, textDecoration: "none" }}
                className="hover:underline hover:opacity-75 transition-opacity duration-150"
              >
                {entry.name}
              </a>
            ) : (
              entry.name
            )}
            {entry.detail ? <span style={{ color: C.muted }}> · {entry.detail}</span> : null}
          </span>
          <span
            aria-hidden
            style={{
              width: `${Math.round((entry.plays / max) * 34) + 2}px`,
              height: 2,
              background: C.accent,
              opacity: 0.5,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 10, color: C.muted, width: 26, textAlign: "right", flexShrink: 0 }}>
            {entry.plays}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

function scrobbleOf(part: ToolUIPart): Scrobble | null {
  if (getToolName(part) !== "nowPlaying") return null;
  if (part.state !== "output-available") return null;
  const out = part.output as Scrobble | { ok: false } | undefined;
  return out && out.ok ? (out as Scrobble) : null;
}

function agoLabel(uts: number): string {
  const mins = Math.max(0, Math.round((Date.now() / 1000 - uts) / 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function ScrobbleCard({ data, motionEnabled }: { data: Scrobble; motionEnabled: boolean }) {
  const live = data.nowPlaying;
  return (
    <motion.div
      initial={motionEnabled ? { opacity: 0, y: 6, filter: "blur(2px)" } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
      className="flex items-center gap-3"
      style={{
        marginLeft: 12,
        marginTop: 2,
        padding: 8,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        background: C.bg,
      }}
    >
      {data.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt=""
          width={44}
          height={44}
          style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 6, background: C.dim, color: C.muted, fontSize: 14, flexShrink: 0 }}
          aria-hidden
        >
          ♪
        </div>
      )}
      <div className="min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5" style={{ fontSize: 10, color: live ? C.accent : C.muted }}>
          {live ? (
            <span className="flex items-end gap-0.5" style={{ height: 9 }} aria-hidden>
              <span className="jd-eq-bar" />
              <span className="jd-eq-bar" />
              <span className="jd-eq-bar" />
            </span>
          ) : null}
          <span style={{ letterSpacing: "0.08em" }}>
            {live ? "scrobbling now" : data.playedAt ? `last played · ${agoLabel(data.playedAt)}` : "last played"}
          </span>
        </div>
        <span className="truncate" style={{ fontSize: 12, color: C.text }}>
          {data.url ? (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.text, textDecoration: "none" }}
              className="hover:underline hover:opacity-75 transition-opacity duration-150"
            >
              {data.track}
            </a>
          ) : (
            data.track
          )}
        </span>
        <span className="truncate" style={{ fontSize: 11, color: C.muted }}>
          {[data.artist, data.album].filter(Boolean).join(" · ")}
        </span>
      </div>
    </motion.div>
  );
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
      {tools.map((part) => {
        const scrobble = scrobbleOf(part);
        if (scrobble) {
          return <ScrobbleCard key={part.toolCallId} data={scrobble} motionEnabled={motionEnabled} />;
        }
        const top = topMusicOf(part);
        if (top) {
          return <TopMusicCard key={part.toolCallId} data={top} motionEnabled={motionEnabled} />;
        }
        return <ToolStep key={part.toolCallId} part={part} motionEnabled={motionEnabled} />;
      })}
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
  lead,
}: {
  messages: UIMessage[];
  status: string;
  motionEnabled: boolean;
  onSend: (text: string) => void;
  lead?: React.ReactNode;
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
      {lead}

      {messages.length === 0 && !lead ? (
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
