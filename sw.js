// sw.js - Versión mejorada con mejor manejo de cache, offline y notificaciones personalizadas
const APP_SHELL = "appShell_v1.7"; // Actualizado a v1.7 (Suscripciones múltiples y notificaciones mejoradas)
const DYNAMIC_CACHE = "dynamic_v1.7"; // Actualizado a v1.7
const API_CACHE = "apiCache_v1.7"; // Cache específico para API
const API_URL = 'https://pwa-be-max.onrender.com'; // URL del backend

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
  "/src/utils/pushNotifications.js",
  "/src/styles/login.css",
  "/src/components/AdminUsers.jsx",
  "/src/components/AdminUsers.css",
  "/src/components/AdminNotifications.jsx",
  "/src/components/AdminNotifications.css",
  "/src/components/Settings.jsx",
  "/src/components/Settings.css",
  "/src/components/Notifications.jsx",
  "/src/components/Notifications.css",
  "/icons/ico1.ico",
  "/icons/ico2.ico",
  "/icons/ico3.ico",
  "/icons/ico4.ico",
  "/icons/ico5.ico"
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
            if (key !== APP_SHELL && key !== DYNAMIC_CACHE && key !== API_CACHE) {
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

  // Para requests de la API, usar estrategia Network First con fallback a cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      (async () => {
        try {
          // Intentar red primero
          const networkResponse = await fetch(event.request);
          
          // Si la respuesta es válida, cachearla
          if (networkResponse && networkResponse.status === 200) {
            const clonedResponse = networkResponse.clone();
            const cache = await caches.open(API_CACHE);
            cache.put(event.request, clonedResponse);
            
            // También guardar en IndexedDB para acceso rápido
            try {
              const data = await clonedResponse.json();
              await saveApiResponseToDB(event.request.url, data);
            } catch (e) {
              // Si no es JSON, no importa
            }
          }
          
          return networkResponse;
        } catch (error) {
          console.log('Error en API request, intentando cache:', error);
          
          // Intentar desde cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            console.log('Sirviendo API desde cache:', event.request.url);
            return cachedResponse;
          }
          
          // Intentar desde IndexedDB
          try {
            const dbData = await getApiResponseFromDB(event.request.url);
            if (dbData) {
              console.log('Sirviendo API desde IndexedDB:', event.request.url);
              return new Response(JSON.stringify(dbData), {
                headers: { 'Content-Type': 'application/json' }
              });
            }
          } catch (dbError) {
            console.error('Error accediendo IndexedDB:', dbError);
          }
          
          // Si todo falla, devolver error offline
          return new Response(JSON.stringify({ 
            error: 'Offline', 
            message: 'No hay conexión y no hay datos en cache' 
          }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })()
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
    const request = indexedDB.open('pwa-database', 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store para datos pendientes
      if (!db.objectStoreNames.contains('pending')) {
        const store = db.createObjectStore('pending', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('endpoint', 'endpoint', { unique: false });
      }
      
      // Store para cache de API
      if (!db.objectStoreNames.contains('apiCache')) {
        const cacheStore = db.createObjectStore('apiCache', { 
          keyPath: 'url' 
        });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        cacheStore.createIndex('endpoint', 'endpoint', { unique: false });
      }
      
      // Store para suscripciones
      if (!db.objectStoreNames.contains('subscriptions')) {
        const subStore = db.createObjectStore('subscriptions', { 
          keyPath: 'id',
          autoIncrement: true
        });
        subStore.createIndex('type', 'type', { unique: false });
        subStore.createIndex('endpoint', 'endpoint', { unique: true });
        subStore.createIndex('active', 'active', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Funciones helper para cache de API en IndexedDB
const saveApiResponseToDB = async (url, data) => {
  try {
    const db = await openDB();
    const tx = db.transaction('apiCache', 'readwrite');
    const store = tx.objectStore('apiCache');
    await new Promise((resolve, reject) => {
      const request = store.put({
        url,
        data,
        endpoint: url.split('/api/')[1] || url,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error guardando en IndexedDB:', error);
  }
};

const getApiResponseFromDB = async (url) => {
  try {
    const db = await openDB();
    const tx = db.transaction('apiCache', 'readonly');
    const store = tx.objectStore('apiCache');
    return new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => {
        const result = request.result;
        // Cache válido por 5 minutos
        if (result && Date.now() - result.timestamp < 5 * 60 * 1000) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error leyendo de IndexedDB:', error);
    return null;
  }
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
              const response = await fetch(`${API_URL}/api/datos`, {
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

// Manejar notificaciones push personalizadas
self.addEventListener('push', event => {
  console.log('Push event recibido:', event);
  
  event.waitUntil(
    (async () => {
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
          timestamp: Date.now(),
          subscriptionType: 'default'
        }
      };

      // Si hay datos en el evento push, usarlos
      if (event.data) {
        try {
          const pushData = event.data.json();
          
          // Determinar el tipo de suscripción desde los datos
          const subscriptionType = pushData.subscriptionType || pushData.type || 'default';
          
          // Obtener configuración personalizada de la suscripción desde IndexedDB
          try {
            const db = await openDB();
            const tx = db.transaction('subscriptions', 'readonly');
            const store = tx.objectStore('subscriptions');
            const index = store.index('type');
            
            const subscriptionRequest = index.getAll(subscriptionType);
            const subscriptions = await new Promise((resolve, reject) => {
              subscriptionRequest.onsuccess = () => resolve(subscriptionRequest.result.filter(s => s.active));
              subscriptionRequest.onerror = () => reject(subscriptionRequest.error);
            });
            
            // Si hay suscripciones activas de este tipo, usar su configuración
            if (subscriptions.length > 0) {
              const subConfig = subscriptions[0].config;
              notificationData = {
                ...notificationData,
                title: pushData.title || subConfig.title || notificationData.title,
                body: pushData.body || notificationData.body,
                icon: pushData.icon || subConfig.icon || notificationData.icon,
                badge: pushData.badge || subConfig.badge || notificationData.badge,
                requireInteraction: pushData.requireInteraction !== undefined 
                  ? pushData.requireInteraction 
                  : subConfig.requireInteraction || notificationData.requireInteraction,
                vibrate: pushData.vibrate || subConfig.vibrate || notificationData.vibrate,
                tag: pushData.tag || subscriptionType,
                data: {
                  ...notificationData.data,
                  ...pushData.data,
                  subscriptionType
                }
              };
            } else {
              // Usar datos del push directamente
              notificationData = { ...notificationData, ...pushData };
            }
          } catch (dbError) {
            console.error('Error accediendo suscripciones:', dbError);
            // Fallback a datos del push
            notificationData = { ...notificationData, ...pushData };
          }
        } catch (e) {
          console.error('Error al parsear datos push:', e);
          notificationData.body = event.data.text();
        }
      }

      await self.registration.showNotification(
        notificationData.title,
        notificationData
      );
    })()
  );
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