"use client";

import { useCallback, useEffect, useState } from "react";
import { useClientFlag } from "./useClientFlag";
import type { Track } from "@/lib/library/types";

/** Doit correspondre exactement au nom utilisé dans public/sw.js. */
const AUDIO_CACHE = "exhaustsound-audio";

const supportsCaches = () =>
  typeof window !== "undefined" && "caches" in window;

/**
 * Téléchargement des pistes pour l'écoute hors ligne.
 *
 * La page écrit directement dans la Cache API ; le service worker se contente
 * de servir ce qui s'y trouve. Passer par des messages au service worker
 * n'apporterait rien : les deux voient le même stockage.
 */
export function useOfflineAudio() {
  const supported = useClientFlag(supportsCaches);
  const [cached, setCached] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supportsCaches()) return;
    let cancelled = false;
    void (async () => {
      try {
        const cache = await caches.open(AUDIO_CACHE);
        const keys = await cache.keys();
        if (!cancelled) setCached(new Set(keys.map((request) => request.url)));
      } catch {
        // Stockage inaccessible (navigation privée) : le mode hors ligne
        // reste simplement indisponible.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markBusy = (url: string, value: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (value) next.add(url);
      else next.delete(url);
      return next;
    });

  const store = useCallback(async (track: Track) => {
    markBusy(track.url, true);
    setError(null);
    try {
      const cache = await caches.open(AUDIO_CACHE);
      // `mode: "cors"` est indispensable : une réponse opaque ne peut être
      // ni découpée pour répondre à un en-tête Range, ni mesurée en quota.
      const response = await fetch(track.url, { mode: "cors" });
      if (!response.ok) throw new Error();
      await cache.put(track.url, response);
      setCached((prev) => new Set(prev).add(track.url));
    } catch {
      setError(`Téléchargement de « ${track.title} » impossible.`);
    } finally {
      markBusy(track.url, false);
    }
  }, []);

  const discard = useCallback(async (track: Track) => {
    markBusy(track.url, true);
    try {
      const cache = await caches.open(AUDIO_CACHE);
      await cache.delete(track.url);
      setCached((prev) => {
        const next = new Set(prev);
        next.delete(track.url);
        return next;
      });
    } catch {
      setError(`Suppression hors ligne de « ${track.title} » impossible.`);
    } finally {
      markBusy(track.url, false);
    }
  }, []);

  const toggle = useCallback(
    (track: Track) => {
      if (cached.has(track.url)) return discard(track);
      return store(track);
    },
    [cached, discard, store],
  );

  return { supported, cached, busy, error, toggle };
}
