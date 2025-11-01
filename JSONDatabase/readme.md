
# 🗄️ JSON Database Documentation

This folder contains the JSON-based collections for the project.
Each file represents a MongoDB collection (or document set) used by the application.

All entities share a consistent pattern:

* Each document includes a unique `id` (numeric or ObjectId).
* All timestamps follow the **ISO 8601** format (`YYYY-MM-DDTHH:mm:ssZ`).
* Relationships between entities use foreign keys (e.g., `boardID`, `ownerID`).


## 1. `user.json`

**Purpose:** Stores user credentials and profile data.

### Structure

```json
{
  "id": 1,
  "username": "example_user",
  "password": "securepassword123",
  "email": "example_user@example.com",
  "imageUrl": "https://example.com/images/example_user.png",
  "createdAt": "2023-10-01T11:00:00Z"
}
```

### Fields

| Field       | Type              | Description                                     |
| ----------- | ----------------- | ----------------------------------------------- |
| `id`        | Number            | Unique identifier for the user.                 |
| `username`  | String            | User’s display name.                            |
| `password`  | String            | User’s hashed password.                         |
| `email`     | String            | User’s email address.                           |
| `imageUrl`  | String            | URL to the user’s profile image.                |
| `createdAt` | String (ISO Date) | Timestamp of when the user account was created. |

---

## 2. `board.json`

**Purpose:** Represents a player’s game board with tracking for shots fired.

### Structure

```json
{
  "id": 1,
  "cols": 10,
  "rows": 10,
  "shots": [
    {"x": 1, "y": 2, "result": "miss"},
    {"x": 3, "y": 4, "result": "hit"}
  ],
  "createdAt": "2023-10-01T12:00:00Z"
}
```

### Fields

| Field            | Type              | Description                                             |
| ---------------- | ----------------- | ------------------------------------------------------- |
| `id`             | Number            | Unique identifier for the board.                        |
| `cols`           | Number            | Number of columns in the board grid.                    |
| `rows`           | Number            | Number of rows in the board grid.                       |
| `shots`          | Array<Object>     | List of shots fired, each with coordinates and outcome. |
| `shots[].x`      | Number            | X-coordinate of the shot.                               |
| `shots[].y`      | Number            | Y-coordinate of the shot.                               |
| `shots[].result` | String            | Result of the shot (`"hit"` or `"miss"`).               |
| `createdAt`      | String (ISO Date) | Timestamp of when the board was created.                |

---

## 3. `boat.json`

**Purpose:** Defines individual boats placed on boards by players.

### Structure

```json
{
  "id": 1,
  "type": "destroyer",
  "status": "afloat",
  "size": 2,
  "position": {"x": 1, "y": 1, "orientation": "horizontal"},
  "boardID": 1,
  "ownerID": 1,
  "createdAt": "2023-10-01T12:00:00Z"
}
```

### Fields

| Field                  | Type              | Description                                             |
| ---------------------- | ----------------- | ------------------------------------------------------- |
| `id`                   | Number            | Unique identifier for the boat.                         |
| `type`                 | String            | Type or class of the boat (e.g., `"destroyer"`).        |
| `status`               | String            | Current state of the boat (`"afloat"`, `"sunk"`, etc.). |
| `size`                 | Number            | Number of cells the boat occupies.                      |
| `position`             | Object            | Starting position and orientation on the board.         |
| `position.x`           | Number            | X-coordinate of the boat’s starting point.              |
| `position.y`           | Number            | Y-coordinate of the boat’s starting point.              |
| `position.orientation` | String            | `"horizontal"` or `"vertical"`.                         |
| `boardID`              | Number            | Reference to the associated board.                      |
| `ownerID`              | Number            | Reference to the owning user.                           |
| `createdAt`            | String (ISO Date) | Timestamp of when the boat was created.                 |

---

## 4. `match.json`

**Purpose:** Records information about matches between two users.

### Structure

```json
{
  "id": 1,
  "hostID": 1,
  "guestID": 2,
  "status": "finished",
  "hostScore": 5,
  "guestScore": 4,
  "boardID": 1,
  "winnerID": 1,
  "createdAt": "2023-10-01T12:00:00Z"
}
```

### Fields

| Field        | Type              | Description                                                         |
| ------------ | ----------------- | ------------------------------------------------------------------- |
| `id`         | Number            | Unique identifier for the match.                                    |
| `hostID`     | Number            | Reference to the hosting user.                                      |
| `guestID`    | Number            | Reference to the guest user.                                        |
| `status`     | String            | Current state of the match (`"pending"`, `"active"`, `"finished"`). |
| `hostScore`  | Number            | Number of successful hits or points by the host.                    |
| `guestScore` | Number            | Number of successful hits or points by the guest.                   |
| `boardID`    | Number            | Reference to the board used in the match.                           |
| `winnerID`   | Number            | ID of the user who won the match.                                   |
| `createdAt`  | String (ISO Date) | Timestamp of when the match was created.                            |

---

## Notes

* **Data relationships:**

  * A `user` can own multiple `boards` and `boats`.
  * Each `match` references two users (host and guest) and one `board`.
* **Data integrity:**

  * All foreign key references (`boardID`, `ownerID`, `winnerID`) should map to existing documents.
* **Intended usage:**

  * Designed for JSON storage and easy integration with MongoDB or Mongoose models.

---


# Respuesta a la Retroalimentación 

En esta sección se responde a las dudas y comentarios planteados en la retroalimentación sobre la propuesta del juego de batalla naval (Battleship).  Se organizan las respuestas por entregable para mantener la claridad.

## 1. Preguntas y/o dudas del requerimiento

En el estado actual no se han identificado dudas adicionales.  De todos modos, se invita a comunicar cualquier pregunta nueva que surja para poder resolverla oportunamente.

## 2. Modelado de datos (entidades y atributos)

El modelado en formato JSON incluye las entidades **user**, **boat**, **board** y **match**.  A partir de sus comentarios se propone lo siguiente:

### Entidad `user`

- **imagen**: se añadirá un atributo de tipo *string* para almacenar una URL o la ruta al avatar del usuario.  Esto permitirá mostrar un ícono o foto de perfil en la interfaz, mejorando la experiencia de usuario.
- **registro de usuario**: se propone un flujo de registro sencillo mediante correo electrónico y contraseña, validado mediante confirmación de correo.  También podría considerarse un inicio de sesión social (Google o GitHub) si se desea simplificar el acceso.  Queda por definir si se aplicará verificación de edad u otros requisitos; agradeceríamos su indicación.

### Entidad `boat`

- **Relación con `board`**: cada *boat* pertenece a un `board` mediante `boardID`.  Esto significa que la instancia de barco está anclada a un tablero específico y no se reutiliza entre partidas.  Si se requiere un catálogo de “tipos” de barcos reutilizables, se podrá crear una entidad adicional (`boatType`) y asociarla a cada barco del tablero.
- **Posición**: los atributos `x` e `y` (enteros) indican la casilla inicial del barco en la matriz.  El tablero estándar es de 10x10, como se describe en muchos tutoriales de diseño de Battleship.  Para barcos de más de una celda se almacenará la orientación (horizontal o vertical) y el tamaño en el tipo de barco.

### Entidad `board`

- **`shots`**: en la versión actual se propone que sea un arreglo de objetos con las coordenadas (`x`, `y`) de cada disparo efectuado *por cualquiera de los jugadores* sobre ese tablero.  Sin embargo, para responder a sus preguntas se recomienda que cada objeto incluya campos adicionales:
  - `playerID`: identifica quién disparó (anfitrión o invitado).
  - `timestamp`: fecha/hora del disparo.
  - `result`: indica si fue *hit* o *miss*.  
  Estas mejoras permiten mantener un historial completo del juego y facilitan estadísticas individualizadas.  El blog de diseño de Battleship en C# señala que cada jugador debe contar con un **FiringBoard** donde registra los disparos realizados y si fueron aciertos o fallos:contentReference[oaicite:1]{index=1}.  Inspirándonos en este modelo, nuestro atributo `shots` se puede interpretar como la unión de los *firing boards* de ambos jugadores.
- **Alcance de `shots`**: almacena todos los disparos del juego; no se sobrescriben.  De esta forma se pueden reconstruir las rondas, analizar la estrategia y evitar que un jugador repita casillas.  
  - **¿Quién hace los disparos?** El atributo `playerID` permite distinguir si fue el anfitrión (`hostID`) o el invitado (`guestID`).
  - **¿Se pueden disparar en la propia flotilla?** La implementación impedirá disparar en el tablero propio; el sistema únicamente aceptará coordenadas dirigidas al tablero del oponente.  Esto sigue la lógica del juego tradicional donde cada jugador opera dos tableros: el suyo y el *firing board* contra el rival.

### Entidad `match`

- **`hostID` y `guestID`**: se mantienen como referencias a los usuarios que participan.  Se incluirán comentarios en el modelo JSON para aclarar las referencias.
- **Fecha del evento**: se añadirá un atributo `createdAt` (fecha y hora en formato ISO 8601) para registrar cuándo inicia la partida.  Si se requiere registrar también la fecha de finalización, se añadirá `finishedAt`.

---

Si alguna de las respuestas necesita mayor aclaración (por ejemplo, la logística exacta del registro de usuarios o el propósito de la sección de privacidad), por favor indíquelo y con gusto se incorporará en la siguiente iteración.


