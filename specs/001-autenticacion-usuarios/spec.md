# 001 · Autenticación, roles y gestión de usuarios

**Iteración:** 1 · **Requisitos:** RF-01, RF-02, RF-03, RF-16, RNF-06, RNF-07

## Contexto

En el centro trabajan un administrador y varios entrenadores, y los clientes pueden consultar su información.
Cada rol ve y hace cosas distintas, y la autorización se comprueba siempre en el servidor.

## Roles

| Rol       | Puede                                                                 |
|-----------|-----------------------------------------------------------------------|
| `ADMIN`   | Todo lo del entrenador, más gestionar usuarios, pantallas e importación de socios. |
| `TRAINER` | Gestionar ejercicios, plantillas, rutinas y sesiones; ver a todos los clientes del centro. |
| `CLIENT`  | Ver su propia rutina, sus sesiones y su histórico. Nada más.           |

## Historias de usuario

### HU-001-1 · Iniciar sesión (P1, Must · RF-01)
- **AC-001-01** Dado un usuario activo, cuando envía correo y contraseña correctos, entonces recibe un token de acceso (15 min)
  y una cookie `httpOnly`, `Secure`, `SameSite=Strict` con el token de refresco (7 días).
- **AC-001-02** Dadas credenciales incorrectas o un usuario desactivado, entonces recibe 401 con un mensaje genérico
  que no revela si el correo existe.
- **AC-001-03** Dados 5 intentos fallidos en 15 minutos desde la misma IP y correo, entonces los siguientes reciben 429.

### HU-001-2 · Mantener la sesión (P1, Must · RF-01)
- **AC-001-04** Dado un token de refresco válido, cuando llamo a `/auth/refresh`, entonces recibo un nuevo token de acceso
  y el de refresco se rota (el anterior queda revocado).
- **AC-001-05** Dado un token de refresco ya usado, cuando se intenta reutilizar, entonces se revoca toda la familia de tokens
  de ese usuario y se responde 401 (detección de reutilización).
- **AC-001-06** Cuando cierro sesión, entonces el token de refresco queda revocado y la cookie se borra.

### HU-001-3 · Control de acceso por rol (P1, Must · RF-02)
- **AC-001-07** Dada una ruta protegida sin token o con token caducado, entonces responde 401.
- **AC-001-08** Dado un usuario cuyo rol no está permitido en la ruta, entonces responde 403.
- **AC-001-09** Dado un cliente, cuando pide datos de otro cliente, entonces responde 404 (no se revela su existencia).

### HU-001-4 · Gestionar usuarios (P1, Must · RF-03)
Como administrador, quiero dar de alta, editar y desactivar entrenadores y clientes.
- **AC-001-10** Cuando creo un usuario con correo, nombre, apellidos, alias opcional y rol, entonces queda activo
  y pendiente de establecer contraseña.
- **AC-001-11** Dado un correo ya registrado, entonces responde 409.
- **AC-001-12** Cuando desactivo un usuario, entonces no puede iniciar sesión, sus tokens se revocan y su histórico se conserva.
- **AC-001-13** Los campos importados de un proveedor externo (nombre, apellidos, correo) no se pueden editar (ver 002).
- **AC-001-14** El listado admite búsqueda por nombre o correo, filtro por rol y paginación.

### HU-001-5 · Activar la cuenta (P3, Could · RF-16)
- **AC-001-15** Cuando se crea un usuario, entonces recibe un correo con un enlace de un solo uso (válido 72 h) para fijar su contraseña.
- **AC-001-16** Si el envío de correo no está configurado, entonces el administrador puede copiar el enlace desde el panel.

## Requisitos no funcionales aplicables

- Contraseñas con argon2id; mínimo 10 caracteres.
- Tokens de refresco y de activación guardados solo como hash SHA-256.
- Mensajes de error al usuario en español.

## Criterios de éxito

| ID       | Métrica                                         | Objetivo |
|----------|-------------------------------------------------|----------|
| SC-001-1 | Rutas protegidas cubiertas por pruebas de 401/403 | 100 %    |
| SC-001-2 | Inicio de sesión (p95, local)                   | < 300 ms |
