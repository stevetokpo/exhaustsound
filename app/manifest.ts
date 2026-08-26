import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ExhaustSound — Studio de fréquences",
    short_name: "ExhaustSound",
    description:
      "Générateur de fréquences, battements binauraux, sons isochrones et lits de bruit pour la méditation et l'endormissement.",
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // « any » plutôt que « portrait » : la mise en page reste lisible en
    // paysage, et forcer une orientation gêne l'écoute posée à plat.
    orientation: "any",
    background_color: "#07070c",
    theme_color: "#07070c",
    categories: ["health", "lifestyle", "music"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Studio de fréquences", short_name: "Studio", url: "/" },
      { name: "Bibliothèque", short_name: "Bibliothèque", url: "/bibliotheque" },
    ],
  };
}
