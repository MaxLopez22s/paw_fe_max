import React, { useState, useEffect } from "react";
import "./styles/login.css";
import Login from "./Login"; // Importa el componente Login separado
import Dashboard from "./components/Dashboard"; // Importa el nuevo Dashboard

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
        fetch(`/api/auth/user-by-telefono/${savedUsuario}`)
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

  // Si no está logueado, mostrar el Login
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Si está logueado, mostrar el dashboard
  return <Dashboard usuario={usuario} isAdmin={isAdmin} onLogout={handleLogout} />;
};

export default App;