import React, { useState } from "react";
import "./styles/login.css"; // Ruta corregida
import { savePending } from "./idb";

const Login = ({ onLogin }) => {
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!telefono || !password || !name) {
      setError("Por favor completa todos los campos obligatorios");
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefono,
          password,
          name,
          email: email || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Error al registrar usuario');
        return;
      }

      const userData = await response.json();
      if (userData.success) {
        setError("✅ Usuario registrado exitosamente. Ahora puedes iniciar sesión.");
        setIsRegistering(false);
        // Limpiar campos
        setPassword("");
        setName("");
        setEmail("");
      }
    } catch (error) {
      console.error('Error en registro:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setError("⚠️ Error de conexión. Verifica que el backend esté corriendo.");
      } else {
        setError("❌ Error al registrar usuario. Intenta nuevamente.");
      }
    }
  };

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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          setError("Credenciales incorrectas. Verifica tu teléfono y contraseña.");
          return;
        }
        throw new Error(errorData.message || 'Error en el servidor');
      }

      const userData = await response.json();
      console.log('Login response:', userData);
      if (userData.success) {
        const adminStatus = userData.user?.isAdmin || false;
        console.log('Login - Admin status:', adminStatus, 'for user:', telefono);
        localStorage.setItem("usuario", telefono);
        localStorage.setItem("isAdmin", adminStatus.toString());
        onLogin(telefono, adminStatus);
      } else {
        setError(userData.message || "Error al iniciar sesión");
      }
    } catch (error) {
      console.error('Error en login:', error);
      
      // Verificar si es un error de conexión
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        // Si falla por conexión, guardar en IndexedDB y registrar sync
        try {
          console.log('Error de conexión. Guardando en IndexedDB...', loginData);
          await savePending(loginData);
          
          // Registrar Background Sync
          if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-posts');
            console.log('Sync registrado para reintentar login');
          }
          
          setError("⚠️ Error de conexión. Verifica que el backend esté corriendo en http://localhost:3001. Los datos se guardaron y se intentarán más tarde.");
        } catch (dbError) {
          console.error('Error al guardar en IndexedDB:', dbError);
          setError("❌ Error grave. Verifica que el backend esté corriendo y que tengas conexión a internet.");
        }
      } else {
        setError(error.message || "Error al iniciar sesión. Intenta nuevamente.");
      }
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">{isRegistering ? "Registrarse" : "Bienvenido"}</h1>
      <form onSubmit={isRegistering ? handleRegister : handleSubmit} className="login-form">
        <input
          type="tel"
          placeholder="Número de teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          required
        />
        {isRegistering && (
          <input
            type="text"
            placeholder="Nombre completo *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {isRegistering && (
          <input
            type="email"
            placeholder="Email (opcional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        {error && <p className={`login-error ${error.includes('✅') ? 'success' : ''}`}>{error}</p>}
        <button type="submit">
          {isRegistering ? "Registrarse" : "Iniciar sesión"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError("");
            setPassword("");
            setName("");
            setEmail("");
          }}
          className="toggle-form-btn"
        >
          {isRegistering ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
        </button>
      </form>
    </div>
  );
};

export default Login;
