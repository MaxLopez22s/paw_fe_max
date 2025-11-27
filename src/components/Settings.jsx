import React, { useState, useEffect } from 'react';
import { 
  subscribeToNotificationType, 
  unsubscribeFromNotificationType, 
  getActiveSubscriptions,
  NOTIFICATION_TYPES,
  NOTIFICATION_CONFIGS,
  requestNotificationPermission
} from '../utils/pushNotifications';

const Settings = ({ usuario }) => {
  const [settings, setSettings] = useState({
    app: {
      theme: 'light',
      language: 'es',
      autoSync: true,
      offlineMode: true
    },
    notifications: {
      push: true,
      sound: true,
      vibration: true,
      schedule: {
        enabled: false,
        startTime: '09:00',
        endTime: '18:00'
      }
    },
    privacy: {
      analytics: true,
      crashReports: true,
      shareUsage: false
    },
    advanced: {
      cacheSize: '100MB',
      syncInterval: 5,
      debugMode: false
    }
  });

  const [saveStatus, setSaveStatus] = useState('');
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar re-render

  useEffect(() => {
    // Cargar configuración guardada
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    // Cargar suscripciones activas después de un pequeño delay para asegurar que el userId esté disponible
    const timer = setTimeout(() => {
      loadSubscriptions();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const loadSubscriptions = async () => {
    try {
      const userId = localStorage.getItem('userId');
      console.log('[loadSubscriptions] Iniciando carga, userId:', userId);
      
      // Si hay userId, priorizar datos del servidor
      if (userId) {
        try {
          const response = await fetch(`/api/subscriptions/${userId}?activeOnly=true`);
          if (response.ok) {
            const data = await response.json();
            console.log('[loadSubscriptions] Respuesta del servidor:', data);
            if (data.success && data.subscriptions && Array.isArray(data.subscriptions)) {
              // Filtrar SOLO las que están explícitamente activas (active === true o undefined)
              // NO incluir las que tienen active === false
              const serverSubs = data.subscriptions
                .filter(sub => {
                  if (!sub) return false;
                  // Solo incluir si active es true o undefined (por defecto activo)
                  // Excluir explícitamente si active === false
                  return sub.active !== false && (sub.active === true || sub.active === undefined);
                })
                .map(sub => ({
                  id: sub._id || sub.id || `sub-${Date.now()}-${Math.random()}`,
                  type: sub.type || 'default',
                  subscription: sub.subscription || {},
                  config: sub.config || {},
                  active: sub.active !== false ? (sub.active === true || sub.active === undefined ? true : false) : false,
                  createdAt: sub.createdAt,
                  updatedAt: sub.updatedAt
                }));
              console.log('[loadSubscriptions] Suscripciones procesadas del servidor (solo activas):', serverSubs);
              setActiveSubscriptions(serverSubs);
              setRefreshKey(prev => prev + 1); // Forzar re-render
              return; // Salir temprano si tenemos datos del servidor
            } else {
              // Si no hay suscripciones en el servidor, limpiar estado
              console.log('[loadSubscriptions] No hay suscripciones en el servidor o formato inválido');
              setActiveSubscriptions([]);
              setRefreshKey(prev => prev + 1); // Forzar re-render
              return;
            }
          } else {
            console.warn('[loadSubscriptions] Error en respuesta del servidor:', response.status);
          }
        } catch (error) {
          console.error('[loadSubscriptions] Error sincronizando con servidor:', error);
        }
      }
      
      // Fallback: cargar desde IndexedDB si no hay userId o falló el servidor
      try {
        const localSubs = await getActiveSubscriptions();
        console.log('[loadSubscriptions] Suscripciones locales (IndexedDB):', localSubs);
        if (localSubs && Array.isArray(localSubs) && localSubs.length > 0) {
          // Filtrar solo las activas
          const activeLocalSubs = localSubs.filter(sub => 
            sub && sub.active !== false && (sub.active === true || sub.active === undefined)
          );
          console.log('[loadSubscriptions] Suscripciones locales activas:', activeLocalSubs);
          setActiveSubscriptions(activeLocalSubs);
          setRefreshKey(prev => prev + 1); // Forzar re-render
        } else {
          console.log('[loadSubscriptions] No hay suscripciones locales');
          setActiveSubscriptions([]);
          setRefreshKey(prev => prev + 1); // Forzar re-render
        }
      } catch (idbError) {
        console.error('[loadSubscriptions] Error cargando de IndexedDB:', idbError);
        setActiveSubscriptions([]);
      }
    } catch (error) {
      console.error('[loadSubscriptions] Error general:', error);
      setActiveSubscriptions([]);
    }
  };

  const handleSubscribe = async (type) => {
    setLoadingSubs(true);
    setSaveStatus('');
    try {
      console.log(`🔄 Iniciando suscripción a tipo: ${type}`);
      
      // Verificar permisos
      if (!('Notification' in window)) {
        throw new Error('Este navegador no soporta notificaciones');
      }

      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Se necesitan permisos de notificación para suscribirse');
        }
      }

      // Verificar Service Worker
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker no disponible en este navegador');
      }

      // Verificar que el service worker esté disponible
      if (!navigator.serviceWorker) {
        throw new Error('Service Worker no está disponible');
      }

      // Obtener el registration primero
      let registration;
      try {
        registration = await navigator.serviceWorker.ready;
        console.log('Service Worker registration obtenido:', registration);
      } catch (error) {
        console.error('Error obteniendo service worker registration:', error);
        throw new Error('No se pudo obtener el Service Worker. Asegúrate de que esté registrado correctamente.');
      }
      
      // Verificar pushManager después de obtener registration
      if (!registration) {
        throw new Error('Service Worker registration no disponible');
      }
      
      if (!registration.pushManager) {
        throw new Error('Push Manager no disponible. Asegúrate de que el Service Worker esté registrado correctamente.');
      }
      
      console.log('Push Manager disponible:', registration.pushManager);
      
      // Verificar si ya existe una suscripción activa (reutilizar la misma)
      let subscription = await registration.pushManager.getSubscription();
      console.log('Suscripción existente:', subscription ? 'Sí' : 'No');
      
      // Si no existe, crear una nueva
      if (!subscription) {
        console.log('Creando nueva suscripción push...');
        const VAPID_PUBLIC_KEY = 'BLbz7pe2pc9pZnoILf5q43dkshGp9Z-UA6lKpkZtqVaFyasrLTTrJjeNbFFCOBCGtB2KtWRIO8c04O2dXAhwdvA';
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

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        console.log('✅ Nueva suscripción creada');
      }

      const config = NOTIFICATION_CONFIGS[type] || NOTIFICATION_CONFIGS[NOTIFICATION_TYPES.DEFAULT];
      let userId = localStorage.getItem('userId');
      const usuario = localStorage.getItem('usuario');

      // Si no hay userId, intentar obtenerlo del servidor
      if (!userId && usuario) {
        try {
          console.log(`📥 Intentando obtener userId para usuario: ${usuario}`);
          const userResponse = await fetch(`/api/auth/user-by-telefono/${usuario}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.success && userData.user && (userData.user.id || userData.user._id)) {
              userId = userData.user.id || userData.user._id;
              localStorage.setItem('userId', userId);
              console.log(`✅ userId obtenido y guardado: ${userId}`);
            }
          }
        } catch (error) {
          console.warn('⚠️ No se pudo obtener userId del servidor:', error);
        }
      }

      // Si aún no hay userId, guardar solo en IndexedDB y mostrar advertencia
      if (!userId) {
        console.warn('⚠️ No hay userId disponible, guardando solo en IndexedDB');
        try {
          const { saveSubscription } = await import('../idb');
          await saveSubscription(subscription, type, config);
          console.log('✅ Guardado en IndexedDB (sin userId)');
          setSaveStatus(`⚠️ Suscrito localmente a ${type}. Inicia sesión nuevamente para sincronizar con el servidor.`);
          setTimeout(() => setSaveStatus(''), 5000);
          await loadSubscriptions();
          return;
        } catch (idbError) {
          console.error('Error guardando en IndexedDB:', idbError);
          throw new Error('No se pudo guardar la suscripción. Por favor, inicia sesión nuevamente.');
        }
      }

      console.log(`📤 Enviando suscripción al servidor para tipo: ${type}, userId: ${userId}`);

      // Enviar al servidor con tipo y userId
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          type,
          config,
          userId
        })
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('Error del servidor:', responseData);
        throw new Error(responseData.message || `Error del servidor: ${response.status}`);
      }

      console.log('✅ Respuesta del servidor:', responseData);

      // Guardar en IndexedDB
      try {
        const { saveSubscription } = await import('../idb');
        await saveSubscription(subscription, type, config);
        console.log('✅ Guardado en IndexedDB');
      } catch (idbError) {
        console.warn('⚠️ Error guardando en IndexedDB:', idbError);
        // Continuar aunque falle IndexedDB
      }
      
      // Esperar un poco y recargar suscripciones
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadSubscriptions();
      
      // Forzar re-render adicional después de un momento
      setTimeout(async () => {
        await loadSubscriptions();
      }, 500);
      
      setSaveStatus(`✅ Suscrito a ${type}`);
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('❌ Error suscribiéndose:', error);
      setSaveStatus(`❌ Error: ${error.message || 'Error al suscribirse'}`);
      setTimeout(() => setSaveStatus(''), 5000);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleUnsubscribe = async (type) => {
    setLoadingSubs(true);
    setSaveStatus('');
    try {
      console.log(`🔄 Iniciando desuscripción de tipo: ${type}`);
      
      const userId = localStorage.getItem('userId');
      const usuario = localStorage.getItem('usuario');
      
      // Obtener suscripciones del servidor primero (TODAS, no solo activas) si hay userId
      let typeSubs = [];
      let endpoint = null;
      
      if (userId) {
        try {
          console.log(`📥 Obteniendo TODAS las suscripciones del servidor para userId: ${userId}`);
          // Obtener todas las suscripciones (activas e inactivas) para poder desactivar
          const response = await fetch(`/api/subscriptions/${userId}?activeOnly=false`);
          if (response.ok) {
            const data = await response.json();
            console.log('Todas las suscripciones del servidor:', data);
            if (data.success && data.subscriptions && Array.isArray(data.subscriptions)) {
              // Normalizar el tipo para comparación
              const normalizeType = (t) => String(t || '').trim().toLowerCase();
              const searchType = normalizeType(type);
              // Buscar suscripciones de este tipo (activas o inactivas)
              typeSubs = data.subscriptions.filter(sub => {
                if (!sub || !sub.type) return false;
                const subType = normalizeType(sub.type);
                return subType === searchType;
              });
              // Priorizar las activas, pero si no hay activas, usar cualquier suscripción de este tipo
              const activeSub = typeSubs.find(sub => sub.active === true || sub.active === undefined);
              const subToUse = activeSub || typeSubs[0];
              if (subToUse && subToUse.subscription && subToUse.subscription.endpoint) {
                endpoint = subToUse.subscription.endpoint;
              }
            }
          } else {
            console.warn('Error en respuesta del servidor:', response.status);
          }
        } catch (error) {
          console.error('Error obteniendo suscripciones del servidor:', error);
        }
      } else {
        console.warn('⚠️ No hay userId disponible, solo se desactivará en IndexedDB');
      }
      
      // Si no hay en el servidor, buscar en IndexedDB
      if (typeSubs.length === 0) {
        try {
          console.log('Buscando en IndexedDB...');
          const subscriptions = await getActiveSubscriptions();
          // Normalizar el tipo para comparación
          const normalizeType = (t) => String(t || '').trim().toLowerCase();
          const searchType = normalizeType(type);
          typeSubs = subscriptions.filter(sub => {
            if (!sub || !sub.type) return false;
            const subType = normalizeType(sub.type);
            return subType === searchType;
          });
          if (typeSubs.length > 0 && typeSubs[0].subscription && typeSubs[0].subscription.endpoint) {
            endpoint = typeSubs[0].subscription.endpoint;
          }
        } catch (error) {
          console.error('Error obteniendo suscripciones de IndexedDB:', error);
        }
      }
      
      if (!endpoint) {
        throw new Error('No se encontró endpoint de suscripción activa de este tipo');
      }
      
      // Normalizar el tipo antes de enviarlo
      const normalizedType = String(type || 'default').trim().toLowerCase();
      console.log(`📤 Desactivando suscripción en el servidor: endpoint=${endpoint}, type=${normalizedType} (original: ${type})`);
      
      // Desactivar en el servidor solo si hay userId
      if (userId) {
        const response = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            type: normalizedType,
            userId
          })
        });
        
        const responseData = await response.json().catch(() => ({}));
        
        if (!response.ok) {
          console.warn('⚠️ Error al desuscribirse en el servidor:', responseData);
          // Continuar aunque falle el servidor
        } else {
          console.log('✅ Desuscripción exitosa en el servidor:', responseData);
        }
      } else {
        console.warn('⚠️ No hay userId, solo se desactivará en IndexedDB');
      }
      
      // Desactivar en IndexedDB
      for (const sub of typeSubs) {
        try {
          if (sub.id) {
            const { deactivateSubscription } = await import('../idb');
            await deactivateSubscription(sub.id);
            console.log(`✅ Desactivada suscripción ${sub.id} en IndexedDB`);
          }
        } catch (error) {
          console.error('Error desactivando en IndexedDB:', error);
          // Continuar aunque falle
        }
      }
      
      // Esperar un poco y recargar suscripciones
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadSubscriptions();
      
      // Forzar re-render adicional después de un momento
      setTimeout(async () => {
        await loadSubscriptions();
      }, 500);
      
      setSaveStatus(`✅ Desuscrito de ${type}`);
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('❌ Error desuscribiéndose:', error);
      setSaveStatus(`❌ Error: ${error.message || 'Error al desuscribirse'}`);
      setTimeout(() => setSaveStatus(''), 5000);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleNestedSettingChange = (category, parentKey, childKey, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [parentKey]: {
          ...prev[category][parentKey],
          [childKey]: value
        }
      }
    }));
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
      
      // TODO: Implementar endpoint para guardar configuración
      // Por ahora solo guardamos en localStorage
      // const response = await fetch('/api/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ usuario, settings })
      // });

      setSaveStatus('✅ Configuración guardada exitosamente (solo local)');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      setSaveStatus('❌ Error al guardar configuración');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const resetSettings = () => {
    if (confirm('¿Estás seguro de que quieres restaurar la configuración por defecto?')) {
      const defaultSettings = {
        app: {
          theme: 'light',
          language: 'es',
          autoSync: true,
          offlineMode: true
        },
        notifications: {
          push: true,
          sound: true,
          vibration: true,
          schedule: {
            enabled: false,
            startTime: '09:00',
            endTime: '18:00'
          }
        },
        privacy: {
          analytics: true,
          crashReports: true,
          shareUsage: false
        },
        advanced: {
          cacheSize: '100MB',
          syncInterval: 5,
          debugMode: false
        }
      };
      
      setSettings(defaultSettings);
      localStorage.setItem('appSettings', JSON.stringify(defaultSettings));
      setSaveStatus('🔄 Configuración restaurada');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const clearCache = () => {
    if (confirm('¿Estás seguro de que quieres limpiar la caché? Esto puede afectar el rendimiento.')) {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // Limpiar localStorage específico
      localStorage.removeItem('notificationHistory');
      
      setSaveStatus('🗑️ Caché limpiada exitosamente');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `configuracion-${usuario}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    setSaveStatus('📁 Configuración exportada');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>⚙️ Configuración</h2>
        <div className="header-actions">
          <button className="export-btn" onClick={exportSettings}>
            📁 Exportar
          </button>
          <button className="reset-btn" onClick={resetSettings}>
            🔄 Restaurar
          </button>
          <button className="save-btn" onClick={saveSettings}>
            💾 Guardar
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="save-status">{saveStatus}</div>
      )}

      <div className="settings-sections">
        {/* App Settings */}
        <div className="settings-section">
          <h3>🎨 Aplicación</h3>
          <div className="setting-item">
            <label>Tema</label>
            <select
              value={settings.app.theme}
              onChange={(e) => handleSettingChange('app', 'theme', e.target.value)}
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
              <option value="auto">Automático</option>
            </select>
          </div>

          <div className="setting-item">
            <label>Idioma</label>
            <select
              value={settings.app.language}
              onChange={(e) => handleSettingChange('app', 'language', e.target.value)}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.app.autoSync}
                onChange={(e) => handleSettingChange('app', 'autoSync', e.target.checked)}
              />
              Sincronización automática
            </label>
          </div>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.app.offlineMode}
                onChange={(e) => handleSettingChange('app', 'offlineMode', e.target.checked)}
              />
              Modo offline habilitado
            </label>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <h3>🔔 Notificaciones</h3>
          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.notifications.push}
                onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
              />
              Notificaciones push
            </label>
          </div>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.notifications.sound}
                onChange={(e) => handleSettingChange('notifications', 'sound', e.target.checked)}
              />
              Sonido en notificaciones
            </label>
          </div>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.notifications.vibration}
                onChange={(e) => handleSettingChange('notifications', 'vibration', e.target.checked)}
              />
              Vibración en notificaciones
            </label>
          </div>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.notifications.schedule.enabled}
                onChange={(e) => handleNestedSettingChange('notifications', 'schedule', 'enabled', e.target.checked)}
              />
              Horario de notificaciones
            </label>
          </div>

          {settings.notifications.schedule.enabled && (
            <div className="nested-settings">
              <div className="setting-item">
                <label>Desde</label>
                <input
                  type="time"
                  value={settings.notifications.schedule.startTime}
                  onChange={(e) => handleNestedSettingChange('notifications', 'schedule', 'startTime', e.target.value)}
                />
              </div>
              <div className="setting-item">
                <label>Hasta</label>
                <input
                  type="time"
                  value={settings.notifications.schedule.endTime}
                  onChange={(e) => handleNestedSettingChange('notifications', 'schedule', 'endTime', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Suscripciones personalizadas */}
          <div className="setting-item" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #ddd' }}>
            <h4 style={{ marginBottom: '1rem' }}>🔔 Suscripciones Personalizadas</h4>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Suscríbete a diferentes tipos de notificaciones con configuraciones personalizadas
            </p>
            
            <div key={refreshKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(NOTIFICATION_TYPES).map(([key, type]) => {
                // Verificar si hay una suscripción activa de este tipo
                // Solo considerar activas si active === true o active === undefined (por defecto activo)
                // NO considerar activas si active === false explícitamente
                const matchingSubs = activeSubscriptions.filter(
                  sub => sub && sub.type === type
                );
                const isSubscribed = matchingSubs.some(
                  sub => sub.active !== false && (sub.active === true || sub.active === undefined)
                );
                const config = NOTIFICATION_CONFIGS[type];
                
                // Log para debug
                console.log(`[Settings] Tipo ${type}:`, {
                  totalSubs: activeSubscriptions.length,
                  matchingSubs: matchingSubs.length,
                  isSubscribed,
                  subsDetails: matchingSubs.map(s => ({ 
                    id: s.id, 
                    type: s.type, 
                    active: s.active 
                  }))
                });
                
                return (
                  <div 
                    key={type} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: isSubscribed ? '#e8f5e9' : '#f5f5f5',
                      borderRadius: '8px',
                      border: isSubscribed ? '2px solid #4caf50' : '1px solid #ddd'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600' }}>{config.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        Tipo: {type} {isSubscribed && '✓'}
                      </div>
                    </div>
                    {isSubscribed ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnsubscribe(type).catch(err => {
                            console.error('Error en handleUnsubscribe:', err);
                            setSaveStatus(`❌ Error: ${err.message || 'Error al desuscribirse'}`);
                            setTimeout(() => setSaveStatus(''), 5000);
                          });
                        }}
                        disabled={loadingSubs}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loadingSubs ? 'not-allowed' : 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        {loadingSubs ? '⏳' : 'Desuscribirse'}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSubscribe(type).catch(err => {
                            console.error('Error en handleSubscribe:', err);
                            setSaveStatus(`❌ Error: ${err.message || 'Error al suscribirse'}`);
                            setTimeout(() => setSaveStatus(''), 5000);
                          });
                        }}
                        disabled={loadingSubs}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#4caf50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loadingSubs ? 'not-allowed' : 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        {loadingSubs ? '⏳' : 'Suscribirse'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="settings-section">
          <h3>🔒 Privacidad</h3>
          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.privacy.analytics}
                onChange={(e) => handleSettingChange('privacy', 'analytics', e.target.checked)}
              />
              Compartir datos de uso (anónimos)
            </label>
          </div>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.privacy.crashReports}
                onChange={(e) => handleSettingChange('privacy', 'crashReports', e.target.checked)}
              />
              Reportes de errores automáticos
            </label>
          </div>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.privacy.shareUsage}
                onChange={(e) => handleSettingChange('privacy', 'shareUsage', e.target.checked)}
              />
              Compartir estadísticas de uso
            </label>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="settings-section">
          <h3>🔧 Avanzado</h3>
          <div className="setting-item">
            <label>Tamaño de caché</label>
            <select
              value={settings.advanced.cacheSize}
              onChange={(e) => handleSettingChange('advanced', 'cacheSize', e.target.value)}
            >
              <option value="50MB">50MB</option>
              <option value="100MB">100MB</option>
              <option value="200MB">200MB</option>
              <option value="500MB">500MB</option>
            </select>
          </div>

          <div className="setting-item">
            <label>Intervalo de sincronización (minutos)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={settings.advanced.syncInterval}
              onChange={(e) => handleSettingChange('advanced', 'syncInterval', parseInt(e.target.value))}
            />
          </div>

          <div className="setting-item checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.advanced.debugMode}
                onChange={(e) => handleSettingChange('advanced', 'debugMode', e.target.checked)}
              />
              Modo de depuración
            </label>
          </div>

          <div className="setting-item">
            <button className="danger-btn" onClick={clearCache}>
              🗑️ Limpiar Caché
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

