import React, { useState } from 'react';
import Profile from './Profile';
import Notifications from './Notifications';
import Settings from './Settings';
import Home from './Home';
import AdminNotifications from './AdminNotifications';
import AdminUsers from './AdminUsers';
import './Dashboard.css';
import './Home.css';
import './Profile.css';
import './Notifications.css';
import './Settings.css';
import './AdminNotifications.css';
import './AdminUsers.css';

const Dashboard = ({ usuario, isAdmin, onLogout }) => {
  const [activeTab, setActiveTab] = useState('home');

  // Debug: verificar estado de admin
  console.log('Dashboard - usuario:', usuario, 'isAdmin:', isAdmin);
  console.log('Dashboard - localStorage isAdmin:', localStorage.getItem('isAdmin'));

  const tabs = [
    { id: 'home', label: '🏠 Inicio', component: Home },
    { id: 'profile', label: '👤 Perfil', component: Profile },
    { id: 'notifications', label: '🔔 Notificaciones', component: Notifications },
    { id: 'settings', label: '⚙️ Configuración', component: Settings },
    ...(isAdmin ? [
      { id: 'admin', label: '👨‍💼 Admin', component: AdminNotifications },
      { id: 'admin-users', label: '👥 Usuarios', component: AdminUsers }
    ] : [])
  ];

  console.log('Dashboard - tabs:', tabs.map(t => t.label));

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Home;

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Mi PWA</h1>
          <div className="user-info">
            <span>Hola, {usuario}</span>
            <button onClick={onLogout} className="logout-btn">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <ActiveComponent usuario={usuario} isAdmin={isAdmin} />
      </main>
    </div>
  );
};

export default Dashboard;
