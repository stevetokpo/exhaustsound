"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { formatClock } from "@/lib/format";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

/** Cohérence cardiaque : expiration plus longue que l'inspiration,
 *  soit ~6 cycles par minute. C'est le levier physiologique le plus fiable
 *  de toute l'application. */
const INHALE_MS = 4000;
const EXHALE_MS = 6000;

interface VeilOverlayProps {
  open: boolean;
  onClose: () => void;
  isActive: boolean;
  durationMin: number;
  remaining: number;
}

/** Le contenu est monté et démonté avec le voile : chaque ouverture repart
 *  d'un cycle respiratoire neuf, sans réinitialisation manuelle. */
export function VeilOverlay({ open, ...props }: VeilOverlayProps) {
  if (!open) return null;
  return <VeilContent {...props} />;
}

function VeilContent({
  onClose, isActive, durationMin, remaining,
}: Omit<VeilOverlayProps, "open">) {
  const [phase, setPhase] = useState<"inhale" | "exhale">("inhale");
  const [showHint, setShowHint] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let timeout: number;
    const scheduleNext = (current: "inhale" | "exhale") => {
      timeout = window.setTimeout(
        () => {
          const following = current === "inhale" ? "exhale" : "inhale";
          setPhase(following);
          scheduleNext(following);
        },
        current === "inhale" ? INHALE_MS : EXHALE_MS,
      );
    };
    scheduleNext("inhale");

    const hintTimeout = window.setTimeout(() => setShowHint(false), 5000);
    closeRef.current?.focus();

    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(hintTimeout);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const inhaling = phase === "inhale";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mode veille"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-deep"
    >
      {/* Zone de sortie plein écran : au réveil, on ne cherche pas un bouton. */}
      <button
        type="button"
        onClick={onClose}
        tabIndex={-1}
        aria-hidden
        className="absolute inset-0 cursor-pointer"
      />

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Quitter le mode veille"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex size-11 cursor-pointer items-center justify-center rounded-full text-faint transition-colors duration-200 hover:text-muted"
      >
        <X aria-hidden className="size-5" />
      </button>

      <div className="pointer-events-none relative flex flex-col items-center gap-10">
        <div className="relative flex size-56 items-center justify-center sm:size-64">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-line-strong"
          />
          <span
            aria-hidden
            style={{
              transitionDuration: reducedMotion
                ? "0ms"
                : `${inhaling ? INHALE_MS : EXHALE_MS}ms`,
            }}
            className={[
              "absolute size-full rounded-full bg-accent-soft",
              "transition-[transform,opacity] ease-[cubic-bezier(0.37,0,0.63,1)]",
              inhaling ? "scale-100 opacity-90" : "scale-[0.45] opacity-30",
            ].join(" ")}
          />
          <span
            className="relative text-sm uppercase tracking-[0.3em] text-muted"
            aria-live="polite"
          >
            {inhaling ? "Inspirez" : "Expirez"}
          </span>
        </div>

        {isActive && durationMin > 0 && (
          <p className="tnum text-sm text-faint">{formatClock(remaining)}</p>
        )}
      </div>

      <p
        className={[
          "pointer-events-none absolute bottom-[max(2rem,env(safe-area-inset-bottom))] text-xs text-faint",
          "transition-opacity duration-1000",
          showHint ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        Touchez l&apos;écran pour revenir
      </p>
    </div>
  );
}
