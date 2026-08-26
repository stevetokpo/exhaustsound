import type { EngineSettings } from "./types";

export type PresetFamily = "seance" | "solfeggio" | "ondes";

export interface Preset {
  id: string;
  name: string;
  family: PresetFamily;
  /** Ce que le preset fait réellement, en une ligne. */
  hint: string;
  settings: Partial<EngineSettings>;
  /** Durée de séance suggérée, en minutes. */
  duration?: number;
  /** Vrai pour tout ce qui repose sur une différence entre les deux oreilles. */
  headphones?: boolean;
}

export const FAMILY_LABELS: Record<PresetFamily, string> = {
  seance: "Séances",
  solfeggio: "Solfeggio",
  ondes: "Ondes cérébrales",
};

export const FAMILY_NOTES: Record<PresetFamily, string> = {
  seance:
    "Combinaisons prêtes à l'emploi : porteuse, battement, lit de bruit et durée.",
  solfeggio:
    "Attributions traditionnelles, sans validation scientifique. L'effet ressenti vient surtout du cadre d'écoute — casque, volume bas, régularité.",
  ondes:
    "Battements binauraux calés sur les bandes de l'EEG. Les études montrent des effets réels mais modestes. Casque indispensable.",
};

export const PRESETS: Preset[] = [
  // ------------------------------------------------------------- séances
  {
    id: "endormissement",
    name: "Endormissement",
    family: "seance",
    hint: "Porteuse grave, battement delta, bruit brun. Fondu sur 45 min.",
    duration: 45,
    headphones: true,
    settings: {
      frequency: 100, waveform: "sine", mode: "binaural", beat: 2.5,
      depth: 0, toneLevel: 0.4, noise: "brown", noiseLevel: 0.45,
      noiseTone: 1200, master: 0.28,
    },
  },
  {
    id: "meditation",
    name: "Méditation profonde",
    family: "seance",
    hint: "136,1 Hz (note Om) avec un battement thêta. 20 min.",
    duration: 20,
    headphones: true,
    settings: {
      frequency: 136.1, waveform: "sine", mode: "binaural", beat: 6,
      depth: 0, toneLevel: 0.5, noise: "pink", noiseLevel: 0.22,
      noiseTone: 3000, master: 0.32,
    },
  },
  {
    id: "detente",
    name: "Détente",
    family: "seance",
    hint: "432 Hz posé sur un lit de bruit rose. Sans casque. 15 min.",
    duration: 15,
    settings: {
      frequency: 432, waveform: "sine", mode: "pure", beat: 8,
      depth: 0.12, toneLevel: 0.45, noise: "pink", noiseLevel: 0.32,
      noiseTone: 5000, master: 0.32,
    },
  },
  {
    id: "concentration",
    name: "Concentration",
    family: "seance",
    hint: "Battement bêta et bruit rose pour masquer l'ambiance. 50 min.",
    duration: 50,
    headphones: true,
    settings: {
      frequency: 200, waveform: "sine", mode: "binaural", beat: 15,
      depth: 0, toneLevel: 0.34, noise: "pink", noiseLevel: 0.42,
      noiseTone: 6000, master: 0.3,
    },
  },
  {
    id: "isochrone-alpha",
    name: "Alpha sans casque",
    family: "seance",
    hint: "Impulsions isochrones à 10 Hz : fonctionne sur haut-parleur. 20 min.",
    duration: 20,
    settings: {
      frequency: 210, waveform: "sine", mode: "isochronic", beat: 10,
      depth: 0.85, toneLevel: 0.45, noise: "pink", noiseLevel: 0.25,
      noiseTone: 4000, master: 0.3,
    },
  },
  {
    id: "apaisement",
    name: "Apaisement rapide",
    family: "seance",
    hint: "528 Hz, léger trémolo, 10 min. Pour redescendre entre deux choses.",
    duration: 10,
    settings: {
      frequency: 528, waveform: "sine", mode: "pure", beat: 5,
      depth: 0.2, toneLevel: 0.42, noise: "off", noiseLevel: 0.3,
      noiseTone: 4000, master: 0.3,
    },
  },

  // ------------------------------------------------------------ solfeggio
  { id: "sf-174", name: "174 Hz", family: "solfeggio", hint: "Soulagement, ancrage", settings: { frequency: 174, mode: "pure", waveform: "sine", depth: 0 } },
  { id: "sf-285", name: "285 Hz", family: "solfeggio", hint: "Régénération des tissus", settings: { frequency: 285, mode: "pure", waveform: "sine", depth: 0 } },
  { id: "sf-396", name: "396 Hz", family: "solfeggio", hint: "Libération de la peur", settings: { frequency: 396, mode: "pure", waveform: "sine", depth: 0 } },
  { id: "sf-417", name: "417 Hz", family: "solfeggio", hint: "Changement, dénouement", settings: { frequency: 417, mode: "pure", waveform: "sine", depth: 0 } },
  { id: "sf-528", name: "528 Hz", family: "solfeggio", hint: "Transformation", settings: { frequency: 528, mode: "pure", waveform: "sine", depth: 0 } },
  { id: "sf-639", name: "639 Hz", family: "solfeggio", hint: "Relations, harmonie", settings: { frequency: 639, mode: "pure", waveform: "sine", depth: 0 } },
  { id: "sf-741", name: "741 Hz", family: "solfeggio", hint: "Expression, nettoyage", settings: { frequency: 741, mode: "pure", waveform: "sine", depth: 0 } },
  { id: "sf-852", name: "852 Hz", family: "solfeggio", hint: "Intuition", settings: { frequency: 852, mode: "pure", waveform: "sine", depth: 0 } },
  { id: "sf-963", name: "963 Hz", family: "solfeggio", hint: "Connexion, éveil", settings: { frequency: 963, mode: "pure", waveform: "sine", depth: 0 } },
  { id: "sf-432", name: "432 Hz", family: "solfeggio", hint: "Accord dit naturel", settings: { frequency: 432, mode: "pure", waveform: "sine", depth: 0 } },
  { id: "sf-136", name: "136,1 Hz", family: "solfeggio", hint: "Note Om, année terrestre", settings: { frequency: 136.1, mode: "pure", waveform: "sine", depth: 0 } },

  // ------------------------------------------------------ ondes cérébrales
  {
    id: "ob-delta", name: "Delta · 2,5 Hz", family: "ondes", headphones: true,
    hint: "Sommeil profond, récupération",
    settings: { frequency: 100, mode: "binaural", beat: 2.5, waveform: "sine", depth: 0 },
  },
  {
    id: "ob-theta", name: "Thêta · 6 Hz", family: "ondes", headphones: true,
    hint: "Méditation profonde, hypnagogie",
    settings: { frequency: 140, mode: "binaural", beat: 6, waveform: "sine", depth: 0 },
  },
  {
    id: "ob-alpha", name: "Alpha · 10 Hz", family: "ondes", headphones: true,
    hint: "Détente attentive, yeux fermés",
    settings: { frequency: 200, mode: "binaural", beat: 10, waveform: "sine", depth: 0 },
  },
  {
    id: "ob-beta", name: "Bêta · 18 Hz", family: "ondes", headphones: true,
    hint: "Concentration active",
    settings: { frequency: 220, mode: "binaural", beat: 18, waveform: "sine", depth: 0 },
  },
  {
    id: "ob-gamma", name: "Gamma · 40 Hz", family: "ondes", headphones: true,
    hint: "Vigilance, attention soutenue",
    settings: { frequency: 250, mode: "binaural", beat: 40, waveform: "sine", depth: 0 },
  },
];

export const PRESETS_BY_FAMILY = (family: PresetFamily) =>
  PRESETS.filter((p) => p.family === family);
