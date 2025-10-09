import React, { useState } from "react";
import "./styles/login.css"; // Ruta corregida
import { savePending } from "./idb";

const Login = ({ onLogin }) => {
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!telefono || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    const loginData = {
      telefono,
      password,
      timestamp: new Date().toISOString()
    };

    try {
      // Para testing: simula un error de red
      // Descomenta la siguiente línea para probar el guardado en IndexedDB
      // throw new Error('Simulación de error de red');

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });

      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem("usuario", telefono);
        onLogin(telefono);
      } else {
        throw new Error('Login falló');
      }
    } catch (error) {
      // Si falla, guardar en IndexedDB y registrar sync
      try {
        console.log('Guardando en IndexedDB...', loginData);
        await savePending(loginData);
        
        // Registrar Background Sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('sync-posts');
          console.log('Sync registrado para reintentar login');
        }
        
        setError("Error de conexión. Los datos se guardaron y se intentarán más tarde.");
      } catch (dbError) {
        console.error('Error al guardar en IndexedDB:', dbError);
        setError("Error grave. Intenta más tarde.");
      }
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">Bienvenido</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="tel"
          placeholder="Número de teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit">Iniciar sesión</button>
      </form>
    </div>
  );
};

export default Login;
