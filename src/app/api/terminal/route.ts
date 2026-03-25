import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";
import { supabase } from "@/lib/supabaseClient";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;

let cachedPrompt: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

async function getSystemPrompt(): Promise<string> {
  if (cachedPrompt && Date.now() - cacheTime < CACHE_TTL) return cachedPrompt;

  const [{ data: contextRows }, { data: posts }] = await Promise.all([
    supabase.from("ai_context").select("content").eq("enabled", true),
    supabase
      .from("posts")
      .select("title, date")
      .order("date", { ascending: false })
      .limit(10),
  ]);

  const sections = contextRows?.map((r) => r.content).join("\n\n") ?? "";
  const blogList = posts?.length
    ? `\n\nMy recent blog posts:\n${posts.map((p) => `- "${p.title}" (${p.date})`).join("\n")}`
    : "";

  const siteInfo = `\n\nWebsite pages (use markdown link format [label](url) when referencing them):\n- [home](/) — landing page\n- [blog](/blog) — writing\n- [about](/about) — who I am\n- [connect](/connect) — how to reach me\n- [matrix](/matrix) — interactive terminal easter egg\n\nWays to connect:\n- [X / Twitter](https://X.com/jordidimass)\n- [Instagram](https://instagram.com/jordidimass)\n- [LinkedIn](https://www.linkedin.com/in/jordidimass/)\n- [GitHub](https://github.com/jordidimass)\n- [Telegram](https://t.me/jordidimass)\n- [schedule a meeting](https://cal.com/jordidimass)\n\nPhotos & profiles around the web:\n- [Unsplash](https://unsplash.com/@jordidimass) — photography\n- [VSCO gallery](https://vsco.co/jordidimass/gallery)\n- [Letterboxd](https://letterboxd.com/jordidimass/) — film diary\n- [Last.fm](https://last.fm/user/jordidimass) — music\n- [Goodreads](https://goodreads.com/jordidimass) — books\n- [Spotify playlists](https://open.spotify.com/user/jordidimass/playlists)\n- [GitHub repos](https://github.com/jordidimass?tab=repositories)`;

  cachedPrompt = `You are an AI assistant representing Jordi Dimas on his personal website. Answer questions concisely and in first person where appropriate.\n\n${sections}${blogList}${siteInfo}\n\nIf asked something you don't know, say so honestly. Keep answers brief and optimized for terminal display. IMPORTANT: Whenever you reference any URL or page in your response, always use markdown link format: [visible label](url). Never output bare URLs.`;
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
