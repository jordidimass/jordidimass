import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OpenAI API key not configured" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano-2025-04-14",
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (responseText) {
      return res.status(200).json({ response: responseText });
    } else {
      return res.status(500).json({ error: "Received an incomplete response from the API" });
    }
  } catch (error) {
    const errorMessage = (error as Error).message || "Failed to generate response";
    return res.status(500).json({ error: errorMessage });
  }
}
