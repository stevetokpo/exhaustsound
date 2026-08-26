"use client";

import { Infinity as InfinityIcon, MoonStar, TriangleAlert } from "lucide-react";
import { Slider } from "@/components/ui/Slider";
import { formatClock, formatPercent } from "@/lib/format";
import { SESSION_FADE } from "@/lib/hooks/useSession";

const DURATIONS = [0, 10, 20, 30, 45, 60];

interface SessionPanelProps {
  master: number;
  onMasterChange: (value: number) => void;
  durationMin: number;
  onDurationChange: (minutes: number) => void;
  remaining: number;
  isActive: boolean;
  onVeil: () => void;
}

export function SessionPanel({
  master, onMasterChange, durationMin, onDurationChange,
  remaining, isActive, onVeil,
}: SessionPanelProps) {
  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="session-title">
      <h2
        id="session-title"
        className="font-display text-lg font-medium tracking-tight text-fg"
      >
        Séance
      </h2>

      <div className="mt-4">
        <Slider
          label="Volume général"
          display={formatPercent(master)}
          value={master}
          min={0}
          max={1}
          step={0.01}
          onChange={onMasterChange}
        />
        {master > 0.7 && (
          <p className="-mt-1 flex items-start gap-2 text-xs leading-relaxed text-warn">
            <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Niveau élevé. Sur une écoute longue au casque, redescendez : une
              sinusoïde pure fatigue l&apos;oreille sans qu&apos;on s&apos;en rende compte.
            </span>
          </p>
        )}
      </div>

      <div className="mt-5">
        <span
          id="duration-label"
          className="text-[13px] font-medium tracking-wide text-muted"
        >
          Durée
        </span>
        <div
          role="radiogroup"
          aria-labelledby="duration-label"
          className="inset-well mt-2 grid grid-cols-3 gap-1.5 p-1.5"
        >
          {DURATIONS.map((minutes) => {
            const selected = minutes === durationMin;
            return (
              <button
                key={minutes}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={minutes === 0 ? "Sans limite" : `${minutes} minutes`}
                onClick={() => onDurationChange(minutes)}
                className={[
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-[11px] px-2 text-[13px] font-medium",
                  "transition-colors duration-200 ease-expo",
                  selected
                    ? "bg-accent-soft text-fg shadow-[inset_0_0_0_1px_var(--accent)]"
                    : "text-muted hover:bg-surface-hover hover:text-fg",
                ].join(" ")}
              >
                {minutes === 0 ? (
                  <InfinityIcon aria-hidden className="size-4" />
                ) : (
                  <span className="tnum">{minutes}</span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-xs leading-relaxed text-faint">
          {durationMin === 0
            ? "Sans limite. La lecture s'arrête à la main."
            : `Fondu de sortie sur les ${SESSION_FADE} dernières secondes.`}
        </p>

        {isActive && durationMin > 0 && (
          <p
            className="mt-3 text-center text-sm text-muted"
            aria-live="polite"
            aria-atomic="true"
          >
            Reste <span className="tnum text-fg">{formatClock(remaining)}</span>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onVeil}
        className="mt-5 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[13px] border border-line bg-surface px-4 text-sm font-medium text-muted transition-colors duration-200 ease-expo hover:border-line-strong hover:bg-surface-hover hover:text-fg"
      >
        <MoonStar aria-hidden className="size-4" />
        Mode veille
      </button>
      <p className="mt-2 text-xs leading-relaxed text-faint">
        Éteint l&apos;écran visuellement et empêche la mise en veille du
        téléphone, pour que le son continue posé sur la table de nuit.
      </p>
    </section>
  );
}
