"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { XIcon } from "./icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Mobile bottom sheet with backdrop. Slides up from the bottom edge. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md bg-surface rounded-t-3xl shadow-float animate-fade-up pb-safe"
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-border-strong" />
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="size-9 rounded-full bg-surface-2 text-ink-2 flex items-center justify-center active:scale-95 transition-transform"
          >
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="px-5 pb-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
