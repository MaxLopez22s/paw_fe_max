import express from 'express';
import webpush from 'web-push';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist')); // Para servir la PWA construida

// Configuración VAPID
const vapidKeys = {
  publicKey: 'BLbz7pe2pc9pZnoILf5q43dkshGp9Z-UA6lKpkZtqVaFyasrLTTrJjeNbFFCOBCGtB2KtWRIO8c04O2dXAhwdvA',
  privateKey: 'NB_Sw6_NpRLOcmnqJD4gG404xsPdilVThhz6dCPFADI'
};

// Configurar web-push con las claves VAPID
webpush.setVapidDetails(
  'mailto:maxfe@ejemplo.com', // Email para VAPID
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Almacenar suscripciones (en producción usarías una base de datos)
const subscriptions = [];

// Usuarios de prueba (en producción usarías una base de datos real)
const users = [
  { telefono: '123456789', password: '123456', nombre: 'Usuario Demo' },
  { telefono: '987654321', password: 'password', nombre: 'Admin' },
  { telefono: '555555555', password: 'test123', nombre: 'Test User' }
];

// Endpoint para login
app.post('/api/login', (req, res) => {
  const { telefono, password } = req.body;
  
  console.log(`Intento de login: ${telefono}`);
  
  // Buscar usuario
  const user = users.find(u => u.telefono === telefono && u.password === password);
  
  if (user) {
    console.log(`Login exitoso para: ${user.nombre}`);
    res.json({
      success: true,
      user: {
        telefono: user.telefono,
        nombre: user.nombre
      },
      message: 'Login exitoso'
    });
  } else {
    console.log(`Login fallido para: ${telefono}`);
    res.status(401).json({
      success: false,
      message: 'Credenciales incorrectas'
    });
  }
});

// Endpoint para recibir suscripciones
app.post('/api/subscribe', (req, res) => {
  const subscription = req.body;
  
  // Verificar que la suscripción no esté ya registrada
  const existingSubscription = subscriptions.find(
    sub => sub.endpoint === subscription.endpoint
  );
  
  if (!existingSubscription) {
    subscriptions.push(subscription);
    console.log('Nueva suscripción registrada:', subscription.endpoint);
  }
  
  res.status(201).json({ message: 'Suscripción registrada exitosamente' });
});

// Endpoint para enviar notificaciones push
app.post('/api/send-notification', async (req, res) => {
  const { title, body, icon, url, tag } = req.body;
  
  if (subscriptions.length === 0) {
    return res.status(400).json({ 
      error: 'No hay suscripciones registradas' 
    });
  }

  const notificationPayload = JSON.stringify({
    title: title || 'Nueva notificación',
    body: body || 'Tienes un nuevo mensaje',
    icon: icon || '/icons/ico1.ico',
    badge: '/icons/ico2.ico',
    tag: tag || 'default-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Abrir',
        icon: '/icons/ico3.ico'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/ico4.ico'
      }
    ],
    data: {
      url: url || '/',
      timestamp: Date.now()
    }
  });

  const promises = subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(subscription, notificationPayload);
      console.log('Notificación enviada exitosamente a:', subscription.endpoint);
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      
      // Si la suscripción es inválida, removerla
      if (error.statusCode === 410) {
        const index = subscriptions.indexOf(subscription);
        if (index > -1) {
          subscriptions.splice(index, 1);
          console.log('Suscripción inválida removida');
        }
      }
    }
  });

  try {
    await Promise.all(promises);
    res.json({ 
      message: `Notificación enviada a ${subscriptions.length} dispositivos`,
      sentTo: subscriptions.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al enviar notificaciones' });
  }
});

// Endpoint para obtener el estado de las suscripciones
app.get('/api/subscriptions', (req, res) => {
  res.json({
    totalSubscriptions: subscriptions.length,
    subscriptions: subscriptions.map(sub => ({
      endpoint: sub.endpoint,
      keys: !!sub.keys
    }))
  });
});

// Endpoint para obtener estadísticas
app.get('/api/stats', (req, res) => {
  res.json({
    totalNotifications: Math.floor(Math.random() * 50) + 10, // Simulado
    lastLogin: new Date().toLocaleString(),
    appVersion: '1.0.0',
    totalUsers: users.length,
    activeSubscriptions: subscriptions.length
  });
});

// Endpoint para perfil de usuario
app.put('/api/profile', (req, res) => {
  const { usuario, settings } = req.body;
  console.log(`Actualizando perfil para usuario: ${usuario}`);
  
  // En una aplicación real, guardarías en la base de datos
  res.json({
    success: true,
    message: 'Perfil actualizado exitosamente'
  });
});

// Endpoint para configuración de la app
app.put('/api/settings', (req, res) => {
  const { usuario, settings } = req.body;
  console.log(`Actualizando configuración para usuario: ${usuario}`);
  
  // En una aplicación real, guardarías en la base de datos
  res.json({
    success: true,
    message: 'Configuración guardada exitosamente'
  });
});

// Endpoint para limpiar suscripciones inválidas
app.delete('/api/subscriptions', async (req, res) => {
  const validSubscriptions = [];
  
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify({
        title: 'Test',
        body: 'Verificando suscripción'
      }));
      validSubscriptions.push(subscription);
    } catch (error) {
      console.log('Suscripción inválida encontrada:', subscription.endpoint);
    }
  }
  
  subscriptions.length = 0;
  subscriptions.push(...validSubscriptions);
  
  res.json({
    message: `Suscripciones limpiadas. ${validSubscriptions.length} suscripciones válidas restantes`,
    validSubscriptions: validSubscriptions.length
  });
});

// Endpoint para probar notificaciones
app.post('/api/test-notification', async (req, res) => {
  const testPayload = JSON.stringify({
    title: '🧪 Notificación de Prueba',
    body: 'Esta es una notificación de prueba enviada desde el servidor',
    icon: '/icons/ico1.ico',
    badge: '/icons/ico2.ico',
    tag: 'test-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Abrir App',
        icon: '/icons/ico3.ico'
      }
    ],
    data: {
      url: '/',
      timestamp: Date.now()
    }
  });

  const promises = subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(subscription, testPayload);
      return { success: true, endpoint: subscription.endpoint };
    } catch (error) {
      return { success: false, endpoint: subscription.endpoint, error: error.message };
    }
  });

  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success).length;
  
  res.json({
    message: `Notificación de prueba enviada`,
    total: subscriptions.length,
    successful,
    failed: subscriptions.length - successful,
    results
  });
});

// Servir la aplicación PWA para todas las rutas no API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📱 Suscripciones registradas: ${subscriptions.length}`);
  console.log(`🔑 Clave pública VAPID: ${vapidKeys.publicKey}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
