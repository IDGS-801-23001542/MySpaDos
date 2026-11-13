# Auditoría de cumplimiento · MySPA.pdf (6 páginas)

**Lectura:** `Código` = implementación encontrada o incorporada y sintaxis revisada, **NO** significa prueba de integración aprobada. `Parcial` = hay limitación conocida o falta condición externa. `No aplica` = excluido expresamente de la entrega web. El PDF incluye además un diagrama E-R en la página 6.

**Pruebas realmente ejecutadas:** sintaxis de 18 módulos API/seed, 12 aserciones unitarias de números, fechas y costos; 11 verificaciones estáticas PWA, parseo de 40 archivos JS/JSX y 168 imports sin rutas locales faltantes; `seed:check`; intento de borrado sin confirmación (rechazado).

**No ejecutadas:** npm ci (red/registro npm inaccesible), compilación Vite (`vite: not found`), API HTTP real, CRUD sobre Atlas, envío SMTP, instalación PWA en navegador, captura visual responsive, pruebas de permisos/concurrencia en BD. No son pruebas aprobadas.

## RF 01 · Empleados

| ID | Verificación | Estado |
|---|---|---|
| 0101 | Alta y datos personales, fotografía, credenciales, estatus | Código |
| 0102 | E + cuatro letras de RFC + timestamp lógico único | Código |
| 0103 | Modificación sin cambiar el número asignado | Código |
| 0104 | Baja lógica y desactivación de acceso | Código |
| 0105 | Búsqueda por campos de catálogo (no todos los metadatos) | Parcial |
| 0106 | Activos por defecto y filtro de inactivos | Código |

## RF 02 · Clientes

| ID | Verificación | Estado |
|---|---|---|
| 0201 | Alta, usuario único, datos de perfil y credenciales | Código |
| 0202 | RFC o sustitución por apellidos/nombre + timestamp | Código |
| 0203 | Búsqueda de campos visibles (no todos los metadatos) | Parcial |
| 0204 | Modificación sin cambiar el número único | Código |
| 0205 | Baja lógica e invalidación de sesiones | Código |
| 0206 | Catálogo con activos/inactivos | Código |

## RF 03 · Productos

| ID | Verificación | Estado |
|---|---|---|
| 0301 | Alta con precio de uso validado a dos decimales | Código |
| 0302 | Búsqueda de nombre, marca, estatus y precio | Código |
| 0303 | Modificación preservando identificador | Código |
| 0304 | Baja lógica | Código |
| 0305 | Listados y filtro por estatus | Código |

## RF 04 · Sucursales

| ID | Verificación | Estado |
|---|---|---|
| 0401 | Alta con latitud/longitud válidas | Código |
| 0402 | Búsquedas por campos relevantes | Código |
| 0403 | Modificación | Código |
| 0404 | Baja lógica protegida si hay salas activas | Código |
| 0405 | Activos/inactivos | Código |
| 0406 | Google Maps incrustado al visualizar detalles | Código |

## RF 05 · Salas

| ID | Verificación | Estado |
|---|---|---|
| 0501 | Alta con sucursal y carga de fotografía | Código |
| 0502 | Búsqueda por nombre, descripción y sucursal | Código |
| 0503 | Modificación | Código |
| 0504 | Baja lógica, protege reservas próximas | Código |
| 0505 | Catálogo público y filtro por sucursal; admin por estatus | Código |

## RF 06 · Horarios

| ID | Verificación | Estado |
|---|---|---|
| 0601 | Alta de inicio/fin y control de superposición | Código |
| 0602 | Búsqueda por inicio/fin | Código |
| 0603 | Modificación si no tiene reservaciones | Código |
| 0604 | Eliminación física cuando no se usa en reservaciones | Código |
| 0605 | Listado | Código |

## RF 07 · Reservaciones

| ID | Verificación | Estado |
|---|---|---|
| 0701 | Alta validada, sin duplicar una misma franja | Código |
| 0702 | Búsqueda en listado limitado a 300 registros | Parcial |
| 0703 | Edición exclusiva por empleado de la sucursal | Código |
| 0704 | Cancelación cambia a CANCELADA y libera franja | Código |
| 0705 | Listado de más reciente a anterior (máx. 300) | Parcial |
| 0706 | Correos en alta/cancelación; requiere SMTP real | Parcial |

## RF 08 · Tratamientos

| ID | Verificación | Estado |
|---|---|---|
| 0801 | Alta de nombre, descripción y estatus | Código |
| 0802 | Búsqueda por campos | Código |
| 0803 | Modificación | Código |
| 0804 | Baja lógica | Código |
| 0805 | Listado | Código |

## RF 09 · Servicios

| ID | Verificación | Estado |
|---|---|---|
| 0901 | Alta con reservación, empleado, fecha y tratamientos | Código |
| 0902 | Búsqueda en listado cargado (máx. 300) | Parcial |
| 0903 | Modificación del detalle | Código |
| 0904 | Eliminación física | Código |
| 0905 | Maestro-detalle y costos en tres niveles | Código |

## RF 10 · Tratamientos en servicios

| ID | Verificación | Estado |
|---|---|---|
| 1001 | N tratamientos y N productos por tratamiento | Código |
| 1002 | Búsqueda de catálogo para asociar | Código |
| 1003 | Modificación del detalle del servicio | Código |
| 1004 | Eliminación física del servicio | Código |
| 1005 | Listado de servicios | Código |

## RNF · Seguridad y experiencia

| ID | Verificación | Estado |
|---|---|---|
| 0101 | Usuarios con rol CLIENTE o EMPLEADO, hash y sesión | Código |
| 0102 | Aplicación de escritorio (fuera del alcance web) | No aplica |
| 0103 | Área separada para empleados y módulos administrativos | Código |
| 0104 | Cliente limitado a perfil, reservas y su historial | Código |
| 02 | Diseño responsivo en CSS; navegador aún sin comprobar | Parcial |
| 03 | Colores tenues, selección por nombre y avisos; sin prueba UX | Parcial |

## PWA adicional (no forma parte del PDF original)

| Aspecto | Situación |
|---|---|
| Manifest, 3 iconos PNG, standalone y tema | Implementado en código |
| SW versionado y precarga de shell | Implementado en código; build no probado |
| Catálogo público consultado previamente offline | Política implementada y probada estáticamente; navegador pendiente |
| API privada y disponibilidad sin caché | Verificado por pruebas de interceptación de rutas estáticas |
| Mutaciones sin conexión | Rechazadas en cliente, siempre requieren backend |
| HTTPS, instalación y actualizaciones reales | Pendiente navegador y hosting HTTPS |

## Riesgos residuales / decisiones técnicas

- La API maneja paginación de facto con límites de 300/500 registros: las búsquedas globales grandes requieren paginación formal y pruebas de escala.
- Los correos de reservación se intentan solo si SMTP está configurado; no existe una cola persistente de reintentos para fallos del proveedor.
- MongoDB Atlas debe permitir transacciones; no se ejecutó ninguna operación contra una base real en este entorno.
- Se usan coordenadas ficticias de León en el seed; sustitúyelas por las ubicaciones de tus sucursales reales.
- Los números existentes no se modifican; la nomenclatura actual de números nuevos respeta el RFC y timestamp exigidos.
- La interfaz y las fotos de catálogos necesitan verificación de UX y navegadores; no hay pruebas e2e realizadas.
