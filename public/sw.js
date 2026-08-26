/**
 * Service worker d'ExhaustSound.
 *
 * Deux objectifs distincts :
 *
 *  1. Le studio de fréquences fonctionne entièrement dans le navigateur.
 *     Une fois la coquille en cache, il tourne sans réseau du tout.
 *  2. Les pistes marquées « hors ligne » sont servies depuis le cache,
 *     ce qui supprime à la fois la dépendance au réseau et le coût de
 *     bande passante d'une écoute répétée.
 *
 * Note : les fragments JavaScript de Next portent un nom haché, inconnu à
 * l'écriture de ce fichier. Ils sont donc mis en cache à l'usage, et non
 * pré-chargés : l'application devient utilisable hors ligne après une
 * première visite connectée.
 */

const VERSION = "1";
const SHELL_CACHE = `exhaustsound-shell-v${VERSION}`;
const ASSET_CACHE = `exhaustsound-assets-v${VERSION}`;
/** Non versionné : les pistes téléchargées survivent aux mises à jour. */
const AUDIO_CACHE = "exhaustsound-audio";

const KEEP = new Set([SHELL_CACHE, ASSET_CACHE, AUDIO_CACHE]);
const SHELL_URLS = ["/", "/bibliotheque", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Tolérant à l'échec : une route indisponible ne doit pas empêcher
      // l'installation du service worker.
      await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("exhaustsound-") && !KEEP.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.hostname.endsWith("res.cloudinary.com")) {
    event.respondWith(serveAudio(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // La liste des pistes doit rester fraîche : jamais de cache dessus.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(serveNavigation(request));
    return;
  }

  // Les fragments de Next portent un hachage dans leur nom : leur contenu
  // ne change jamais pour une URL donnée.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
});

async function serveNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const root = await cache.match("/");
    if (root) return root;
    const offline = await cache.match("/offline");
    if (offline) return offline;
    return new Response("Hors ligne", { status: 503, statusText: "Hors ligne" });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("", { status: 504, statusText: "Ressource indisponible" });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const response = await network;
  return response ?? new Response("", { status: 504, statusText: "Ressource indisponible" });
}

/**
 * Sert une piste depuis le cache si elle y a été déposée par la page.
 * Un élément <audio> demande le contenu par tranches (en-tête `Range`) ;
 * la Cache API ne stockant que des réponses complètes, la tranche est
 * découpée ici et renvoyée en 206.
 */
async function serveAudio(request) {
  const cache = await caches.open(AUDIO_CACHE);
  // Correspondance par URL : l'en-tête Range ne doit pas influer sur la clé.
  const cached = await cache.match(request.url);
  if (!cached) return fetch(request);

  const range = request.headers.get("range");
  if (!range) return cached;

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) return cached;

  const buffer = await cached.arrayBuffer();
  const size = buffer.byteLength;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;

  if (Number.isNaN(start) || start >= size || start > end) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }

  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": cached.headers.get("Content-Type") ?? "audio/mpeg",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
    },
  });
}
