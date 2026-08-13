// ─── Vesper palette ────────────────────────────────────────────────────────────
// Shared by every terminal surface (FloatingTerminal, AskSurface, MusicPlayer).
// Deliberately not the site brand palette — the terminal keeps its own skin.
export const C = {
  bg: "#101010",
  border: "#1e1e1e",
  text: "#f5f5f5",
  muted: "#4c4c4c",
  accent: "#ff8800",
  dim: "#2a2a2a",
} as const;

export const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
