import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import config from './config'

// Configuración VAPID
const VAPID_PUBLIC_KEY = 'BLbz7pe2pc9pZnoILf5q43dkshGp9Z-UA6lKpkZtqVaFyasrLTTrJjeNbFFCOBCGtB2KtWRIO8c04O2dXAhwdvA';

// Función para convertir VAPID key a Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Importar funciones de IndexedDB
import { saveSubscription, getSubscriptions } from './idb';
import { postWithSync } from './utils/apiWithSync';
import { autoCleanCache } from './utils/cacheManager';

// Función para suscribirse a notificaciones push con tipo personalizado
const subscribeToPush = async (registration, type = 'default', configData = {}) => {
  try {
    // Verificar si ya existe una suscripción activa de este tipo
    const existingSubs = await getSubscriptions(type, true);
    if (existingSubs.length > 0) {
      console.log(`Ya existe una suscripción activa de tipo: ${type}`);
      return existingSubs[0];
    }
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('Suscripción push exitosa:', subscription.toJSON());
    
    // Guardar en IndexedDB con tipo y configuración
    await saveSubscription(subscription, type, configData);
    
    // Enviar la suscripción al servidor con información del tipo
    await sendSubscriptionToServer(subscription, type, configData);
    
    return subscription;
  } catch (error) {
    console.error('Error al suscribirse a push:', error);
    throw error;
  }
};

// Función para enviar la suscripción al servidor con tipo y configuración
const sendSubscriptionToServer = async (subscription, type = 'default', configData = {}) => {
  try {
    const response = await postWithSync('/api/subscribe', {
      subscription: subscription.toJSON ? subscription.toJSON() : subscription,
      type,
      config: configData
    });

    if (!response.ok) {
      throw new Error('Error al enviar suscripción al servidor');
    }

    console.log('Suscripción enviada al servidor exitosamente');
  } catch (error) {
    // Verificar si es un error de conexión
    const errorMessage = error.message || '';
    if (
      errorMessage.includes('Sin conexión') || 
      errorMessage.includes('sincronización') ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError') ||
      !navigator.onLine
    ) {
      console.log('⚠️ Sin conexión. La suscripción se guardó localmente y se sincronizará automáticamente cuando se recupere la conexión.');
    } else {
      console.error('Error al enviar suscripción:', error);
    }
    // La suscripción se guardará automáticamente en IndexedDB para sincronización posterior
  }
};

// Función para solicitar permisos de notificación
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('Permisos de notificación denegados');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Limpieza automática de caché al iniciar
autoCleanCache().then(cleaned => {
  if (cleaned) {
    console.log('✅ Cachés viejas limpiadas automáticamente');
  }
});

// Registro del Service Worker con manejo de notificaciones push
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(async (registration) => {
      console.log('Service Worker registrado correctamente');

      // Solicitar permisos de notificación
      const hasPermission = await requestNotificationPermission();
      
      // No crear suscripción automáticamente - el usuario debe hacerlo manualmente desde Settings
      // Esto evita problemas con suscripciones no deseadas
      if (hasPermission && 'pushManager' in registration) {
        console.log('Service Worker listo para notificaciones push. Usa Settings para suscribirte.');
      }

      // Escuchar mensajes del Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SW_UPDATED') {
          console.log('Nueva versión del Service Worker disponible');
          // Si shouldReload es true, limpiar cachés y recargar
          if (event.data.shouldReload) {
            // Limpiar cachés antes de recargar
            if ('caches' in window) {
              caches.keys().then(names => {
              names.forEach(name => {
                if (!name.includes('v2.0')) { // Mantener solo las cachés actuales
                  caches.delete(name);
                }
              });
              });
            }
          }
          showUpdateNotification(event.data.message);
        }
        
        if (event.data.type === 'RELOAD_PAGE') {
          console.log('Recargando página por actualización del Service Worker');
          window.location.reload(true); // Forzar recarga desde servidor
        }
      });

      // Verificar si hay actualizaciones pendientes
      registration.addEventListener('updatefound', () => {
        console.log('Nueva versión del Service Worker encontrada');
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('Nueva versión instalada, lista para activar');
            showUpdateNotification('Nueva versión disponible. ¿Quieres actualizar ahora?');
          }
        });
      });
    })
    .catch(err => console.error('Error al registrar el Service Worker:', err));
}

// Función para mostrar notificación de actualización
const showUpdateNotification = (message) => {
  // Crear un elemento de notificación en la página
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    max-width: 300px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 0.9rem;
    line-height: 1.4;
  `;

  notification.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">🔄 Actualización Disponible</div>
        <div>${message}</div>
      </div>
      <button id="close-update-notification" style="
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      ">×</button>
    </div>
    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
      <button id="update-now" style="
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        transition: background 0.2s ease;
      ">Actualizar Ahora</button>
      <button id="update-later" style="
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.8rem;
        transition: background 0.2s ease;
      ">Más Tarde</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Event listeners para los botones
  document.getElementById('close-update-notification').onclick = () => {
    document.body.removeChild(notification);
  };

  document.getElementById('update-now').onclick = async () => {
    // Limpiar cachés antes de actualizar
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
        cacheNames.map(name => {
          if (!name.includes('v2.0')) { // Mantener solo las cachés actuales
            return caches.delete(name);
          }
        })
        );
        console.log('Cachés limpiadas antes de actualizar');
      } catch (error) {
        console.error('Error limpiando cachés:', error);
      }
    }
    
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('updateAndReload');
    }
    document.body.removeChild(notification);
  };

  document.getElementById('update-later').onclick = () => {
    document.body.removeChild(notification);
  };

  // Auto-ocultar después de 10 segundos
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 10000);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
