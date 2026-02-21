import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { supabase } from "@/lib/supabaseClient";

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
  const { messages } = await req.json();

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "No messages provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = streamText({
    model: openai("gpt-4.1-nano-2025-04-14"),
    system: await getSystemPrompt(),
    messages,
  });

  return result.toTextStreamResponse();
}
