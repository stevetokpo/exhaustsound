"use client";

import { useEffect } from "react";

/**
 * En développement, un service worker prend la main sur les fragments servis
 * par Turbopack et casse le rechargement à chaud. Il n'est donc enregistré
 * qu'en production : pour l'essayer localement, `next build` puis `next start`.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Contexte non sécurisé ou enregistrement refusé : l'application
        // fonctionne normalement, sans le mode hors ligne.
      });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
