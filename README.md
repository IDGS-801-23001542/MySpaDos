# MySpa2 · Aplicación web y PWA

React 19 + Vite 6 · Express 4 + Node.js 22 · MongoDB Atlas (base **`myspa2`**). Proyecto continuado desde MySpa2 original; no contiene cuentas, archivos `.env` ni datos reales.

## Inicio rápido

1. Extrae `MySpa2_Final.zip` y abre la carpeta `MySpa2`.
2. Copia tu `.env` **fuera del ZIP** a la raíz, o crea uno a partir de `.env.example`. No lo subas a Git. La aplicación selecciona exclusivamente la base `myspa2`, aunque tu URI incluya otro nombre. Comprueba permisos `readWrite` en Atlas.
3. Usa **Node 22** y ejecuta desde la raíz:

```bash
npm ci
npm run check
npm run seed:check
npm run seed
npm run dev
```

4. Abre `http://127.0.0.1:5173`.

El primer `seed` imprime contraseñas **temporales aleatorias** solo para cuentas nuevas. Guárdalas privadamente y cámbialas tras el primer acceso. Para la cuenta demostrativa `admin.myspa2` puedes establecer `SEED_ADMIN_PASSWORD` en `.env` *antes del primer seed*. El seed normal no elimina ni reemplaza registros existentes. Crea empleados, clientes, sucursales, salas, horarios, productos, tratamientos, reservas y servicios maestro-detalle.

**Solo para un borrado voluntario de `myspa2`:** `npm run seed -- --reset --confirm-reset=MYSPA2`. Esta operación es destructiva y exige el indicador explícito de confirmación. Nunca apunta a `myspa`.

## Producción e instalación PWA

```bash
npm run build
npm start
```

Visita la aplicación compilada en `http://127.0.0.1:4000` o publícala detrás de **HTTPS**. Ajusta `NODE_ENV=production`, `APP_PUBLIC_URL` y `WEB_ORIGIN` al dominio HTTPS real; configura `SMTP_*` para enviar correos y recuperar contraseñas. Los mapas usan coordenadas y el iframe de Google Maps (necesitan conexión). Las sucursales demostrativas son ficticias.

Para probar la PWA localmente en Vite Preview: inicia por separado la API con `npm run dev -w server`; después `npm run build` y `npm run preview -w client`; abre `http://127.0.0.1:4173`. El Service Worker se registra en producción/preview, **no** en el servidor de desarrollo con hot reload.

La PWA instala iconos, manifest, arranque standalone y un Service Worker versionado. Después de abrir y cargar la aplicación por primera vez, se permite consultar sin conexión la **interfaz** y las respuestas públicas ya cargadas de sucursales, salas, horarios y tratamientos. Google Maps, imágenes subidas, disponibilidad en tiempo real, cuentas, historial, reservas, cambios, cancelaciones y servicios **requieren conexión**. No hay cola de escritura offline. Para ver cambios en SW aparece un aviso de actualización. La opción de instalar depende del navegador.

## Funciones y seguridad

- Empleado: administra catálogos y datos, y gestiona las reservaciones y servicios de su sucursal. Reporte servicio → tratamientos → productos, con sus costos históricos.
- Cliente: registro, perfil, consulta de salas, reservaciones propias, cancelaciones e historial de servicios con costos.
- API: sesiones mediante cookie HttpOnly y protección CSRF, bcrypt, roles en backend, transacciones multi-documento Atlas, índices únicos y bloqueo de franja por sala/fecha/horario. Fotografías de empleados no son públicas.
- Número de empleado: `E` + cuatro letras del RFC + timestamp único. Número de cliente: cuatro letras del RFC o algoritmo alternativo del PDF + timestamp único. Un contador lógico en MongoDB evita colisiones de timestamp bajo concurrencia.
- SMTP es necesario para **entregar** mensajes; sin SMTP las operaciones se registran, pero los correos no se envían.

## Verificaciones y limitaciones

`npm run test` ejecuta pruebas sin red de RFC, dinero, fechas y reglas estáticas del SW. `npm run check` añade comprobaciones de sintaxis API y JSX (cuando las dependencias estén instaladas). **Las pruebas funcionales contra Atlas y las de instalación/offline real requieren ejecutarse en tu equipo con `.env` y navegador.** Consulta `AUDITORIA.md` para la matriz RF/RNF y limitaciones verificadas.
