"use client";

import { useEffect, useState } from "react";
import { fetchTracks, type LibraryStatus } from "@/lib/library/client";
import type { Track } from "@/lib/library/types";

/** Lecture seule de la bibliothèque, pour le sélecteur de piste de fond. */
export function useTrackList() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<LibraryStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchTracks();
      if (cancelled) return;
      setTracks(result.tracks);
      setStatus(result.status);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tracks, status };
}
