import type { Track } from "./types";

export type LibraryStatus = "loading" | "ready" | "unconfigured" | "error";

export interface TracksResult {
  tracks: Track[];
  status: LibraryStatus;
  error: string | null;
}

/** Lecture partagée entre la bibliothèque et le sélecteur de piste de fond. */
export async function fetchTracks(): Promise<TracksResult> {
  try {
    const response = await fetch("/api/tracks", { cache: "no-store" });
    const payload = await response.json();
    if (response.status === 503) {
      return { tracks: [], status: "unconfigured", error: payload.error ?? null };
    }
    if (!response.ok) {
      return {
        tracks: [],
        status: "error",
        error: payload.error ?? "Lecture de la bibliothèque impossible.",
      };
    }
    return { tracks: payload.tracks ?? [], status: "ready", error: null };
  } catch {
    return { tracks: [], status: "error", error: "Le serveur n'a pas répondu." };
  }
}
