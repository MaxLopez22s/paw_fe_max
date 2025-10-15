// Archivo para generar y configurar claves VAPID
// IMPORTANTE: Reemplaza estas claves con las tuyas propias

import webpush from 'web-push';

// Generar nuevas claves VAPID (ejecutar solo una vez)
console.log('🔑 Generando claves VAPID...');
const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n📋 Claves VAPID generadas:');
console.log('Clave Pública:', vapidKeys.publicKey);
console.log('Clave Privada:', vapidKeys.privateKey);

console.log('\n📝 Instrucciones:');
console.log('1. Copia la clave pública en:');
console.log('   - src/main.jsx (VAPID_PUBLIC_KEY)');
console.log('   - sw.js (VAPID_PUBLIC_KEY)');
console.log('2. Copia la clave privada en:');
console.log('   - server.js (vapidKeys.privateKey)');
console.log('3. Actualiza el email en server.js (línea de setVapidDetails)');

export default vapidKeys;
