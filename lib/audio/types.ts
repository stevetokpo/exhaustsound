export type Waveform = "sine" | "triangle" | "square" | "sawtooth";

/** pure = porteuse simple · binaural = 2 porteuses décalées (casque requis)
 *  isochronic = porteuse hachée par un train d'impulsions (sans casque) */
export type ToneMode = "pure" | "binaural" | "isochronic";

export type NoiseColor = "off" | "white" | "pink" | "brown";

/** Ambiances naturelles synthétisées (voir lib/audio/ambience.ts). */
export type AmbienceId =
  | "pluie" | "averse" | "orage" | "vent"
  | "vagues" | "ruisseau" | "feu" | "grillons";

/** Ce que joue la couche de fond : un bruit brut ou une ambiance.
 *  Les deux s'excluent — une pluie est déjà du bruit filtré. */
export type Texture = NoiseColor | AmbienceId;

export interface EngineSettings {
  /** Porteuse, 20 Hz → 10 000 Hz */
  frequency: number;
  waveform: Waveform;
  mode: ToneMode;
  /** Battement : écart binaural ou cadence isochrone, 0,5 → 40 Hz */
  beat: number;
  /** Profondeur de modulation 0 → 1 (isochrone, ou trémolo en mode pur) */
  depth: number;
  /** Niveau de la porteuse 0 → 1 */
  toneLevel: number;
  noise: NoiseColor;
  ambience: AmbienceId | "off";
  noiseLevel: number;
  /** Passe-bas sur le bruit : 200 Hz (sourd) → 16 000 Hz (ouvert) */
  noiseTone: number;
  /** Volume général 0 → 1 (courbe perceptuelle appliquée en interne) */
  master: number;
}

export const DEFAULT_SETTINGS: EngineSettings = {
  frequency: 432,
  waveform: "sine",
  mode: "pure",
  beat: 8,
  depth: 0,
  toneLevel: 0.55,
  noise: "off",
  ambience: "off",
  noiseLevel: 0.3,
  noiseTone: 4000,
  master: 0.35,
};

export const FREQ_MIN = 20;
export const FREQ_MAX = 10000;
export const BEAT_MIN = 0.5;
export const BEAT_MAX = 40;

export const WAVEFORM_LABELS: Record<Waveform, string> = {
  sine: "Sinus",
  triangle: "Triangle",
  square: "Carrée",
  sawtooth: "Dent de scie",
};

export const WAVEFORM_HINTS: Record<Waveform, string> = {
  sine: "Le plus doux. Une seule harmonique, aucune aspérité.",
  triangle: "Doux avec un peu de corps. Bon compromis à bas volume.",
  square: "Riche et présent. Fatigant au-delà de quelques minutes.",
  sawtooth: "Le plus dense. À réserver aux fréquences basses.",
};

export const MODE_LABELS: Record<ToneMode, string> = {
  pure: "Pure",
  binaural: "Binaural",
  isochronic: "Isochrone",
};

export const NOISE_LABELS: Record<NoiseColor, string> = {
  off: "Aucun",
  white: "Blanc",
  pink: "Rose",
  brown: "Brun",
};
