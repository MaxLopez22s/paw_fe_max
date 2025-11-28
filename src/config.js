// Configuración centralizada de la aplicación
const API_URL = import.meta.env.VITE_API_URL || 'https://pwa-be-max.onrender.com';

// Función helper para construir URLs completas de la API
export const getApiUrl = (endpoint) => {
  // Si el endpoint ya es una URL completa, devolverla tal cual
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  // Eliminar el slash inicial si existe para evitar doble slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_URL}/${cleanEndpoint}`;
};

export default {
  API_URL,
  getApiUrl
};

