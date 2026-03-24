import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { supabase } from "@/lib/supabaseClient";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 2000;

let cachedPrompt: string | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

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

  cachedPrompt = `You are an AI assistant representing Jordi Dimas on his personal website. Answer questions concisely and in first person where appropriate.\n\n${sections}${blogList}\n\nIf asked something you don't know, say so honestly. Keep answers brief.`;
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
    const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    if (text.length > MAX_CONTENT_LENGTH) {
      return new Response(JSON.stringify({ error: "Message content too long." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const result = streamText({
    model: openai("gpt-4.1-nano-2025-04-14"),
    system: await getSystemPrompt(),
    messages,
  });

  return result.toTextStreamResponse();
}
