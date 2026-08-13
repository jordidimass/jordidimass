import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, smoothStream, tool, jsonSchema, stepCountIs } from "ai";
import { supabase } from "@/lib/supabaseClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { slugFromKey } from "@/lib/gallery";

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;

let cachedPrompt: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

const GALLERY_WORKER_URL = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL ?? "";

/**
 * Client-side tools: declared with no `execute`, so the SDK forwards the call
 * to the browser and the terminal runs it against the real router and audio
 * element. Nothing here is theatre — a step only appears once the model has
 * actually asked for it, and the result the model sees is what happened.
 */
const siteTools = {
  navigate: tool({
    description:
      "Take the visitor to a page on this site. Use this whenever they ask to go to, open, show or see something — do not just describe the page, actually take them there.",
    inputSchema: jsonSchema<{ path: string }>({
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Absolute internal path. One of / , /blog , /gallery , /about , /connect , /matrix , or a specific /gallery/<slug> or /posts/<slug>.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    }),
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
      .select("title, date")
      .order("date", { ascending: false })
      .limit(10),
    GALLERY_WORKER_URL
      ? fetch(GALLERY_WORKER_URL).then((r) => r.json()).catch(() => null)
      : Promise.resolve(null),
  ]);

  const sections = contextRows?.map((r) => r.content).join("\n\n") ?? "";

  const blogList = posts?.length
    ? `\n\nMy recent blog posts:\n${posts.map((p) => `- "${p.title}" (${p.date})`).join("\n")}`
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

Music note: Last.fm is the primary source for music taste and listening history. Spotify is for playlists only. VSCO is photography — never suggest it for music.`;

  cachedPrompt = `You are Jordi Dimas, speaking on your own personal website. Always answer in the first person — "I", "my", "me". Never refer to Jordi in the third person and never describe yourself as an assistant. Answer concisely.\n\n${sections}${blogList}${galleryList}${siteInfo}\n\nYou can operate this site, not just describe it. You have tools to navigate the visitor to any page, control the music player, and toggle animations. Prefer acting over explaining: if someone asks to see the photos, call navigate rather than telling them where to click. After a tool runs, say what you did in one short line.

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
    model: openai("gpt-4.1-nano-2025-04-14"),
    system: await getSystemPrompt(),
    messages: modelMessages,
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
