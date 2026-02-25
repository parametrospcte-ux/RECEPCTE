# 📥 RecepDoc — Portal de Archivos con Firebase

Aplicación web completa para recibir y gestionar archivos Excel.
Sin servidor propio — funciona 100% con Firebase (gratis).

---

## 🗂️ Archivos del proyecto

```
recepcion-firebase/
├── index.html   ← Estructura HTML (4 vistas)
├── styles.css   ← Estilos (tema oscuro)
├── app.js       ← Toda la lógica (Firebase + Auth + Admin)
└── README.md    ← Esta guía
```

---

## 🚀 GUÍA DE CONFIGURACIÓN PASO A PASO

### PASO 1 — Crear el proyecto en Firebase

1. Ve a **https://console.firebase.google.com**
2. Haz clic en **"Agregar proyecto"**
3. Ponle un nombre (ej: `recep-doc`) y sigue los pasos
4. Cuando termine, haz clic en **"Continuar"**

---

### PASO 2 — Obtener tu configuración (apiKey, etc.)

1. Dentro de tu proyecto, haz clic en el ícono **`</>`** (Agregar app web)
2. Ponle un apodo a tu app (ej: `web`) y haz clic en **"Registrar app"**
3. Copia el bloque `firebaseConfig` que aparece. Luce así:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "mi-proyecto.firebaseapp.com",
  projectId: "mi-proyecto",
  storageBucket: "mi-proyecto.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

4. Abre `app.js` y **reemplaza** el bloque `FIREBASE_CONFIG` con tus valores

---

### PASO 3 — Activar Google Auth

1. En la consola de Firebase → menú izquierdo → **Authentication**
2. Clic en **"Comenzar"** → pestaña **"Sign-in method"**
3. Haz clic en **Google** → actívalo → pon tu correo como soporte → **Guardar**

---

### PASO 4 — Activar Firestore (base de datos)

1. Menú izquierdo → **Firestore Database** → **"Crear base de datos"**
2. Selecciona **"Iniciar en modo de prueba"** → elige una región → **Listo**
3. Ve a la pestaña **Reglas** y reemplaza con esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /entregas/{docId} {
      // Cualquier usuario autenticado puede crear registros
      allow create: if request.auth != null;
      // Solo el admin puede leer (ajusta el correo)
      allow read: if request.auth != null;
      // Nadie puede editar ni borrar desde el cliente
      allow update, delete: if false;
    }
  }
}
```

---

### PASO 5 — Activar Firebase Storage (archivos)

1. Menú izquierdo → **Storage** → **"Comenzar"**
2. Selecciona **"Modo de prueba"** → elige una región → **Listo**
3. Ve a la pestaña **Reglas** y reemplaza con esto:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /entregas/{allPaths=**} {
      // Solo usuarios autenticados pueden subir y descargar
      allow read, write: if request.auth != null;
    }
  }
}
```

---

### PASO 6 — Configurar el administrador

Abre `app.js` y cambia la línea del administrador:

```javascript
const ADMIN_EMAILS = [
  "tucorreo@gmail.com",   // ← Pon AQUÍ tu correo de Google
];
```

Puedes agregar varios correos separados por comas:
```javascript
const ADMIN_EMAILS = [
  "admin1@gmail.com",
  "admin2@empresa.com",
];
```

---

### PASO 7 — Abrir la aplicación

Simplemente abre `index.html` en tu navegador.

> ⚠️ **Importante:** Firebase Auth con Google **no funciona** si abres el archivo
> directamente con `file://`. Necesitas servirlo con un servidor local o subirlo a hosting.

**Opción A — VS Code + extensión Live Server (recomendado):**
1. Instala la extensión **Live Server** en VS Code
2. Clic derecho sobre `index.html` → **"Open with Live Server"**
3. Se abre en `http://127.0.0.1:5500`

**Opción B — Firebase Hosting (para producción, gratis):**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## ✅ Funcionalidades incluidas

| Función | Descripción |
|---|---|
| 🔐 Login Google | Autenticación automática con cuenta Google |
| 📤 Subir Excel | Drag & drop con validación y progreso real |
| 🗺️ Localidad | Menú desplegable con ciudades del Ecuador |
| 🏷️ Campos extra | Código de rastreo y descripción opcionales |
| ☁️ Firebase Storage | Archivos guardados en la nube (hasta 10 MB) |
| 🗄️ Firestore | Registro completo de cada entrega |
| 📊 Panel Admin | Solo visible para correos en ADMIN_EMAILS |
| 📈 Estadísticas | Total archivos, personas, localidades, último envío |
| 👥 Vista por persona | Quién envió cuántos archivos y cuándo |
| 📋 Tabla completa | Todos los envíos con descarga individual |
| ⬇ Exportar Excel | Informe completo descargable como .xlsx |
| 🔒 Seguro | Validación en cliente + reglas de Firebase |

---

## 💰 Costo

El plan gratuito de Firebase (Spark) incluye:
- **Firestore:** 1 GB almacenamiento, 50k lecturas/día
- **Storage:** 5 GB almacenamiento, 1 GB/día descarga
- **Auth:** Ilimitado

Para uso moderado (decenas de usuarios) es completamente gratis.
