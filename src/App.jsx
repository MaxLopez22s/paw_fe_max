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
    console.log('App - Restoring session:', { savedUsuario, savedIsAdmin });
    if (savedUsuario) {
      setIsLoggedIn(true);
      setUsuario(savedUsuario);
      setIsAdmin(savedIsAdmin);
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