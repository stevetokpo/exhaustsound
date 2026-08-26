"use client";

import { ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/Slider";
import { formatPercent } from "@/lib/format";
import { AMBIENCE_HINTS, AMBIENCE_LABELS } from "@/lib/audio/ambience";
import {
  NOISE_LABELS,
  type AmbienceId,
  type EngineSettings,
  type NoiseColor,
  type Texture,
} from "@/lib/audio/types";

interface TextureSectionProps {
  settings: EngineSettings;
  texture: Texture;
  onTextureChange: (value: Texture) => void;
  update: <K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) => void;
}

const NOISE_HINTS: Record<Exclude<NoiseColor, "off">, string> = {
  white: "Énergie égale sur toutes les fréquences. Le plus sifflant.",
  pink: "Énergie décroissante vers l'aigu. Le plus proche de la pluie.",
  brown: "Très grave et sourd. Le plus enveloppant pour dormir.",
};

const NATURE: AmbienceId[] = [
  "pluie", "averse", "orage", "vent", "vagues", "ruisseau", "feu", "grillons",
];
const NOISES: Exclude<NoiseColor, "off">[] = ["white", "pink", "brown"];

function hintFor(texture: Texture): string {
  if (texture === "off") return "Fréquence seule, sans couche de fond.";
  if (texture in AMBIENCE_LABELS) return AMBIENCE_HINTS[texture as AmbienceId];
  return NOISE_HINTS[texture as Exclude<NoiseColor, "off">];
}

export function TextureSection({
  settings, texture, onTextureChange, update,
}: TextureSectionProps) {
  const { noiseLevel, noiseTone } = settings;
  const off = texture === "off";

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="texture-title">
      <h2
        id="texture-title"
        className="font-display text-lg font-medium tracking-tight text-fg"
      >
        Ambiance
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Une sinusoïde seule devient vite pénible sur une longue séance. Une
        couche de fond lui donne de la matière et masque la pièce. Les
        ambiances naturelles sont synthétisées en direct : elles ne bouclent
        jamais et ne consomment aucune donnée.
      </p>

      <div className="relative mt-4">
        <label htmlFor="texture-select" className="sr-only">
          Couche de fond
        </label>
        <select
          id="texture-select"
          value={texture}
          onChange={(e) => onTextureChange(e.target.value as Texture)}
          className="inset-well min-h-11 w-full cursor-pointer appearance-none py-2 pl-3 pr-10 text-sm text-fg"
        >
          <option value="off">{NOISE_LABELS.off}</option>
          <optgroup label="Nature">
            {NATURE.map((id) => (
              <option key={id} value={id}>
                {AMBIENCE_LABELS[id]}
              </option>
            ))}
          </optgroup>
          <optgroup label="Bruits">
            {NOISES.map((color) => (
              <option key={color} value={color}>
                {NOISE_LABELS[color]}
              </option>
            ))}
          </optgroup>
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint"
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-faint">{hintFor(texture)}</p>

      <div className="mt-3 space-y-1">
        <Slider
          label="Niveau"
          display={formatPercent(noiseLevel)}
          value={noiseLevel}
          min={0}
          max={1}
          step={0.01}
          disabled={off}
          onChange={(v) => update("noiseLevel", v)}
        />

        <Slider
          label="Timbre"
          display={`${(noiseTone / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kHz`}
          value={noiseTone}
          min={200}
          max={16000}
          scale="log"
          disabled={off}
          hint="Passe-bas. Vers la gauche, la pluie s'éloigne derrière une vitre."
          onChange={(v) => update("noiseTone", Math.round(v))}
        />
      </div>
    </section>
  );
}
