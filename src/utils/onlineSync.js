// Utilidad para sincronización automática cuando vuelve la conexión
import { getAllPending, clearPending } from '../idb';
import config from '../config';

// Función para sincronizar todos los registros pendientes
export const syncPendingRequests = async () => {
  try {
    const allRecords = await getAllPending();
    
    if (allRecords.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    console.log(`🔄 Sincronizando ${allRecords.length} registros pendientes...`);
    
    let synced = 0;
    let failed = 0;

    for (const record of allRecords) {
      try {
        // Normalizar URL usando getApiUrl
        let url = record.url || '/api/datos';
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = config.getApiUrl(url);
        }

        const method = record.method || 'POST';
        const headers = record.headers || { 'Content-Type': 'application/json' };
        const body = record.body || record;

        const response = await fetch(url, {
          method: method,
          headers: headers,
          body: JSON.stringify(body)
        });

        if (response.ok) {
          await clearPending(record.id);
          synced++;
          console.log(`✅ Registro ${record.id} sincronizado: ${url}`);
        } else {
          failed++;
          console.log(`❌ Registro ${record.id} falló (${response.status}): ${url}`);
        }
      } catch (err) {
        failed++;
        console.error(`❌ Error sincronizando registro ${record.id}:`, err);
      }
    }

    return { success: true, synced, failed, total: allRecords.length };
  } catch (error) {
    console.error('Error en syncPendingRequests:', error);
    return { success: false, error: error.message };
  }
};

// Función para verificar si hay registros pendientes
export const hasPendingRequests = async () => {
  try {
    const allRecords = await getAllPending();
    return allRecords.length > 0;
  } catch (error) {
    console.error('Error verificando registros pendientes:', error);
    return false;
  }
};

// Evento personalizado para notificar sincronización
export const createSyncEvent = (data) => {
  return new CustomEvent('syncCompleted', { detail: data });
};


