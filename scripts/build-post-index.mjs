#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import GithubSlugger from "github-slugger";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT_DIR = join(ROOT, "src/generated");
const OUT_FILE = join(OUT_DIR, "post-index.json");
const MODEL = "text-embedding-3-small";
const MIN_SECTION_CHARS = 80;
const MAX_SECTION_CHARS = 2400;

function write(index) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(index, null, 0));
}

function clean(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sections(post) {
  const slugger = new GithubSlugger();
  const lines = (post.content ?? "").split("\n");
  const out = [];
  let current = { headingId: "", headingText: post.title, body: [] };

  for (const line of lines) {
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (m) {
      out.push(current);
      const headingText = m[2].replace(/[*_`]/g, "").trim();
      current = { headingId: slugger.slug(headingText), headingText, body: [] };
      continue;
    }
    current.body.push(line);
  }
  out.push(current);

  return out
    .map((s) => ({
      postSlug: post.slug,
      postTitle: post.title,
      date: post.date,
      headingId: s.headingId,
      headingText: s.headingText,
      text: clean(s.body.join("\n")).slice(0, MAX_SECTION_CHARS),
    }))
    .filter((s) => s.text.length >= MIN_SECTION_CHARS);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("[post-index] supabase env missing — writing empty index");
    return write({ model: MODEL, builtAt: null, sections: [] });
  }
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[post-index] OPENAI_API_KEY missing — writing empty index");
    return write({ model: MODEL, builtAt: null, sections: [] });
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("posts")
    .select("slug, title, date, content")
    .order("date", { ascending: false });

  if (error || !data?.length) {
    console.warn(`[post-index] no posts (${error?.message ?? "empty"}) — writing empty index`);
    return write({ model: MODEL, builtAt: null, sections: [] });
  }

  const chunks = data.flatMap(sections);
  if (!chunks.length) {
    console.warn("[post-index] no sections — writing empty index");
    return write({ model: MODEL, builtAt: null, sections: [] });
  }

  const { embeddings } = await embedMany({
    model: openai.textEmbeddingModel(MODEL),
    values: chunks.map((c) => `${c.postTitle} — ${c.headingText}\n\n${c.text}`),
  });

  write({
    model: MODEL,
    builtAt: new Date().toISOString(),
    sections: chunks.map((c, i) => ({ ...c, embedding: embeddings[i] })),
  });

  console.log(`[post-index] ${chunks.length} sections from ${data.length} posts`);
}

main().catch((err) => {
  console.warn(`[post-index] failed (${err.message}) — writing empty index`);
  write({ model: MODEL, builtAt: null, sections: [] });
});
