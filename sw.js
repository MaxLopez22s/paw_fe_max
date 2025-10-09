// sw.js - Versión mejorada con mejor manejo de cache
const APP_SHELL = "appShell_v1.1"; // Cambiado a v1.1
const DYNAMIC_CACHE = "dynamic_v1.1"; // Cambiado a v1.1

// Archivos del App Shell
const APP_SHELL_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/src/index.css",
  "/src/App.css",
  "/src/App.jsx",
  "/src/main.jsx",
  "/src/Login.jsx",
  "/src/idb.js",
  "/src/styles/login.css"
];

self.addEventListener('install', event => {
  console.log('Service Worker instalando...');
  event.waitUntil(
    caches.open(APP_SHELL)
      .then(cache => {
        console.log('Cache abierta, agregando archivos...');
        return cache.addAll(APP_SHELL_FILES);
      })
      .then(() => {
        console.log('Todos los archivos cacheados');
        return self.skipWaiting(); // Fuerza activación inmediata
      })
      .catch(error => {
        console.error('Error en install:', error);
      })
  );
});

self.addEventListener("activate", event => {
  console.log('Service Worker activando...');
  event.waitUntil(
    Promise.all([
      // Limpiar caches viejas
      caches.keys().then(keys => {
        return Promise.all(
          keys.map(key => {
            if (key !== APP_SHELL && key !== DYNAMIC_CACHE) {
              console.log('Eliminando cache vieja:', key);
              return caches.delete(key);
            }
          })
        );
      }),
      // Tomar control inmediato de todas las pestañas
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker activado y listo');
    })
  );
});

self.addEventListener("fetch", event => {
  // Solo cachear GET requests
  if (event.request.method !== "GET") return;

  // Para requests de la API, siempre ir a la red primero
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          return networkResponse;
        })
        .catch(error => {
          console.log('Error en API request:', error);
          throw error;
        })
    );
    return;
  }

  // Para recursos estáticos, usar estrategia Cache First
  event.respondWith(
    caches.match(event.request).then(cacheResponse => {
      if (cacheResponse) {
        console.log('Sirviendo desde cache:', event.request.url);
        return cacheResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {
          // Solo cachear responses válidas
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clonar la response para cachear
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Fallback para HTML requests
          if (event.request.destination === 'document') {
            return caches.match("/index.html");
          }
          return new Response('Offline', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        });
    })
  );
});

// Función para abrir IndexedDB en el Service Worker
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pwa-posts', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Función helper para obtener todos los registros pendientes
const getAllPending = (db) => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readonly');
    const store = tx.objectStore('pending');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Función helper para eliminar registro
const deletePending = (db, id) => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readwrite');
    const store = tx.objectStore('pending');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-posts') {
    console.log('Background Sync activado para sync-posts');
    
    event.waitUntil(
      (async () => {
        try {
          const db = await openDB();
          const allRecords = await getAllPending(db);
          
          console.log(`Reintentando ${allRecords.length} registros pendientes`);

          for (const record of allRecords) {
            try {
              const response = await fetch('/api/datos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
              });

              if (response.ok) {
                // Eliminar del IndexedDB si se subió correctamente
                await deletePending(db, record.id);
                console.log(`Registro ${record.id} sincronizado exitosamente`);
              } else {
                console.log(`Registro ${record.id} aún falla, manteniendo en DB`);
              }
            } catch (err) {
              console.error('Error al reenviar registro:', err);
            }
          }
        } catch (error) {
          console.error('Error en sync:', error);
        }
      })()
    );
  }
});

// Escuchar mensajes desde la app para forzar actualización
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});