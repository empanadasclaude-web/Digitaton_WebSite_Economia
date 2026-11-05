# Economía de los Negocios — Plataforma web

React + Vite. Estado actual: **Frame 1 · Login**.

## Arrancar

```bash
npm install
cp .env.example .env     # y pega tu Client ID de Google
npm run dev              # http://localhost:5173
```

> Sin `VITE_GOOGLE_CLIENT_ID`, en `npm run dev` aparece un bloque "Modo desarrollo"
> con los correos autorizados para probar el flujo sin Google. Ese bloque no existe
> en el build de producción.

## Obtener el Client ID de Google (una sola vez)

1. [Google Cloud Console](https://console.cloud.google.com/) → crea un proyecto.
2. **APIs y servicios → Pantalla de consentimiento de OAuth** → tipo *Externo*; agrega
   `cichavez@uao.edu.co` y `empanadasclaude@gmail.com` como *usuarios de prueba*.
3. **Credenciales → Crear credenciales → ID de cliente OAuth → Aplicación web**.
4. En *Orígenes autorizados de JavaScript* agrega `http://localhost:5173`
   (y el dominio real cuando se publique).
5. Copia el Client ID en `.env`.

## Quién puede entrar

La lista está en `src/config/auth.js` (`ALLOWED_EMAILS`). Una cuenta de Google que no esté
en la lista es rechazada con un mensaje y nunca se guarda sesión.

> ⚠️ Esta validación corre en el navegador, así que protege la interfaz pero no los datos.
> Cuando agreguemos el backend (JSON, tiempo real, Excel) debe volver a verificar el token
> de Google y la misma lista **en el servidor**.

## Estructura

```
src/
  config/auth.js            lista blanca, Client ID, duración de sesión
  context/AuthContext.jsx   sesión del docente (signIn / signOut)
  components/
    AuroraBackground        fondo con formas para que el vidrio tenga qué refractar
    GlassPanel              panel liquid glass reutilizable
    GlassFilters            filtro SVG de refracción (se monta una vez)
    ProtectedRoute          protege las rutas del docente
  frames/
    Login/                  Frame 1
    Home/                   marcador temporal (Frame 2: panel de cursos y empresas)
  styles/global.css         tokens de diseño
```
