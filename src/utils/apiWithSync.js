// Utilidad para manejar peticiones POST con sincronización offline
import { savePending } from '../idb';
import config from '../config';

// Función para normalizar URLs (convertir relativas a absolutas)
const normalizeUrl = (url) => {
  // Si ya es una URL completa, devolverla tal cual
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Si empieza con /api/, construir URL completa
  if (url.startsWith('/api/')) {
    return `${config.API_URL}${url}`;
  }
  // Si no empieza con /, agregarlo
  if (!url.startsWith('/')) {
    return `${config.API_URL}/api/${url}`;
  }
  // URL relativa con /
  return `${config.API_URL}${url}`;
};

/**
 * Realiza una petición POST con soporte offline.
 * Si la petición falla, guarda los datos en IndexedDB y registra una tarea de background sync.
 * 
 * @param {string} url - URL del endpoint
 * @param {Object} options - Opciones de fetch (body, headers, etc.)
 * @returns {Promise<Response>} - Respuesta de la petición
 */
export const fetchWithSync = async (url, options = {}) => {
  const {
    body,
    headers = {},
    ...fetchOptions
  } = options;

  // Normalizar URL a absoluta
  const fullUrl = normalizeUrl(url);

  // Asegurar que Content-Type esté presente si hay body
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  try {
    // Intentar hacer la petición
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      method: 'POST',
      headers: requestHeaders,
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });

    // Si la petición fue exitosa, retornar la respuesta
    if (response.ok) {
      return response;
    }

    // Si la respuesta no es ok, también intentar guardar (por si es un error del servidor)
    // pero solo si es un error 5xx o si no hay conexión
    if (response.status >= 500 || !navigator.onLine) {
      await savePendingRequest(fullUrl, body, requestHeaders);
      throw new Error(`Error del servidor: ${response.status}`);
    }

    // Para errores 4xx (del cliente), no guardar, solo lanzar error
    throw new Error(`Error: ${response.status} - ${response.statusText}`);
  } catch (error) {
    // Si el error es porque no hay conexión
    if (!navigator.onLine) {
      await savePendingRequest(fullUrl, body, requestHeaders);
      throw new Error('Sin conexión. Los datos se sincronizarán automáticamente cuando se recupere la conexión.');
    }

    // Si es un error de red o conexión, guardar para sincronización posterior
    if (
      error instanceof TypeError && 
      (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed'))
    ) {
      await savePendingRequest(fullUrl, body, requestHeaders);
      throw new Error('Sin conexión. Los datos se sincronizarán automáticamente cuando se recupere la conexión.');
    }

    // Re-lanzar el error si no es de conexión
    throw error;
  }
};

/**
 * Guarda una petición fallida en IndexedDB y registra una tarea de background sync
 */
const savePendingRequest = async (url, body, headers) => {
  try {
    // Asegurar que la URL sea absoluta
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `${config.API_URL}${url.startsWith('/') ? url : '/' + url}`;
    
    // Guardar en IndexedDB
    const pendingData = {
      url: fullUrl,
      body: typeof body === 'string' ? JSON.parse(body) : body,
      headers,
      method: 'POST',
      timestamp: Date.now(),
      endpoint: fullUrl.replace(/.*\/api\//, '') || fullUrl
    };

    await savePending(pendingData);
    console.log('Request guardado en IndexedDB para sincronización:', fullUrl);

    // Registrar tarea de background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-posts');
        console.log('Tarea de background sync registrada');
      } catch (syncError) {
        console.error('Error registrando background sync:', syncError);
        // No es crítico, la petición ya está guardada en IndexedDB
      }
    } else {
      console.warn('Background Sync no está disponible en este navegador');
    }
  } catch (error) {
    console.error('Error guardando petición pendiente:', error);
    throw error;
  }
};

/**
 * Versión específica para POST (más simple de usar)
 */
export const postWithSync = async (url, data, headers = {}) => {
  return fetchWithSync(url, {
    method: 'POST',
    body: data,
    headers
  });
};

