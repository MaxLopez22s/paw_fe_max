import React, { useState, useEffect } from 'react';

const Home = ({ usuario }) => {
  const [stats, setStats] = useState({
    totalNotifications: 0,
    lastLogin: new Date().toLocaleString(),
    appVersion: '1.0.0'
  });

  const [quickActions] = useState([
    {
      id: 'send-notification',
      title: 'Enviar Notificación',
      description: 'Enviar una notificación push a todos los usuarios',
      icon: '📱',
      action: 'sendNotification'
    },
    {
      id: 'view-stats',
      title: 'Ver Estadísticas',
      description: 'Ver estadísticas de uso y notificaciones',
      icon: '📊',
      action: 'viewStats'
    },
    {
      id: 'sync-data',
      title: 'Sincronizar Datos',
      description: 'Sincronizar datos pendientes con el servidor',
      icon: '🔄',
      action: 'syncData'
    },
    {
      id: 'export-data',
      title: 'Exportar Datos',
      description: 'Exportar información del usuario',
      icon: '💾',
      action: 'exportData'
    }
  ]);

  useEffect(() => {
    // Simular carga de estadísticas
    const loadStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.log('Usando estadísticas por defecto');
      }
    };
    
    loadStats();
  }, []);

  const handleQuickAction = async (action) => {
    switch (action) {
      case 'sendNotification':
        // Implementar envío de notificación
        console.log('Enviando notificación...');
        break;
      case 'viewStats':
        console.log('Mostrando estadísticas...');
        break;
      case 'syncData':
        console.log('Sincronizando datos...');
        break;
      case 'exportData':
        console.log('Exportando datos...');
        break;
      default:
        console.log('Acción no implementada:', action);
    }
  };

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h2>¡Bienvenido de vuelta, {usuario}! 👋</h2>
        <p>Aquí tienes un resumen de tu actividad</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🔔</div>
          <div className="stat-info">
            <h3>Notificaciones</h3>
            <p className="stat-number">{stats.totalNotifications}</p>
            <p className="stat-label">Total enviadas</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🕒</div>
          <div className="stat-info">
            <h3>Última Conexión</h3>
            <p className="stat-number">{stats.lastLogin}</p>
            <p className="stat-label">Fecha y hora</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📱</div>
          <div className="stat-info">
            <h3>Versión App</h3>
            <p className="stat-number">{stats.appVersion}</p>
            <p className="stat-label">Actual</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>Estado</h3>
            <p className="stat-number">Online</p>
            <p className="stat-label">Conectado</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>Acciones Rápidas</h3>
        <div className="actions-grid">
          {quickActions.map(action => (
            <button
              key={action.id}
              className="action-card"
              onClick={() => handleQuickAction(action.action)}
            >
              <div className="action-icon">{action.icon}</div>
              <div className="action-content">
                <h4>{action.title}</h4>
                <p>{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3>Actividad Reciente</h3>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">🔐</div>
            <div className="activity-content">
              <p><strong>Sesión iniciada</strong></p>
              <p className="activity-time">Hace unos momentos</p>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">📱</div>
            <div className="activity-content">
              <p><strong>PWA instalada</strong></p>
              <p className="activity-time">Primera visita</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

