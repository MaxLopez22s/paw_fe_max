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

  useEffect(() => {
    // Cargar configuración guardada
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    // Cargar suscripciones activas
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const subs = await getActiveSubscriptions();
      setActiveSubscriptions(subs);
    } catch (error) {
      console.error('Error cargando suscripciones:', error);
    }
  };

  const handleSubscribe = async (type) => {
    setLoadingSubs(true);
    try {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        alert('Se necesitan permisos de notificación para suscribirse');
        setLoadingSubs(false);
        return;
      }

      const config = NOTIFICATION_CONFIGS[type] || NOTIFICATION_CONFIGS[NOTIFICATION_TYPES.DEFAULT];
      await subscribeToNotificationType(type, config);
      await loadSubscriptions();
      setSaveStatus(`✅ Suscrito a ${type}`);
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error suscribiéndose:', error);
      setSaveStatus(`❌ Error al suscribirse a ${type}`);
      setTimeout(() => setSaveStatus(''), 3000);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleUnsubscribe = async (type) => {
    setLoadingSubs(true);
    try {
      await unsubscribeFromNotificationType(type);
      await loadSubscriptions();
      setSaveStatus(`✅ Desuscrito de ${type}`);
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error desuscribiéndose:', error);
      setSaveStatus(`❌ Error al desuscribirse de ${type}`);
      setTimeout(() => setSaveStatus(''), 3000);
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(NOTIFICATION_TYPES).map(([key, type]) => {
                const isSubscribed = activeSubscriptions.some(sub => sub.type === type);
                const config = NOTIFICATION_CONFIGS[type];
                
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
                        onClick={() => handleUnsubscribe(type)}
                        disabled={loadingSubs}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loadingSubs ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Desuscribirse
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(type)}
                        disabled={loadingSubs}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#4caf50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loadingSubs ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Suscribirse
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

