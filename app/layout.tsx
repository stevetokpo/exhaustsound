import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Lora, Raleway } from "next/font/google";
import { Header } from "@/components/shell/Header";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  // Jamais de graisse 300 : sur fond sombre, les fûts fins de Raleway
  // se délitent et le contraste effectif chute sous le seuil AA.
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExhaustSound — Studio de fréquences",
  description:
    "Générateur de fréquences, battements binauraux, sons isochrones et lits de bruit pour la méditation et l'endormissement.",
  applicationName: "ExhaustSound",
  appleWebApp: {
    capable: true,
    title: "ExhaustSound",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Next émet le nom standardisé `mobile-web-app-capable`. Les versions
    // d'iOS antérieures à 16.4 ne lisent que l'ancien préfixe : sans lui,
    // l'icône ouvre Safari au lieu de lancer l'app en plein écran.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070c",
  // Indispensable pour que env(safe-area-inset-*) renvoie autre chose que 0.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

/** Applique l'ambiance enregistrée avant la première peinture. */
const AMBIANCE_SCRIPT = `try{var a=localStorage.getItem("exhaustsound:ambiance");if(a==="ambre"||a==="nuit"){document.documentElement.dataset.ambiance=a}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-ambiance="nuit"
      className={`${lora.variable} ${raleway.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: AMBIANCE_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#contenu"
          className="sr-only rounded-lg bg-elevated px-4 py-2 text-sm text-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Aller au contenu
        </a>
        <Header />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
