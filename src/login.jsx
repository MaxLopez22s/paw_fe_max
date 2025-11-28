import React, { useState } from "react";
<<<<<<< HEAD
import "./styles/login.css";
import { savePending } from "./idb";
import config from "./config";
=======
import "./styles/login.css"; // Ruta corregida
import { savePending } from "./idb";
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf

const Login = ({ onLogin }) => {
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

<<<<<<< HEAD
  // ---------- REGISTRO ----------
=======
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!telefono || !password || !name) {
      setError("Por favor completa todos los campos obligatorios");
      return;
    }

    try {
<<<<<<< HEAD
      const response = await fetch(`${config.API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
=======
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
        body: JSON.stringify({
          telefono,
          password,
          name,
<<<<<<< HEAD
          email: email || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Error al registrar usuario");
        return;
      }

      if (data.success) {
        setError("✅ Usuario registrado exitosamente. Ahora puedes iniciar sesión.");
        setIsRegistering(false);
=======
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
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
        setPassword("");
        setName("");
        setEmail("");
      }
    } catch (error) {
<<<<<<< HEAD
      console.error("Error en registro:", error);
      setError("⚠️ Error de conexión con el servidor.");
    }
  };

  // ---------- LOGIN ----------
=======
      console.error('Error en registro:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setError("⚠️ Error de conexión. Verifica que el backend esté corriendo.");
      } else {
        setError("❌ Error al registrar usuario. Intenta nuevamente.");
      }
    }
  };

>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!telefono || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    const loginData = {
      telefono,
      password,
<<<<<<< HEAD
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${config.API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const userData = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError("Credenciales incorrectas.");
          return;
        }
        throw new Error(userData.message || "Error en el servidor");
      }

      if (userData.success) {
        const adminStatus = userData.user?.isAdmin || false;
        const userId = userData.user?._id || userData.user?.id || null;

        localStorage.setItem("usuario", telefono);
        localStorage.setItem("isAdmin", adminStatus.toString());
        if (userId) localStorage.setItem("userId", userId);

=======
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
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
        onLogin(telefono, adminStatus);
      } else {
        setError(userData.message || "Error al iniciar sesión");
      }
    } catch (error) {
<<<<<<< HEAD
      console.error("Error en login:", error);

      if (error.message.includes("Failed to fetch")) {
        // Guarda login offline
        await savePending(loginData);
        setError("⚠️ Sin conexión. El login se reintentará automáticamente.");
      } else {
        setError("❌ Error al iniciar sesión.");
=======
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
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
      }
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">{isRegistering ? "Registrarse" : "Bienvenido"}</h1>
<<<<<<< HEAD
      <form
        onSubmit={isRegistering ? handleRegister : handleSubmit}
        className="login-form"
      >
=======
      <form onSubmit={isRegistering ? handleRegister : handleSubmit} className="login-form">
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
        <input
          type="tel"
          placeholder="Número de teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          required
        />
<<<<<<< HEAD

=======
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
        {isRegistering && (
          <input
            type="text"
            placeholder="Nombre completo *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
<<<<<<< HEAD

=======
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
<<<<<<< HEAD

=======
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
        {isRegistering && (
          <input
            type="email"
            placeholder="Email (opcional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
<<<<<<< HEAD

        {error && (
          <p className={`login-error ${error.includes("✅") ? "success" : ""}`}>
            {error}
          </p>
        )}

        <button type="submit">
          {isRegistering ? "Registrarse" : "Iniciar sesión"}
        </button>

=======
        {error && <p className={`login-error ${error.includes('✅') ? 'success' : ''}`}>{error}</p>}
        <button type="submit">
          {isRegistering ? "Registrarse" : "Iniciar sesión"}
        </button>
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
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
<<<<<<< HEAD
          {isRegistering
            ? "¿Ya tienes cuenta? Inicia sesión"
            : "¿No tienes cuenta? Regístrate"}
=======
          {isRegistering ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
>>>>>>> bb931a92cce45860a90493e824c36613198ef7bf
        </button>
      </form>
    </div>
  );
};

export default Login;
