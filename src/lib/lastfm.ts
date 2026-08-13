export type Scrobble = {
  ok: true;
  nowPlaying: boolean;
  track: string;
  artist: string;
  album: string | null;
  url: string | null;
  image: string | null;
  playedAt: number | null;
};

export type ScrobbleError = { ok: false; reason: string };

type LastfmImage = { size: string; "#text": string };
type LastfmTrack = {
  name?: string;
  url?: string;
  artist?: { "#text"?: string };
  album?: { "#text"?: string };
  image?: LastfmImage[];
  date?: { uts?: string };
  "@attr"?: { nowplaying?: string };
};

const ENDPOINT = "https://ws.audioscrobbler.com/2.0/";

function pickImage(images: LastfmImage[] | undefined): string | null {
  if (!images?.length) return null;
  const bySize = (size: string) => images.find((i) => i.size === size)?.["#text"];
  const url = bySize("extralarge") || bySize("large") || bySize("medium") || bySize("small");
  return url && url.trim() ? url : null;
}

export type TopPeriod = "7day" | "1month" | "3month" | "6month" | "12month" | "overall";
export type TopKind = "artists" | "albums" | "tracks";

export type TopEntry = { name: string; detail: string | null; plays: number; url: string | null };
export type TopMusic = { ok: true; kind: TopKind; period: TopPeriod; entries: TopEntry[] };

export const PERIOD_LABEL: Record<TopPeriod, string> = {
  "7day": "last 7 days",
  "1month": "last month",
  "3month": "last 3 months",
  "6month": "last 6 months",
  "12month": "last year",
  overall: "all time",
};

type LastfmTop = {
  name?: string;
  playcount?: string;
  url?: string;
  artist?: { name?: string };
};

export async function getTopMusic(
  kind: TopKind,
  period: TopPeriod,
  limit = 5
): Promise<TopMusic | ScrobbleError> {
  const user = process.env.LASTFM_USERNAME;
  const key = process.env.LASTFM_API_KEY;
  if (!user || !key) return { ok: false, reason: "Last.fm is not configured." };

  const method =
    kind === "artists"
      ? "user.gettopartists"
      : kind === "albums"
        ? "user.gettopalbums"
        : "user.gettoptracks";
  const url = `${ENDPOINT}?method=${method}&user=${encodeURIComponent(user)}&api_key=${encodeURIComponent(key)}&format=json&period=${period}&limit=${limit}`;

  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return { ok: false, reason: `Last.fm returned ${res.status}.` };

    const data = (await res.json()) as {
      topartists?: { artist?: LastfmTop[] };
      topalbums?: { album?: LastfmTop[] };
      toptracks?: { track?: LastfmTop[] };
    };
    const raw =
      kind === "artists"
        ? data.topartists?.artist
        : kind === "albums"
          ? data.topalbums?.album
          : data.toptracks?.track;
    const list = Array.isArray(raw) ? raw : [];
    const entries: TopEntry[] = list
      .filter((e) => e.name)
      .map((e) => ({
        name: e.name as string,
        detail: kind === "artists" ? null : e.artist?.name ?? null,
        plays: Number(e.playcount) || 0,
        url: e.url ?? null,
      }));

    if (!entries.length) return { ok: false, reason: "No listening data for that period." };
    return { ok: true, kind, period, entries };
  } catch {
    return { ok: false, reason: "Could not reach Last.fm." };
  }
}

export async function getRecentScrobble(): Promise<Scrobble | ScrobbleError> {
  const user = process.env.LASTFM_USERNAME;
  const key = process.env.LASTFM_API_KEY;
  if (!user || !key) return { ok: false, reason: "Last.fm is not configured." };

  const url = `${ENDPOINT}?method=user.getrecenttracks&user=${encodeURIComponent(user)}&api_key=${encodeURIComponent(key)}&format=json&limit=1`;

  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return { ok: false, reason: `Last.fm returned ${res.status}.` };

    const data = (await res.json()) as { recenttracks?: { track?: LastfmTrack | LastfmTrack[] } };
    const raw = data.recenttracks?.track;
    const track = Array.isArray(raw) ? raw[0] : raw;
    if (!track?.name) return { ok: false, reason: "No scrobbles found." };

    const uts = Number(track.date?.uts);

    return {
      ok: true,
      nowPlaying: track["@attr"]?.nowplaying === "true",
      track: track.name,
      artist: track.artist?.["#text"] ?? "",
      album: track.album?.["#text"] || null,
      url: track.url ?? null,
      image: pickImage(track.image),
      playedAt: Number.isFinite(uts) && uts > 0 ? uts : null,
    };
  } catch {
    return { ok: false, reason: "Could not reach Last.fm." };
  }
}
