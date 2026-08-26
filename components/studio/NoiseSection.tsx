"use client";

import { Slider } from "@/components/ui/Slider";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatPercent } from "@/lib/format";
import { NOISE_LABELS, type EngineSettings, type NoiseColor } from "@/lib/audio/types";

interface NoiseSectionProps {
  settings: EngineSettings;
  update: <K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) => void;
}

const NOISE_HINTS: Record<NoiseColor, string> = {
  off: "Fréquence seule.",
  white: "Énergie égale sur toutes les fréquences. Le plus sifflant.",
  pink: "Énergie décroissante vers l'aigu. Le plus proche de la pluie.",
  brown: "Très grave et sourd. Le plus enveloppant pour dormir.",
};

export function NoiseSection({ settings, update }: NoiseSectionProps) {
  const { noise, noiseLevel, noiseTone } = settings;
  const off = noise === "off";

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="noise-title">
      <h2
        id="noise-title"
        className="font-display text-lg font-medium tracking-tight text-fg"
      >
        Lit de bruit
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Une sinusoïde seule devient vite pénible sur une longue séance. Un fond
        de bruit lui donne de la matière et masque l&apos;ambiance de la pièce.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <SegmentedControl<NoiseColor>
            label="Couleur"
            columns={4}
            value={noise}
            onChange={(v) => update("noise", v)}
            options={(Object.keys(NOISE_LABELS) as NoiseColor[]).map((c) => ({
              value: c,
              label: NOISE_LABELS[c],
              hint: NOISE_HINTS[c],
            }))}
          />
          <p className="mt-2 text-xs leading-relaxed text-faint">
            {NOISE_HINTS[noise]}
          </p>
        </div>

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
          hint="Passe-bas. Vers la gauche, le bruit devient sourd et lointain."
          onChange={(v) => update("noiseTone", Math.round(v))}
        />
      </div>
    </section>
  );
}
