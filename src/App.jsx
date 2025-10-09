import React, { useState } from "react";
import "./styles/login.css";
import Login from "./Login"; // Importa el componente Login separado

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
  return (
    <div className="dashboard-container">
      <h1>Bienvenido, {usuario}</h1>
      <p>Has iniciado sesión correctamente</p>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
};

export default App;