import { TRACKS, TRACK_ORDER, type TrackKey } from "@/config/music";
import { profileData } from "@/config/profile";

export type CommandGroup = "ask" | "navigate" | "music" | "site" | "info";

export type OutputLine =
  | { kind: "text"; text: string; dim?: boolean }
  | { kind: "link"; label: string; href: string; external?: boolean }
  | { kind: "action"; label: string; command: string };

export type ArgSpec = {
  name: string;
  required?: boolean;
  rest?: boolean;
  describe?: string;
  complete?: (ctx: CommandContext) => string[];
};

export type CommandContext = {
  navigate: (path: string) => void;
  openExternal: (url: string) => void;
  print: (lines: OutputLine[]) => void;
  clear: () => void;
  closeTerminal: () => void;
  enterAsk: (question?: string) => void;
  runCommand: (input: string) => Promise<string>;
  music: {
    play: () => Promise<string>;
    pause: () => string;
    next: () => Promise<string>;
    prev: () => Promise<string>;
    select: (key: TrackKey) => string;
    current: () => TrackKey;
    playing: () => boolean;
  };
  motion: { enabled: () => boolean; toggle: () => void };
  photoSlugs: () => string[];
  postSlugs: () => { slug: string; title: string }[];
};

export type Command = {
  name: string;
  summary: string;
  group: CommandGroup;
  args?: ArgSpec[];
  aliases?: string[];
  aiExposed: boolean;
  hidden?: boolean;
  run: (ctx: CommandContext, args: string[]) => string | Promise<string>;
};

const text = (t: string, dim = false): OutputLine => ({ kind: "text", text: t, dim });
const link = (label: string, href: string, external = false): OutputLine => ({ kind: "link", label, href, external });

function findTrack(query: string): TrackKey | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    TRACK_ORDER.find((k) => TRACKS[k].title.toLowerCase() === q) ??
    TRACK_ORDER.find((k) => TRACKS[k].title.toLowerCase().includes(q)) ??
    null
  );
}

export const COMMANDS: Command[] = [
  {
    name: "ask",
    summary: "start a conversation  (esc to leave)",
    group: "ask",
    args: [{ name: "question", rest: true, describe: "optional opening question" }],
    aiExposed: false,
    run: (ctx, args) => {
      const question = args.join(" ").trim();
      ctx.enterAsk(question || undefined);
      return question ? `asked: ${question}` : "entered ask mode";
    },
  },
  {
    name: "play",
    summary: "start playback, or play a track",
    group: "music",
    args: [{ name: "track", rest: true, describe: "track or artist name", complete: () => TRACK_ORDER.map((k) => TRACKS[k].title) }],
    aiExposed: true,
    run: async (ctx, args) => {
      const query = args.join(" ").trim();
      if (query) {
        const key = findTrack(query);
        if (!key) throw new Error(`no track matching "${query}". try: tracks`);
        const msg = ctx.music.select(key);
        ctx.print([text(msg)]);
        return msg;
      }
      const msg = await ctx.music.play();
      ctx.print([text(msg)]);
      return msg;
    },
  },
  {
    name: "shortcuts",
    summary: "keys, and how to run commands from the chat",
    group: "info",
    aiExposed: true,
    run: (ctx) => {
      ctx.print([
        text("global:", true),
        text("  Cmd/Ctrl K        command palette"),
        text("  Cmd/Ctrl Shift K  toggle terminal"),
        text("  ?                 shortcuts panel"),
        text(""),
        text("terminal:", true),
        text("  Tab               complete command or argument"),
        text("  ↑ ↓               command history"),
        text("  Ctrl R            search history"),
        text("  Cmd/Ctrl K        clear"),
        text("  Esc               leave ask mode, then close"),
        text("  &&                chain commands"),
        text("  / + command       run any of these without leaving ask mode"),
      ]);
      return "Cmd+K palette, Cmd+Shift+K terminal, Tab complete, Ctrl+R history, && chains";
    },
  },
  {
    name: "help",
    summary: "list every command",
    group: "info",
    args: [{ name: "command", describe: "show detail for one command", complete: () => COMMANDS.filter((c) => !c.hidden).map((c) => c.name) }],
    aiExposed: true,
    run: (ctx, args) => {
      const target = args[0]?.toLowerCase();
      if (target) {
        const cmd = lookup(target);
        if (!cmd) {
          ctx.print([text(`no command named "${target}"`, true)]);
          return `no command named ${target}`;
        }
        ctx.print([
          text(signature(cmd)),
          text(`  ${cmd.summary}`, true),
          ...(cmd.aliases?.length ? [text(`  aliases: ${cmd.aliases.join(", ")}`, true)] : []),
        ]);
        return `${cmd.name}: ${cmd.summary}`;
      }
      const width = Math.max(...COMMANDS.filter((c) => !c.hidden).map((c) => c.name.length)) + 2;
      ctx.print([
        text("available commands:", true),
        ...COMMANDS.filter((c) => !c.hidden).map((c) =>
          text(`  ${c.name.padEnd(width)}${c.summary}`)
        ),
      ]);
      return COMMANDS.filter((c) => !c.hidden).map((c) => c.name).join(", ");
    },
  },
  {
    name: "pages",
    summary: "show all site pages",
    group: "navigate",
    aliases: ["ls"],
    aiExposed: true,
    run: (ctx) => {
      ctx.print([
        text("site pages:", true),
        link("  home", "/"),
        link("  blog", "/blog"),
        link("  gallery", "/gallery"),
        link("  about", "/about"),
        link("  connect", "/connect"),
      ]);
      return "/ , /blog, /gallery, /about, /connect";
    },
  },
  {
    name: "open",
    summary: "open a page, post or photo",
    group: "navigate",
    aliases: ["cd"],
    args: [
      {
        name: "target",
        required: true,
        describe: "page name, post slug or photo slug",
        complete: (ctx) => [
          "home", "blog", "gallery", "about", "connect", "matrix",
          ...ctx.postSlugs().map((p) => p.slug),
          ...ctx.photoSlugs(),
        ],
      },
    ],
    aiExposed: true,
    run: (ctx, args) => {
      const target = args[0]?.toLowerCase();
      if (!target) throw new Error("expected a page, post or photo");
      const pages: Record<string, string> = {
        home: "/", "/": "/", blog: "/blog", gallery: "/gallery",
        about: "/about", connect: "/connect", matrix: "/matrix",
      };
      if (pages[target]) { ctx.navigate(pages[target]); return `opened ${pages[target]}`; }
      if (ctx.postSlugs().some((p) => p.slug === target)) {
        ctx.navigate(`/posts/${target}`);
        return `opened /posts/${target}`;
      }
      if (ctx.photoSlugs().includes(target)) {
        ctx.navigate(`/gallery/${target}`);
        return `opened /gallery/${target}`;
      }
      throw new Error(`nothing called "${target}". try: pages, or a post/photo slug`);
    },
  },
  {
    name: "posts",
    summary: "list blog posts",
    group: "info",
    aiExposed: true,
    run: (ctx) => {
      const posts = ctx.postSlugs();
      if (!posts.length) { ctx.print([text("no posts loaded yet", true)]); return "none"; }
      ctx.print([
        text("posts:", true),
        ...posts.map((p) => link(`  ${p.title}`, `/posts/${p.slug}`)),
      ]);
      return posts.map((p) => p.title).join(", ");
    },
  },
  {
    name: "links",
    summary: "show social & profile links",
    group: "info",
    aiExposed: true,
    run: (ctx) => {
      ctx.print([
        text("social:", true),
        ...profileData.socials.map((s) => link(`  ${s.title}`, s.href, true)),
        text(""),
        text("around the web:", true),
        ...profileData.links.map((l) => link(`  ${l.title}`, l.href, true)),
      ]);
      return [...profileData.socials, ...profileData.links].map((l) => `${l.title}: ${l.href}`).join(", ");
    },
  },
  {
    name: "whoami",
    summary: "who i am",
    group: "info",
    aiExposed: true,
    run: (ctx) => {
      ctx.print([
        text("jordi dimas"),
        text("software developer from guatemala, with a deep fascination for physics,"),
        text("systems theory, and the intricate world of computer science."),
        text(""),
        text("i believe in the power of continuous learning and the beauty of elegant"),
        text("solutions. every line of code is an opportunity to create something"),
        text("meaningful, and every project is a chance to push the boundaries of"),
        text("what's possible."),
        text(""),
        text("always open to collaborating on innovative projects and connecting with"),
        text("fellow developers who share a passion for crafting exceptional digital"),
        text("experiences."),
      ]);
      return "software developer from guatemala; physics, systems theory, computer science";
    },
  },
  {
    name: "neofetch",
    summary: "system info",
    group: "info",
    aiExposed: true,
    run: (ctx) => {
      const art = ["                    λ","                   λλ","                  λλλ","                 λλλλ","                λλλλλ","               λλλλλλ","              λλλλλλλ"];
      const info = ["jordidimas@web","--------------","OS     Next.js App Router","Shell  React 19","DE     Tailwind CSS v4","AI     Vercel AI SDK v6","DB     Supabase"];
      ctx.print([
        ...art.map((a, i) => text(`${a.padEnd(24)}  ${info[i] ?? ""}`)),
        text(""),
        text("Host   jordidimas.dev", true),
      ]);
      return info.join(" | ");
    },
  },
  {
    name: "pause",
    summary: "pause playback",
    group: "music",
    aiExposed: true,
    run: (ctx) => {
      const msg = ctx.music.pause();
      ctx.print([text(msg)]);
      return msg;
    },
  },
  {
    name: "next",
    summary: "next track",
    group: "music",
    aiExposed: true,
    run: async (ctx) => {
      const msg = await ctx.music.next();
      ctx.print([text(`→ ${msg}`)]);
      return msg;
    },
  },
  {
    name: "prev",
    summary: "previous track",
    group: "music",
    aiExposed: true,
    run: async (ctx) => {
      const msg = await ctx.music.prev();
      ctx.print([text(`→ ${msg}`)]);
      return msg;
    },
  },
  {
    name: "tracks",
    summary: "list the playlist",
    group: "music",
    aiExposed: true,
    run: (ctx) => {
      const current = ctx.music.current();
      ctx.print([
        text("playlist:", true),
        ...TRACK_ORDER.map((k, i) =>
          text(`  ${String(i + 1).padStart(2)}. ${TRACKS[k].title}${k === current ? "  ◂" : ""}`)
        ),
      ]);
      return TRACK_ORDER.map((k) => TRACKS[k].title).join(", ");
    },
  },
  {
    name: "animation",
    summary: "toggle animations on/off",
    group: "site",
    aiExposed: true,
    run: (ctx) => {
      ctx.motion.toggle();
      const next = !ctx.motion.enabled();
      ctx.print([text(`animations ${next ? "on" : "off"}`, true)]);
      return `animations ${next ? "on" : "off"}`;
    },
  },
  {
    name: "matrix",
    summary: "enter the matrix",
    group: "site",
    aliases: ["toggle-matrix"],
    aiExposed: true,
    run: (ctx) => {
      ctx.print([text("entering the matrix...", true)]);
      setTimeout(() => ctx.navigate("/matrix"), 700);
      return "entering the matrix";
    },
  },
  {
    name: "clear",
    summary: "clear terminal  (Cmd/Ctrl+K)",
    group: "site",
    aiExposed: false,
    run: (ctx) => { ctx.clear(); return "cleared"; },
  },
  {
    name: "exit",
    summary: "close terminal",
    group: "site",
    aiExposed: false,
    run: (ctx) => {
      ctx.print([text("closing terminal...", true)]);
      setTimeout(() => ctx.closeTerminal(), 600);
      return "closing";
    },
  },
];

const BY_NAME = new Map<string, Command>();
for (const c of COMMANDS) {
  BY_NAME.set(c.name, c);
  for (const a of c.aliases ?? []) BY_NAME.set(a, c);
}

export function lookup(name: string): Command | undefined {
  return BY_NAME.get(name.trim().toLowerCase());
}

export function signature(c: Command): string {
  const args = (c.args ?? [])
    .map((a) => (a.required ? `<${a.name}>` : `[${a.name}${a.rest ? "..." : ""}]`))
    .join(" ");
  return args ? `${c.name} ${args}` : c.name;
}

export function allNames(): string[] {
  return [...BY_NAME.keys()].sort();
}

export function completionsFor(input: string, ctx: CommandContext): string[] {
  const parts = input.split(/\s+/);
  if (parts.length <= 1) {
    const prefix = (parts[0] ?? "").toLowerCase();
    return allNames().filter((n) => n.startsWith(prefix));
  }
  const cmd = lookup(parts[0]);
  if (!cmd?.args?.length) return [];
  const argIndex = Math.min(parts.length - 2, cmd.args.length - 1);
  const spec = cmd.args[argIndex];
  if (!spec?.complete) return [];
  const prefix = parts.slice(argIndex + 1).join(" ").toLowerCase();
  return spec.complete(ctx).filter((v) => v.toLowerCase().startsWith(prefix));
}

function looksConversational(input: string): boolean {
  const words = input.trim().split(/\s+/);
  if (input.includes("?")) return true;
  if (words.length < 3) return false;
  return !lookup(words[0]);
}

function nearest(name: string): string | null {
  const n = name.toLowerCase();
  if (n.length < 2) return null;
  return (
    allNames().find((c) => c.startsWith(n) || n.startsWith(c)) ??
    allNames().find((c) => c.includes(n)) ??
    null
  );
}

export async function execute(input: string, ctx: CommandContext): Promise<string> {
  const raw = input.trim();
  if (!raw) return "";
  const [name, ...args] = raw.split(/\s+/);
  const cmd = lookup(name);
  if (!cmd) {
    if (looksConversational(raw)) {
      throw new Error(`that reads like a question — try: ask ${raw}`);
    }
    const near = nearest(name);
    throw new Error(
      near
        ? `command not found: ${name}. did you mean "${near}"?`
        : `command not found: ${name}. type "help" for the list, or "ask" to just talk to me.`
    );
  }
  const required = (cmd.args ?? []).filter((a) => a.required);
  if (args.length < required.length) {
    const missing = required[args.length];
    const hint = missing.complete?.(ctx).slice(0, 4).join(", ");
    throw new Error(
      `${cmd.name}: expected ${missing.describe ?? missing.name}${hint ? `. try: ${hint}` : ""}`
    );
  }
  return cmd.run(ctx, args);
}

export function aiCommandCatalog(): string {
  return COMMANDS.filter((c) => c.aiExposed && !c.hidden)
    .map((c) => `- ${signature(c)} — ${c.summary}`)
    .join("\n");
}
