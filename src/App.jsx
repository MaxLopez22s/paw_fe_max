import React, { useState, useEffect } from "react";
import "./styles/login.css";
import Login from "./login.jsx"; // Importa el componente Login separado
import Dashboard from "./components/Dashboard"; // Importa el nuevo Dashboard
import config from "./config";
import { syncPendingRequests, hasPendingRequests } from "./utils/onlineSync";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogin = (telefono, adminStatus = false) => {
    setIsLoggedIn(true);
    setUsuario(telefono);
    setIsAdmin(adminStatus);
    localStorage.setItem("usuario", telefono);
    localStorage.setItem("isAdmin", adminStatus.toString());
    // userId se guarda en login.jsx
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsuario("");
    setIsAdmin(false);
    localStorage.removeItem("usuario");
    localStorage.removeItem("isAdmin");
  };

  // Verificar si hay sesión guardada
  useEffect(() => {
    const savedUsuario = localStorage.getItem("usuario");
    const savedIsAdmin = localStorage.getItem("isAdmin") === "true";
    const savedUserId = localStorage.getItem("userId");
    console.log('App - Restoring session:', { savedUsuario, savedIsAdmin, savedUserId });
    if (savedUsuario) {
      setIsLoggedIn(true);
      setUsuario(savedUsuario);
      setIsAdmin(savedIsAdmin);
      
      // Si no hay userId pero hay usuario, intentar obtenerlo del servidor
      if (!savedUserId && savedUsuario) {
        fetch(`${config.API_URL}/api/auth/user-by-telefono/${savedUsuario}`)
          .then(res => {
            if (res.ok) {
              return res.json();
            }
            throw new Error(`HTTP ${res.status}`);
          })
          .then(data => {
            if (data.success && data.user) {
              const userId = data.user.id || data.user._id;
              if (userId) {
                localStorage.setItem("userId", userId);
                console.log('App - userId restaurado del servidor:', userId);
              } else {
                console.warn('App - Usuario encontrado pero sin id (puede ser usuario de prueba)');
              }
            }
          })
          .catch(err => {
            console.warn('App - No se pudo obtener userId del servidor:', err);
          });
      }
    }
  }, []);

  // Detectar cuando vuelve la conexión y sincronizar automáticamente
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Conexión restaurada');
      
      // Verificar si hay registros pendientes
      const hasPending = await hasPendingRequests();
      
      if (hasPending) {
        // Mostrar notificación de sincronización
        const syncNotification = document.createElement('div');
        syncNotification.id = 'sync-notification';
        syncNotification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          z-index: 10000;
          max-width: 300px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        `;
        syncNotification.innerHTML = `
          <div style="font-size: 1.5rem;">🔄</div>
          <div>
            <div style="font-weight: 600;">Sincronizando datos...</div>
            <div style="font-size: 0.8rem; opacity: 0.9;">Los datos se actualizarán automáticamente</div>
          </div>
        `;
        document.body.appendChild(syncNotification);

        // Sincronizar registros pendientes
        const result = await syncPendingRequests();
        
        // Actualizar notificación
        if (result.success) {
          syncNotification.innerHTML = `
            <div style="font-size: 1.5rem;">✅</div>
            <div>
              <div style="font-weight: 600;">Sincronización completada</div>
              <div style="font-size: 0.8rem; opacity: 0.9;">${result.synced} exitosos, ${result.failed} fallidos</div>
            </div>
          `;
          syncNotification.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
          
          // Disparar evento personalizado para actualizar componentes
          window.dispatchEvent(new CustomEvent('syncCompleted', { 
            detail: { synced: result.synced, failed: result.failed } 
          }));
        } else {
          syncNotification.innerHTML = `
            <div style="font-size: 1.5rem;">⚠️</div>
            <div>
              <div style="font-weight: 600;">Error en sincronización</div>
              <div style="font-size: 0.8rem; opacity: 0.9;">Se reintentará más tarde</div>
            </div>
          `;
          syncNotification.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        }

        // Ocultar notificación después de 3 segundos
        setTimeout(() => {
          if (document.body.contains(syncNotification)) {
            syncNotification.style.transition = 'opacity 0.3s ease';
            syncNotification.style.opacity = '0';
            setTimeout(() => {
              if (document.body.contains(syncNotification)) {
                document.body.removeChild(syncNotification);
              }
            }, 300);
          }
        }, 3000);
      }
    };

    // Escuchar evento online
    window.addEventListener('online', handleOnline);

    // Verificar si ya hay conexión al cargar
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Si no está logueado, mostrar el Login
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Si está logueado, mostrar el dashboard
  return <Dashboard usuario={usuario} isAdmin={isAdmin} onLogout={handleLogout} />;
};

export default App;