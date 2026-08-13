import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, smoothStream, tool, jsonSchema, stepCountIs } from "ai";
import { supabase } from "@/lib/supabaseClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { slugFromKey } from "@/lib/gallery";
import { TRACKS, TRACK_ORDER } from "@/config/music";

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;

let cachedPrompt: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

const GALLERY_WORKER_URL = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL ?? "";

const POST_BODY_LIMIT = 6000;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function excerpt(content: string | null, limit = 420): string {
  const flat = (content ?? "")
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > limit ? `${flat.slice(0, limit)}…` : flat;
}

/**
 * Client-side tools: declared with no `execute`, so the SDK forwards the call
 * to the browser and the terminal runs it against the real router and audio
 * element. Nothing here is theatre — a step only appears once the model has
 * actually asked for it, and the result the model sees is what happened.
 */
const siteTools = {
  navigate: tool({
    description:
      "Move the visitor to a different page of THIS site. Only call this when they explicitly ask to be taken somewhere — 'take me to', 'go to', 'open', 'show me'. A question such as 'how can we have a meeting?' or 'give me your telegram' is NOT a navigation request: answer it with a link instead. This cannot open external sites, so never call it as a stand-in for one. To open a specific blog post use /posts/<slug> with a slug from the post list; /blog is only the index. Never guess a slug.",
    inputSchema: jsonSchema<{ path: string }>({
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Absolute internal path. One of / , /blog , /gallery , /about , /connect , /matrix , or a specific /posts/<slug> or /gallery/<slug> taken verbatim from the lists you were given.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    }),
  }),
  readPost: tool({
    description:
      "Read the full text of one of my blog posts. Use this before answering anything specific about what a post says, argues or covers — do not guess from the title.",
    inputSchema: jsonSchema<{ slug: string }>({
      type: "object",
      properties: {
        slug: { type: "string", description: "The post slug, taken verbatim from the post list." },
      },
      required: ["slug"],
      additionalProperties: false,
    }),
    execute: async ({ slug }: { slug: string }) => {
      const { data, error } = await supabase
        .from("posts")
        .select("title, date, content")
        .eq("slug", slug)
        .single();
      if (error || !data) return `No post with slug "${slug}".`;
      const body = (data.content ?? "").slice(0, POST_BODY_LIMIT);
      return `"${data.title}" (${formatDate(data.date)}) — /posts/${slug}\n\n${body}`;
    },
  }),
  music: tool({
    description:
      "Control the music player built into the terminal. Use when the visitor asks to play, pause, skip or change music.",
    inputSchema: jsonSchema<{ action: "play" | "pause" | "next" | "previous"; track?: string }>({
      type: "object",
      properties: {
        action: { type: "string", enum: ["play", "pause", "next", "previous"] },
        track: {
          type: "string",
          description: "Optional track title to play. Matched loosely against the playlist.",
        },
      },
      required: ["action"],
      additionalProperties: false,
    }),
  }),
  setAnimations: tool({
    description:
      "Turn the site's animations on or off. Use when the visitor asks for less motion, or to re-enable it.",
    inputSchema: jsonSchema<{ enabled: boolean }>({
      type: "object",
      properties: { enabled: { type: "boolean" } },
      required: ["enabled"],
      additionalProperties: false,
    }),
  }),
} as const;

async function getSystemPrompt(): Promise<string> {
  if (cachedPrompt && Date.now() - cacheTime < CACHE_TTL) return cachedPrompt;

  const [{ data: contextRows }, { data: posts }, galleryData] = await Promise.all([
    supabase.from("ai_context").select("content").eq("enabled", true),
    supabase
      .from("posts")
      .select("slug, title, date, content")
      .order("date", { ascending: false })
      .limit(10),
    GALLERY_WORKER_URL
      ? fetch(GALLERY_WORKER_URL).then((r) => r.json()).catch(() => null)
      : Promise.resolve(null),
  ]);

  const sections = contextRows?.map((r) => r.content).join("\n\n") ?? "";

  const blogList = posts?.length
    ? `\n\nMy blog posts, newest first. The first entry IS my latest/most recent post:\n${posts
        .map(
          (p, i) =>
            `${i + 1}. "${p.title}" — published ${formatDate(p.date)} — url /posts/${p.slug} — slug "${p.slug}"\n   about: ${excerpt(p.content)}`
        )
        .join("\n")}`
    : "";

  const galleryImages: string[] =
    (galleryData?.images ?? []).map((img: { key: string }) => slugFromKey(img.key));
  const galleryList = galleryImages.length
    ? `\n\nMy [gallery](/gallery) has ${galleryImages.length} photos. Each photo has a dedicated page at /gallery/[name] — always link individual photos using markdown format [name](/gallery/name). Current photos: ${galleryImages.map((s) => `[${s}](/gallery/${s})`).join(", ")}.`
    : "";

  const siteInfo = `\n\nWebsite pages (use markdown link format [label](url) when referencing them):
- [home](/) — landing page
- [blog](/blog) — writing
- [gallery](/gallery) — photography
- [about](/about) — who I am
- [connect](/connect) — how to reach me
- [matrix](/matrix) — interactive terminal easter egg

Ways to connect:
- [X / Twitter](https://X.com/jordidimass)
- [Instagram](https://instagram.com/jordidimass)
- [LinkedIn](https://www.linkedin.com/in/jordidimass/)
- [GitHub](https://github.com/jordidimass)
- [Telegram](https://t.me/jordidimass)
- [schedule a meeting](https://cal.com/jordidimass)

Photos & profiles around the web:
- [Unsplash](https://unsplash.com/@jordidimass) — photography
- [VSCO](https://vsco.co/jordidimass/gallery) — photography (VSCO is a photo-sharing platform, not music)
- [Letterboxd](https://letterboxd.com/jordidimass/) — film diary
- [Last.fm](https://last.fm/user/jordidimass) — music listening history and scrobbles
- [Goodreads](https://goodreads.com/jordidimass) — books
- [Spotify](https://open.spotify.com/user/jordidimass/playlists) — curated playlists
- [GitHub repos](https://github.com/jordidimass?tab=repositories)

Music note: Last.fm is the primary source for music taste and listening history. Spotify is for playlists only. VSCO is photography — never suggest it for music.

The terminal player's playlist, exactly these ${TRACK_ORDER.length} tracks:
${TRACK_ORDER.map((k) => `- ${TRACKS[k].title}`).join("\n")}

MUSIC RULES:
- Any band, artist or song name from that list is a music request. "put some Title Fight on", "play Elliott Smith", "some Gomez" — all mean call the music tool with action "play" and that name as track. They are never page names, never a reason to navigate.
- "put on", "play", "throw on", "give me some" followed by a name = music, not navigation.
- Match loosely: a band name alone is enough, I only have one track per artist.
- If the name is not on that list, say I do not have it rather than playing something else, and never navigate instead.

NAVIGATION RULES — moving someone off the page they are reading is disruptive, so the bar is high:
- Only call navigate when they ask to BE MOVED: "take me to", "go to", "open", "show me", "bring me to", "put X on screen".
- A question is not a navigation request. "how can we have a meeting?", "give me your telegram", "what do you write about?", "where can I find X?" — answer in words with a link, and do NOT navigate.
- Everything off this site — scheduling, Telegram, X, Instagram, LinkedIn, GitHub, Spotify, Last.fm, Letterboxd, Goodreads, Unsplash, VSCO — is a link only. navigate moves between pages of THIS site and can never open any of them. Never navigate to /connect or /about as a substitute.
- Never navigate to a page just to cite a link that is already in your answer.
- "I want to X", "I'd like to X", "can I X", "how do I X" are requests for information, not for movement. Answer them with a link.
- When unsure, answer with a link and do not navigate.

WORKED EXAMPLES — follow these exactly:
- "i want to schedule a meeting" → NO tool call. Reply: You can [schedule a meeting](https://cal.com/jordidimass) with me.
- "give me your telegram" → NO tool call. Reply: I'm on [Telegram](https://t.me/jordidimass).
- "how can we have a meeting?" → NO tool call. Reply: Grab a slot on my [calendar](https://cal.com/jordidimass).
- "where are your photos?" → NO tool call. Reply: They're in my [gallery](/gallery).
- "take me to your photos" → navigate /gallery.
- "open your latest post" → navigate to the /posts/<slug> of the first post listed above.
- "what is your latest post about?" → readPost with that slug, then answer in words.
- "put some Title Fight on" → music, action play, track Title Fight.

LINK RULES — these are absolute, a wrong path is a broken page:
- The visible label must name the destination: [schedule a meeting](...), [Telegram](...), [Harness your Agent](...). Never "this link", "here", "this page", "click here".
- A blog post lives at /posts/<slug>. NEVER /blog/<slug>. /blog is only the index listing.
- A photo lives at /gallery/<slug>. /gallery is only the index.
- The only other valid internal paths are exactly: /, /blog, /gallery, /about, /connect, /matrix.
- Only ever use a slug that appears verbatim in the lists above. Never invent, guess, pluralise or reword one.
- If you do not have a slug for something, link to the index page instead — /blog or /gallery.
- Always use relative paths starting with /. Never write the domain name.`;

  cachedPrompt = `You are Jordi Dimas, speaking on your own personal website. Always answer in the first person — "I", "my", "me". Never refer to Jordi in the third person and never describe yourself as an assistant. Answer concisely.\n\n${sections}${blogList}${galleryList}${siteInfo}\n\nYou can operate this site, not just describe it. You have tools to navigate the visitor to any page, read the full text of a post, control the music player, and toggle animations. Prefer acting over explaining: if someone asks to see the photos, call navigate rather than telling them where to click. If they ask for my latest or most recent post, navigate straight to /posts/<slug> of the FIRST post in the list above — not to /blog. After a tool runs, say what you did in one short line.

If asked something you don't know, say so honestly. Keep answers brief and optimized for terminal display. IMPORTANT: Whenever you reference any URL or page in your response, always use markdown link format: [visible label](url). Never output bare URLs.`;
  cacheTime = Date.now();
  return cachedPrompt;
}

export async function POST(req: Request) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages } = await req.json();

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "No messages provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Input validation
  if (messages.length > MAX_MESSAGES) {
    return new Response(JSON.stringify({ error: "Too many messages in conversation." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  for (const msg of messages) {
    const parts = msg.parts ?? [];
    for (const part of parts) {
      if (part.type === "text" && part.text?.length > MAX_CONTENT_LENGTH) {
        return new Response(JSON.stringify({ error: "Message content too long." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  // useChat sends UIMessage[]; streamText requires ModelMessage[]
  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: openai("gpt-4.1-mini"),
    system: await getSystemPrompt(),
    messages: modelMessages,
    temperature: 0,
    tools: siteTools,
    // One step to call a tool, another to speak after seeing the result.
    stopWhen: stepCountIs(5),
    // nano answers faster than anyone can read, so the whole reply used to land
    // in a single frame. This paces the real tokens word by word — nothing is
    // fabricated, the arrival is just spread out enough to follow.
    experimental_transform: smoothStream({ chunking: "word", delayInMs: 18 }),
  });

  return result.toUIMessageStreamResponse();
}
