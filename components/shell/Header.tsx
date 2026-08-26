"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AudioLines, Library, Moon, Sunset, WifiOff } from "lucide-react";
import { useAmbiance } from "@/lib/hooks/useAmbiance";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { InstallButton } from "@/components/pwa/InstallButton";

const NAV = [
  { href: "/", label: "Studio", icon: AudioLines },
  { href: "/bibliotheque", label: "Bibliothèque", icon: Library },
];

export function Header() {
  const pathname = usePathname();
  const { ambiance, setAmbiance } = useAmbiance();
  const online = useOnlineStatus();
  const isNight = ambiance === "nuit";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-chrome backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="mr-auto flex items-center gap-2 rounded-lg text-fg"
        >
          <span
            aria-hidden
            className="halo-ring flex size-8 items-center justify-center rounded-[10px] bg-elevated"
          >
            <AudioLines className="size-4 text-accent-hi" />
          </span>
          <span className="font-display text-base font-medium tracking-tight">
            ExhaustSound
          </span>
        </Link>

        {!online && (
          <span
            role="status"
            title="Hors ligne — le studio de fréquences reste utilisable"
            className="flex items-center gap-1.5 rounded-pill border border-line px-2.5 py-1 text-xs text-warn"
          >
            <WifiOff aria-hidden className="size-3" />
            <span className="hidden sm:inline">Hors ligne</span>
          </span>
        )}

        <nav aria-label="Navigation principale" className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const current = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? "page" : undefined}
                className={[
                  "flex min-h-11 items-center gap-2 rounded-[11px] px-3 text-sm font-medium",
                  "transition-colors duration-200 ease-expo",
                  current
                    ? "bg-surface-active text-fg"
                    : "text-muted hover:bg-surface-hover hover:text-fg",
                ].join(" ")}
              >
                <Icon aria-hidden className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <InstallButton />

        <button
          type="button"
          onClick={() => setAmbiance(isNight ? "ambre" : "nuit")}
          aria-label={
            isNight
              ? "Passer à l'ambiance ambre, sans lumière bleue"
              : "Passer à l'ambiance nuit"
          }
          title={isNight ? "Ambiance ambre" : "Ambiance nuit"}
          className="flex size-11 cursor-pointer items-center justify-center rounded-[11px] text-muted transition-colors duration-200 ease-expo hover:bg-surface-hover hover:text-fg"
        >
          {isNight ? (
            <Sunset aria-hidden className="size-4" />
          ) : (
            <Moon aria-hidden className="size-4" />
          )}
        </button>
      </div>
    </header>
  );
}
