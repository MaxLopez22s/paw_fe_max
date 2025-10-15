// sw.js - Versión mejorada con mejor manejo de cache
const APP_SHELL = "appShell_v1.2"; // Actualizado a v1.2
const DYNAMIC_CACHE = "dynamic_v1.2"; // Actualizado a v1.2

// Archivos del App Shell
const APP_SHELL_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/src/index.css",
  "/src/App.css",
  "/src/App.jsx",
  "/src/main.jsx",
  "/src/login.jsx",
  "/src/idb.js",
  "/src/styles/login.css",
  "/public/icons/ico1.ico",
  "/public/icons/ico2.ico",
  "/public/icons/ico3.ico",
  "/public/icons/ico4.ico",
  "/public/icons/ico5.ico"
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
        // NO forzar activación inmediata - esperar a que el usuario cierre las pestañas
        console.log('Service Worker instalado, esperando activación...');
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
      })
      // NO usar self.clients.claim() para evitar tomar control inmediato
    ]).then(() => {
      console.log('Service Worker activado y listo');
      // Notificar a las pestañas que hay una nueva versión disponible
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            message: 'Nueva versión disponible. Recarga la página para ver los cambios.'
          });
        });
      });
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

// Configuración para notificaciones push
const VAPID_PUBLIC_KEY = 'BLbz7pe2pc9pZnoILf5q43dkshGp9Z-UA6lKpkZtqVaFyasrLTTrJjeNbFFCOBCGtB2KtWRIO8c04O2dXAhwdvA';

// Manejar notificaciones push
self.addEventListener('push', event => {
  console.log('Push event recibido:', event);
  
  let notificationData = {
    title: 'Nueva notificación',
    body: 'Tienes un nuevo mensaje',
    icon: '/icons/ico1.ico',
    badge: '/icons/ico2.ico',
    tag: 'default-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Abrir',
        icon: '/icons/ico3.ico'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/ico4.ico'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  // Si hay datos en el evento push, usarlos
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (e) {
      console.error('Error al parsear datos push:', e);
      notificationData.body = event.data.text();
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationData
  );

  event.waitUntil(promiseChain);
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('Notificación clickeada:', event);
  
  event.notification.close();

  if (event.action === 'open') {
    // Abrir o enfocar la aplicación
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/');
        }
      })
    );
  } else if (event.action === 'close') {
    // Solo cerrar la notificación (ya se cerró arriba)
    console.log('Notificación cerrada');
  } else {
    // Click en la notificación misma (no en acción)
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Manejar cierre de notificaciones
self.addEventListener('notificationclose', event => {
  console.log('Notificación cerrada:', event);
  // Aquí puedes enviar analytics sobre notificaciones cerradas
});

// Escuchar mensajes desde la app
self.addEventListener('message', event => {
  // Manejar actualización manual del Service Worker
  if (event.data === 'skipWaiting') {
    console.log('Forzando activación del Service Worker...');
    self.skipWaiting();
  }
  
  // Manejar actualización con recarga automática
  if (event.data === 'updateAndReload') {
    console.log('Actualizando Service Worker y recargando página...');
    self.skipWaiting().then(() => {
      // Notificar a todas las pestañas para que se recarguen
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'RELOAD_PAGE' });
        });
      });
    });
  }
  
  // Manejar mensajes para mostrar notificaciones manuales
  if (event.data && event.data.type === 'show-notification') {
    const options = {
      body: event.data.body || 'Mensaje de prueba',
      icon: event.data.icon || '/icons/ico1.ico',
      badge: '/icons/ico2.ico',
      tag: event.data.tag || 'manual-notification',
      requireInteraction: true,
      data: {
        url: event.data.url || '/',
        timestamp: Date.now()
      }
    };
    self.registration.showNotification(event.data.title || 'Notificación', options);
  }
});