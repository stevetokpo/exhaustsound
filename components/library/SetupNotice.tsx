import { KeyRound } from "lucide-react";

const VARIABLES = [
  { name: "CLOUDINARY_CLOUD_NAME", hint: "Le nom du cloud, visible en haut du tableau de bord." },
  { name: "CLOUDINARY_API_KEY", hint: "Onglet Settings › API Keys." },
  { name: "CLOUDINARY_API_SECRET", hint: "Même page. Ne jamais le préfixer NEXT_PUBLIC_." },
];

export function SetupNotice() {
  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="setup-title">
      <h2
        id="setup-title"
        className="flex items-center gap-2 font-display text-lg font-medium tracking-tight text-fg"
      >
        <KeyRound aria-hidden className="size-4 text-accent-hi" />
        Cloudinary à configurer
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Créez un fichier <code className="tnum text-fg">.env.local</code> à la
        racine du projet avec ces trois valeurs, puis relancez le serveur.
        Le secret reste côté serveur : il sert à signer les envois, il n&apos;est
        jamais transmis au navigateur.
      </p>

      <ul className="mt-4 space-y-2">
        {VARIABLES.map(({ name, hint }) => (
          <li key={name} className="inset-well px-3 py-2.5">
            <p className="tnum text-xs text-fg">{name}</p>
            <p className="mt-0.5 text-xs text-muted">{hint}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
