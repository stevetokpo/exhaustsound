export type TrackCategory = "musique" | "voix";

export const CATEGORY_LABELS: Record<TrackCategory, string> = {
  musique: "Musique",
  voix: "Voix & affirmations",
};

export const CATEGORY_HINTS: Record<TrackCategory, string> = {
  musique: "Nappes, ambiances, musiques de fond pour la séance.",
  voix: "Affirmations, vocaux, guidages parlés.",
};

export interface Track {
  /** Identifiant Cloudinary, sert aussi de clé de suppression. */
  publicId: string;
  title: string;
  category: TrackCategory;
  url: string;
  /** Secondes. Absent tant que Cloudinary n'a pas fini l'analyse. */
  duration: number | null;
  bytes: number;
  format: string;
  createdAt: string;
}

export function isTrackCategory(value: unknown): value is TrackCategory {
  return value === "musique" || value === "voix";
}

/** Cloudinary encode le contexte en `clé=valeur|clé=valeur` :
 *  les deux séparateurs doivent disparaître du titre. */
export function sanitizeTitle(raw: string): string {
  return raw.replace(/[|=]/g, " ").trim().slice(0, 120);
}

/** « ambiance_pluie.mp3 » → « ambiance pluie » */
export function titleFromFileName(fileName: string): string {
  return sanitizeTitle(fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
}
