import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "ft:gpt-3.5-turbo-0125:jordi:mterminal:AGYg9UpD",
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = completion.choices[0]?.message?.content?.trim() ?? '';
    return res.status(200).json({ response: responseText });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate response" });
  }
}
