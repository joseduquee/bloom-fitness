# Constitución del proyecto

Principios que se aplican a todo el código de Bloom Fitness. Si una especificación entra en conflicto
con alguno, prevalece la constitución salvo que se modifique explícitamente.

## 1. Alcance

1. Solo se construye lo que está en una especificación aprobada. Lo demás va a la hoja de ruta.
2. Se implementan primero los requisitos *Must*; los *Should* y *Could*, solo si el calendario lo permite.
3. La v1.0 da servicio a **un centro**. El modelo admite varios centros, pero no hay multiempresa.

## 2. Código

1. TypeScript en modo estricto en todo el monorepo. No se permite `any` sin un comentario que lo justifique.
2. Identificadores del código en inglés; textos de la interfaz, mensajes de error al usuario y documentación en español.
3. Los contratos entre frontend y backend (DTO, eventos, enums) se definen **una sola vez** en `packages/shared`
   con esquemas zod, y ambos lados los importan.
4. El backend se organiza en módulos de NestJS por dominio. Un módulo no accede a las tablas de otro:
   usa su servicio.
5. Toda escritura entra por la API REST. El canal WebSocket solo difunde estado; nunca recibe escrituras de negocio.

## 3. Seguridad

1. Toda ruta REST requiere autenticación salvo `/health`, `/auth/login`, `/auth/refresh` y el emparejamiento de pantallas.
2. La autorización se comprueba en el servidor con guardas por rol. La interfaz solo oculta, nunca protege.
3. El canal WebSocket rechaza cualquier conexión sin un JWT o un token de pantalla válido.
4. Las contraseñas se guardan con argon2id. Los tokens de refresco y de pantalla se guardan solo como hash.
5. Ningún secreto se versiona. La configuración se lee de variables de entorno validadas al arrancar.
6. Desarrollo, pruebas y demostraciones usan **solo datos simulados**.
7. La pantalla de sala recibe el alias del cliente y su entrenamiento; nunca datos de contacto ni medidas corporales.

## 4. Calidad

1. Cada *pull request* debe pasar formato, linter, comprobación de tipos, pruebas y compilación.
2. Cada criterio de aceptación tiene al menos una prueba automática que lo cita por su identificador.
3. La lógica de dominio se prueba con pruebas unitarias; los endpoints, con pruebas de integración contra PostgreSQL real.
4. Las fechas se guardan en UTC y se muestran en la zona horaria `Europe/Madrid`.

## 5. Interfaz

1. Interfaz en español, adaptable a móvil, tableta y escritorio.
2. Los estados de carga y error se gestionan por entidad (por ejemplo, por asistente), no con un indicador global.
3. Objetivo de accesibilidad: WCAG 2.1 AA en las vistas principales.
4. La vista de pantalla de sala se diseña para leerse a 4 m: tipografía grande y alto contraste.

## 6. Flujo de trabajo

1. GitHub Flow: `main` protegida y siempre desplegable; ramas cortas `feature/`, `fix/`, `chore/`.
2. Commits con Conventional Commits; fusión por *squash*.
3. Las tareas se generan con ayuda de un asistente de IA a partir de la especificación; el código generado
   se revisa y pasa por las mismas comprobaciones que cualquier otro cambio.
