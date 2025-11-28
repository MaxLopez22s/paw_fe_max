// Gestor de caché para limpieza automática y manual
const CURRENT_VERSION = 'v2.0';

/**
 * Limpia todas las cachés viejas (excepto las de la versión actual)
 */
export const cleanOldCaches = async () => {
  try {
    if (!('caches' in window)) {
      console.warn('Cache API no disponible');
      return { cleaned: 0, error: 'Cache API no disponible' };
    }

    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name => !name.includes(CURRENT_VERSION));
    
    if (oldCaches.length === 0) {
      console.log('✅ No hay cachés viejas que limpiar');
      return { cleaned: 0, message: 'No hay cachés viejas' };
    }

    await Promise.all(
      oldCaches.map(name => {
        console.log(`🗑️ Eliminando caché vieja: ${name}`);
        return caches.delete(name);
      })
    );

    console.log(`✅ ${oldCaches.length} cachés viejas eliminadas`);
    return { cleaned: oldCaches.length, cleanedNames: oldCaches };
  } catch (error) {
    console.error('Error limpiando cachés viejas:', error);
    return { cleaned: 0, error: error.message };
  }
};

/**
 * Limpia todas las cachés (incluyendo las actuales)
 */
export const clearAllCaches = async () => {
  try {
    if (!('caches' in window)) {
      console.warn('Cache API no disponible');
      return { cleaned: 0, error: 'Cache API no disponible' };
    }

    const cacheNames = await caches.keys();
    
    await Promise.all(
      cacheNames.map(name => {
        console.log(`🗑️ Eliminando caché: ${name}`);
        return caches.delete(name);
      })
    );

    console.log(`✅ ${cacheNames.length} cachés eliminadas`);
    return { cleaned: cacheNames.length, cleanedNames: cacheNames };
  } catch (error) {
    console.error('Error limpiando todas las cachés:', error);
    return { cleaned: 0, error: error.message };
  }
};

/**
 * Verifica y limpia cachés automáticamente al iniciar
 */
export const autoCleanCache = async () => {
  try {
    // Obtener versión de caché guardada
    const savedVersion = localStorage.getItem('sw_cache_version');
    
    // Si la versión cambió o no existe, limpiar cachés viejas
    if (savedVersion !== CURRENT_VERSION) {
      console.log(`🔄 Versión cambió de ${savedVersion || 'ninguna'} a ${CURRENT_VERSION}. Limpiando cachés...`);
      await cleanOldCaches();
      localStorage.setItem('sw_cache_version', CURRENT_VERSION);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error en autoCleanCache:', error);
    return false;
  }
};

/**
 * Limpia caché y recarga la página
 */
export const clearCacheAndReload = async () => {
  try {
    await clearAllCaches();
    sessionStorage.clear();
    
    // Forzar actualización del Service Worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    }
    
    // Recargar después de un breve delay
    setTimeout(() => {
      window.location.reload(true);
    }, 500);
    
    return true;
  } catch (error) {
    console.error('Error en clearCacheAndReload:', error);
    return false;
  }
};

// Ejecutar limpieza automática al cargar el módulo (solo en cliente)
if (typeof window !== 'undefined') {
  // Limpiar cachés viejas después de un pequeño delay
  setTimeout(() => {
    autoCleanCache();
  }, 1000);
}

