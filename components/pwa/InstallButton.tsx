"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { useClientFlag } from "@/lib/hooks/useClientFlag";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STANDALONE_QUERY = "(display-mode: standalone)";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ se présente comme un Mac, mais reste tactile.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const installed = useClientFlag(isStandalone);
  const ios = useClientFlag(isIosSafari);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Sans preventDefault, Chrome affiche sa propre bannière et l'événement
      // n'est plus rejouable au moment choisi.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showIosHelp) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowIosHelp(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setShowIosHelp(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onClickOutside);
    };
  }, [showIosHelp]);

  if (installed) return null;
  // iOS ne déclenche jamais `beforeinstallprompt` : l'ajout à l'écran
  // d'accueil y passe obligatoirement par le menu de partage.
  if (!deferred && !ios) return null;

  const buttonClass =
    "flex min-h-11 cursor-pointer items-center gap-2 rounded-[11px] px-3 text-sm font-medium text-muted transition-colors duration-200 ease-expo hover:bg-surface-hover hover:text-fg";

  if (ios && !deferred) {
    return (
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => setShowIosHelp((v) => !v)}
          aria-expanded={showIosHelp}
          className={buttonClass}
        >
          <Download aria-hidden className="size-4" />
          <span className="hidden sm:inline">Installer</span>
        </button>

        {showIosHelp && (
          <div
            role="dialog"
            aria-label="Installer sur iPhone ou iPad"
            className="panel absolute right-0 top-full z-40 mt-2 w-72 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-fg">Ajouter à l&apos;écran d&apos;accueil</p>
              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                aria-label="Fermer"
                className="-mr-1 -mt-1 flex size-8 cursor-pointer items-center justify-center rounded-full text-faint hover:text-fg"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              <li className="flex items-center gap-2">
                <Share aria-hidden className="size-4 shrink-0 text-accent-hi" />
                <span>Touchez le bouton Partager, en bas de Safari.</span>
              </li>
              <li className="flex items-center gap-2">
                <SquarePlus aria-hidden className="size-4 shrink-0 text-accent-hi" />
                <span>Choisissez « Sur l&apos;écran d&apos;accueil ».</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        const event = deferred;
        if (!event) return;
        setDeferred(null); // un événement d'installation ne se rejoue pas
        await event.prompt();
        await event.userChoice;
      }}
      className={buttonClass}
    >
      <Download aria-hidden className="size-4" />
      <span className="hidden sm:inline">Installer</span>
    </button>
  );
}
