// idb.js - Versión mejorada con soporte para cache de API y suscripciones
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pwa-database', 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store para datos pendientes de sincronización
      if (!db.objectStoreNames.contains('pending')) {
        const store = db.createObjectStore('pending', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('endpoint', 'endpoint', { unique: false });
      }
      
      // Store para cache de respuestas de API
      if (!db.objectStoreNames.contains('apiCache')) {
        const cacheStore = db.createObjectStore('apiCache', { 
          keyPath: 'url' 
        });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        cacheStore.createIndex('endpoint', 'endpoint', { unique: false });
      }
      
      // Store para suscripciones push personalizadas
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

export const savePending = async (data) => {
  const db = await openDB();
  const tx = db.transaction('pending', 'readwrite');
  const store = tx.objectStore('pending');
  
  return new Promise((resolve, reject) => {
    const request = store.add({
      ...data,
      timestamp: Date.now()
    });
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllPending = async () => {
  const db = await openDB();
  const tx = db.transaction('pending', 'readonly');
  const store = tx.objectStore('pending');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const clearPending = async (id) => {
  const db = await openDB();
  const tx = db.transaction('pending', 'readwrite');
  const store = tx.objectStore('pending');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Funciones para cache de API
export const saveApiCache = async (url, data, endpoint = null) => {
  const db = await openDB();
  const tx = db.transaction('apiCache', 'readwrite');
  const store = tx.objectStore('apiCache');
  
  return new Promise((resolve, reject) => {
    const request = store.put({
      url,
      data,
      endpoint: endpoint || url,
      timestamp: Date.now()
    });
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getApiCache = async (url) => {
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
};

export const clearApiCache = async (url = null) => {
  const db = await openDB();
  const tx = db.transaction('apiCache', 'readwrite');
  const store = tx.objectStore('apiCache');
  
  return new Promise((resolve, reject) => {
    if (url) {
      const request = store.delete(url);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } else {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }
  });
};

// Funciones para suscripciones push personalizadas
export const saveSubscription = async (subscription, type = 'default', config = {}) => {
  const db = await openDB();
  const tx = db.transaction('subscriptions', 'readwrite');
  const store = tx.objectStore('subscriptions');
  
  // Verificar si ya existe una suscripción con el mismo endpoint
  const existing = await new Promise((resolve) => {
    const index = store.index('endpoint');
    const request = index.get(subscription.endpoint);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  
  const subscriptionData = {
    subscription: subscription.toJSON ? subscription.toJSON() : subscription,
    type,
    config: {
      title: config.title || 'Notificación',
      icon: config.icon || '/icons/ico1.ico',
      badge: config.badge || '/icons/ico2.ico',
      sound: config.sound || false,
      vibrate: config.vibrate || [200, 100, 200],
      requireInteraction: config.requireInteraction || false,
      ...config
    },
    active: true,
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now()
  };
  
  return new Promise((resolve, reject) => {
    const request = existing 
      ? store.put({ ...subscriptionData, id: existing.id })
      : store.add(subscriptionData);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getSubscriptions = async (type = null, activeOnly = true) => {
  const db = await openDB();
  const tx = db.transaction('subscriptions', 'readonly');
  const store = tx.objectStore('subscriptions');
  
  return new Promise((resolve, reject) => {
    let request;
    
    if (type) {
      const index = store.index('type');
      request = index.getAll(type);
    } else {
      request = store.getAll();
    }
    
    request.onsuccess = () => {
      let results = request.result;
      if (activeOnly) {
        results = results.filter(sub => sub.active);
      }
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deactivateSubscription = async (id) => {
  const db = await openDB();
  const tx = db.transaction('subscriptions', 'readwrite');
  const store = tx.objectStore('subscriptions');
  
  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const sub = getRequest.result;
      if (sub) {
        sub.active = false;
        sub.updatedAt = Date.now();
        const updateRequest = store.put(sub);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};