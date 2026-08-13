"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { isRenderableHref } from "@/lib/siteRoutes";
import { C } from "./vesper";

type Router = ReturnType<typeof useRouter>;

// Split patterns keep their delimiters (capturing groups) so the non-matching
// text survives the split untouched.
const LINK_SPLIT = /(\[[^\]]+\]\([^)]+\))/g;
const CODE_SPLIT = /(`[^`\n]+`)/g;
const BOLD_SPLIT = /(\*\*[^*\n]+\*\*)/g;

const LINK_ONE = /^\[([^\]]+)\]\(([^)]+)\)$/;
const CODE_ONE = /^`([^`\n]+)`$/;
const BOLD_ONE = /^\*\*([^*\n]+)\*\*$/;

const BULLET = /^(\s*)[-*]\s+(.*)$/;

function Link({ label, href, router }: { label: string; href: string; router: Router }) {
  if (!isRenderableHref(href)) return <>{label}</>;
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : "_self"}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={external ? undefined : (e) => { e.preventDefault(); router.push(href); }}
      style={{ color: C.accent, textDecoration: "none" }}
      className="hover:underline hover:opacity-75 transition-opacity duration-150 cursor-pointer"
    >
      {label}
    </a>
  );
}

/**
 * Links only. This is what the command output uses — `neofetch` art and the
 * like must pass through with nothing else reinterpreted.
 */
export function parseInlineLinks(text: string, router: Router): React.ReactNode {
  const parts = text.split(LINK_SPLIT);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const m = part.match(LINK_ONE);
    if (!m) return <span key={i}>{part}</span>;
    return <Link key={i} label={m[1]} href={m[2]} router={router} />;
  });
}

function renderBold(text: string, key: string): React.ReactNode {
  const parts = text.split(BOLD_SPLIT);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const m = part.match(BOLD_ONE);
    if (!m) return <React.Fragment key={`${key}b${i}`}>{part}</React.Fragment>;
    return <strong key={`${key}b${i}`} style={{ fontWeight: 600, color: C.text }}>{m[1]}</strong>;
  });
}

function renderLinks(text: string, router: Router, key: string): React.ReactNode {
  const parts = text.split(LINK_SPLIT);
  if (parts.length === 1) return renderBold(text, key);
  return parts.map((part, i) => {
    const m = part.match(LINK_ONE);
    if (!m) return <React.Fragment key={`${key}l${i}`}>{renderBold(part, `${key}l${i}`)}</React.Fragment>;
    return <Link key={`${key}l${i}`} label={m[1]} href={m[2]} router={router} />;
  });
}

/**
 * Code is resolved first so its contents are never reinterpreted as a link or
 * as emphasis. A half-arrived marker (`**bo` mid-stream) matches nothing and
 * renders as the literal characters, which is the behaviour we want while the
 * response is still being written.
 */
function renderInline(text: string, router: Router, key: string): React.ReactNode {
  const parts = text.split(CODE_SPLIT);
  if (parts.length === 1) return renderLinks(text, router, key);
  return parts.map((part, i) => {
    const m = part.match(CODE_ONE);
    if (!m) return <React.Fragment key={`${key}c${i}`}>{renderLinks(part, router, `${key}c${i}`)}</React.Fragment>;
    return (
      <code
        key={`${key}c${i}`}
        style={{
          background: C.dim,
          color: C.text,
          padding: "1px 4px",
          borderRadius: 3,
          fontSize: "0.92em",
        }}
      >
        {m[1]}
      </code>
    );
  });
}

/**
 * Line-oriented light markdown: bullets, inline code, bold, blank-line
 * paragraph spacing, and the existing [label](url) links. No headings, tables
 * or fenced code — those would break the terminal read.
 *
 * `trailing` (the streaming caret) is folded into the last rendered line so it
 * sits inline at the end of the text rather than below the block.
 */
export function TerminalMarkdown({
  text,
  trailing,
}: {
  text: string;
  trailing?: React.ReactNode;
}) {
  const router = useRouter();
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let lastTextIndex = -1;
  let lastWasSpacer = true; // leading blank lines produce no gap

  lines.forEach((line, i) => {
    if (!line.trim()) {
      // Collapse runs of blank lines into a single paragraph gap.
      if (!lastWasSpacer) {
        out.push(<div key={`s${i}`} style={{ height: 6 }} aria-hidden />);
        lastWasSpacer = true;
      }
      return;
    }
    lastWasSpacer = false;

    const bullet = line.match(BULLET);
    if (bullet) {
      lastTextIndex = out.length;
      out.push(
        <div
          key={`l${i}`}
          className="leading-5 break-words flex gap-2"
          style={{ fontSize: 12, color: C.text, paddingLeft: 8 }}
        >
          <span style={{ color: C.muted, flexShrink: 0 }} aria-hidden>·</span>
          <span className="min-w-0">{renderInline(bullet[2], router, `l${i}`)}</span>
        </div>
      );
      return;
    }

    lastTextIndex = out.length;
    out.push(
      <div
        key={`l${i}`}
        className="leading-5 whitespace-pre-wrap break-words"
        style={{ fontSize: 12, color: C.text }}
      >
        {renderInline(line, router, `l${i}`)}
      </div>
    );
  });

  if (trailing && lastTextIndex >= 0) {
    const last = out[lastTextIndex] as React.ReactElement<{ children?: React.ReactNode }>;
    out[lastTextIndex] = React.cloneElement(last, undefined, last.props.children, trailing);
  } else if (trailing) {
    out.push(<div key="caret" style={{ fontSize: 12 }}>{trailing}</div>);
  }

  return <>{out}</>;
}
