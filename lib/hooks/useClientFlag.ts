"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Lit une capacité du navigateur sans état miroir à resynchroniser après
 * l'hydratation. Renvoie `false` au rendu serveur, puis la vraie valeur.
 */
export function useClientFlag(compute: () => boolean): boolean {
  return useSyncExternalStore(noSubscribe, compute, () => false);
}
