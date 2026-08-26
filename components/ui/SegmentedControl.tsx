"use client";

import { useId, useRef } from "react";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Étale les segments sur 2 colonnes sous 400px. */
  columns?: 2 | 3 | 4;
}

export function SegmentedControl<T extends string>({
  label, options, value, onChange, columns = 3,
}: SegmentedControlProps<T>) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const move = (delta: number) => {
    const index = options.findIndex((o) => o.value === value);
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    const buttons = containerRef.current?.querySelectorAll("button");
    buttons?.[next]?.focus();
  };

  const gridClass =
    columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3";

  return (
    <div>
      <span id={id} className="text-[13px] font-medium tracking-wide text-muted">
        {label}
      </span>
      <div
        ref={containerRef}
        role="radiogroup"
        aria-labelledby={id}
        className={`mt-2 grid gap-1.5 ${gridClass} inset-well p-1.5`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            move(1);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            move(-1);
          }
        }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              title={option.hint}
              onClick={() => onChange(option.value)}
              className={[
                "min-h-11 cursor-pointer rounded-[11px] px-2 text-[13px] font-medium",
                "transition-[background-color,color,box-shadow] duration-200 ease-expo",
                selected
                  ? "bg-accent-soft text-fg shadow-[inset_0_0_0_1px_var(--accent),0_0_20px_-8px_var(--accent-glow)]"
                  : "text-muted hover:bg-surface-hover hover:text-fg",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
