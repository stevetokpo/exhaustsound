"use client";

import Link from "next/link";
import { ChevronDown, Repeat } from "lucide-react";
import { Slider } from "@/components/ui/Slider";
import { useTrackList } from "@/lib/hooks/useTrackList";
import { CATEGORY_LABELS, type Track, type TrackCategory } from "@/lib/library/types";
import { formatPercent } from "@/lib/format";

interface BackgroundTrackProps {
  track: Track | null;
  level: number;
  loop: boolean;
  onTrackChange: (track: Track | null) => void;
  onLevelChange: (value: number) => void;
  onLoopChange: (value: boolean) => void;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as TrackCategory[];

export function BackgroundTrack({
  track, level, loop, onTrackChange, onLevelChange, onLoopChange,
}: BackgroundTrackProps) {
  const { tracks, status } = useTrackList();

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="background-title">
      <h2
        id="background-title"
        className="font-display text-lg font-medium tracking-tight text-fg"
      >
        Fond sonore
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Une piste de la bibliothèque, mélangée en direct sous la fréquence.
        Le fondu de fin de séance les emporte toutes les deux ensemble.
      </p>

      {status === "loading" ? (
        <div
          aria-busy="true"
          className="mt-4 h-11 animate-pulse rounded-[13px] bg-surface"
        >
          <span className="sr-only">Chargement des pistes</span>
        </div>
      ) : status !== "ready" ? (
        <p className="mt-4 text-xs leading-relaxed text-faint">
          La bibliothèque n&apos;est pas accessible.{" "}
          <Link href="/bibliotheque" className="text-accent-hi underline underline-offset-2">
            Vérifier la configuration
          </Link>
        </p>
      ) : tracks.length === 0 ? (
        <p className="mt-4 text-xs leading-relaxed text-faint">
          Aucune piste déposée.{" "}
          <Link href="/bibliotheque" className="text-accent-hi underline underline-offset-2">
            Ajouter des fichiers
          </Link>
        </p>
      ) : (
        <>
          <div className="relative mt-4">
            <label htmlFor="background-select" className="sr-only">
              Piste de fond
            </label>
            {/* Sélecteur natif : sur mobile il ouvre le sélecteur système,
                bien plus confortable qu'une liste maison au coucher. */}
            <select
              id="background-select"
              value={track?.publicId ?? ""}
              onChange={(e) => {
                const found = tracks.find((t) => t.publicId === e.target.value);
                onTrackChange(found ?? null);
              }}
              className="inset-well min-h-11 w-full cursor-pointer appearance-none py-2 pl-3 pr-10 text-sm text-fg"
            >
              <option value="">Aucun</option>
              {CATEGORIES.map((category) => {
                const group = tracks.filter((t) => t.category === category);
                if (group.length === 0) return null;
                return (
                  <optgroup key={category} label={CATEGORY_LABELS[category]}>
                    {group.map((item) => (
                      <option key={item.publicId} value={item.publicId}>
                        {item.title}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint"
            />
          </div>

          {track && (
            <div className="mt-3">
              <Slider
                label="Niveau du fond"
                display={formatPercent(level)}
                value={level}
                min={0}
                max={1}
                step={0.01}
                onChange={onLevelChange}
              />

              <button
                type="button"
                onClick={() => onLoopChange(!loop)}
                aria-pressed={loop}
                className={[
                  "flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[13px] border px-4 text-sm font-medium",
                  "transition-colors duration-200 ease-expo",
                  loop
                    ? "border-accent bg-accent-soft text-fg"
                    : "border-line bg-surface text-muted hover:bg-surface-hover hover:text-fg",
                ].join(" ")}
              >
                <Repeat aria-hidden className="size-4" />
                {loop ? "En boucle" : "Une seule fois"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
