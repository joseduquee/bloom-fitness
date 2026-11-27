# 005 · Plan técnico

| PR | Contenido | Requisitos | Criterios |
|----|-----------|------------|-----------|
| A  | Pantallas de sala: emparejamiento, `/tv`, revocación | RF-12, RF-13, RNF-02, RNF-04 | AC-005-01 a AC-005-09 |
| B  | Histórico y área del cliente | RF-14, RF-15 | AC-005-10 a AC-005-14 |

Las métricas de calidad (Lighthouse, Core Web Vitals, axe y SUS, SC-005-1 a SC-005-4) se miden al final sobre la
aplicación completa.

## PR A · Pantallas de sala

### Modelo

```prisma
model Screen {
  id, centerId, name
  tokenHash  String?  @unique   // hash del token del dispositivo; null si no está emparejada o se revocó
  pairedAt, revokedAt, lastSeenAt, createdAt
}

model ScreenPairingCode {
  id, screenId
  codeHash  String  @unique     // nunca se guarda el código en claro
  expiresAt DateTime            // 10 minutos
  usedAt    DateTime?           // un solo uso
}
```

Estado de la pantalla: `REVOKED` si tiene `revokedAt`, `PAIRED` si tiene token y `PENDING` en otro caso.

### Emparejamiento (AC-005-01 a AC-005-04)

1. El administrador da de alta la pantalla y recibe un código de 6 caracteres de un alfabeto sin símbolos
   ambiguos a distancia (sin 0/O ni 1/I/L), generado con `crypto.randomInt`. Pedir un código nuevo anula los
   anteriores sin usar.
2. En el televisor, `/tv` pide el código. `POST /screens/pair` es público (constitución §3.1), lo canjea por un
   token opaco de 32 bytes y guarda solo su hash. El código se marca como usado con una actualización condicional,
   así dos televisores no pueden canjear el mismo a la vez.
3. Los códigos incorrectos se cuentan por IP con el mismo limitador que el inicio de sesión (5 en 15 minutos, 429).
   Con 30⁶ combinaciones, 10 minutos de vida y ese límite, adivinar uno no es viable.
4. El televisor guarda el token en `localStorage` y lo envía al conectarse al canal en tiempo real
   (`auth.screenToken`).
5. Revocar borra el hash del token y avisa a la pasarela, que cierra la conexión de esa pantalla. El televisor
   intenta reconectar, recibe «Pantalla no autorizada», borra su token y vuelve a pedir código. Emparejar de nuevo
   una pantalla también cierra la conexión del televisor anterior.

### Tiempo real

- El middleware de la pasarela acepta un JWT del personal **o** un token de pantalla (constitución §3.3).
- Al conectar, la pantalla entra en la sala `screens:{centro}` y recibe `screen:state` con el nombre del centro,
  su zona horaria y las sesiones en curso. Después recibe `screen:session` con cada cambio de cualquier sesión del
  centro, sin suscribirse a nada. Una pantalla no puede usar `session:subscribe` ni `screen:subscribe`.
- Solo recibe la proyección sin datos personales de la spec 004 (AC-004-18).

### Vista `/tv`

- Fuera del área con inicio de sesión. Sin token: formulario de emparejamiento a pantalla completa.
- Sin sesiones en curso (AC-005-05): hora grande, fecha, nombre del centro y «No hay ninguna sesión en curso».
- Con sesiones (AC-005-06): una tarjeta por asistente presente de todas las sesiones en curso, con alias,
  plantilla, GIF, ejercicio, «Serie 2 de 4», repeticiones, carga, última serie y progreso.
- Rejilla según el número de tarjetas (AC-005-07): 1 → 1×1, 2 → 2×1, 3 → 3×1, 4 → 2×2. Las tarjetas usan
  `min-h-0` y el GIF ocupa el espacio que sobra, así nada desborda en 1920×1080.
- Legibilidad a 4 m (AC-005-08): fondo `slate-950` con texto blanco (contraste superior a 15:1), alias a 60 px y
  datos principales a 48 px como mínimo.
- Conexión (AC-005-09): Socket.IO reconecta solo; mientras tanto se muestra «Reconectando…» en la cabecera,
  sin tapar el contenido. Los eventos con una revisión anterior a la que ya se tiene se descartan.

### Administración (`/pantallas`, solo administrador)

Listado con estado y última conexión, alta con código, «Volver a emparejar» (código nuevo) y «Revocar» con
confirmación. El código se muestra una sola vez junto a la dirección `/tv` y la hora de caducidad.
