// idb.js - Versión mejorada
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pwa-posts', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        const store = db.createObjectStore('pending', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
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