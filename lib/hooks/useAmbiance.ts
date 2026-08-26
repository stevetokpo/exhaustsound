"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Ambiance = "nuit" | "ambre";
const STORAGE_KEY = "exhaustsound:ambiance";

/**
 * La source de vérité est l'attribut `data-ambiance` posé sur <html> par le
 * script inline du layout, avant la première peinture. On le lit plutôt que
 * d'en tenir une copie dans un état React : plus de flash, plus de
 * resynchronisation après hydratation.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): Ambiance {
  return document.documentElement.dataset.ambiance === "ambre" ? "ambre" : "nuit";
}

export function useAmbiance() {
  const ambiance = useSyncExternalStore(subscribe, getSnapshot, () => "nuit" as const);

  const setAmbiance = useCallback((next: Ambiance) => {
    document.documentElement.dataset.ambiance = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Navigation privée ou stockage bloqué : le choix vaut pour la session.
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { ambiance, setAmbiance };
}
