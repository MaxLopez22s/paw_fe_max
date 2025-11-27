import React, { useState } from "react";
import "./styles/login.css";
import { savePending } from "./idb";

const API_URL = "https://pwa-be-max.onrender.com";

const Login = ({ onLogin }) => {
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // ---------- REGISTRO ----------
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!telefono || !password || !name) {
      setError("Por favor completa todos los campos obligatorios");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono,
          password,
          name,
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
        setPassword("");
        setName("");
        setEmail("");
      }
    } catch (error) {
      console.error("Error en registro:", error);
      setError("⚠️ Error de conexión con el servidor.");
    }
  };

  // ---------- LOGIN ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!telefono || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    const loginData = {
      telefono,
      password,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
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

        onLogin(telefono, adminStatus);
      } else {
        setError(userData.message || "Error al iniciar sesión");
      }
    } catch (error) {
      console.error("Error en login:", error);

      if (error.message.includes("Failed to fetch")) {
        // Guarda login offline
        await savePending(loginData);
        setError("⚠️ Sin conexión. El login se reintentará automáticamente.");
      } else {
        setError("❌ Error al iniciar sesión.");
      }
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">{isRegistering ? "Registrarse" : "Bienvenido"}</h1>
      <form
        onSubmit={isRegistering ? handleRegister : handleSubmit}
        className="login-form"
      >
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

        {error && (
          <p className={`login-error ${error.includes("✅") ? "success" : ""}`}>
            {error}
          </p>
        )}

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
          {isRegistering
            ? "¿Ya tienes cuenta? Inicia sesión"
            : "¿No tienes cuenta? Regístrate"}
        </button>
      </form>
    </div>
  );
};

export default Login;
