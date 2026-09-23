/** Powell Remito — service worker — v1 — 2026-09-23 */
// QUÉ HACE: deja la app del remito abriendo SIN SEÑAL cuando está instalada en un
//   celular (PWA). Solo se registra bajo https; en la tablet (file:///) no existe.
// ESTRATEGIA: network-first para los GET del MISMO origen (la app y sus íconos):
//   con señal siempre baja la versión nueva, sin señal sirve la última guardada.
//   Todo lo demás (el POST al sync de GAS, el catálogo) NO pasa por acá: la cola
//   offline de la app ya maneja eso, y cachear respuestas del ERP sería guardar
//   datos en un lugar que nadie limpia.
// EN CADA RELEASE DE LA APP: subir CACHE_VERSION (regla del CLAUDE.md).
const CACHE_VERSION = 'remito-v33';
const PRECACHE = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

// Instalación: guarda el esqueleto para el primer arranque sin señal.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

// Activación: borra los caches de versiones viejas.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: solo GET del mismo origen. Red primero, cache si no hay red.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copia));
        return resp;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./')))
  );
});
