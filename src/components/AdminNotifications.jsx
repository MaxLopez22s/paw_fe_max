import React, { useState, useEffect } from 'react';
import { NOTIFICATION_TYPES, NOTIFICATION_CONFIGS } from '../utils/pushNotifications';
import { postWithSync } from '../utils/apiWithSync';
import './AdminNotifications.css';
import config from '../config';

const AdminNotifications = ({ usuario, isAdmin }) => {
  const [subscriptionStats, setSubscriptionStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [notificationForm, setNotificationForm] = useState({
    subscriptionType: 'default',
    title: '',
    body: '',
    icon: '/icons/ico1.ico',
    url: '/',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    priority: 'normal'
  });

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadNotificationHistory();
      // Cargar suscripciones después de un pequeño delay para asegurar que el userId esté disponible
      const timer = setTimeout(() => {
        loadSubscriptions();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAdmin]);

  // Debug: Log cuando cambie activeSubscriptions
  useEffect(() => {
    console.log('[AdminNotifications] activeSubscriptions actualizado:', activeSubscriptions);
  }, [activeSubscriptions]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/notifications/admin/subscription-stats?adminTelefono=${usuario}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStats(data.stats || []);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setMessage('❌ Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const userId = localStorage.getItem('userId');
      console.log('[AdminNotifications - loadSubscriptions] Iniciando carga, userId:', userId);
      
      // Si hay userId, priorizar datos del servidor
      if (userId) {
        try {
          const response = await fetch(`${config.API_URL}/api/subscriptions/${userId}?activeOnly=true`);
          if (response.ok) {
            const data = await response.json();
            console.log('[AdminNotifications - loadSubscriptions] Respuesta del servidor:', data);
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
                .map(sub => {
                  // Normalizar el tipo para asegurar consistencia
                  const normalizedType = String(sub.type || 'default').trim();
                  return {
                    id: sub._id || sub.id || `sub-${Date.now()}-${Math.random()}`,
                    type: normalizedType,
                    subscription: sub.subscription || {},
                    config: sub.config || {},
                    active: sub.active !== false ? (sub.active === true || sub.active === undefined ? true : false) : false,
                    createdAt: sub.createdAt,
                    updatedAt: sub.updatedAt
                  };
                });
              console.log('[AdminNotifications - loadSubscriptions] Suscripciones procesadas del servidor (solo activas):', serverSubs);
              setActiveSubscriptions(serverSubs);
              setRefreshKey(prev => prev + 1); // Forzar re-render
              return; // Salir temprano si tenemos datos del servidor
            } else {
              // Si no hay suscripciones en el servidor, limpiar estado
              console.log('[AdminNotifications - loadSubscriptions] No hay suscripciones en el servidor o formato inválido');
              setActiveSubscriptions([]);
              setRefreshKey(prev => prev + 1); // Forzar re-render
              return;
            }
          } else {
            console.warn('[AdminNotifications - loadSubscriptions] Error en respuesta del servidor:', response.status);
          }
        } catch (error) {
          console.error('[AdminNotifications - loadSubscriptions] Error sincronizando con servidor:', error);
        }
      }
      
      // Fallback: cargar desde IndexedDB si no hay userId o falló el servidor
      try {
        const localSubs = await getActiveSubscriptions();
        console.log('[AdminNotifications - loadSubscriptions] Suscripciones locales (IndexedDB):', localSubs);
        if (localSubs && Array.isArray(localSubs) && localSubs.length > 0) {
          // Filtrar solo las activas
          const activeLocalSubs = localSubs.filter(sub => 
            sub && sub.active !== false && (sub.active === true || sub.active === undefined)
          );
          console.log('[AdminNotifications - loadSubscriptions] Suscripciones locales activas:', activeLocalSubs);
          setActiveSubscriptions(activeLocalSubs);
          setRefreshKey(prev => prev + 1); // Forzar re-render
        } else {
          console.log('[AdminNotifications - loadSubscriptions] No hay suscripciones locales');
          setActiveSubscriptions([]);
          setRefreshKey(prev => prev + 1); // Forzar re-render
        }
      } catch (idbError) {
        console.error('[AdminNotifications - loadSubscriptions] Error cargando de IndexedDB:', idbError);
        setActiveSubscriptions([]);
      }
    } catch (error) {
      console.error('[AdminNotifications - loadSubscriptions] Error general:', error);
      setActiveSubscriptions([]);
    }
  };

  const handleSubscribe = async (type) => {
    setLoadingSubs(true);
    setMessage(''); // Limpiar mensaje previo
    try {
      console.log(`[AdminNotifications] 🔄 Iniciando suscripción a tipo: ${type}`);
      
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
        console.log('[AdminNotifications] Service Worker registration obtenido:', registration);
      } catch (error) {
        console.error('[AdminNotifications] Error obteniendo service worker registration:', error);
        throw new Error('No se pudo obtener el Service Worker. Asegúrate de que esté registrado correctamente.');
      }
      
      // Verificar pushManager después de obtener registration
      if (!registration) {
        throw new Error('Service Worker registration no disponible');
      }
      
      if (!registration.pushManager) {
        throw new Error('Push Manager no disponible. Asegúrate de que el Service Worker esté registrado correctamente.');
      }
      
      console.log('[AdminNotifications] Push Manager disponible:', registration.pushManager);
      
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
      const userId = localStorage.getItem('userId');

      if (!userId) {
        throw new Error('No se encontró userId. Por favor, inicia sesión nuevamente.');
      }

      // Normalizar el tipo antes de enviarlo
      const normalizedType = String(type || 'default').trim().toLowerCase();
      console.log(`📤 Enviando suscripción al servidor para tipo: ${normalizedType} (original: ${type}), userId: ${userId}`);

      // Enviar al servidor con tipo y userId
      const response = await fetch(`${config.API_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          type: normalizedType,
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
      
      setMessage(`✅ Suscrito a ${type}`);
      
      // Esperar un poco y recargar suscripciones
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadSubscriptions();
      
      // Forzar re-render adicional después de un momento
      setTimeout(async () => {
        console.log('[AdminNotifications] Recargando suscripciones después de suscribirse...');
        await loadSubscriptions();
        // Forzar otro re-render después de cargar
        setRefreshKey(prev => {
          const newKey = prev + 1;
          console.log('[AdminNotifications] Estado actualizado, refreshKey:', newKey);
          return newKey;
        });
      }, 500);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('❌ Error suscribiéndose:', error);
      setMessage(`❌ Error: ${error.message || 'Error al suscribirse'}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleUnsubscribe = async (type) => {
    setLoadingSubs(true);
    setMessage(''); // Limpiar mensaje previo
    try {
      console.log(`[AdminNotifications] 🔄 Iniciando desuscripción de tipo: ${type}`);
      
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        throw new Error('No se encontró userId. Por favor, inicia sesión nuevamente.');
      }
      
      // Obtener suscripciones del servidor primero (TODAS, no solo activas)
      let typeSubs = [];
      let endpoint = null;
      
      try {
        console.log(`📥 Obteniendo TODAS las suscripciones del servidor para userId: ${userId}`);
        // Obtener todas las suscripciones (activas e inactivas) para poder desactivar
        const response = await fetch(`${config.API_URL}/api/subscriptions/${userId}?activeOnly=false`);
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
      
      // Desactivar en el servidor
      const response = await fetch(`${config.API_URL}/api/unsubscribe`, {
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
      
      setMessage(`✅ Desuscrito de ${type}`);
      
      // Esperar un poco y recargar suscripciones
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadSubscriptions();
      
      // Forzar re-render adicional después de un momento
      setTimeout(async () => {
        console.log('[AdminNotifications] Recargando suscripciones después de desuscribirse...');
        await loadSubscriptions();
        // Forzar otro re-render después de cargar
        setRefreshKey(prev => {
          const newKey = prev + 1;
          console.log('[AdminNotifications] Estado actualizado, refreshKey:', newKey);
          return newKey;
        });
      }, 500);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('❌ Error desuscribiéndose:', error);
      setMessage(`❌ Error: ${error.message || 'Error al desuscribirse'}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoadingSubs(false);
    }
  };

  const loadNotificationHistory = async () => {
    setLoadingNotifications(true);
    try {
      const userId = localStorage.getItem('userId');
      if (userId) {
        // Obtener las suscripciones activas del admin
        let activeSubscriptionTypes = [];
        try {
          const subsResponse = await fetch(`${config.API_URL}/api/subscriptions/${userId}?activeOnly=true`);
          if (subsResponse.ok) {
            const subsData = await subsResponse.json();
            if (subsData.success && subsData.subscriptions) {
              activeSubscriptionTypes = subsData.subscriptions
                .filter(sub => sub.active !== false)
                .map(sub => sub.type);
            }
          }
        } catch (error) {
          console.error('Error obteniendo suscripciones:', error);
        }
        
        // Cargar notificaciones del servidor
        const response = await fetch(`${config.API_URL}/api/notifications/${userId}?limit=50`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.notifications) {
            // Filtrar notificaciones por tipos de suscripción activos
            let filteredNotifications = [];
            if (activeSubscriptionTypes.length > 0) {
              filteredNotifications = data.notifications.filter(notif => 
                activeSubscriptionTypes.includes(notif.type)
              );
            } else {
              // Si no hay suscripciones, no mostrar notificaciones del servidor
              filteredNotifications = [];
            }
            
            // Convertir al formato esperado
            const serverNotifications = filteredNotifications.map(notif => ({
              id: notif._id || notif.id,
              title: notif.title,
              body: notif.body,
              icon: notif.icon,
              type: notif.type || 'info',
              timestamp: notif.createdAt || notif.timestamp,
              read: notif.read || false,
              url: notif.url
            }));
            
            setNotificationHistory(serverNotifications.sort((a, b) => 
              new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
            ));
          }
        }
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleInputChange = (field, value) => {
    setNotificationForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.body) {
      setMessage('⚠️ Por favor completa el título y el mensaje');
      return;
    }

    setSending(true);
    setMessage('');

    try {
      const response = await postWithSync('/api/notifications/admin/send-by-subscription-type', {
        adminTelefono: usuario,
        subscriptionType: notificationForm.subscriptionType,
        title: notificationForm.title,
        body: notificationForm.body,
        icon: notificationForm.icon,
        url: notificationForm.url,
        options: {
          requireInteraction: notificationForm.requireInteraction,
          vibrate: notificationForm.vibrate,
          priority: notificationForm.priority
        }
      });

      const result = await response.json();

      if (result.success) {
        const sent = result.sent || 0;
        const failed = result.failed || 0;
        const total = result.total || (sent + failed);
        setMessage(`✅ Notificación enviada: ${sent} exitosas, ${failed} fallidas de ${total} total`);
        
        // Limpiar formulario
        setNotificationForm({
          subscriptionType: 'default',
          title: '',
          body: '',
          icon: '/icons/ico1.ico',
          url: '/',
          requireInteraction: false,
          vibrate: [200, 100, 200],
          priority: 'normal'
        });

        // Recargar estadísticas y notificaciones
        await loadStats();
        await loadNotificationHistory();
      } else {
        setMessage(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      // Verificar si es un error de conexión
      const errorMessage = error.message || '';
      const isConnectionError = 
        errorMessage.includes('Sin conexión') || 
        errorMessage.includes('sincronización') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        !navigator.onLine ||
        (error instanceof TypeError && error.message.includes('fetch'));
      
      if (isConnectionError) {
        console.log('⚠️ Sin conexión. Notificación guardada en IndexedDB para sincronización.');
        setMessage('⚠️ Sin conexión. Los datos se sincronizarán automáticamente cuando se recupere la conexión.');
      } else {
        console.error('Error enviando notificación:', error);
        setMessage('❌ Error al enviar notificación. Verifica que el backend esté corriendo.');
      }
    } finally {
      setSending(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-notifications-container">
        <div className="access-denied">
          <h2>🔒 Acceso Denegado</h2>
          <p>Esta sección es solo para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-notifications-container">
      <div className="admin-header">
        <h2>👨‍💼 Panel de Administración - Notificaciones Push</h2>
        <p>Envía notificaciones personalizadas según el tipo de suscripción</p>
      </div>

      {message && (
        <div className={`admin-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Estadísticas de Suscripciones */}
      <div className="stats-section">
        <div className="stats-header">
          <h3>📊 Estadísticas de Suscripciones</h3>
          <button onClick={loadStats} disabled={loading} className="refresh-btn">
            {loading ? '🔄 Cargando...' : '🔄 Actualizar'}
          </button>
        </div>

        {loading ? (
          <div className="loading">Cargando estadísticas...</div>
        ) : subscriptionStats.length === 0 ? (
          <div className="no-stats">No hay suscripciones activas</div>
        ) : (
          <div className="stats-grid">
            {subscriptionStats.map(stat => (
              <div key={stat.type} className="stat-card">
                <div className="stat-type">{stat.type}</div>
                <div className="stat-numbers">
                  <div className="stat-item">
                    <span className="stat-label">Suscripciones:</span>
                    <span className="stat-value">{stat.subscriptions}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Usuarios únicos:</span>
                    <span className="stat-value">{stat.uniqueUsers}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulario de Envío */}
      <div className="send-form-section">
        <h3>📤 Enviar Notificación por Tipo de Suscripción</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Tipo de Suscripción *</label>
            <select
              value={notificationForm.subscriptionType}
              onChange={(e) => handleInputChange('subscriptionType', e.target.value)}
            >
              {Object.entries(NOTIFICATION_TYPES).map(([key, value]) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
            <small>Selecciona el tipo de suscripción que recibirá esta notificación</small>
          </div>

          <div className="form-group">
            <label>Título *</label>
            <input
              type="text"
              value={notificationForm.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Título de la notificación"
              required
            />
          </div>

          <div className="form-group full-width">
            <label>Mensaje *</label>
            <textarea
              value={notificationForm.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              placeholder="Mensaje de la notificación"
              rows="4"
              required
            />
          </div>

          <div className="form-group">
            <label>Icono</label>
            <input
              type="text"
              value={notificationForm.icon}
              onChange={(e) => handleInputChange('icon', e.target.value)}
              placeholder="/icons/ico1.ico"
            />
          </div>

          <div className="form-group">
            <label>URL de destino</label>
            <input
              type="text"
              value={notificationForm.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="/"
            />
            <small>
              Ruta donde se abrirá la app al hacer clic. Ejemplos: 
              <br />• <code>/</code> - Inicio
              <br />• <code>/notifications</code> - Notificaciones
              <br />• <code>/profile</code> - Perfil
              <br />• <code>/settings</code> - Configuración
            </small>
          </div>

          <div className="form-group">
            <label>Prioridad</label>
            <select
              value={notificationForm.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
            >
              <option value="low">Baja</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={notificationForm.requireInteraction}
                onChange={(e) => handleInputChange('requireInteraction', e.target.checked)}
              />
              Requerir interacción (no se cierra automáticamente)
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button
            onClick={handleSendNotification}
            disabled={sending || !notificationForm.title || !notificationForm.body}
            className="send-btn"
          >
            {sending ? '⏳ Enviando...' : '📤 Enviar Notificación'}
          </button>
        </div>
      </div>

      {/* Historial de Notificaciones Recibidas */}
      <div className="notifications-history-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #ddd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>📬 Notificaciones Recibidas</h3>
          <button 
            onClick={loadNotificationHistory} 
            disabled={loadingNotifications}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#4caf50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: loadingNotifications ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            {loadingNotifications ? '🔄 Cargando...' : '🔄 Actualizar'}
          </button>
        </div>

        {loadingNotifications ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando notificaciones...</div>
        ) : notificationHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            No hay notificaciones recibidas según tus suscripciones activas
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notificationHistory.map(notification => (
              <div 
                key={notification.id || notification._id} 
                style={{
                  padding: '1rem',
                  background: notification.read ? '#f9f9f9' : '#fff',
                  border: `2px solid ${notification.read ? '#ddd' : '#4caf50'}`,
                  borderRadius: '8px',
                  opacity: notification.read ? 0.7 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>
                        {notification.type === 'alerts' ? '🚨' :
                         notification.type === 'messages' ? '💬' :
                         notification.type === 'updates' ? '🔄' :
                         notification.type === 'promotions' ? '🎁' : '📤'}
                      </span>
                      <h4 style={{ margin: 0, fontWeight: '600' }}>{notification.title}</h4>
                      {notification.type && (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: '#666',
                          background: '#f0f0f0',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          {notification.type}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0.5rem 0', color: '#666' }}>{notification.body}</p>
                    <div style={{ fontSize: '0.85rem', color: '#999' }}>
                      {new Date(notification.timestamp || notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suscripciones Personalizadas del Admin */}
      <div className="settings-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #ddd' }}>
        <h3>🔔 Suscripciones Personalizadas</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          Suscríbete a diferentes tipos de notificaciones con configuraciones personalizadas
        </p>
        
        <div key={refreshKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.entries(NOTIFICATION_TYPES).map(([key, type]) => {
            // Verificar si hay una suscripción activa de este tipo
            // Solo considerar activas si active === true o active === undefined (por defecto activo)
            // NO considerar activas si active === false explícitamente
            // Comparación más robusta: normalizar tipos (trim, lowercase) y comparar
            const normalizeType = (t) => String(t || '').trim().toLowerCase();
            const matchingSubs = activeSubscriptions.filter(
              sub => {
                if (!sub || !sub.type) return false;
                const subType = normalizeType(sub.type);
                const searchType = normalizeType(type);
                const matches = subType === searchType;
                if (!matches) {
                  console.log(`[AdminNotifications] Tipo no coincide: "${subType}" !== "${searchType}" (original: "${sub.type}" vs "${type}")`);
                }
                return matches;
              }
            );
            const isSubscribed = matchingSubs.some(
              sub => sub.active !== false && (sub.active === true || sub.active === undefined)
            );
            const config = NOTIFICATION_CONFIGS[type];
            
            // Log para debug - más detallado
            console.log(`[AdminNotifications] Tipo ${type} (buscando):`, {
              totalSubs: activeSubscriptions.length,
              matchingSubs: matchingSubs.length,
              isSubscribed,
              subsDetails: matchingSubs.map(s => ({ 
                id: s.id, 
                type: s.type, 
                active: s.active 
              })),
              allSubsTypes: activeSubscriptions.map(s => ({ 
                type: s.type, 
                typeValue: typeof s.type,
                active: s.active 
              })),
              searchingFor: type,
              searchingForType: typeof type
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
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(`[AdminNotifications] Click en Desuscribirse para tipo: ${type}`);
                      try {
                        await handleUnsubscribe(type);
                      } catch (err) {
                        console.error('Error en handleUnsubscribe:', err);
                        setMessage(`❌ Error: ${err.message || 'Error al desuscribirse'}`);
                        setTimeout(() => setMessage(''), 5000);
                      }
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
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(`[AdminNotifications] Click en Suscribirse para tipo: ${type}`);
                      try {
                        await handleSubscribe(type);
                      } catch (err) {
                        console.error('Error en handleSubscribe:', err);
                        setMessage(`❌ Error: ${err.message || 'Error al suscribirse'}`);
                        setTimeout(() => setMessage(''), 5000);
                      }
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

      {/* Información adicional */}
      <div className="info-section">
        <h4>ℹ️ Información</h4>
        <ul>
          <li>Las notificaciones se enviarán solo a usuarios con suscripciones activas del tipo seleccionado</li>
          <li>Cada suscripción puede tener su propia configuración (icono, badge, vibración, etc.)</li>
          <li>Las notificaciones se guardarán en el historial de cada usuario</li>
          <li>Las suscripciones inválidas se desactivarán automáticamente</li>
          <li>Las notificaciones recibidas se filtran según tus suscripciones activas</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminNotifications;

