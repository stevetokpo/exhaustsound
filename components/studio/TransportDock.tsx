"use client";

import { Pause, Play } from "lucide-react";
import { formatClock, formatHz } from "@/lib/format";
import type { SessionState } from "@/lib/audio/session";

interface TransportDockProps {
  state: SessionState;
  settings: { frequency: number; mode: string };
  activePreset: string | null;
  durationMin: number;
  remaining: number;
  onToggle: () => void;
}

const STATE_LABELS: Record<SessionState, string> = {
  idle: "À l'arrêt",
  playing: "En lecture",
  fading: "Fondu de sortie",
};

export function TransportDock({
  state, settings, activePreset, durationMin, remaining, onToggle,
}: TransportDockProps) {
  const active = state !== "idle";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="panel pointer-events-auto flex w-full max-w-md items-center gap-3 p-2 pr-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={onToggle}
          aria-label={active ? "Arrêter la séance" : "Démarrer la séance"}
          className={[
            "flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full",
            "transition-[transform,box-shadow,background-color] duration-200 ease-expo",
            "active:scale-95",
            active
              ? "bg-accent text-white shadow-[0_0_32px_-6px_var(--accent-glow)]"
              : "bg-surface-active text-fg hover:bg-accent hover:text-white",
          ].join(" ")}
        >
          {active ? (
            <Pause aria-hidden className="size-6" fill="currentColor" />
          ) : (
            <Play aria-hidden className="size-6 translate-x-0.5" fill="currentColor" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">
            {activePreset ?? `${formatHz(settings.frequency)} Hz`}
          </p>
          <p className="truncate text-xs text-muted" aria-live="polite">
            {STATE_LABELS[state]}
            {active && durationMin > 0 && (
              <>
                {" · "}
                <span className="tnum">{formatClock(remaining)}</span>
              </>
            )}
          </p>
        </div>

        {/* Témoin de lecture : la couleur ne porte pas seule l'information,
            le libellé d'état la double juste à gauche. */}
        <span
          aria-hidden
          className={[
            "size-2 shrink-0 rounded-full transition-colors duration-300",
            state === "playing"
              ? "bg-play shadow-[0_0_10px_var(--play)]"
              : state === "fading"
                ? "bg-warn"
                : "bg-faint",
          ].join(" ")}
        />
      </div>
    </div>
  );
}
