"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useInView } from "motion/react";
import { slugFromKey, columnStarts, aboveFoldIndices, FALLBACK_WIDTH, FALLBACK_HEIGHT, type GalleryImage } from "@/lib/gallery";
import { imageSource } from "@/lib/galleryLoader";
import { EASE_OUT } from "@/lib/motion";

const STAGGERED_TILES = 9;
const STAGGER_STEP = 0.05;
// Modals sit in the 200-500ms band; the exit is quicker because dismissing is
// the system responding, not the user deciding.
const MODAL_IN = 0.22;
const MODAL_OUT = 0.15;

function label(key: string): string {
  return key.replace(/\.[^.]+$/, "");
}

async function downloadImage(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

const DownloadIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v13M7 11l5 5 5-5M5 21h14" />
  </svg>
);

const OpenPageIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
  </svg>
);

const HOLD_TIMEOUT_MS = 4000;

/**
 * Runs at HTML parse time, long before hydration.
 *
 * The reveal has to wait for the first screenful to decode, but on a slow
 * connection React does not hydrate until well after the images have started
 * arriving — so a React effect released the hold far too late to matter, and
 * the grid revealed itself piecemeal. This is inline and synchronous instead.
 */
const RELEASE_SCRIPT = `(function(){
  var g=document.querySelector('[data-gallery-grid][data-hold]');
  if(!g) return;
  var reduce=!window.matchMedia('(min-width: 640px)').matches
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.getAttribute('data-motion')==='off';
  g.__jdHoldManaged = true;
  var release=function(){ g.removeAttribute('data-hold'); };
  if(reduce){ release(); return; }
  var done=false, fire=function(){ if(!done){ done=true; release(); } };
  setTimeout(fire, ${HOLD_TIMEOUT_MS});
  var start=function(){
    var vh=window.innerHeight, imgs=[];
    var tiles=g.querySelectorAll('[data-gallery-tile]');
    for(var i=0;i<tiles.length;i++){
      if(tiles[i].getBoundingClientRect().top>=vh) continue;
      var im=tiles[i].querySelector('img');
      if(im) imgs.push(im);
    }
    if(!imgs.length){ fire(); return; }
    var left=imgs.length;
    var tick=function(){ if(--left<=0) fire(); };
    for(var j=0;j<imgs.length;j++){
      if(imgs[j].complete && imgs[j].naturalWidth>0){ tick(); continue; }
      imgs[j].addEventListener('load', tick, {once:true});
      imgs[j].addEventListener('error', tick, {once:true});
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();`;

/**
 * Holds the first screenful until every one of its images has decoded, then
 * releases them together so the CSS row delays play as one cascade.
 *
 * Without this the reveal follows network arrival order, so the gallery filled
 * in piecemeal and looked different on every load. Releasing as a group makes
 * the entrance deterministic.
 *
 * Everything here is additive: the hold is only ever applied by script, so if
 * this never runs the tiles animate straight from the prerendered HTML. A
 * timeout releases them regardless, so a stalled image cannot strand the page.
 */
function useGalleryReveal(gridRef: React.RefObject<HTMLDivElement | null>, count: number) {
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.getAttribute("data-motion") === "off") return;

    const tiles = [...grid.querySelectorAll<HTMLElement>("[data-gallery-tile]")];
    const viewport = window.innerHeight;
    const deferred = tiles.filter((el) => el.getBoundingClientRect().top >= viewport * 1.2);
    for (const el of deferred) el.setAttribute("data-pending", "");

    let timer = 0;
    const singleColumn = !window.matchMedia("(min-width: 640px)").matches;
    if (singleColumn) grid.removeAttribute("data-hold");

    if (!singleColumn && !(grid as HTMLDivElement & { __jdHoldManaged?: boolean }).__jdHoldManaged) {
      const firstScreen = tiles.filter((el) => el.getBoundingClientRect().top < viewport);
      const imgs = firstScreen
        .map((el) => el.querySelector("img"))
        .filter((el): el is HTMLImageElement => el !== null);
      let left = imgs.length;
      const release = () => grid.removeAttribute("data-hold");
      const tick = () => { if (--left <= 0) release(); };
      for (const img of imgs) {
        if (img.complete && img.naturalWidth > 0) { tick(); continue; }
        img.addEventListener("load", tick, { once: true });
        img.addEventListener("error", tick, { once: true });
      }
      if (!imgs.length) release();
      timer = window.setTimeout(release, HOLD_TIMEOUT_MS);
    }

    let io: IntersectionObserver | undefined;
    if (deferred.length) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            (e.target as HTMLElement).removeAttribute("data-pending");
            io?.unobserve(e.target);
          }
        },
        { rootMargin: "200px" }
      );
      deferred.forEach((el) => io!.observe(el));
    }

    return () => {
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [gridRef, count]);
}

function GalleryTile({
  img,
  index,
  rows,
  breakClass,
  eager,
  priority,
  onSelect,
}: {
  img: GalleryImage;
  index: number;
  rows: { one: number; two: number; three: number };
  breakClass: string;
  eager: boolean;
  priority: boolean;
  onSelect: () => void;
}) {

  return (
    <div
      data-gallery-tile={index}
      className={`jd-tile group relative break-inside-avoid ${breakClass}`}
      style={{
        "--jd-row": rows.one,
        "--jd-row-2": rows.two,
        "--jd-row-3": rows.three,
      } as React.CSSProperties}
    >
      <div aria-hidden="true" className="jd-skeleton" />
      <div className="jd-tile-content">
      <button
        type="button"
        onClick={onSelect}
        className="relative block w-full cursor-pointer overflow-hidden rounded-sm text-left"
      >
        <Image
          {...imageSource(img)}
          alt={label(img.key)}
          width={img.width ?? FALLBACK_WIDTH}
          height={img.height ?? FALLBACK_HEIGHT}
          quality={82}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          placeholder={img.blurDataURL ? "blur" : "empty"}
          blurDataURL={img.blurDataURL}
          className="h-auto w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 flex items-end bg-brand-bg/0 transition-colors duration-200 group-hover:bg-brand-bg/40">
          <p className="w-full truncate px-3 py-2 text-xs font-light tracking-widest text-brand-text lowercase opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {label(img.key)}
          </p>
        </div>
      </button>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-sm opacity-0 shadow-[0_10px_28px_rgba(0,0,0,0.35),0_0_0_1px_rgba(245,245,245,0.08)] transition-opacity duration-200 group-hover:opacity-100"
      />
      </div>
    </div>
  );
}

export default function GalleryClient({ images }: { images: GalleryImage[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  useGalleryReveal(gridRef, images.length);

  // Deterministic packing, computed on the server: forcing the column breaks is
  // what lets `eager` reach the top of every column instead of only column one.
  const layout = useMemo(() => {
    const s2 = columnStarts(images, 2);
    const s3 = columnStarts(images, 3);
    const rowIn = (starts: number[], i: number) => {
      let start = 0;
      for (const s of starts) if (i >= s) start = s;
      return i - start;
    };
    return {
      two: new Set(s2.slice(1)),
      three: new Set(s3.slice(1)),
      eagerSet: aboveFoldIndices(images, 2),
      // Must stay a subset of eagerSet: Next throws if an image carries both
      // `priority` and loading="lazy".
      prioritySet: aboveFoldIndices(images, 1),
      rows: images.map((_, i) => ({ one: i, two: rowIn(s2, i), three: rowIn(s3, i) })),
    };
  }, [images]);

  const selectedImage = selected === null ? null : images[selected];
  const imageLoaded = selectedImage ? loadedUrls.has(selectedImage.url) : false;

  useEffect(() => setMounted(true), []);

  const markLoaded = useCallback((url: string) => {
    setLoadedUrls((prev) => new Set(prev).add(url));
  }, []);

  const navigate = useCallback((delta: 1 | -1) => {
    setSelected((c) => (c === null ? null : (c + delta + images.length) % images.length));
  }, [images.length]);

  // Prefetch the image page as soon as a modal opens so the Link is instant
  useEffect(() => {
    if (selectedImage) {
      router.prefetch(`/gallery/${slugFromKey(selectedImage.key)}`);
    }
  }, [selectedImage, router]);

  // Keyboard navigation
  useEffect(() => {
    if (selected === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, navigate]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selected !== null) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
    return undefined;
  }, [selected]);

  async function handleDownload() {
    if (!selectedImage || downloading) return;
    setDownloading(true);
    try {
      // Always the untouched original, never a derived variant.
      await downloadImage(selectedImage.url, selectedImage.key);
    } finally {
      setDownloading(false);
    }
  }

  // ── Icons shared between mobile / desktop ─────────────────────────────────────
  const actionButtons = selectedImage && (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="jd-pressable select-none text-brand-muted/60 transition-colors duration-200 hover:text-brand-accent active:text-brand-accent disabled:opacity-40"
        aria-label="download"
      >
        {DownloadIcon}
      </button>
      {/* Link (not button) — enables hover prefetch + proper soft navigation */}
      <Link
        href={`/gallery/${slugFromKey(selectedImage.key)}`}
        onClick={() => { document.body.style.overflow = ""; }}
        className="jd-pressable select-none text-brand-muted/60 transition-colors duration-200 hover:text-brand-accent active:text-brand-accent"
        aria-label="open image page"
      >
        {OpenPageIcon}
      </Link>
    </div>
  );

  return (
    <>
      {/* ── Masonry grid ────────────────────────────────────────────────────── */}
      <div ref={gridRef} data-gallery-grid data-hold className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
        {images.map((img, index) => (
          <GalleryTile
            key={img.key}
            img={img}
            index={index}
            rows={layout.rows[index]}
            breakClass={[
              layout.two.has(index) ? "sm:max-lg:break-before-column" : "",
              layout.three.has(index) ? "lg:break-before-column" : "",
            ].filter(Boolean).join(" ")}
            eager={layout.eagerSet.has(index)}
            priority={layout.prioritySet.has(index)}
            onSelect={() => setSelected(index)}
          />
        ))}
      </div>
      <noscript>
        <style>{`[data-gallery-grid][data-hold] .jd-tile-content{animation:jd-tile-in 300ms var(--ease-out) both}[data-gallery-grid][data-hold] .jd-skeleton{opacity:0}`}</style>
      </noscript>
      <script dangerouslySetInnerHTML={{ __html: RELEASE_SCRIPT }} />

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      {mounted && createPortal(
        <AnimatePresence>
        {selectedImage && (
        <motion.div
          key="gallery-modal"
          className="fixed inset-0 z-50 flex flex-col bg-brand-bg/95 backdrop-blur-sm"
          onClick={() => setSelected(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: MODAL_OUT, ease: EASE_OUT } }}
          transition={{ duration: MODAL_IN, ease: EASE_OUT }}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="jd-pressable absolute right-6 top-6 z-10 text-xl text-brand-muted transition-colors duration-200 hover:text-brand-accent"
            aria-label="close"
          >
            ✕
          </button>

          {/* ── Mobile ── */}
          <motion.div
            className="flex flex-1 flex-col md:hidden"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: MODAL_OUT, ease: EASE_OUT } }}
            transition={{ duration: MODAL_IN, ease: EASE_OUT }}
          >
            <div className="flex flex-1 items-center justify-center overflow-hidden px-4 pb-4 pt-14">
              <Image
                {...imageSource(selectedImage)}
                alt={label(selectedImage.key)}
                width={selectedImage.width ?? FALLBACK_WIDTH}
                height={selectedImage.height ?? FALLBACK_HEIGHT}
                quality={86}
                sizes="100vw"
                placeholder={selectedImage.blurDataURL ? "blur" : "empty"}
                blurDataURL={selectedImage.blurDataURL}
                className="max-h-full w-full rounded-[4px] object-contain"
                style={{ maxHeight: "calc(100dvh - 160px)" }}
              />
            </div>
            <div className="flex items-center justify-between px-8 pb-10">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="jd-pressable select-none text-3xl text-brand-muted transition-colors duration-200 active:text-brand-accent"
                aria-label="previous"
              >
                ←
              </button>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-light tracking-widest text-brand-muted lowercase">
                  {label(selectedImage.key)}
                </p>
                <p className="text-xs text-brand-muted/50">
                  {selected! + 1} / {images.length}
                </p>
                <div className="mt-1">{actionButtons}</div>
              </div>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="jd-pressable select-none text-3xl text-brand-muted transition-colors duration-200 active:text-brand-accent"
                aria-label="next"
              >
                →
              </button>
            </div>
          </motion.div>

          {/* ── Desktop ── */}
          <div className="hidden flex-1 items-center justify-center md:flex">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(-1); }}
              className="jd-pressable absolute left-8 z-10 select-none text-3xl text-brand-muted transition-colors duration-200 hover:text-brand-accent"
              aria-label="previous"
            >
              ←
            </button>

            <motion.div
              className="relative flex flex-col items-center"
              style={{ width: "calc(100vw - 120px)", maxHeight: "100vh", padding: "20px 0" }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: MODAL_OUT, ease: EASE_OUT } }}
              transition={{ duration: MODAL_IN, ease: EASE_OUT }}
            >
              <Image
                key={selectedImage.url}
                {...imageSource(selectedImage)}
                alt={label(selectedImage.key)}
                width={selectedImage.width ?? FALLBACK_WIDTH}
                height={selectedImage.height ?? FALLBACK_HEIGHT}
                quality={88}
                sizes="80vw"
                priority
                placeholder={selectedImage.blurDataURL ? "blur" : "empty"}
                blurDataURL={selectedImage.blurDataURL}
                onLoad={() => markLoaded(selectedImage.url)}
                className={`max-w-full rounded-[4px] object-contain transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                style={{ maxHeight: "calc(100vh - 72px)" }}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-muted/30 border-t-brand-muted" />
                </div>
              )}
              <div className="mt-3 flex items-center gap-4">
                <p className="text-center text-sm font-light tracking-widest text-brand-muted lowercase">
                  {label(selectedImage.key)}
                  <span className="ml-4 text-brand-muted/50">
                    {selected! + 1} / {images.length}
                  </span>
                </p>
                {actionButtons}
              </div>
            </motion.div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(1); }}
              className="jd-pressable absolute right-8 z-10 select-none text-3xl text-brand-muted transition-colors duration-200 hover:text-brand-accent"
              aria-label="next"
            >
              →
            </button>
          </div>
        </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
