"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useLibrary } from "@/lib/hooks/useLibrary";
import { useOfflineAudio } from "@/lib/hooks/useOfflineAudio";
import type { Track } from "@/lib/library/types";
import { SetupNotice } from "./SetupNotice";
import { UploadPanel } from "./UploadPanel";
import { TrackList } from "./TrackList";
import { PlayerDock } from "./PlayerDock";

export function Library() {
  const { tracks, status, error, pending, upload, remove, dismissPending } =
    useLibrary();
  const offline = useOfflineAudio();
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = (track: Track) => {
    if (current?.publicId === track.publicId) {
      setPlaying((value) => !value);
      return;
    }
    setCurrent(track);
    setPlaying(true);
  };

  const handleRemove = (track: Track) => {
    if (current?.publicId === track.publicId) {
      setCurrent(null);
      setPlaying(false);
    }
    void remove(track);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-44 pt-6 sm:px-6">
      <h1 className="font-display text-2xl font-medium tracking-tight text-fg">
        Bibliothèque
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Vos musiques et vos vocaux, hébergés sur Cloudinary. L&apos;envoi part
        du navigateur directement vers Cloudinary, sans passer par le serveur.
      </p>

      {(error ?? offline.error) && status !== "unconfigured" && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-[13px] border border-danger/40 bg-surface px-3 py-2.5 text-sm text-danger"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error ?? offline.error}</span>
        </p>
      )}

      {status === "unconfigured" ? (
        <div className="mt-5">
          <SetupNotice />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <UploadPanel
            pending={pending}
            disabled={status === "loading"}
            onUpload={upload}
            onDismiss={dismissPending}
          />

          {status === "loading" ? (
            <div className="panel space-y-2 p-4 sm:p-5" aria-busy="true">
              <span className="sr-only">Chargement de la bibliothèque</span>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  aria-hidden
                  className="h-14 animate-pulse rounded-[13px] bg-surface"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          ) : (
            <TrackList
              tracks={tracks}
              currentId={current?.publicId ?? null}
              playing={playing}
              onPlay={handlePlay}
              onRemove={handleRemove}
              offlineSupported={offline.supported}
              cachedUrls={offline.cached}
              busyUrls={offline.busy}
              onToggleOffline={(track) => void offline.toggle(track)}
            />
          )}
        </div>
      )}

      {current && (
        <PlayerDock
          track={current}
          playing={playing}
          onPlayingChange={setPlaying}
          onClose={() => {
            setCurrent(null);
            setPlaying(false);
          }}
        />
      )}
    </div>
  );
}
