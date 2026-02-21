import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt) {
    return new Response(JSON.stringify({ error: "No prompt provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = streamText({
    model: openai("gpt-4.1-nano-2025-04-14"),
    system: process.env.AI_SYSTEM_PROMPT,
    prompt,
  });

  return result.toTextStreamResponse();
}
