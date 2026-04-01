"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { CircleHelpIcon } from "./CircleHelpIcon";

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1",
        "font-mono text-[11px] text-brand-white",
        className
      )}
    >
      {children}
    </kbd>
  );
}

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const shortcuts = useMemo(
    () =>
      [
        {
          group: "Global",
          items: [
            { label: "Command palette", keys: ["Cmd/Ctrl", "K"] },
            { label: "Toggle terminal", keys: ["Cmd/Ctrl", "Shift", "K"] },
            { label: "Help", keys: ["?"] },
          ],
        },
        {
          group: "Terminal",
          items: [
            { label: "Close", keys: ["Esc"] },
            { label: "Clear (when focused)", keys: ["Cmd/Ctrl", "K"] },
          ],
        },
      ] as const,
    []
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Desktop only.
      if (!window.matchMedia("(min-width: 768px)").matches) return;

      if (e.key === "Escape") {
        if (open) setOpen(false);
        return;
      }

      if (e.key !== "?") return;

      // Don't steal '?' while typing or when cmdk is open.
      if (document.querySelector("[cmdk-dialog]")) return;
      const el = (e.target instanceof Element ? e.target : null) ?? (document.activeElement instanceof Element ? document.activeElement : null);
      if (el) {
        const tag = el.tagName;
        const isEditable = (el as HTMLElement).isContentEditable;
        if (isEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }

      e.preventDefault();
      setOpen((v) => !v);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="hidden md:block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 left-6 z-50",
          // More minimal when closed.
          !open && "h-10 w-10 flex items-center justify-center rounded-full bg-transparent border border-transparent",
          !open && "text-brand-muted/80 hover:text-brand-white transition-colors duration-200",
          // Keep the original "designed" look when open.
          open && "h-11 w-11 flex items-center justify-center rounded-full",
          open && "text-brand-muted hover:text-brand-white transition-colors duration-200",
          open && "bg-white/0 hover:bg-white/5",
          open && "border border-white/10 hover:border-white/20",
          open && "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
        )}
        aria-label="Shortcuts help"
        aria-expanded={open}
      >
        <CircleHelpIcon size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="panel"
              className={cn(
                "fixed left-6 bottom-[84px] z-50 w-[320px]",
                "rounded-xl border border-white/10 bg-white/5 backdrop-blur-md",
                "shadow-[0_16px_56px_rgba(0,0,0,0.55)]"
              )}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              role="dialog"
              aria-label="Shortcuts"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-brand-white text-sm tracking-wide">Shortcuts</div>
                  <div className="text-brand-muted text-xs">Press Esc to close</div>
                </div>
                <Kbd className="text-brand-muted">Esc</Kbd>
              </div>

              <div className="p-4 space-y-4">
                {shortcuts.map((section) => (
                  <div key={section.group}>
                    <div className="text-xs text-brand-muted tracking-[0.18em] uppercase mb-2">
                      {section.group}
                    </div>
                    <div className="space-y-2">
                      {section.items.map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-4">
                          <div className="text-sm text-brand-white/90 leading-5">{row.label}</div>
                          <div className="shrink-0 flex items-center gap-1">
                            {row.keys.map((k, idx) => (
                              <Kbd key={`${row.label}-${k}-${idx}`}>{k}</Kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="text-[11px] text-brand-muted pt-2 border-t border-white/10">
                  Tip: Inside the terminal, <span className="text-brand-white/80">Cmd/Ctrl+K</span> clears the screen.
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
