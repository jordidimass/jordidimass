const SKELETON_RATIOS = [
  "66%", "75%", "60%",
  "80%", "62%", "70%",
  "66%", "72%", "64%",
];

export default function Loading() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text py-8 px-8">
      <div className="mx-auto max-w-8xl space-y-16">
        <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3" aria-hidden="true">
          {SKELETON_RATIOS.map((ratio, i) => (
            <div
              key={i}
              className="break-inside-avoid rounded-sm bg-brand-muted/5"
              style={{ paddingBottom: ratio }}
            />
          ))}
        </div>
        <span className="sr-only">loading gallery</span>
      </div>
    </div>
  );
}
