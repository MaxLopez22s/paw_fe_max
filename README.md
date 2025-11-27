# PWA Frontend

Frontend React para aplicación PWA con notificaciones push y funcionalidades offline.

## 🚀 Características

- ✅ React 19 con Vite
- ✅ PWA completamente funcional
- ✅ Service Worker con caché offline
- ✅ Notificaciones Push
- ✅ Background Sync
- ✅ IndexedDB para datos offline
- ✅ Instalable como app nativa
- ✅ Responsive design

## 📱 PWA Features

### Service Worker
- Caché de recursos estáticos
- Estrategia Cache First para assets
- Network First para API calls
- Background Sync para datos offline

### Notificaciones Push
- Suscripción automática al cargar
- Manejo de eventos push
- Acciones en notificaciones
- Iconos personalizados

### Offline Support
- Caché de páginas principales
- Sincronización automática
- Almacenamiento en IndexedDB
- Fallback offline

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview
```

## 🌍 Variables de Entorno

```bash
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Mi PWA
VITE_APP_VERSION=1.0.0
VITE_VAPID_PUBLIC_KEY=BLbz7pe2pc9pZnoILf5q43dkshGp9Z-UA6lKpkZtqVaFyasrLTTrJjeNbFFCOBCGtB2KtWRIO8c04O2dXAhwdvA
```

## 🚀 Deploy en Vercel/Netlify

### Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Netlify
1. Conectar repositorio
2. **Build Command**: `npm run build`
3. **Publish Directory**: `dist`
4. Deploy automático

## 📱 Instalación PWA

1. Abrir en navegador móvil/desktop
2. Buscar ícono "Instalar" en barra de direcciones
3. O usar menú del navegador → "Instalar app"
4. La app se instalará como aplicación nativa

## 🎨 Componentes

- **Home**: Página principal
- **Dashboard**: Panel de control
- **Notifications**: Gestión de notificaciones
- **Profile**: Perfil de usuario
- **Settings**: Configuraciones
- **Login**: Autenticación

## 🔧 Configuración

### Vite Config
- Proxy configurado para API
- Host habilitado para desarrollo
- Build optimizado para PWA

### Service Worker
- Versión: v1.2
- Caché de archivos principales
- Manejo de actualizaciones

## 📊 Funcionalidades

### Autenticación
- Login con teléfono/password
- Persistencia de sesión
- Logout automático

### Notificaciones
- Suscripción automática
- Notificaciones personalizadas
- Acciones en notificaciones
- Manejo de clics

### Datos Offline
- Sincronización automática
- Almacenamiento local
- Retry en conexión

## 🧪 Testing

```bash
# Desarrollo local
npm run dev

# Build y preview
npm run build
npm run preview

# Linting
npm run lint
```

## 📱 Navegadores Soportados

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Opera

## 🔒 Seguridad

- HTTPS requerido para PWA
- Service Worker seguro
- Validación de datos
- CORS configurado

## 📈 Performance

- Lazy loading de componentes
- Caché optimizado
- Compresión de assets
- Minificación de código

## 🛠️ Desarrollo

### Scripts Disponibles
```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run preview      # Preview build
npm run lint         # Linting
npm run server       # Servidor estático
npm run start        # Build + servidor
npm run dev:full     # Desarrollo completo
```

### Estructura de Archivos
```
src/
├── components/      # Componentes React
├── assets/         # Recursos estáticos
├── styles/         # Estilos CSS
├── App.jsx         # Componente principal
├── main.jsx        # Punto de entrada
└── idb.js          # IndexedDB utilities
```

## 📞 Soporte

Para problemas o preguntas:
1. Revisar logs del navegador
2. Verificar Service Worker en DevTools
3. Comprobar conectividad con backend
4. Validar permisos de notificaciones




