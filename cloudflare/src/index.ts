export interface Env {
  GALLERY: R2Bucket;
  ALLOWED_ORIGIN: string;
}

const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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

    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405, headers: cors });
    }

    const path = url.pathname.replace(/^\//, "");

    // GET / — list all images
    if (!path || path === "") {
      const allObjects: R2Object[] = [];
      let cursor: string | undefined;
      do {
        const listed = await env.GALLERY.list({ cursor });
        allObjects.push(...listed.objects);
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);

      const seen = new Set<string>();
      const images = allObjects
        .filter((obj) => {
          if (seen.has(obj.key)) return false;
          seen.add(obj.key);
          return true;
        })
        .sort((a, b) => Number(new Date(b.uploaded)) - Number(new Date(a.uploaded)))
        .map((obj) => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          url: `${url.origin}/image/${encodeURIComponent(obj.key)}`,
        }));

      return Response.json(
        { images, count: images.length },
        {
          headers: {
            ...cors,
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        }
      );
    }

    // GET /image/:key — serve individual image
    if (path.startsWith("image/")) {
      const key = decodeURIComponent(path.slice("image/".length));

      const cache = caches.default;
      const cacheKey = new Request(request.url, request);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      const object = await env.GALLERY.get(key);
      if (!object) {
        return new Response("Not Found", { status: 404, headers: cors });
      }

      const etag = object.httpEtag;
      const ifNoneMatch = request.headers.get("If-None-Match");

      const headers = new Headers({
        ...cors,
        "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
        "Cache-Control": `public, max-age=${CACHE_TTL}, immutable`,
        ...(etag ? { ETag: etag } : {}),
        "Content-Disposition": `inline; filename="${encodeURIComponent(key)}"`,
      });

      if (
        etag &&
        ifNoneMatch
          ?.split(",")
          .map((value) => value.trim())
          .includes(etag)
      ) {
        return new Response(null, { status: 304, headers });
      }

      const response = new Response(object.body, { headers });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    return new Response("Not Found", { status: 404, headers: cors });
  },
};
