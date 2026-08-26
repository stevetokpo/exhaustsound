"use client";

import { useId, type ReactNode } from "react";

interface SliderProps {
  label: string;
  /** Valeur formatée affichée à droite du libellé (ex. « 432,0 Hz »). */
  display: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** L'échelle logarithmique est indispensable de 20 Hz à 10 kHz :
   *  en linéaire, tout le grave tient dans les premiers pixels. */
  scale?: "linear" | "log";
  hint?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

const RESOLUTION = 1000;

export function Slider({
  label, display, value, min, max, step = 1,
  scale = "linear", hint, disabled = false, onChange,
}: SliderProps) {
  const id = useId();
  const isLog = scale === "log";

  const toPosition = (v: number) =>
    isLog
      ? (Math.log(Math.max(v, min) / min) / Math.log(max / min)) * RESOLUTION
      : v;

  const fromPosition = (p: number) =>
    isLog ? min * (max / min) ** (p / RESOLUTION) : p;

  const position = toPosition(value);
  const sliderMin = isLog ? 0 : min;
  const sliderMax = isLog ? RESOLUTION : max;
  const fill = ((position - sliderMin) / (sliderMax - sliderMin)) * 100;

  return (
    <div className={disabled ? "opacity-45" : undefined}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[13px] font-medium tracking-wide text-muted"
        >
          {label}
        </label>
        <span className="tnum text-[13px] text-fg">{display}</span>
      </div>

      {/* py-3 porte la zone tactile à 46px sans épaissir la piste */}
      <div className="py-3">
        <input
          id={id}
          type="range"
          className="range"
          style={{ ["--fill" as string]: `${fill}%` }}
          min={sliderMin}
          max={sliderMax}
          step={isLog ? 1 : step}
          value={position}
          disabled={disabled}
          aria-valuetext={typeof display === "string" ? display : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            const raw = fromPosition(Number(e.target.value));
            const snapped = isLog
              ? Math.round(raw * 10) / 10
              : Math.round(raw / step) * step;
            onChange(Math.min(max, Math.max(min, snapped)));
          }}
        />
      </div>

      {hint && (
        <p id={`${id}-hint`} className="-mt-1 text-xs leading-relaxed text-faint">
          {hint}
        </p>
      )}
    </div>
  );
}
