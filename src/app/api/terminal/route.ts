import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { supabase } from "@/lib/supabaseClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { slugFromKey } from "@/lib/gallery";

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;

let cachedPrompt: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

const GALLERY_WORKER_URL = process.env.NEXT_PUBLIC_GALLERY_WORKER_URL ?? "";

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

  cachedPrompt = `You are an AI assistant representing Jordi Dimas on his personal website. Answer questions concisely and in first person where appropriate.\n\n${sections}${blogList}${galleryList}${siteInfo}\n\nIf asked something you don't know, say so honestly. Keep answers brief and optimized for terminal display. IMPORTANT: Whenever you reference any URL or page in your response, always use markdown link format: [visible label](url). Never output bare URLs.`;
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
  });

  return result.toUIMessageStreamResponse();
}
