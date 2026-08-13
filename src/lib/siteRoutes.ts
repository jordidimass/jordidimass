const INTERNAL_ROUTES =
  /^\/(?:|blog|gallery|about|connect|matrix|posts\/[a-z0-9-]+|gallery\/[a-z0-9-]+)$/;

export function isInternalRoute(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  return INTERNAL_ROUTES.test(href.split(/[?#]/)[0]);
}

export function isRenderableHref(href: string): boolean {
  if (/^https?:\/\//i.test(href)) return true;
  if (href.startsWith("mailto:")) return true;
  return isInternalRoute(href);
}
