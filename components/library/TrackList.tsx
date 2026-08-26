"use client";

import { useState } from "react";
import {
  AudioLines, CircleCheckBig, Download, LoaderCircle,
  Music, Pause, Play, Trash2,
} from "lucide-react";
import { formatBytes, formatClock } from "@/lib/format";
import { CATEGORY_LABELS, type Track, type TrackCategory } from "@/lib/library/types";

type Filter = "tout" | TrackCategory;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "tout", label: "Tout" },
  { value: "musique", label: CATEGORY_LABELS.musique },
  { value: "voix", label: CATEGORY_LABELS.voix },
];

interface TrackListProps {
  tracks: Track[];
  currentId: string | null;
  playing: boolean;
  onPlay: (track: Track) => void;
  onRemove: (track: Track) => void;
  offlineSupported: boolean;
  cachedUrls: Set<string>;
  busyUrls: Set<string>;
  onToggleOffline: (track: Track) => void;
}

export function TrackList({
  tracks, currentId, playing, onPlay, onRemove,
  offlineSupported, cachedUrls, busyUrls, onToggleOffline,
}: TrackListProps) {
  const [filter, setFilter] = useState<Filter>("tout");
  const [confirming, setConfirming] = useState<string | null>(null);

  const visible =
    filter === "tout" ? tracks : tracks.filter((t) => t.category === filter);

  const offlineTracks = tracks.filter((t) => cachedUrls.has(t.url));
  const offlineCount = offlineTracks.length;
  const offlineBytes = offlineTracks.reduce((total, t) => total + t.bytes, 0);

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="tracks-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="tracks-title"
          className="font-display text-lg font-medium tracking-tight text-fg"
        >
          Pistes
        </h2>
        <span className="text-xs text-faint">
          <span className="tnum">{tracks.length}</span>{" "}
          {tracks.length > 1 ? "pistes" : "piste"}
          {offlineCount > 0 && (
            <>
              {" · "}
              <span className="tnum">{offlineCount}</span> hors ligne (
              <span className="tnum">{formatBytes(offlineBytes)}</span>)
            </>
          )}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Filtrer par catégorie"
        className="inset-well mt-3 grid grid-cols-3 gap-1.5 p-1.5"
      >
        {FILTERS.map((item) => {
          const selected = item.value === filter;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFilter(item.value)}
              className={[
                "min-h-11 cursor-pointer rounded-[11px] px-2 text-[13px] font-medium",
                "transition-colors duration-200 ease-expo",
                selected
                  ? "bg-accent-soft text-fg shadow-[inset_0_0_0_1px_var(--accent)]"
                  : "text-muted hover:bg-surface-hover hover:text-fg",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 text-center text-sm leading-relaxed text-muted">
          {tracks.length === 0
            ? "Aucune piste pour l'instant. Déposez un premier fichier ci-dessus."
            : "Aucune piste dans cette catégorie."}
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {visible.map((track) => {
            const isCurrent = track.publicId === currentId;
            const isConfirming = confirming === track.publicId;
            const Icon = track.category === "voix" ? AudioLines : Music;

            return (
              <li
                key={track.publicId}
                className={[
                  "flex items-center gap-3 rounded-[13px] border px-3 py-2.5",
                  "transition-colors duration-200 ease-expo",
                  isCurrent
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:bg-surface-hover",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => onPlay(track)}
                  aria-label={
                    isCurrent && playing ? `Mettre en pause ${track.title}` : `Lire ${track.title}`
                  }
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-active text-fg transition-colors duration-200 hover:bg-accent hover:text-white"
                >
                  {isCurrent && playing ? (
                    <Pause aria-hidden className="size-4" fill="currentColor" />
                  ) : (
                    <Play aria-hidden className="size-4 translate-x-px" fill="currentColor" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{track.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <Icon aria-hidden className="size-3 shrink-0" />
                    <span>{CATEGORY_LABELS[track.category]}</span>
                    <span aria-hidden className="text-faint">·</span>
                    <span className="tnum">
                      {track.duration !== null ? formatClock(track.duration) : "—"}
                    </span>
                    <span aria-hidden className="text-faint">·</span>
                    <span className="tnum">{formatBytes(track.bytes)}</span>
                  </p>
                </div>

                {offlineSupported && !isConfirming && (
                  <OfflineToggle
                    track={track}
                    cached={cachedUrls.has(track.url)}
                    busy={busyUrls.has(track.url)}
                    onToggle={onToggleOffline}
                  />
                )}

                {isConfirming ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(null);
                        onRemove(track);
                      }}
                      className="min-h-11 cursor-pointer rounded-[11px] px-3 text-xs font-semibold text-danger hover:bg-surface-hover"
                    >
                      Supprimer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="min-h-11 cursor-pointer rounded-[11px] px-3 text-xs text-muted hover:bg-surface-hover hover:text-fg"
                    >
                      Annuler
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(track.publicId)}
                    aria-label={`Supprimer ${track.title}`}
                    className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[11px] text-faint transition-colors duration-200 hover:bg-surface-hover hover:text-danger"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface OfflineToggleProps {
  track: Track;
  cached: boolean;
  busy: boolean;
  onToggle: (track: Track) => void;
}

/** Téléchargement explicite plutôt qu'automatique : mettre en cache chaque
 *  piste écoutée remplirait le stockage de l'appareil sans prévenir. */
function OfflineToggle({ track, cached, busy, onToggle }: OfflineToggleProps) {
  const label = cached
    ? `Retirer « ${track.title} » de l'écoute hors ligne`
    : `Garder « ${track.title} » hors ligne`;

  return (
    <button
      type="button"
      onClick={() => onToggle(track)}
      disabled={busy}
      aria-pressed={cached}
      aria-label={label}
      title={label}
      className={[
        "flex size-11 shrink-0 items-center justify-center rounded-[11px]",
        "transition-colors duration-200 ease-expo",
        busy
          ? "cursor-not-allowed text-faint"
          : cached
            ? "cursor-pointer text-play hover:bg-surface-hover"
            : "cursor-pointer text-faint hover:bg-surface-hover hover:text-fg",
      ].join(" ")}
    >
      {busy ? (
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
      ) : cached ? (
        <CircleCheckBig aria-hidden className="size-4" />
      ) : (
        <Download aria-hidden className="size-4" />
      )}
    </button>
  );
}
