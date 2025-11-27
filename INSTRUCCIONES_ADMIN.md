# Instrucciones para Ver el Panel de Administración

## Problema: No aparece la pestaña "👨‍💼 Admin"

Si no ves la pestaña de administración, sigue estos pasos:

### 1. Verificar que estés logueado como Admin

**Credenciales de Admin:**
- Teléfono: `987654321`
- Contraseña: `password`

### 2. Limpiar la Caché del Navegador

#### Opción A: Limpiar desde DevTools (Recomendado)
1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña **Application** (o **Aplicación**)
3. En el menú lateral, busca **Service Workers**
4. Haz clic en **Unregister** para desregistrar el service worker
5. Ve a **Storage** → **Clear site data**
6. Recarga la página (Ctrl + Shift + R o Cmd + Shift + R)

#### Opción B: Limpiar desde el Navegador
1. Presiona **Ctrl + Shift + Delete** (Windows) o **Cmd + Shift + Delete** (Mac)
2. Selecciona "Caché" y "Datos de sitios web"
3. Haz clic en "Borrar datos"
4. Recarga la página

### 3. Verificar en la Consola

Abre la consola del navegador (F12) y verifica estos mensajes:

```
Login response: { success: true, user: { ..., isAdmin: true } }
Login - Admin status: true for user: 987654321
Dashboard - usuario: 987654321 isAdmin: true
Dashboard - tabs: ['🏠 Inicio', '👤 Perfil', '🔔 Notificaciones', '⚙️ Configuración', '👨‍💼 Admin']
```

Si `isAdmin` es `false`, el problema está en el login o en el backend.

### 4. Verificar el Backend

Asegúrate de que el backend esté corriendo y que la ruta `/api/auth/login` esté funcionando correctamente.

Prueba con:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"telefono":"987654321","password":"password"}'
```

Deberías ver en la respuesta:
```json
{
  "success": true,
  "user": {
    "telefono": "987654321",
    "nombre": "Admin",
    "email": "admin@test.com",
    "isAdmin": true
  }
}
```

### 5. Forzar Actualización del Service Worker

Si el problema persiste:

1. Abre la consola (F12)
2. Ejecuta:
```javascript
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});
```
3. Recarga la página (Ctrl + Shift + R)

### 6. Verificar localStorage

En la consola, ejecuta:
```javascript
console.log('Usuario:', localStorage.getItem('usuario'));
console.log('isAdmin:', localStorage.getItem('isAdmin'));
```

Si `isAdmin` no es `"true"`, cierra sesión y vuelve a iniciar sesión como admin.

## Solución Rápida

1. **Cierra sesión** (si estás logueado)
2. **Limpia la caché** (Ctrl + Shift + Delete)
3. **Recarga la página** (Ctrl + Shift + R)
4. **Inicia sesión como admin** (987654321 / password)
5. Deberías ver la pestaña "👨‍💼 Admin"

## Si el problema persiste

Verifica que:
- El backend esté corriendo en `http://localhost:3001`
- Estés usando las credenciales correctas del admin
- No haya errores en la consola del navegador
- El service worker esté actualizado (versión v1.4)



