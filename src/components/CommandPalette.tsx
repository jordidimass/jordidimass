"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { createPortal } from "react-dom";
import { profileData } from "@/config/profile";
import { slugFromKey, type GalleryImage } from "@/lib/gallery";
import type { PostMetadata } from "@/lib/posts";
import { useMotionContext } from "./MotionProvider";

// ── Icons ────────────────────────────────────────────────────────────────────

function IconNav() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconPost() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconPhoto() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconTerminal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function IconSkipNext() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}

function IconSkipPrev() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  );
}

function IconMusic() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

// ── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Home", href: "/", keywords: ["home", "landing", "start"] },
  { label: "Blog", href: "/blog", keywords: ["blog", "posts", "writing"] },
  { label: "Gallery", href: "/gallery", keywords: ["gallery", "photos", "photography"] },
  { label: "About", href: "/about", keywords: ["about", "bio", "me", "skills"] },
  { label: "Connect", href: "/connect", keywords: ["connect", "contact", "social"] },
];

// ── Music ────────────────────────────────────────────────────────────────────

type TrackKey =
  | "rave_zion" | "prime_audio_soup" | "happiness" | "clubbed"
  | "spybreak" | "mindfields" | "windowlicker" | "blockrockin" | "places";

const TRACKS: { key: TrackKey; title: string }[] = [
  { key: "rave_zion",        title: "Rave Zion" },
  { key: "prime_audio_soup", title: "Meat Beat Manifesto - Prime Audio Soup" },
  { key: "happiness",        title: "Porter Robinson - Is There Really No Happiness" },
  { key: "clubbed",          title: "Rob Dougan - Clubbed to Death" },
  { key: "spybreak",         title: "Propellerheads - Spybreak" },
  { key: "mindfields",       title: "The Prodigy - Mindfields" },
  { key: "windowlicker",     title: "Aphex Twin - Window Licker" },
  { key: "blockrockin",      title: "The Chemical Brothers - Block Rockin Beats" },
  { key: "places",           title: "Fred again.. & Anderson .Paak - places to be" },
];

// ── Global styles injected once ───────────────────────────────────────────────

const CMDK_STYLES = `
  .jd-cmdk-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 20vh;
    padding-left: 16px;
    padding-right: 16px;
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  .jd-cmdk-panel {
    width: 100%;
    max-width: 560px;
    background: #111010;
    border: 1px solid rgba(172,139,139,0.22);
    border-radius: 14px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.85);
    overflow: hidden;
  }
  .jd-cmdk-panel [cmdk-input-wrapper] {
    border-bottom: 1px solid rgba(172,139,139,0.15);
  }
  .jd-cmdk-panel [cmdk-input] {
    width: 100%;
    padding: 14px 18px;
    background: transparent;
    border: none;
    outline: none;
    font-size: 15px;
    color: #E8E0D8;
    font-family: var(--font-geist-sans);
  }
  .jd-cmdk-panel [cmdk-input]::placeholder {
    color: #6b5e5e;
  }
  .jd-cmdk-panel [cmdk-list] {
    max-height: 360px;
    overflow-y: auto;
    padding: 8px;
    scrollbar-width: thin;
    scrollbar-color: rgba(172,139,139,0.25) transparent;
  }
  .jd-cmdk-panel [cmdk-list]::-webkit-scrollbar {
    width: 4px;
  }
  .jd-cmdk-panel [cmdk-list]::-webkit-scrollbar-track {
    background: transparent;
  }
  .jd-cmdk-panel [cmdk-list]::-webkit-scrollbar-thumb {
    background: rgba(172,139,139,0.25);
    border-radius: 2px;
  }
  .jd-cmdk-panel [cmdk-group-heading] {
    padding: 8px 10px 4px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b5e5e;
    font-family: var(--font-geist-sans);
    user-select: none;
  }
  .jd-cmdk-panel [cmdk-item] {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13.5px;
    color: #E8E0D8;
    font-family: var(--font-geist-sans);
    outline: none;
    transition: background 0.1s, color 0.1s;
  }
  .jd-cmdk-panel [cmdk-item][aria-selected="true"] {
    background: rgba(255,188,188,0.09);
    color: #FFBCBC;
  }
  .jd-cmdk-panel [cmdk-item][aria-selected="true"] .jd-icon {
    color: #FFBCBC;
  }
  .jd-cmdk-panel [cmdk-item]:hover {
    background: rgba(255,188,188,0.06);
  }
  .jd-cmdk-panel [cmdk-empty] {
    padding: 28px;
    text-align: center;
    font-size: 13px;
    color: #6b5e5e;
    font-family: var(--font-geist-sans);
  }
  .jd-cmdk-footer {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 8px 14px;
    border-top: 1px solid rgba(172,139,139,0.12);
  }
  .jd-cmdk-footer kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 5px;
    background: rgba(172,139,139,0.1);
    border: 1px solid rgba(172,139,139,0.18);
    border-radius: 4px;
    font-size: 10px;
    color: #AC8B8B;
    font-family: var(--font-geist-sans);
  }
  .jd-cmdk-footer span {
    font-size: 11px;
    color: #6b5e5e;
    font-family: var(--font-geist-sans);
  }
  .jd-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    color: #AC8B8B;
    transition: color 0.1s;
  }
  .jd-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .jd-hint {
    font-size: 11px;
    color: #6b5e5e;
    flex-shrink: 0;
  }
`;

// ── Main component ────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const router = useRouter();
  const { motionEnabled, toggleMotion } = useMotionContext();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState<PostMetadata[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const stylesInjected = useRef(false);

  // Mount guard for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Inject styles once
  useEffect(() => {
    if (stylesInjected.current) return;
    const style = document.createElement("style");
    style.id = "jd-cmdk-styles";
    style.textContent = CMDK_STYLES;
    document.head.appendChild(style);
    stylesInjected.current = true;
  }, []);

  // Fetch dynamic content on mount
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      fetch(`${supabaseUrl}/rest/v1/posts?select=slug,title,date&order=date.desc`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      })
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setPosts(data))
        .catch(() => {});
    }

    const workerUrl = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL;
    if (workerUrl) {
      fetch(workerUrl)
        .then((r) => r.json())
        .then((data) => Array.isArray(data.images) && setImages(data.images))
        .catch(() => {});
    }
  }, []);

  // Global Cmd+K / Ctrl+K to toggle open; Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mac = navigator.platform.toUpperCase().includes("MAC");
      if ((mac ? e.metaKey : e.ctrlKey) && e.key === "k") {
        const el = (e.target instanceof Element ? e.target : null) ?? (document.activeElement instanceof Element ? document.activeElement : null);
        // Let terminal UIs use Cmd/Ctrl+K for clear without opening the palette.
        if (el?.closest?.("[data-jd-terminal]")) return;
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const runAndClose = useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, []);

  const navigate = useCallback(
    (href: string) => runAndClose(() => router.push(href)),
    [router, runAndClose]
  );

  const openExternal = useCallback(
    (href: string) => runAndClose(() => window.open(href, "_blank", "noopener,noreferrer")),
    [runAndClose]
  );

  const openTerminal = useCallback(
    () => runAndClose(() => window.dispatchEvent(new CustomEvent("open-terminal"))),
    [runAndClose]
  );

  const handleToggleMotion = useCallback(
    () => runAndClose(toggleMotion),
    [runAndClose, toggleMotion]
  );

  const musicPlay = useCallback(
    () => runAndClose(() => window.dispatchEvent(new CustomEvent("music-play"))),
    [runAndClose]
  );
  const musicPause = useCallback(
    () => runAndClose(() => window.dispatchEvent(new CustomEvent("music-pause"))),
    [runAndClose]
  );
  const musicNext = useCallback(
    () => runAndClose(() => window.dispatchEvent(new CustomEvent("music-next"))),
    [runAndClose]
  );
  const musicPrev = useCallback(
    () => runAndClose(() => window.dispatchEvent(new CustomEvent("music-prev"))),
    [runAndClose]
  );
  const musicTrack = useCallback(
    (key: TrackKey) => runAndClose(() => window.dispatchEvent(new CustomEvent("music-track", { detail: { track: key } }))),
    [runAndClose]
  );

  if (!mounted || !open) return null;

  const palette = (
    <div cmdk-dialog="" className="jd-cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="jd-cmdk-panel" onClick={(e) => e.stopPropagation()}>
        <Command label="Command palette">
          <div cmdk-input-wrapper="">
            <Command.Input placeholder="Search pages, posts, links…" autoFocus />
          </div>

          <Command.List>
            <Command.Empty>No results found.</Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigation">
              {NAV_ITEMS.map((item) => (
                <Command.Item
                  key={item.href}
                  value={item.label}
                  keywords={item.keywords}
                  onSelect={() => navigate(item.href)}
                >
                  <span className="jd-icon"><IconNav /></span>
                  <span className="jd-label">{item.label}</span>
                  <span className="jd-hint">{item.href}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Blog Posts */}
            {posts.length > 0 && (
              <Command.Group heading="Blog Posts">
                {posts.map((post) => (
                  <Command.Item
                    key={post.slug}
                    value={post.title}
                    keywords={["blog", "post", "writing"]}
                    onSelect={() => navigate(`/posts/${post.slug}`)}
                  >
                    <span className="jd-icon"><IconPost /></span>
                    <span className="jd-label">{post.title}</span>
                    {post.date && (
                      <span className="jd-hint">
                        {new Date(post.date).getFullYear()}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Actions */}
            <Command.Group heading="Actions">
              <Command.Item
                value="open terminal"
                keywords={["terminal", "cli", "command", "shell"]}
                onSelect={openTerminal}
              >
                <span className="jd-icon"><IconTerminal /></span>
                <span className="jd-label">Open Terminal</span>
              </Command.Item>
              <Command.Item
                value="book a meeting"
                keywords={["meeting", "calendar", "schedule", "cal"]}
                onSelect={() => openExternal("https://cal.com/jordidimass")}
              >
                <span className="jd-icon"><IconCalendar /></span>
                <span className="jd-label">Book a Meeting</span>
                <span className="jd-hint">↗</span>
              </Command.Item>
              <Command.Item
                value={motionEnabled ? 'animations off' : 'animations on'}
                keywords={["animations", "motion", "disable", "enable", "minimal", "lite", "performance"]}
                onSelect={handleToggleMotion}
              >
                <span className="jd-icon"><IconZap /></span>
                <span className="jd-label">{motionEnabled ? 'Animations Off' : 'Animations On'}</span>
              </Command.Item>
            </Command.Group>

            {/* Social */}
            <Command.Group heading="Social">
              {profileData.socials.map((s) => (
                <Command.Item
                  key={s.href}
                  value={s.title}
                  keywords={["social", "profile", s.title.toLowerCase()]}
                  onSelect={() => openExternal(s.href)}
                >
                  <span className="jd-icon"><IconExternal /></span>
                  <span className="jd-label">{s.title}</span>
                  <span className="jd-hint">↗</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Links */}
            <Command.Group heading="Links">
              {profileData.links.map((l) => (
                <Command.Item
                  key={l.href}
                  value={l.title}
                  keywords={["link", "external"]}
                  onSelect={() => openExternal(l.href)}
                >
                  <span className="jd-icon"><IconExternal /></span>
                  <span className="jd-label">{l.title}</span>
                  <span className="jd-hint">↗</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Gallery */}
            {images.length > 0 && (
              <Command.Group heading="Gallery">
                {images.slice(0, 12).map((img) => {
                  const slug = slugFromKey(img.key);
                  const name = img.key.replace(/\.[^.]+$/, "");
                  return (
                    <Command.Item
                      key={img.key}
                      value={name}
                      keywords={["gallery", "photo", "image"]}
                      onSelect={() => navigate(`/gallery/${slug}`)}
                    >
                      <span className="jd-icon"><IconPhoto /></span>
                      <span className="jd-label">{name}</span>
                      <span className="jd-hint">/gallery</span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Music */}
            <Command.Group heading="Music">
              <Command.Item
                value="play music"
                keywords={["play", "music", "start", "audio"]}
                onSelect={musicPlay}
              >
                <span className="jd-icon"><IconPlay /></span>
                <span className="jd-label">Play</span>
              </Command.Item>
              <Command.Item
                value="pause music"
                keywords={["pause", "music", "stop", "audio"]}
                onSelect={musicPause}
              >
                <span className="jd-icon"><IconPause /></span>
                <span className="jd-label">Pause</span>
              </Command.Item>
              <Command.Item
                value="next track"
                keywords={["next", "skip", "track", "music"]}
                onSelect={musicNext}
              >
                <span className="jd-icon"><IconSkipNext /></span>
                <span className="jd-label">Next Track</span>
              </Command.Item>
              <Command.Item
                value="previous track"
                keywords={["prev", "previous", "back", "track", "music"]}
                onSelect={musicPrev}
              >
                <span className="jd-icon"><IconSkipPrev /></span>
                <span className="jd-label">Previous Track</span>
              </Command.Item>
              {TRACKS.map((t) => (
                <Command.Item
                  key={t.key}
                  value={t.title}
                  keywords={["play", "music", "track", t.key]}
                  onSelect={() => musicTrack(t.key)}
                >
                  <span className="jd-icon"><IconMusic /></span>
                  <span className="jd-label">{t.title}</span>
                  <span className="jd-hint">▶</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="jd-cmdk-footer">
            <kbd>↑↓</kbd><span>navigate</span>
            <kbd>↵</kbd><span>open</span>
            <kbd>esc</kbd><span>close</span>
          </div>
        </Command>
      </div>
    </div>
  );

  return createPortal(palette, document.body);
}
