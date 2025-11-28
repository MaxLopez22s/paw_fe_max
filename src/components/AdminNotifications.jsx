import React, { useState, useEffect } from 'react';
import { NOTIFICATION_TYPES } from '../utils/pushNotifications';
import { postWithSync } from '../utils/apiWithSync';
import './AdminNotifications.css';

const AdminNotifications = ({ usuario, isAdmin }) => {
  const [subscriptionStats, setSubscriptionStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  
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
    }
  }, [isAdmin]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/notifications/admin/subscription-stats?adminTelefono=${usuario}`);
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
        setMessage(`✅ Notificación enviada: ${result.sent} exitosas, ${result.failed} fallidas de ${result.total} total`);
        
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

        // Recargar estadísticas
        await loadStats();
      } else {
        setMessage(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error enviando notificación:', error);
      if (error.message.includes('Sin conexión') || error.message.includes('sincronización')) {
        setMessage(`⚠️ ${error.message}`);
      } else {
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

      {/* Información adicional */}
      <div className="info-section">
        <h4>ℹ️ Información</h4>
        <ul>
          <li>Las notificaciones se enviarán solo a usuarios con suscripciones activas del tipo seleccionado</li>
          <li>Cada suscripción puede tener su propia configuración (icono, badge, vibración, etc.)</li>
          <li>Las notificaciones se guardarán en el historial de cada usuario</li>
          <li>Las suscripciones inválidas se desactivarán automáticamente</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminNotifications;

