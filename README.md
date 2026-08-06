# frontAgentPR

Panel web del revisor automático de merge requests. Login con Google y
configuración del bot sin tocar código: varios servidores de GitLab, sus
proyectos y sus reglas, cada uno con sus ajustes.

Habla con el backend [`webhookAgentPR`](https://github.com/juanromero2719/webhookAgentPR),
que es el único que toca la base de datos.

Next.js 16 (App Router) + Auth.js v5. **El frontend no tiene base de datos
propia**: la sesión vive cifrada en una cookie (JWT) y los datos los sirve el
backend.

## Qué se puede configurar desde aquí

| Sección | Qué hace |
| --- | --- |
| Servidores | URL de GitLab, token del bot, API key de OpenAI, usuario del bot, TLS |
| Ajustes de revisión | Límites de diff, modelo, esfuerzo de razonamiento, idioma, severidades en línea, disparadores. A nivel de servidor y, pisándolos, de proyecto |
| Proyectos | Alta, activación y ajustes propios. Los que mandan webhooks sin estar dados de alta aparecen solos, desactivados |
| Reglas | Markdown editable que sustituye a `project_rules/*.md`. Como convenciones (fuente de severidad MEDIA) o como alcance propio que reemplaza el normal |
| Contexto extra | Ficheros del repo que se adjuntan al prompt cuando el diff toca algo que encaja con un patrón |
| Accesos | Invitación por correo de Google con rol `viewer`, `editor` u `owner` |
| Webhook | El secreto del servidor, para pegarlo en GitLab |

**Campo vacío = hereda.** Un ajuste que no defines lo aporta el nivel superior:
el servidor para un proyecto, y las variables de entorno del backend para un
servidor. Por eso los formularios no se rellenan con valores por defecto.

Los cambios se aplican en la **siguiente revisión**, sin redespliegue.

## Cómo funciona la autenticación

```
navegador                  frontAgentPR (servidor)              webhookAgentPR
    │                                │                                │
    │ 1. login con Google ──────────>│                                │
    │                                │  guarda el id_token de Google  │
    │                                │  en la cookie de sesión        │
    │ 2. GET /api/backend/health_2 ─>│                                │
    │                                │ 3. ¿hay sesión? Authorization: │
    │                                │    Bearer <id_token> ─────────>│
    │                                │                    4. valida el token
    │                                │                       contra Google y
    │                                │                       comprueba que la
    │                                │                       audiencia sea el
    │                                │                       client_id propio
    │ <────────────── 5. respuesta ──│<───────────────────────────────│
```

Tres detalles que importan:

- **El navegador nunca ve el `id_token`.** El token de Google solo se lee en el
  servidor, en [`app/api/backend/[...path]/route.ts`](app/api/backend/[...path]/route.ts).
  Ese proxy es el único camino hacia el backend, y solo deja pasar las rutas de
  su lista blanca para que no sea un túnel abierto a todo el backend, `/webhook`
  incluido.
- **El backend valida de verdad quién llama**, no se fía de que el frontend diga
  "este usuario está logueado": comprueba la firma del token con Google y que
  haya sido emitido para nuestro cliente OAuth.
- **Los permisos los decide el backend**, según el rol que tengas sobre cada
  servidor. La interfaz esconde los botones que no puedes usar, pero eso es
  comodidad, no seguridad: aunque los fuerces, el backend responde 403.

El `id_token` de Google caduca en 1 hora; [`auth.ts`](auth.ts) lo renueva solo
con el `refresh_token`, así que la sesión no se cae al cabo de una hora.

## Puesta en marcha

### 1. Credenciales de Google

En [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
**Crear credenciales** → **ID de cliente de OAuth 2.0** → tipo **Aplicación web**:

| Campo | Valor (desarrollo) |
| --- | --- |
| Orígenes autorizados de JavaScript | `http://localhost:3000` |
| URI de redireccionamiento autorizados | `http://localhost:3000/api/auth/callback/google` |

Al desplegar en Vercel, añade también el dominio de producción:
`https://TU-APP.vercel.app` y `https://TU-APP.vercel.app/api/auth/callback/google`.

Si la pantalla de consentimiento está en modo **Prueba**, añade tu cuenta en
*Usuarios de prueba* o el login fallará.

### 2. Variables de entorno

```bash
cp .env.example .env.local
npx auth secret          # genera AUTH_SECRET y lo escribe en .env.local
```

Rellena `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` con las credenciales del paso 1.
`BACKEND_URL` ya apunta al backend en producción.

### 3. Arrancar

```bash
npm install
npm run dev            # http://localhost:3000
```

### 4. Configurar el backend

El backend necesita saber qué audiencia exigir en los tokens. En el proyecto
`webhookAgentPR` (variables de entorno de Vercel, entorno *Production*):

```
GOOGLE_CLIENT_ID=<el MISMO AUTH_GOOGLE_ID de aquí>
DATABASE_URL=<cadena del pooler de Supabase, puerto 6543>
```

Opcionalmente, para restringir quién puede autenticarse:

```
ALLOWED_EMAILS=tu@correo.com
ALLOWED_EMAIL_DOMAINS=unillanos.edu.co
```

Sin `GOOGLE_CLIENT_ID`, todos los endpoints del panel responden `503`. Con él mal
puesto, `401`. Sin `DATABASE_URL`, `/health_2` funciona pero `/api/**` responde
`503`: no hay dónde guardar la configuración.

El esquema de la base de datos y cómo importar la configuración que ya tenías
están en [`migrations/README.md`](../webhookAgentPR/migrations/README.md) del
backend.

### 5. Primer servidor

1. Entra al panel y pulsa **Añadir servidor**.
2. Rellena la URL de GitLab y el token del bot, y usa **Probar conexión** para
   confirmar que el token vale antes de seguir.
3. En la sección **Webhook**, pulsa **Mostrar** y copia el secreto.
4. En GitLab: *Proyecto → Settings → Webhooks → Add new webhook*, con la URL
   `<backend>/webhook`, ese secreto, y los disparadores *Merge request events* y
   *Comments*.
5. Asigna el bot a un MR. El proyecto aparecerá solo en el panel, desactivado:
   actívalo y ya se revisa.

## Estructura

| Fichero | Qué hace |
| --- | --- |
| [auth.ts](auth.ts) | Configuración de Auth.js: proveedor Google, sesión JWT, renovación del `id_token` |
| [app/api/auth/[...nextauth]/route.ts](app/api/auth/[...nextauth]/route.ts) | Endpoints de login/logout/callback |
| [app/api/backend/[...path]/route.ts](app/api/backend/[...path]/route.ts) | Proxy autenticado al backend + lista blanca de rutas |
| [lib/api.ts](lib/api.ts) | Cliente del backend: traduce los errores de FastAPI a mensajes mostrables |
| [lib/types.ts](lib/types.ts) | Formas que devuelve la API de configuración |
| [app/page.tsx](app/page.tsx) | Portada con el botón de Google |
| [app/dashboard/page.tsx](app/dashboard/page.tsx) | Panel (redirige a la portada si no hay sesión) |
| [app/dashboard/servers-panel.tsx](app/dashboard/servers-panel.tsx) | Listado y alta de servidores |
| [app/dashboard/servers/[id]/server-detail.tsx](app/dashboard/servers/[id]/server-detail.tsx) | Detalle: ajustes, webhook, reglas y zona peligrosa |
| [app/dashboard/servers/[id]/projects-section.tsx](app/dashboard/servers/[id]/projects-section.tsx) | Proyectos, con sus ajustes y reglas propias |
| [app/dashboard/servers/[id]/members-section.tsx](app/dashboard/servers/[id]/members-section.tsx) | Invitaciones y roles |
| [components/review-config-form.tsx](components/review-config-form.tsx) | Editor de ajustes, compartido por servidor y proyecto |
| [components/rules-editor.tsx](components/rules-editor.tsx) | Editor de reglas en markdown |
| [components/extra-context-editor.tsx](components/extra-context-editor.tsx) | Tabla de contexto extra |
| [types/next-auth.d.ts](types/next-auth.d.ts) | Tipos de los campos propios de la sesión y el JWT |

## Añadir un endpoint nuevo del backend

Todo lo que el backend expone bajo `/api/` ya pasa por el proxy. Para una ruta
fuera de ese prefijo (como `/health_2`), añádela a `ALLOWED_EXACT` en
[app/api/backend/[...path]/route.ts](app/api/backend/[...path]/route.ts).

Desde el cliente se llama con el helper, que ya apunta al proxy:

```ts
import { api } from "@/lib/api";

const servidores = await api.get<Server[]>("/api/servers");
await api.patch(`/api/projects/${id}`, { enabled: true });
```

## Despliegue en Vercel

Repo aparte del backend. En la configuración del proyecto:

- **Framework**: Next.js (se detecta solo).
- **Variables de entorno**: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
  `BACKEND_URL`. `AUTH_URL` no hace falta: Vercel la deduce.
- No hace falta base de datos ni ningún almacenamiento.
