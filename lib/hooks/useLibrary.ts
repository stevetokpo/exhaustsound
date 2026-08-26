"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  titleFromFileName,
  type Track,
  type TrackCategory,
} from "@/lib/library/types";
import { fetchTracks, type LibraryStatus } from "@/lib/library/client";

/** Plafond du plan gratuit Cloudinary pour une ressource audio/vidéo. */
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export interface PendingUpload {
  id: string;
  fileName: string;
  progress: number;
  error: string | null;
}

interface SignatureResponse {
  context: string;
  folder: string;
  tags: string;
  timestamp: number;
  signature: string;
  apiKey: string;
  endpoint: string;
}

interface UploadResponse {
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
  created_at: string;
  duration?: number;
}

/** XHR et non fetch : c'est le seul moyen d'obtenir la progression d'envoi. */
function postToCloudinary(
  file: File,
  signed: SignatureResponse,
  onProgress: (ratio: number) => void,
  signal: AbortSignal,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("folder", signed.folder);
    form.append("tags", signed.tags);
    form.append("context", signed.context);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.endpoint);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });

    xhr.addEventListener("load", () => {
      try {
        const payload = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload as UploadResponse);
        else reject(new Error(payload?.error?.message ?? `Erreur ${xhr.status}`));
      } catch {
        reject(new Error("Réponse illisible de Cloudinary."));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Connexion interrompue.")));
    xhr.addEventListener("abort", () => reject(new Error("Envoi annulé.")));

    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

export function useLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<LibraryStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    const result = await fetchTracks();
    setTracks(result.tracks);
    setStatus(result.status);
    setError(result.error);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [load]);

  const upload = useCallback(
    async (files: File[], category: TrackCategory) => {
      abortRef.current ??= new AbortController();
      const controller = abortRef.current;

      for (const file of files) {
        const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setPending((prev) => [
          ...prev,
          { id, fileName: file.name, progress: 0, error: null },
        ]);

        const fail = (message: string) => {
          setPending((prev) =>
            prev.map((p) => (p.id === id ? { ...p, error: message } : p)),
          );
        };

        if (file.size > MAX_FILE_BYTES) {
          fail("Fichier trop lourd : 100 Mo maximum.");
          continue;
        }

        try {
          const title = titleFromFileName(file.name);
          const signatureResponse = await fetch("/api/upload/signature", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, category }),
          });
          const signed = await signatureResponse.json();
          if (!signatureResponse.ok) {
            fail(signed.error ?? "Signature refusée.");
            continue;
          }

          const uploaded = await postToCloudinary(
            file,
            signed as SignatureResponse,
            (ratio) =>
              setPending((prev) =>
                prev.map((p) => (p.id === id ? { ...p, progress: ratio } : p)),
              ),
            controller.signal,
          );

          // On insère la piste depuis la réponse d'upload plutôt que de
          // relancer la recherche : l'index Cloudinary met quelques secondes
          // à voir un nouvel objet, et la piste semblerait perdue.
          setTracks((prev) => [
            {
              publicId: uploaded.public_id,
              title,
              category,
              url: uploaded.secure_url,
              duration: typeof uploaded.duration === "number" ? uploaded.duration : null,
              bytes: uploaded.bytes,
              format: uploaded.format,
              createdAt: uploaded.created_at,
            },
            ...prev,
          ]);
          setPending((prev) => prev.filter((p) => p.id !== id));
          setStatus("ready");
        } catch (uploadError) {
          fail(
            uploadError instanceof Error ? uploadError.message : "Envoi impossible.",
          );
        }
      }
    },
    [],
  );

  const dismissPending = useCallback((id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /** Retrait optimiste : la piste disparaît tout de suite et revient à sa
   *  place si Cloudinary refuse. L'appelant passe l'objet entier, ce qui
   *  évite d'aller relire l'état pour pouvoir le restaurer. */
  const remove = useCallback(async (track: Track) => {
    setTracks((prev) => prev.filter((t) => t.publicId !== track.publicId));
    try {
      const response = await fetch(
        `/api/tracks?publicId=${encodeURIComponent(track.publicId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
    } catch {
      setTracks((prev) =>
        [track, ...prev.filter((t) => t.publicId !== track.publicId)].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      );
      setError("Suppression impossible. La piste a été rétablie.");
    }
  }, []);

  return { tracks, status, error, pending, upload, remove, dismissPending, reload: load };
}
