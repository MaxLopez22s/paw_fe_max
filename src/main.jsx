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

// Función para suscribirse a notificaciones push con tipo personalizado
const subscribeToPush = async (registration, type = 'default', configData = {}) => {
  try {
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

    await saveSubscription(subscription, type, configData);

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
    const userId = localStorage.getItem('userId');
    const response = await fetch(`${config.API_URL}/api/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON ? subscription.toJSON() : subscription,
        type,
        config: configData,
        userId
      })
    });

    if (!response.ok) {
      throw new Error('Error al enviar suscripción al servidor');
    }

    console.log('Suscripción enviada al servidor exitosamente');
  } catch (error) {
    console.error('Error al enviar suscripción:', error);
  }
};

// Función para solicitar permisos de notificación
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones');
    return false;
  }

  if (Notification.permission === 'granted') return true;

  if (Notification.permission === 'denied') {
    console.log('Permisos de notificación denegados');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Registro del Service Worker con manejo de notificaciones push
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(async (registration) => {
      console.log('Service Worker registrado correctamente');

      const hasPermission = await requestNotificationPermission();

      // NO crear suscripción automáticamente
      if (hasPermission && 'pushManager' in registration) {
        console.log('Service Worker listo para notificaciones push. Usa Settings para suscribirte.');
      }

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SW_UPDATED') {
          showUpdateNotification(event.data.message);
        }

        if (event.data.type === 'RELOAD_PAGE') {
          window.location.reload();
        }
      });

      registration.addEventListener('updatefound', () => {
        console.log('Nueva versión del Service Worker encontrada');
        const newWorker = registration.installing;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotification('Nueva versión disponible. ¿Quieres actualizar ahora?');
          }
        });
      });
    })
    .catch(err => console.error('Error al registrar el Service Worker:', err));
}

const showUpdateNotification = (message) => {
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
  `;

  notification.innerHTML = `
    <strong>🔄 Actualización Disponible</strong><br>${message}
  `;

  document.body.appendChild(notification);

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
