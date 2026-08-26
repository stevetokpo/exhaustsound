"use client";

import { Headphones, Minus, Plus } from "lucide-react";
import { Slider } from "@/components/ui/Slider";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatHz, formatPercent } from "@/lib/format";
import {
  BEAT_MAX, BEAT_MIN, FREQ_MAX, FREQ_MIN,
  MODE_LABELS, WAVEFORM_HINTS, WAVEFORM_LABELS,
  type EngineSettings, type ToneMode, type Waveform,
} from "@/lib/audio/types";

interface ToneSectionProps {
  settings: EngineSettings;
  update: <K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) => void;
}

const MODE_HINTS: Record<ToneMode, string> = {
  pure: "Une seule porteuse, centrée. Fonctionne sur haut-parleur.",
  binaural: "Deux porteuses décalées, une par oreille. Casque obligatoire.",
  isochronic: "Porteuse hachée par des impulsions. Sans casque.",
};

const STEPPERS = [
  { label: "÷2", title: "Une octave en dessous", apply: (f: number) => f / 2 },
  { label: "−1", title: "Un hertz en dessous", apply: (f: number) => f - 1, icon: Minus },
  { label: "+1", title: "Un hertz au-dessus", apply: (f: number) => f + 1, icon: Plus },
  { label: "×2", title: "Une octave au-dessus", apply: (f: number) => f * 2 },
] as const;

export function ToneSection({ settings, update }: ToneSectionProps) {
  const { frequency, waveform, mode, beat, depth, toneLevel } = settings;
  const showBeat = mode !== "pure";
  const showDepth = mode === "isochronic" || mode === "pure";

  const stepFrequency = (apply: (f: number) => number) => {
    const next = Math.round(apply(frequency) * 10) / 10;
    update("frequency", Math.min(FREQ_MAX, Math.max(FREQ_MIN, next)));
  };

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="tone-title">
      <h2
        id="tone-title"
        className="font-display text-lg font-medium tracking-tight text-fg"
      >
        Porteuse
      </h2>

      {/* Lecture de la fréquence : c'est la valeur que l'utilisateur suit,
          elle mérite la plus grosse typographie de l'écran. */}
      <div className="inset-well mt-4 px-4 py-5 text-center">
        <div className="tnum text-5xl leading-none font-light text-fg sm:text-6xl">
          {formatHz(frequency)}
          <span className="ml-2 align-baseline text-xl text-muted">Hz</span>
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {STEPPERS.map((stepper) => (
            <button
              key={stepper.label}
              type="button"
              title={stepper.title}
              aria-label={stepper.title}
              onClick={() => stepFrequency(stepper.apply)}
              className="tnum min-h-11 min-w-11 cursor-pointer rounded-[11px] border border-line bg-surface px-3 text-sm text-muted transition-colors duration-200 ease-expo hover:border-line-strong hover:bg-surface-hover hover:text-fg"
            >
              {stepper.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Slider
          label="Fréquence"
          display={`${formatHz(frequency)} Hz`}
          value={frequency}
          min={FREQ_MIN}
          max={FREQ_MAX}
          scale="log"
          hint="Échelle logarithmique : chaque tiers de course vaut environ trois octaves."
          onChange={(v) => update("frequency", v)}
        />
      </div>

      <div className="mt-2 space-y-4">
        <div>
          <SegmentedControl<ToneMode>
            label="Mode"
            value={mode}
            onChange={(v) => update("mode", v)}
            options={(Object.keys(MODE_LABELS) as ToneMode[]).map((m) => ({
              value: m,
              label: MODE_LABELS[m],
              hint: MODE_HINTS[m],
            }))}
          />
          <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-faint">
            {mode === "binaural" && (
              <Headphones aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent-hi" />
            )}
            <span>{MODE_HINTS[mode]}</span>
          </p>
        </div>

        <div>
          <SegmentedControl<Waveform>
            label="Forme d'onde"
            columns={4}
            value={waveform}
            onChange={(v) => update("waveform", v)}
            options={(Object.keys(WAVEFORM_LABELS) as Waveform[]).map((w) => ({
              value: w,
              label: WAVEFORM_LABELS[w],
              hint: WAVEFORM_HINTS[w],
            }))}
          />
          <p className="mt-2 text-xs leading-relaxed text-faint">
            {WAVEFORM_HINTS[waveform]}
          </p>
        </div>

        {showBeat && (
          <Slider
            label={mode === "binaural" ? "Battement binaural" : "Cadence des impulsions"}
            display={`${formatHz(beat)} Hz`}
            value={beat}
            min={BEAT_MIN}
            max={BEAT_MAX}
            step={0.1}
            hint={
              mode === "binaural"
                ? "Écart entre l'oreille gauche et l'oreille droite. Delta 0,5–4 · Thêta 4–8 · Alpha 8–12 · Bêta 12–30."
                : "Nombre d'impulsions par seconde."
            }
            onChange={(v) => update("beat", Math.round(v * 10) / 10)}
          />
        )}

        {showDepth && (
          <Slider
            label={mode === "isochronic" ? "Profondeur des impulsions" : "Trémolo"}
            display={formatPercent(depth)}
            value={depth}
            min={0}
            max={1}
            step={0.01}
            hint={
              mode === "isochronic"
                ? "À 100 %, le son se coupe entièrement entre deux impulsions."
                : "Une respiration d'amplitude très légère rend une sinusoïde pure moins clinique."
            }
            onChange={(v) => update("depth", v)}
          />
        )}

        <Slider
          label="Niveau de la porteuse"
          display={formatPercent(toneLevel)}
          value={toneLevel}
          min={0}
          max={1}
          step={0.01}
          hint="Dosage de la fréquence par rapport au lit de bruit."
          onChange={(v) => update("toneLevel", v)}
        />
      </div>
    </section>
  );
}
