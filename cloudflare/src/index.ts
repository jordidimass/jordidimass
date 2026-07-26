export interface Env {
  GALLERY: R2Bucket;
  ALLOWED_ORIGIN: string;
}

const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days
// A fallback is provisional — it only means the derived object is not built yet.
// Caching it long would pin the original in place well past the derive run.
const FALLBACK_TTL = 60;
const MANIFEST_KEY = "manifest.json";
const DERIVED_PREFIX = "derived/";
const ALLOWED_WIDTHS = new Set([640, 828, 1280, 1920, 2560, 3200]);

interface Manifest {
  images: ManifestEntry[];
  generatedAt?: string;
}

interface ManifestEntry {
  key: string;
  width: number;
  height: number;
  blurDataURL: string;
  widths: number[];
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-JD-Variant",
    "Vary": "Origin",
  };
}

function isAllowedOrigin(request: Request, allowedOrigin: string): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const allowed = new URL(allowedOrigin);
  const apex = allowed.hostname.replace(/^www\./, "");
  const incoming = new URL(origin);

  if (incoming.hostname === "localhost" || incoming.hostname === "127.0.0.1") {
    return true;
  }

  const allowedPort =
    allowed.port || (allowed.protocol === "https:" ? "443" : allowed.protocol === "http:" ? "80" : "");
  const incomingPort =
    incoming.port ||
    (incoming.protocol === "https:" ? "443" : incoming.protocol === "http:" ? "80" : "");

  if (incoming.protocol !== allowed.protocol || incomingPort !== allowedPort) {
    return false;
  }

  return incoming.hostname === allowed.hostname || incoming.hostname === apex;
}

/**
 * Streams an R2 object with edge caching, ETag and 304 handling.
 * `variant` tells the client (and derive.mjs) whether it got a real derived
 * object or the original as a fallback.
 */
async function serveObject(
  request: Request,
  ctx: ExecutionContext,
  object: R2ObjectBody,
  key: string,
  variant: "derived" | "original",
  cors: HeadersInit
): Promise<Response> {
  const etag = object.httpEtag;
  const headers = new Headers({
    ...cors,
    "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
    "Cache-Control":
      variant === "derived"
        ? `public, max-age=${CACHE_TTL}, immutable`
        : `public, max-age=${FALLBACK_TTL}`,
    "X-JD-Variant": variant,
    ...(etag ? { ETag: etag } : {}),
    "Content-Disposition": `inline; filename="${encodeURIComponent(key)}"`,
  });

  const ifNoneMatch = request.headers.get("If-None-Match");
  if (
    etag &&
    ifNoneMatch
      ?.split(",")
      .map((value) => value.trim())
      .includes(etag)
  ) {
    return new Response(null, { status: 304, headers });
  }

  if (request.method === "HEAD") {
    headers.set("Content-Length", String(object.size));
    return new Response(null, { headers });
  }

  const response = new Response(object.body, { headers });
  if (variant === "derived") {
    const cacheKey = new Request(request.url, { method: "GET" });
    ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
  }
  return response;
}

async function readManifest(env: Env): Promise<Manifest | null> {
  const object = await env.GALLERY.get(MANIFEST_KEY);
  if (!object) return null;
  try {
    const data = (await object.json()) as Manifest;
    return data.images ? data : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? env.ALLOWED_ORIGIN;

    if (!isAllowedOrigin(request, env.ALLOWED_ORIGIN)) {
      return new Response("Forbidden", { status: 403 });
    }

    const cors = corsHeaders(origin);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: cors });
    }

    const path = url.pathname.replace(/^\//, "");

    // GET / — list all images, enriched from the manifest when it exists
    if (!path || path === "") {
      const manifest = await readManifest(env);

      const allObjects: R2Object[] = [];
      let cursor: string | undefined;
      do {
        const listed = await env.GALLERY.list({ cursor });
        allObjects.push(...listed.objects);
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);

      const seen = new Set<string>();
      const originals = allObjects.filter((obj) => {
        // Derived variants and the manifest are not gallery photos.
        if (obj.key.startsWith(DERIVED_PREFIX) || obj.key === MANIFEST_KEY) return false;
        if (seen.has(obj.key)) return false;
        seen.add(obj.key);
        return true;
      });

      const meta = new Map((manifest?.images ?? []).map((entry) => [entry.key, entry]));
      // Derived variants are cached immutable at the edge, so a re-derive needs a
      // new URL to be picked up. This token is that cache key.
      const version = manifest?.generatedAt
        ? Date.parse(manifest.generatedAt).toString(36)
        : undefined;

      const images = originals
        .sort((a, b) => Number(new Date(b.uploaded)) - Number(new Date(a.uploaded)))
        .map((obj) => {
          const entry = meta.get(obj.key);
          return {
            key: obj.key,
            size: obj.size,
            uploaded: obj.uploaded,
            url: `${url.origin}/image/${encodeURIComponent(obj.key)}`,
            ...(entry
              ? {
                  width: entry.width,
                  height: entry.height,
                  blurDataURL: entry.blurDataURL,
                  widths: entry.widths,
                }
              : {}),
          };
        });

      return Response.json(
        { images, count: images.length, manifest: manifest !== null, version },
        {
          headers: {
            ...cors,
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        }
      );
    }

    // GET /v/:width/:key — serve a derived variant, falling back to the original
    if (path.startsWith("v/")) {
      const rest = path.slice("v/".length);
      const slash = rest.indexOf("/");
      if (slash === -1) return new Response("Not Found", { status: 404, headers: cors });

      const width = Number(rest.slice(0, slash));
      const key = decodeURIComponent(rest.slice(slash + 1));

      if (!ALLOWED_WIDTHS.has(width)) {
        return new Response("Unsupported width", { status: 400, headers: cors });
      }

      const cacheKey = new Request(request.url, { method: "GET" });
      const cached = await caches.default.match(cacheKey);
      // Self-healing: a cached fallback from before the derive run must not
      // outlive it, so drop it and re-resolve rather than serving it again.
      if (cached && cached.headers.get("X-JD-Variant") === "derived") return cached;
      if (cached) ctx.waitUntil(caches.default.delete(cacheKey));

      const derived = await env.GALLERY.get(`${DERIVED_PREFIX}${width}/${key}.webp`);
      if (derived) {
        return serveObject(request, ctx, derived, key, "derived", cors);
      }

      const original = await env.GALLERY.get(key);
      if (!original) return new Response("Not Found", { status: 404, headers: cors });
      return serveObject(request, ctx, original, key, "original", cors);
    }

    // GET /image/:key — serve the untouched original (downloads, archival)
    if (path.startsWith("image/")) {
      const key = decodeURIComponent(path.slice("image/".length));

      const cacheKey = new Request(request.url, { method: "GET" });
      const cached = await caches.default.match(cacheKey);
      if (cached) return cached;

      const object = await env.GALLERY.get(key);
      if (!object) {
        return new Response("Not Found", { status: 404, headers: cors });
      }

      return serveObject(request, ctx, object, key, "original", cors);
    }

    return new Response("Not Found", { status: 404, headers: cors });
  },
};
