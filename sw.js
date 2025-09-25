self.addEventListener('install',event=>{
    caches.open("appShell_v1.0")
    .then(cache=>{
        cache.addAll([
            "/src/index.css",
            "/src/App.jsx",
            "/src/App.css",
            "/",                
            "/index.html",
            "/manifest.json",
        ]);
    });
    self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== APP_SHELL && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim(); // activa el SW inmediatamente
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cacheResponse => {
      // Si hay cache, lo devuelve
      if (cacheResponse) {
        return cacheResponse;
      }

      // Si no hay cache, va a la red
      return fetch(event.request)
        .then(networkResponse => {
          // Guardar dinámicamente si es válido
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Si falla la red y no hay cache → devuelve fallback
          return caches.match("/index.html");
        });
    })
  );
});
/*self.addEventListener('sync',event=>{});
self.addEventListener('push',event=>{});*/

const APP_SHELL = "appShell_v1.0";
const DYNAMIC_CACHE = "dynamic_v1.0";

// Archivos del App Shell (fijos)
const APP_SHELL_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/src/index.css",
  "/src/App.css",
  "/src/App.jsx"
];