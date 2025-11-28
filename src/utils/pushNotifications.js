// Utilidad para gestionar notificaciones push personalizadas
import { saveSubscription, getSubscriptions, deactivateSubscription } from '../idb';
import { postWithSync } from './apiWithSync';

const VAPID_PUBLIC_KEY = 'BLbz7pe2pc9pZnoILf5q43dkshGp9Z-UA6lKpkZtqVaFyasrLTTrJjeNbFFCOBCGtB2KtWRIO8c04O2dXAhwdvA';

// Convertir VAPID key a Uint8Array
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

// Solicitar permisos de notificación
export const requestNotificationPermission = async () => {
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

// Suscribirse a un tipo específico de notificación
export const subscribeToNotificationType = async (type, configData = {}) => {
  try {
    if (!('serviceWorker' in navigator) || !('pushManager' in navigator.serviceWorker.registration)) {
      throw new Error('Service Worker o Push Manager no disponible');
    }

    const registration = await navigator.serviceWorker.ready;
    
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

    // Guardar en IndexedDB
    await saveSubscription(subscription, type, configData);

    // Enviar al servidor
    await sendSubscriptionToServer(subscription, type, configData);

    return subscription;
  } catch (error) {
    console.error(`Error suscribiéndose a ${type}:`, error);
    throw error;
  }
};

// Desuscribirse de un tipo de notificación
export const unsubscribeFromNotificationType = async (type) => {
  try {
    const subscriptions = await getSubscriptions(type, true);
    const userId = localStorage.getItem('userId');
    
    for (const sub of subscriptions) {
      // Desactivar en IndexedDB
      await deactivateSubscription(sub.id);
      
      // Intentar desuscribirse del push manager
      try {
        const registration = await navigator.serviceWorker.ready;
        const pushSubscription = await registration.pushManager.getSubscription();
        if (pushSubscription && pushSubscription.endpoint === sub.subscription.endpoint) {
          await pushSubscription.unsubscribe();
        }
      } catch (error) {
        console.error('Error desuscribiéndose del push manager:', error);
      }
      
      // Notificar al servidor
      try {
        const response = await fetch(`${config.API_URL}/api/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            endpoint: sub.subscription.endpoint,
            type,
            userId
          })
        });
        
        if (!response.ok) {
          console.error('Error en respuesta del servidor al desuscribirse');
        }
      } catch (error) {
        console.error('Error notificando al servidor:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error desuscribiéndose de ${type}:`, error);
    throw error;
  }
};

// Obtener todas las suscripciones activas
export const getActiveSubscriptions = async () => {
  return await getSubscriptions(null, true);
};

// Obtener suscripciones de un tipo específico
export const getSubscriptionsByType = async (type) => {
  return await getSubscriptions(type, true);
};

// Enviar suscripción al servidor
const sendSubscriptionToServer = async (subscription, type, configData) => {
  try {
    const response = await postWithSync('/api/subscribe', {
      subscription: subscription.toJSON ? subscription.toJSON() : subscription,
      type,
      config
    });

    if (!response.ok) {
      throw new Error('Error al enviar suscripción al servidor');
    }

    console.log(`Suscripción ${type} enviada al servidor exitosamente`);
  } catch (error) {
    console.error('Error al enviar suscripción:', error);
    // La suscripción se guardará automáticamente en IndexedDB para sincronización posterior
    throw error;
  }
};

// Tipos de notificaciones predefinidos
export const NOTIFICATION_TYPES = {
  DEFAULT: 'default',
  ALERTS: 'alerts',
  MESSAGES: 'messages',
  UPDATES: 'updates',
  PROMOTIONS: 'promotions'
};

// Configuraciones predefinidas para cada tipo
export const NOTIFICATION_CONFIGS = {
  [NOTIFICATION_TYPES.DEFAULT]: {
    title: 'Notificación General',
    icon: '/icons/ico1.ico',
    badge: '/icons/ico2.ico',
    requireInteraction: false
  },
  [NOTIFICATION_TYPES.ALERTS]: {
    title: 'Alerta Importante',
    icon: '/icons/ico3.ico',
    badge: '/icons/ico2.ico',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200]
  },
  [NOTIFICATION_TYPES.MESSAGES]: {
    title: 'Nuevo Mensaje',
    icon: '/icons/ico4.ico',
    badge: '/icons/ico2.ico',
    requireInteraction: false
  },
  [NOTIFICATION_TYPES.UPDATES]: {
    title: 'Actualización',
    icon: '/icons/ico5.ico',
    badge: '/icons/ico2.ico',
    requireInteraction: false
  },
  [NOTIFICATION_TYPES.PROMOTIONS]: {
    title: 'Oferta Especial',
    icon: '/icons/ico1.ico',
    badge: '/icons/ico2.ico',
    requireInteraction: false
  }
};




