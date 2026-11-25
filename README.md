
  # MySpa 2

  **SPA · Bienestar y calma**

  Sistema web para administrar sucursales, salas, tratamientos, reservaciones, servicios e inventario de un spa, con una experiencia de cliente instalable como PWA.

  **React 19 · Vite 6 · Node.js · Express · MongoDB Atlas**

---

## Descripción

**MySpa 2** es un proyecto de aplicación web integral para la operación de un spa. Cuenta con un catálogo público de salas y tratamientos, registro y autenticación de clientes, reservaciones por fecha y horario, seguimiento de asistencia y módulos para el personal y la administración.

La aplicación incorpora una **Progressive Web App (PWA)**, un panel con indicadores operativos, control de servicios y consumo de productos. El acceso y las operaciones disponibles dependen del rol del usuario.

> **Alcance:** proyecto de desarrollo y demostración. Para utilizarlo en producción hacen falta pruebas en el entorno de despliegue, configuración segura de credenciales y revisión de los datos de ejemplo.

## Funcionalidades

### Visitante

- Consultar salas, sucursales y tratamientos disponibles.
- Explorar fotografías, descripciones y capacidad de las salas.
- Consultar ubicación y disponibilidad de horarios.
- Registrarse, iniciar sesión o solicitar recuperación de contraseña.

### Cliente

- Gestionar su perfil y contraseña.
- Crear reservaciones por sala, fecha y horario, considerando la capacidad y los asistentes.
- Consultar reservaciones, cancelarlas cuando corresponda y revisar su historial.
- Consultar el detalle de servicios realizados, tratamientos, productos y costos.
- Recibir notificaciones por correo cuando el servicio SMTP esté configurado.

### Empleado

- Consultar la agenda de la sucursal asignada.
- Crear, consultar, modificar y cancelar reservaciones según las reglas del sistema.
- Revisar avisos de inicio y finalización de citas y confirmar asistencia.
- Registrar servicios con tratamientos, asistentes, productos y costos.
- Consultar y gestionar los servicios autorizados para su sucursal.

### Administrador

- Consultar el panel general con estadísticas, reservaciones de hoy, próximas citas, seguimiento de estados y actividad semanal.
- Administrar empleados, clientes, sucursales, salas, horarios, tratamientos y productos.
- Controlar existencias, niveles mínimos y reposiciones de inventario.
- Consultar reservaciones y servicios de todas las sucursales.

### Reservaciones y asistencia

Las reservaciones pueden encontrarse en estado `PENDIENTE`, `ATENDIDA`, `CANCELADA` o `NO_ASISTIO`. Registrar un servicio permite marcar la cita como atendida. Las citas pendientes cuyo horario terminó pueden revisarse desde el panel del personal; si no se resuelven durante el margen configurable, el backend las marca como `NO_ASISTIO`.

## Tecnologías y herramientas

| Capa | Tecnología | Uso |
| --- | --- | --- |
| Frontend | React 19 | Componentes e interfaz de usuario |
| Herramientas frontend | Vite 6 | Desarrollo y compilación |
| Navegación | React Router 7 | Rutas públicas y protegidas |
| Estilos e iconografía | CSS y Lucide React | Diseño responsivo y componentes visuales |
| Estado | Hooks, Context API y `useReducer` | Sesión, formularios y avisos de asistencia |
| Backend | Node.js y Express 4 | API REST y reglas de negocio |
| Base de datos | MongoDB Atlas + driver `mongodb` | Almacenamiento documental e índices |
| Validaciones | Zod | Validación de entradas |
| Autenticación | bcryptjs y cookies de sesión | Contraseñas protegidas y sesiones |
| Correo | Nodemailer / SMTP | Notificaciones y recuperación de contraseña |
| Archivos | Multer | Carga de imágenes |
| Seguridad HTTP | express-rate-limit y protección CSRF | Restricciones y protección de operaciones |
| PWA | Manifest y Service Worker propios | Instalación, caché y avisos de actualización |
| Geolocalización | Google Maps (configuración opcional) | Ubicación de sucursales |
| Pruebas | Node.js Test Runner | Pruebas automatizadas |

## Estructura principal

```text
MySpa2/
├── client/
│   ├── public/                 # Imágenes, iconos y manifest de PWA
│   ├── src/
│   │   ├── components/         # Componentes reutilizables y avisos
│   │   ├── context/            # Contexto de autenticación
│   │   ├── hooks/              # Hooks personalizados
│   │   ├── pages/              # Páginas públicas, cliente y personal
│   │   ├── reducers/           # Reducers de sesión y asistencia
│   │   └── styles/             # Estilos
│   ├── sw.template.js          # Plantilla del Service Worker
│   └── vite.config.js
├── server/
│   └── src/
│       ├── lib/                # Seguridad, base de datos y lógica
│       ├── routes/             # Endpoints de la API REST
│       └── index.js            # Inicio del servidor
├── scripts/                   # Seed y utilidades de mantenimiento
├── tests/                     # Pruebas automatizadas
├── .env.example               # Variables de ejemplo, sin secretos
├── package.json               # Scripts del proyecto
└── README.md
```

## Requisitos

- Node.js **20.19 o superior** y npm.
- Acceso a una instancia de **MongoDB Atlas**.
- Un navegador moderno (Chrome, Edge, Firefox o similar).
- Opcional: una cuenta SMTP para enviar correos y una clave de Google Maps para mostrar ubicaciones.

## Instalación y ejecución local

1. Abre una terminal **CMD** en la carpeta raíz del proyecto.
2. Instala las dependencias:

   ```bat
   npm install
   ```

3. Copia el archivo de configuración y complétalo con tus valores:

   ```bat
   copy .env.example .env
   ```

   Como mínimo, configura `MONGODB_URI`. **No subas `.env` al repositorio.**

4. Comprueba el proyecto:

   ```bat
   npm run verify
   ```

5. Inicia el frontend y el backend:

   ```bat
   npm run dev
   ```

6. Accede a:

   - **Web:** http://127.0.0.1:5173
   - **API:** http://127.0.0.1:4000/api/health

La API utiliza el puerto `4000` por defecto y la base de datos `myspa2` definida en el código del proyecto. La aplicación web corre en el puerto `5173` durante el desarrollo.

### Configuración opcional

| Variable | Descripción |
| --- | --- |
| `MONGODB_URI` | Cadena de conexión privada a MongoDB Atlas |
| `PORT` | Puerto de la API (por defecto `4000`) |
| `WEB_ORIGIN` | Origen permitido del frontend |
| `APP_PUBLIC_URL` | URL pública de la aplicación, usada en enlaces de correo |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envío de mensajes mediante SMTP |
| `RESET_TOKEN_SECRET` | Secreto para firmar los enlaces de restablecimiento de contraseña |
| `MYSPA_NO_SHOW_GRACE_MINUTES` | Margen antes de marcar automáticamente `NO_ASISTIO` (por defecto 120 minutos) |
| `VITE_GOOGLE_MAPS_API_KEY` | Clave pública de navegador para Google Maps, restringida por origen |

**Nota:** las contraseñas de aplicación de Gmail van en `SMTP_PASS`, no en `RESET_TOKEN_SECRET`. La recuperación por correo requiere ambos: SMTP y el secreto de firma. Los enlaces de recuperación caducan a los 20 minutos.

## Datos de demostración (seed)

Para comprobar el contenido de demostración sin modificar la base de datos:

```bat
npm run seed:check
```

Para agregar los datos iniciales que falten, sin reiniciar las colecciones existentes:

```bat
npm run seed
```

**¡Atención!** El siguiente comando es destructivo: elimina los datos administrados por el seed en la base `myspa2` y vuelve a generar los datos de demostración.

```bat
npm run seed -- --reset --confirm-reset=MYSPA2
```

No lo ejecutes sobre una base con información que debas conservar.

> **Seguridad de los ejemplos:** antes de publicar el repositorio, revisa `scripts/seed.mjs`: contiene contraseñas de demostración y registros de ejemplo que deben sustituirse por datos completamente ficticios. No reutilices esas contraseñas en otros sistemas.

## Pruebas y compilación

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Inicia frontend y API en desarrollo |
| `npm run check` | Revisa sintaxis y ejecuta pruebas |
| `npm test` | Ejecuta las pruebas automatizadas |
| `npm run test:attendance` | Prueba autenticación, reducers y asistencia |
| `npm run verify` | Ejecuta comprobaciones y build del frontend |
| `npm run build` | Compila el frontend para producción |
| `npm run start` | Inicia la API con Node.js |
| `npm run seed:check` | Verifica la definición del seed sin alterar MongoDB |

Para probar la versión PWA compilada, utiliza **dos terminales**:

```bat
:: Terminal 1: API
npm run dev -w server
```

```bat
:: Terminal 2: compilación y vista previa
npm run build
npm run preview -w client
```

Abre http://127.0.0.1:4173 para revisar instalación, caché y actualizaciones de la PWA. El Service Worker se registra en la versión compilada, no en el servidor HMR de desarrollo.

### Alcance del funcionamiento offline

La PWA puede conservar la interfaz y determinados recursos públicos consultados previamente. **No** permite crear, modificar o cancelar reservas ni registrar servicios desconectado: esas acciones necesitan la API y una conexión activa. Tampoco se implementa sincronización posterior de escrituras offline.

## Seguridad y organización de datos

- Roles: `CLIENTE`, `EMPLEADO` y `ADMIN`, con autorización en el backend.
- Contraseñas almacenadas con hash mediante bcryptjs.
- Sesiones por cookie `HttpOnly` y comprobación CSRF para operaciones protegidas.
- Límites de solicitudes para operaciones sensibles y validación de entradas.
- Índices de MongoDB para controlar unicidad y referencias lógicas entre colecciones.
- La aplicación utiliza subdocumentos para tratamientos y productos registrados en un servicio.
- Los identificadores numéricos nuevos no dependen de la colección `counters`; los enlaces de recuperación tampoco requieren `passwordResets`.

**Importante para Git:** `.env`, `node_modules/` y `dist/` están excluidos por `.gitignore`. Si alguno llegó a versionarse previamente, debe retirarse del seguimiento de Git. Antes de publicar, comprueba también que no existan datos personales ni credenciales reales en el código o historial del repositorio.

## Estado del proyecto

El repositorio incluye los módulos descritos, las pruebas automatizadas y la configuración para ejecutarlo de forma local. La validación completa de correos SMTP, conexión real a Atlas, PWA instalada y casos de concurrencia se realiza en el entorno donde se despliega la aplicación.
