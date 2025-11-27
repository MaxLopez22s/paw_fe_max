import React, { useState, useEffect } from 'react';

const Notifications = ({ usuario }) => {
  const [notificationStatus, setNotificationStatus] = useState('');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [notificationHistory, setNotificationHistory] = useState([]);
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

  const loadNotificationHistory = () => {
    const history = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
    setNotificationHistory(history);
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
        <div className="history-header">
          <h3>Historial de Notificaciones</h3>
          {notificationHistory.length > 0 && (
            <button className="clear-btn" onClick={clearHistory}>
              🗑️ Limpiar
            </button>
          )}
        </div>
        
        <div className="history-list">
          {notificationHistory.length === 0 ? (
            <p className="no-history">No hay notificaciones enviadas aún</p>
          ) : (
            notificationHistory.map(notification => (
              <div key={notification.id} className="history-item">
                <div className="history-icon">
                  {notification.type === 'test' ? '🧪' : '📤'}
                </div>
                <div className="history-content">
                  <h4>{notification.title}</h4>
                  <p>{notification.body}</p>
                  <span className="history-time">
                    {new Date(notification.timestamp).toLocaleString()}
                  </span>
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

