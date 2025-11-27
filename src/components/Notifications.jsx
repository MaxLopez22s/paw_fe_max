import React, { useState, useEffect } from 'react';

const Notifications = ({ usuario }) => {
  const [notificationStatus, setNotificationStatus] = useState('');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [customNotification, setCustomNotification] = useState({
    title: '',
    body: '',
    icon: '/icons/ico1.ico'
  });

  useEffect(() => {
    checkNotificationStatus();
    getSubscriptionInfo();
    loadNotificationHistory();
  }, []);

  const checkNotificationStatus = () => {
    if (!('Notification' in window)) {
      setNotificationStatus('no-support');
      return;
    }

    switch (Notification.permission) {
      case 'granted':
        setNotificationStatus('granted');
        break;
      case 'denied':
        setNotificationStatus('denied');
        break;
      default:
        setNotificationStatus('default');
    }
  };

  const getSubscriptionInfo = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        setSubscriptionInfo({
          endpoint: subscription.endpoint,
          keys: !!subscription.getKey('p256dh')
        });
      }
    } catch (error) {
      console.error('Error al obtener información de suscripción:', error);
    }
  };

  const loadNotificationHistory = async () => {
    setLoadingHistory(true);
    try {
      console.log('[Notifications] Cargando historial de notificaciones...');
      
      // Primero cargar desde localStorage (rápido)
      const localHistory = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
      setNotificationHistory(localHistory);
      
      // Obtener userId (intentar obtenerlo si no está disponible)
      let userId = localStorage.getItem('userId');
      const usuario = localStorage.getItem('usuario');
      
      // Si no hay userId, intentar obtenerlo del servidor
      if (!userId && usuario) {
        try {
          console.log('[Notifications] Intentando obtener userId para usuario:', usuario);
          const userResponse = await fetch(`/api/auth/user-by-telefono/${usuario}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.success && userData.user && (userData.user.id || userData.user._id)) {
              userId = userData.user.id || userData.user._id;
              localStorage.setItem('userId', userId);
              console.log('[Notifications] userId obtenido:', userId);
            }
          }
        } catch (error) {
          console.warn('[Notifications] No se pudo obtener userId:', error);
        }
      }
      
      // Luego cargar desde el servidor
      if (userId) {
        try {
          // Primero obtener las suscripciones activas del usuario
          let activeSubscriptionTypes = [];
          try {
            const subsResponse = await fetch(`/api/subscriptions/${userId}?activeOnly=true`);
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
          const response = await fetch(`/api/notifications/${userId}?limit=50`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.notifications) {
              // Filtrar notificaciones por tipos de suscripción activos
              // Solo mostrar notificaciones de tipos a los que el usuario está suscrito
              let filteredNotifications = [];
              if (activeSubscriptionTypes.length > 0) {
                // Filtrar solo por tipos de suscripción activos
                filteredNotifications = data.notifications.filter(notif => 
                  activeSubscriptionTypes.includes(notif.type)
                );
                console.log(`Filtradas ${filteredNotifications.length} notificaciones de ${data.notifications.length} totales para tipos:`, activeSubscriptionTypes);
              } else {
                // Si no hay suscripciones activas, no mostrar notificaciones del servidor
                console.log('No hay suscripciones activas, no se mostrarán notificaciones del servidor');
                filteredNotifications = [];
              }
              
              // Convertir notificaciones del servidor al formato esperado
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
              
              // Combinar con notificaciones locales y ordenar por fecha
              // Eliminar duplicados por ID
              const allNotificationsMap = new Map();
              
              // Agregar notificaciones del servidor
              serverNotifications.forEach(notif => {
                allNotificationsMap.set(notif.id, notif);
              });
              
              // Agregar notificaciones locales (solo si no están en el servidor)
              localHistory.forEach(notif => {
                if (!allNotificationsMap.has(notif.id)) {
                  allNotificationsMap.set(notif.id, notif);
                }
              });
              
              // Convertir a array y ordenar
              const allNotifications = Array.from(allNotificationsMap.values())
                .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
                .slice(0, 50); // Mantener solo las últimas 50
              
              setNotificationHistory(allNotifications);
            }
          }
        } catch (error) {
          console.error('[Notifications] Error cargando notificaciones del servidor:', error);
          // Si falla, usar solo las locales
        }
      } else {
        console.log('[Notifications] No hay userId disponible, usando solo notificaciones locales');
      }
    } catch (error) {
      console.error('[Notifications] Error general cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveNotificationToHistory = (notification) => {
    const history = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
    const newEntry = {
      ...notification,
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    history.unshift(newEntry);
    history.splice(10); // Mantener solo las últimas 10
    localStorage.setItem('notificationHistory', JSON.stringify(history));
    setNotificationHistory(history);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador no soporta notificaciones');
      return;
    }

    const permission = await Notification.requestPermission();
    checkNotificationStatus();
    
    if (permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        await subscribeToPush(registration);
        await getSubscriptionInfo();
      } catch (error) {
        console.error('Error al suscribirse:', error);
      }
    }
  };

  const subscribeToPush = async (registration) => {
    const VAPID_PUBLIC_KEY = 'BNF7IksZuJmIQTntbVFM02H9fbpsC1QheZNbfI9BuwjPceHSJfkWA5gSHTRvKodt_-mCBMNxB86EEOk9dq1suDY';
    
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

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON())
      });

      setSubscriptionInfo({
        endpoint: subscription.endpoint,
        keys: !!subscription.getKey('p256dh')
      });

    } catch (error) {
      console.error('Error al suscribirse a push:', error);
      throw error;
    }
  };

  const sendTestNotification = async () => {
    try {
      // Mostrar notificación local de prueba
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('🧪 Notificación de Prueba', {
          body: 'Esta es una notificación de prueba local',
          icon: '/icons/ico1.ico',
          badge: '/icons/ico2.ico',
          tag: 'test-notification'
        });
      }
      
      saveNotificationToHistory({
        title: '🧪 Notificación de Prueba',
        body: 'Esta es una notificación de prueba enviada localmente',
        type: 'test'
      });

      alert('✅ Notificación de prueba mostrada');
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      alert('❌ Error al enviar notificación');
    }
  };

  const sendCustomNotification = async () => {
    if (!customNotification.title || !customNotification.body) {
      alert('Por favor completa el título y mensaje');
      return;
    }

    try {
      // Mostrar notificación local
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(customNotification.title, {
          body: customNotification.body,
          icon: customNotification.icon || '/icons/ico1.ico',
          badge: '/icons/ico2.ico',
          tag: 'custom-notification'
        });
      }
      
      saveNotificationToHistory({
        ...customNotification,
        type: 'custom'
      });

      alert('✅ Notificación personalizada mostrada');
      
      // Limpiar formulario
      setCustomNotification({
        title: '',
        body: '',
        icon: '/icons/ico1.ico'
      });
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      alert('❌ Error al enviar notificación');
    }
  };

  const getStatusText = () => {
    switch (notificationStatus) {
      case 'granted': return '✅ Permisos otorgados';
      case 'denied': return '❌ Permisos denegados';
      case 'default': return '⚠️ Permisos no solicitados';
      case 'no-support': return '❌ Navegador no compatible';
      default: return '❓ Estado desconocido';
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('notificationHistory');
    setNotificationHistory([]);
  };

  return (
    <div className="notifications-container">
      <h2>🔔 Gestión de Notificaciones</h2>

      {/* Status Section */}
      <div className="status-section">
        <h3>Estado de Notificaciones</h3>
        <div className="status-info">
          <div className="status-item">
            <strong>Permisos:</strong> {getStatusText()}
          </div>
          
          {subscriptionInfo && (
            <div className="status-item">
              <strong>Suscripción:</strong> 
              <span className={subscriptionInfo.keys ? 'status-success' : 'status-error'}>
                {subscriptionInfo.keys ? '✅ Activa' : '❌ Inactiva'}
              </span>
            </div>
          )}
        </div>

        {notificationStatus === 'default' && (
          <button 
            className="permission-btn"
            onClick={requestNotificationPermission}
          >
            Solicitar Permisos
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="actions-section">
        <h3>Acciones Rápidas</h3>
        <div className="action-buttons">
          {notificationStatus === 'granted' && (
            <>
              <button 
                className="action-btn test-btn"
                onClick={sendTestNotification}
              >
                🧪 Enviar Prueba
              </button>
              
              <button 
                className="action-btn custom-btn"
                onClick={() => {
                  const title = prompt('Título:') || 'Notificación';
                  const body = prompt('Mensaje:') || 'Mensaje de prueba';
                  sendCustomNotification();
                }}
              >
                ⚡ Notificación Rápida
              </button>
            </>
          )}
        </div>
      </div>

      {/* Custom Notification Form */}
      {notificationStatus === 'granted' && (
        <div className="custom-form-section">
          <h3>Notificación Personalizada</h3>
          <div className="form-group">
            <label>Título</label>
            <input
              type="text"
              value={customNotification.title}
              onChange={(e) => setCustomNotification(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Título de la notificación"
            />
          </div>
          
          <div className="form-group">
            <label>Mensaje</label>
            <textarea
              value={customNotification.body}
              onChange={(e) => setCustomNotification(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Mensaje de la notificación"
              rows="3"
            />
          </div>
          
          <button 
            className="send-custom-btn"
            onClick={sendCustomNotification}
            disabled={!customNotification.title || !customNotification.body}
          >
            📤 Enviar Notificación
          </button>
        </div>
      )}

      {/* Notification History */}
      <div className="history-section">
        <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Historial de Notificaciones</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                loadNotificationHistory();
              }}
              disabled={loadingHistory}
              style={{ 
                padding: '0.5rem 1rem', 
                background: loadingHistory ? '#ccc' : '#4caf50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: loadingHistory ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: loadingHistory ? 0.7 : 1
              }}
            >
              {loadingHistory ? '⏳ Cargando...' : '🔄 Actualizar'}
            </button>
            {notificationHistory.length > 0 && (
              <button 
                className="clear-btn" 
                onClick={clearHistory}
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: '#f44336', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                🗑️ Limpiar
              </button>
            )}
          </div>
        </div>
        
        <div className="history-list">
          {notificationHistory.length === 0 ? (
            <p className="no-history">No hay notificaciones aún</p>
          ) : (
            notificationHistory.map(notification => (
              <div key={notification.id || notification._id} className="history-item" style={{
                opacity: notification.read ? 0.7 : 1,
                borderLeft: notification.read ? '3px solid #ccc' : '3px solid #4caf50'
              }}>
                <div className="history-icon">
                  {notification.type === 'test' ? '🧪' : 
                   notification.type === 'alerts' ? '🚨' :
                   notification.type === 'messages' ? '💬' :
                   notification.type === 'updates' ? '🔄' :
                   notification.type === 'promotions' ? '🎁' : '📤'}
                </div>
                <div className="history-content">
                  <h4>{notification.title}</h4>
                  <p>{notification.body}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span className="history-time">
                      {new Date(notification.timestamp || notification.createdAt).toLocaleString()}
                    </span>
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;

