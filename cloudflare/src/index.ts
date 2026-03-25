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
  // No Origin header = direct load (img src, curl, etc.) — always allow
  if (!origin) return true;
  return (
    origin === allowedOrigin ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1")
  );
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
      const listed = await env.GALLERY.list();
      const images = listed.objects.map((obj) => ({
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

      const headers = new Headers({
        ...cors,
        "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
        "Cache-Control": `public, max-age=${CACHE_TTL}, immutable`,
        "ETag": object.httpEtag,
        "Content-Disposition": `inline; filename="${encodeURIComponent(key)}"`,
      });

      const response = new Response(object.body, { headers });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    return new Response("Not Found", { status: 404, headers: cors });
  },
};
