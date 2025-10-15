# 🔔 Sistema de Notificaciones Push - PWA

Este proyecto implementa un sistema completo de notificaciones push para una Progressive Web App (PWA).

## 🚀 Características Implementadas

- ✅ **Service Worker** configurado para manejar notificaciones push
- ✅ **Suscripción automática** a notificaciones push
- ✅ **Servidor Express** con endpoints para enviar notificaciones
- ✅ **Interfaz de usuario** para probar las notificaciones
- ✅ **Manejo de clics** en notificaciones
- ✅ **Acciones personalizadas** en notificaciones

## 📋 Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Generar claves VAPID

```bash
node vapid-keys.js
```

Esto generará nuevas claves VAPID. Copia las claves en los siguientes archivos:

- **Clave pública** → `src/main.jsx`, `sw.js`
- **Clave privada** → `server.js`

### 3. Configurar email en server.js

Actualiza la línea en `server.js`:
```javascript
webpush.setVapidDetails(
  'mailto:tu-email@ejemplo.com', // ← Cambiar por tu email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);
```

## 🏃‍♂️ Ejecutar el Proyecto

### Desarrollo (cliente + servidor)
```bash
npm run dev:full
```

### Solo cliente (desarrollo)
```bash
npm run dev
```

### Solo servidor
```bash
npm run server
```

### Producción
```bash
npm run build
npm start
```

## 📡 Endpoints del Servidor

### `POST /api/subscribe`
Registra una nueva suscripción push.

**Body:**
```json
{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

### `POST /api/send-notification`
Envía una notificación push personalizada.

**Body:**
```json
{
  "title": "Título de la notificación",
  "body": "Mensaje de la notificación",
  "icon": "/path/to/icon.png",
  "url": "/path/to/open"
}
```

### `POST /api/test-notification`
Envía una notificación de prueba predefinida.

### `GET /api/subscriptions`
Obtiene información sobre las suscripciones activas.

### `DELETE /api/subscriptions`
Limpia suscripciones inválidas.

## 🎯 Uso de la Interfaz

1. **Inicia sesión** en la aplicación
2. **Solicita permisos** de notificación (si no los tienes)
3. **Envía notificaciones de prueba** usando los botones:
   - 🧪 **Enviar Prueba**: Notificación predefinida
   - ✏️ **Notificación Personalizada**: Crea tu propia notificación

## 🔧 Estructura del Proyecto

```
pwa_fe/
├── src/
│   ├── main.jsx          # Registro del SW y suscripción push
│   ├── App.jsx           # Interfaz de notificaciones
│   └── ...
├── sw.js                 # Service Worker con manejo de push
├── server.js             # Servidor Express con endpoints
├── vapid-keys.js         # Generador de claves VAPID
└── package.json          # Dependencias y scripts
```

## 🔍 Funcionalidades del Service Worker

### Eventos Push
- Recibe y procesa notificaciones push
- Maneja datos personalizados en notificaciones
- Configura acciones y opciones de notificación

### Eventos de Click
- Maneja clics en notificaciones
- Abre/enfoca la aplicación
- Maneja acciones personalizadas (Abrir/Cerrar)

### Eventos de Cierre
- Registra cuando se cierran notificaciones
- Útil para analytics

## 🛠️ Personalización

### Cambiar Iconos
Actualiza las rutas de iconos en:
- `sw.js` (líneas 206, 207, 214, 218)
- `server.js` (líneas de icon y badge)

### Modificar Acciones
Cambia las acciones disponibles en las notificaciones editando el array `actions` en:
- `sw.js` (líneas 210-221)
- `server.js` (líneas de actions)

### Personalizar Estilos
Modifica los estilos de la interfaz en `src/App.jsx` (líneas 181-245).

## 🔒 Seguridad

- Las claves VAPID privadas nunca se exponen al cliente
- Las suscripciones se validan antes de enviar notificaciones
- Las notificaciones inválidas se limpian automáticamente

## 🐛 Troubleshooting

### No recibo notificaciones
1. Verifica que los permisos estén otorgados
2. Revisa la consola del navegador
3. Asegúrate de que el servidor esté ejecutándose
4. Verifica que las claves VAPID sean correctas

### Error de suscripción
1. Verifica que el Service Worker esté registrado
2. Revisa que las claves VAPID sean válidas
3. Asegúrate de que el navegador soporte push

### Notificaciones no aparecen
1. Verifica que no estén bloqueadas por el navegador
2. Revisa la configuración de notificaciones del sistema
3. Prueba en modo incógnito

## 📚 Recursos Adicionales

- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

