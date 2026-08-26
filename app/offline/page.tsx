import Link from "next/link";
import { AudioLines, WifiOff } from "lucide-react";

export const metadata = { title: "Hors ligne — ExhaustSound" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16 text-center sm:px-6">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-[14px] bg-surface text-accent-hi"
      >
        <WifiOff className="size-5" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-fg">
        Pas de réseau
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Cette page n&apos;a pas encore été mise en cache. Le studio de
        fréquences, lui, fonctionne entièrement hors ligne : il ne dépend
        d&apos;aucun serveur.
      </p>
      <Link
        href="/"
        className="mt-6 flex min-h-11 items-center gap-2 rounded-[13px] border border-line bg-surface px-4 text-sm font-medium text-fg transition-colors duration-200 ease-expo hover:bg-surface-hover"
      >
        <AudioLines aria-hidden className="size-4" />
        Ouvrir le studio
      </Link>
    </div>
  );
}
