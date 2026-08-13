import { openai } from "@ai-sdk/openai";
import { embed, cosineSimilarity } from "ai";
import index from "@/generated/post-index.json";

export type PostHit = {
  postSlug: string;
  postTitle: string;
  headingId: string;
  headingText: string;
  url: string;
  snippet: string;
  score: number;
};

type IndexedSection = {
  postSlug: string;
  postTitle: string;
  date: string;
  headingId: string;
  headingText: string;
  text: string;
  embedding: number[];
};

type PostIndex = { model: string; builtAt: string | null; sections: IndexedSection[] };

const POST_INDEX = index as PostIndex;
const MIN_SCORE = 0.2;

export function indexIsEmpty(): boolean {
  return POST_INDEX.sections.length === 0;
}

export async function searchPosts(query: string, limit = 3): Promise<PostHit[]> {
  const q = query.trim();
  if (!q || indexIsEmpty()) return [];

  const { embedding } = await embed({
    model: openai.textEmbeddingModel(POST_INDEX.model),
    value: q,
  });

  return POST_INDEX.sections
    .map((s) => ({
      postSlug: s.postSlug,
      postTitle: s.postTitle,
      headingId: s.headingId,
      headingText: s.headingText,
      url: s.headingId ? `/posts/${s.postSlug}#${s.headingId}` : `/posts/${s.postSlug}`,
      snippet: s.text,
      score: cosineSimilarity(embedding, s.embedding),
    }))
    .filter((h) => h.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
