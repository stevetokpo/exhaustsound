"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Repeat, Volume2, X } from "lucide-react";
import { formatClock } from "@/lib/format";
import type { Track } from "@/lib/library/types";

interface PlayerDockProps {
  track: Track;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onClose: () => void;
}

export function PlayerDock({
  track, playing, onPlayingChange, onClose,
}: PlayerDockProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(track.duration ?? 0);
  const [volume, setVolume] = useState(0.8);
  const [loop, setLoop] = useState(false);

  // Changement de piste : on recharge et on lance la lecture.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    void audio.play().catch(() => {
      // Lecture refusée (politique d'autoplay) : l'utilisateur relancera.
    });
  }, [track.publicId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing && audio.paused) void audio.play().catch(() => {});
    else if (!playing && !audio.paused) audio.pause();
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="panel pointer-events-auto w-full max-w-xl p-3 backdrop-blur-xl">
        {/* crossOrigin permet de router cette piste dans le graphe Web Audio
            plus tard, pour la mélanger à une fréquence générée. */}
        <audio
          ref={audioRef}
          src={track.url}
          crossOrigin="anonymous"
          loop={loop}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
          onPlay={() => onPlayingChange(true)}
          onPause={() => onPlayingChange(false)}
          onEnded={() => onPlayingChange(false)}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onPlayingChange(!playing)}
            aria-label={playing ? "Mettre en pause" : "Reprendre la lecture"}
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-white transition-transform duration-200 ease-expo active:scale-95"
          >
            {playing ? (
              <Pause aria-hidden className="size-5" fill="currentColor" />
            ) : (
              <Play aria-hidden className="size-5 translate-x-0.5" fill="currentColor" />
            )}
          </button>

          <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
            {track.title}
          </p>

          <button
            type="button"
            onClick={() => setLoop((v) => !v)}
            aria-pressed={loop}
            aria-label="Lire en boucle"
            className={[
              "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[11px]",
              "transition-colors duration-200 ease-expo",
              loop ? "bg-accent-soft text-accent-hi" : "text-faint hover:bg-surface-hover hover:text-fg",
            ].join(" ")}
          >
            <Repeat aria-hidden className="size-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le lecteur"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[11px] text-faint transition-colors duration-200 hover:bg-surface-hover hover:text-fg"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <div className="mt-1 flex items-center gap-3">
          <span className="tnum w-11 shrink-0 text-right text-xs text-muted">
            {formatClock(position)}
          </span>
          <input
            type="range"
            className="range flex-1"
            style={{ ["--fill" as string]: `${progress}%` }}
            min={0}
            max={duration || 1}
            step={0.1}
            value={position}
            aria-label="Position dans la piste"
            aria-valuetext={`${formatClock(position)} sur ${formatClock(duration)}`}
            onChange={(e) => {
              const next = Number(e.target.value);
              setPosition(next);
              if (audioRef.current) audioRef.current.currentTime = next;
            }}
          />
          <span className="tnum w-11 shrink-0 text-xs text-muted">
            {formatClock(duration)}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-3 pl-1">
          <Volume2 aria-hidden className="size-4 shrink-0 text-faint" />
          <input
            type="range"
            className="range max-w-40 flex-1"
            style={{ ["--fill" as string]: `${volume * 100}%` }}
            min={0}
            max={1}
            step={0.01}
            value={volume}
            aria-label="Volume du lecteur"
            aria-valuetext={`${Math.round(volume * 100)} %`}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
