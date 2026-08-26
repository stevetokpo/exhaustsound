"use client";

import { useRef, useState } from "react";
import { CloudUpload, TriangleAlert, X } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { MAX_FILE_BYTES, type PendingUpload } from "@/lib/hooks/useLibrary";
import {
  CATEGORY_HINTS, CATEGORY_LABELS, type TrackCategory,
} from "@/lib/library/types";
import { formatBytes } from "@/lib/format";

interface UploadPanelProps {
  pending: PendingUpload[];
  disabled: boolean;
  onUpload: (files: File[], category: TrackCategory) => void;
  onDismiss: (id: string) => void;
}

const CATEGORIES = Object.keys(CATEGORY_LABELS) as TrackCategory[];

export function UploadPanel({
  pending, disabled, onUpload, onDismiss,
}: UploadPanelProps) {
  const [category, setCategory] = useState<TrackCategory>("voix");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (fileList: FileList | null) => {
    if (!fileList || disabled) return;
    const files = Array.from(fileList).filter(
      (file) => file.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name),
    );
    if (files.length) onUpload(files, category);
  };

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="upload-title">
      <h2
        id="upload-title"
        className="font-display text-lg font-medium tracking-tight text-fg"
      >
        Ajouter des pistes
      </h2>

      <div className="mt-4">
        <SegmentedControl<TrackCategory>
          label="Catégorie"
          columns={2}
          value={category}
          onChange={setCategory}
          options={CATEGORIES.map((c) => ({
            value: c,
            label: CATEGORY_LABELS[c],
            hint: CATEGORY_HINTS[c],
          }))}
        />
        <p className="mt-2 text-xs leading-relaxed text-faint">
          {CATEGORY_HINTS[category]}
        </p>
      </div>

      {/* Le label enveloppe un input natif : la zone reste atteignable au
          clavier et annoncée correctement, le glisser-déposer n'est qu'un
          raccourci en plus. */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
        className={[
          "mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-[13px] border border-dashed px-4 py-8 text-center",
          "transition-colors duration-200 ease-expo",
          disabled && "cursor-not-allowed opacity-45",
          dragging
            ? "border-accent bg-accent-soft"
            : "border-line-strong bg-surface hover:bg-surface-hover",
        ].filter(Boolean).join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = ""; // permet de redéposer le même fichier
          }}
        />
        <CloudUpload aria-hidden className="size-6 text-accent-hi" />
        <span className="text-sm font-medium text-fg">
          Déposez vos fichiers ou cliquez pour choisir
        </span>
        <span className="text-xs text-muted">
          MP3, WAV, M4A, FLAC — {formatBytes(MAX_FILE_BYTES)} par fichier au plus
        </span>
      </label>

      {pending.length > 0 && (
        <ul className="mt-4 space-y-2">
          {pending.map((item) => (
            <li key={item.id} className="inset-well px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-xs text-fg">
                  {item.fileName}
                </span>
                {item.error ? (
                  <button
                    type="button"
                    onClick={() => onDismiss(item.id)}
                    aria-label={`Retirer ${item.fileName} de la liste`}
                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-faint hover:text-fg"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                ) : (
                  <span className="tnum shrink-0 text-xs text-muted">
                    {Math.round(item.progress * 100)} %
                  </span>
                )}
              </div>

              {item.error ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
                  <TriangleAlert aria-hidden className="mt-0.5 size-3 shrink-0" />
                  <span>{item.error}</span>
                </p>
              ) : (
                <div
                  role="progressbar"
                  aria-label={`Envoi de ${item.fileName}`}
                  aria-valuenow={Math.round(item.progress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-2 h-1 overflow-hidden rounded-pill bg-deep"
                >
                  <div
                    className="h-full rounded-pill bg-accent transition-[width] duration-200 ease-expo"
                    style={{ width: `${item.progress * 100}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
