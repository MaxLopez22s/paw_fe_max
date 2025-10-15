import React, { useState, useEffect } from "react";
import "./styles/login.css";
import Login from "./Login"; // Importa el componente Login separado
import Dashboard from "./components/Dashboard"; // Importa el nuevo Dashboard

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usuario, setUsuario] = useState("");

  const handleLogin = (telefono) => {
    setIsLoggedIn(true);
    setUsuario(telefono);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsuario("");
    localStorage.removeItem("usuario");
  };

  // Si no está logueado, mostrar el Login
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Si está logueado, mostrar el dashboard
  return <Dashboard usuario={usuario} onLogout={handleLogout} />;
};

export default App;