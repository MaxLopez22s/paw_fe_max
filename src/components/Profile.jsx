import React, { useState, useEffect } from 'react';

const Profile = ({ usuario }) => {
  const [profile, setProfile] = useState({
    telefono: usuario,
    nombre: '',
    email: '',
    avatar: '',
    preferencias: {
      notificaciones: true,
      tema: 'claro',
      idioma: 'es'
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    // Cargar perfil desde localStorage o API
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, []);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfile(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    try {
      // Guardar en localStorage
      localStorage.setItem('userProfile', JSON.stringify(profile));
      
      // Enviar al servidor (simulado)
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      setSaveMessage('✅ Perfil guardado exitosamente');
      setIsEditing(false);
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('❌ Error al guardar perfil');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const generateAvatar = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const initials = profile.nombre ? profile.nombre.split(' ').map(n => n[0]).join('') : usuario[0];
    
    return (
      <div 
        className="avatar-generated" 
        style={{ backgroundColor: color }}
      >
        {initials.toUpperCase()}
      </div>
    );
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Mi Perfil</h2>
        <button 
          className={`edit-btn ${isEditing ? 'cancel' : ''}`}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {saveMessage && (
        <div className="save-message">{saveMessage}</div>
      )}

      <div className="profile-content">
        {/* Avatar Section */}
        <div className="avatar-section">
          {generateAvatar()}
          <h3>{profile.nombre || `Usuario ${usuario}`}</h3>
          <p>Teléfono: {profile.telefono}</p>
        </div>

        {/* Profile Form */}
        <div className="profile-form">
          <div className="form-group">
            <label>Nombre Completo</label>
            <input
              type="text"
              value={profile.nombre}
              onChange={(e) => handleInputChange('nombre', e.target.value)}
              disabled={!isEditing}
              placeholder="Ingresa tu nombre completo"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!isEditing}
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              value={profile.telefono}
              disabled
              placeholder="Número de teléfono"
            />
            <small>El teléfono no se puede cambiar</small>
          </div>

          {/* Preferences */}
          <div className="preferences-section">
            <h4>Preferencias</h4>
            
            <div className="preference-item">
              <label>
                <input
                  type="checkbox"
                  checked={profile.preferencias.notificaciones}
                  onChange={(e) => handleInputChange('preferencias.notificaciones', e.target.checked)}
                  disabled={!isEditing}
                />
                Recibir notificaciones push
              </label>
            </div>

            <div className="preference-item">
              <label>Tema</label>
              <select
                value={profile.preferencias.tema}
                onChange={(e) => handleInputChange('preferencias.tema', e.target.value)}
                disabled={!isEditing}
              >
                <option value="claro">Claro</option>
                <option value="oscuro">Oscuro</option>
                <option value="auto">Automático</option>
              </select>
            </div>

            <div className="preference-item">
              <label>Idioma</label>
              <select
                value={profile.preferencias.idioma}
                onChange={(e) => handleInputChange('preferencias.idioma', e.target.value)}
                disabled={!isEditing}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>

          {isEditing && (
            <div className="form-actions">
              <button className="save-btn" onClick={handleSave}>
                Guardar Cambios
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className="account-info">
        <h4>Información de la Cuenta</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Usuario desde:</span>
            <span className="info-value">Hoy</span>
          </div>
          <div className="info-item">
            <span className="info-label">Última actualización:</span>
            <span className="info-value">Ahora</span>
          </div>
          <div className="info-item">
            <span className="info-label">Estado:</span>
            <span className="info-value status-active">Activo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

