"use client";

import { useState } from "react";
import { Headphones, Info, Timer } from "lucide-react";
import {
  FAMILY_LABELS, FAMILY_NOTES, PRESETS_BY_FAMILY,
  type Preset, type PresetFamily,
} from "@/lib/audio/presets";

const FAMILIES: PresetFamily[] = ["seance", "solfeggio", "ondes"];

interface PresetShelfProps {
  activePreset: string | null;
  onSelect: (preset: Preset) => void;
}

export function PresetShelf({ activePreset, onSelect }: PresetShelfProps) {
  const [family, setFamily] = useState<PresetFamily>("seance");
  const presets = PRESETS_BY_FAMILY(family);
  const isSession = family === "seance";

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="presets-title">
      <h2
        id="presets-title"
        className="font-display text-lg font-medium tracking-tight text-fg"
      >
        Préréglages
      </h2>

      <div
        role="tablist"
        aria-label="Familles de préréglages"
        className="inset-well mt-3 grid grid-cols-3 gap-1.5 p-1.5"
      >
        {FAMILIES.map((f) => {
          const selected = f === family;
          return (
            <button
              key={f}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setFamily(f)}
              className={[
                "min-h-11 cursor-pointer rounded-[11px] px-2 text-[13px] font-medium",
                "transition-colors duration-200 ease-expo",
                selected
                  ? "bg-accent-soft text-fg shadow-[inset_0_0_0_1px_var(--accent)]"
                  : "text-muted hover:bg-surface-hover hover:text-fg",
              ].join(" ")}
            >
              {FAMILY_LABELS[f]}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-faint" />
        <span>{FAMILY_NOTES[family]}</span>
      </p>

      <div
        className={`mt-4 grid gap-2 ${isSession ? "sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}
      >
        {presets.map((preset) => {
          const selected = activePreset === preset.name;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(preset)}
              className={[
                "group cursor-pointer rounded-[13px] border p-3 text-left",
                "transition-[background-color,border-color,box-shadow] duration-200 ease-expo",
                selected
                  ? "border-accent bg-accent-soft shadow-[0_0_24px_-10px_var(--accent-glow)]"
                  : "border-line bg-surface hover:border-line-strong hover:bg-surface-hover",
              ].join(" ")}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`text-sm font-semibold ${isSession ? "" : "tnum"} text-fg`}
                >
                  {preset.name}
                </span>
                {preset.headphones && (
                  <Headphones
                    aria-label="Casque nécessaire"
                    className="size-3.5 shrink-0 text-accent-hi"
                  />
                )}
              </span>

              <span className="mt-1 block text-xs leading-snug text-muted">
                {preset.hint}
              </span>

              {preset.duration && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-pill border border-line px-2 py-0.5 text-[11px] text-faint">
                  <Timer aria-hidden className="size-3" />
                  <span className="tnum">{preset.duration} min</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
