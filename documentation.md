# Documentación de Endpoints

A continuación se describe cada endpoint del proyecto, los datos que solicita, la respuesta esperada y su función.

---

## Usuarios

- **GET /users**
  - Descripción: Lista usuarios paginados y filtrados.
  - Parámetros: `page`, `size`, `orderBy`, `search`, `active` (query).
  - Respuesta: `{ data: [usuarios], totalRows: <int> }`

- **GET /sessionStatus**
  - Descripción: Verifica el estado de la sesión del usuario autenticado.
  - Respuesta: Información de sesión.

- **GET /usersSearch**
  - Descripción: Busca usuarios por nombre, email, etc.
  - Parámetros: `search` (query).
  - Respuesta: Lista de usuarios encontrados.

- **GET /users/:id**
  - Descripción: Obtiene los datos de un usuario por su ID.
  - Respuesta: Datos del usuario.

- **GET /users/:username/getByUsername**
  - Descripción: Obtiene usuario por su username.
  - Respuesta: Datos del usuario.

- **DELETE /users/:id**
  - Descripción: Elimina un usuario por su ID.
  - Respuesta: Resultado de la operación.

- **PATCH /users/:id**
  - Descripción: Actualiza datos de usuario, permite subir foto.
  - Datos: FormData con campos de usuario y `picture`.
  - Respuesta: Usuario actualizado.

- **PATCH /users/:id/forumBan**
  - Descripción: Banea/desbanea al usuario del foro.
  - Respuesta: Estado actualizado.

- **PATCH /users/:id/streamChatBan**
  - Descripción: Banea/desbanea al usuario del chat de stream.
  - Respuesta: Estado actualizado.

- **PATCH /users/:id/disable**
  - Descripción: Deshabilita/habilita al usuario.
  - Respuesta: Estado actualizado.

- **GET /usersInfo**
  - Descripción: Información de usuarios conectados/logueados.
  - Respuesta: Array de usuarios online.

---

## Pedigrees

- **GET /pedigrees**
  - Descripción: Lista de pedigrees paginados y filtrados.
  - Parámetros: `page`, `size`, `orderBy`, `registeredName`, `dogId`, `registrationNumber`, `callname`, `breeder`, `owner`, `userId` (query).
  - Respuesta: `{ data: [pedigrees], totalRows: <int> }`

- **GET /pedigrees/:id**
  - Descripción: Obtiene pedigree por ID.
  - Respuesta: Datos del pedigree.

- **GET /pedigrees/:id/logs**
  - Descripción: Obtiene logs de cambios del pedigree.
  - Respuesta: Array de logs.

- **DELETE /pedigrees/:id**
  - Descripción: Elimina un pedigree por ID.
  - Respuesta: Resultado de la operación.

- **POST /pedigrees/store**
  - Descripción: Crea un nuevo pedigree. Permite subir imagen.
  - Datos: FormData con campos del pedigree y `img`.
  - Respuesta: Pedigree creado.

- **PUT /pedigrees/changeOwner/:id**
  - Descripción: Cambia el propietario de un pedigree.
  - Datos: `owner` (body).
  - Respuesta: Pedigree actualizado.

---

## Categorías

- **GET /categories**
  - Descripción: Lista de categorías paginadas.
  - Parámetros: `page`, `size` (query).
  - Respuesta: `{ data: [categorías], totalRows: <int> }`

- **GET /categoriesInfo**
  - Descripción: Información adicional de categorías.
  - Respuesta: Datos de categorías.

- **GET /categories/:id**
  - Descripción: Obtiene categoría por ID.
  - Respuesta: Datos de la categoría.

- **POST /categories/store**
  - Descripción: Crea una nueva categoría.
  - Datos: Campos de la categoría.
  - Respuesta: Categoría creada.

- **DELETE /categories/:id**
  - Descripción: Elimina una categoría por ID.
  - Respuesta: Resultado de la operación.

- **PATCH /categories/:id**
  - Descripción: Actualiza datos de la categoría.
  - Datos: Campos a actualizar.
  - Respuesta: Categoría actualizada.

- **PATCH /markAllForums**
  - Descripción: Marca todos los foros como vistos para el usuario.
  - Respuesta: Estado actualizado.

- **PATCH /categories/:id/order**
  - Descripción: Cambia el orden de la categoría.
  - Datos: `num_order` (body).
  - Respuesta: Categoría actualizada.

- **PATCH /categories/:id/lock**
  - Descripción: Bloquea/desbloquea la categoría.
  - Respuesta: Estado actualizado.

---

## Temas (Topics)

- **GET /topics**
  - Descripción: Lista de temas paginados y filtrados.
  - Parámetros: `page`, `size`, `idCategories`, `search`, `previous` (query).
  - Respuesta: `{ data: [temas], totalRows: <int> }`

- **GET /topics/:id**
  - Descripción: Obtiene tema por ID.
  - Respuesta: Datos del tema.

- **POST /topics/store**
  - Descripción: Crea un nuevo tema.
  - Datos: Campos del tema.
  - Respuesta: Tema creado.

- **PATCH /topics/:id**
  - Descripción: Actualiza datos del tema.
  - Datos: Campos a actualizar.
  - Respuesta: Tema actualizado.

- **PATCH /topics/:id/sticky**
  - Descripción: Marca/desmarca el tema como "sticky".
  - Respuesta: Estado actualizado.

- **PATCH /topics/:id/markAll**
  - Descripción: Marca todos los posts del tema como vistos.
  - Respuesta: Estado actualizado.

- **PATCH /topics/:id/lock**
  - Descripción: Bloquea/desbloquea el tema.
  - Respuesta: Estado actualizado.

- **PATCH /topics/:id/announcement**
  - Descripción: Marca/desmarca el tema como anuncio.
  - Respuesta: Estado actualizado.

- **DELETE /topics/:id**
  - Descripción: Elimina un tema por ID.
  - Respuesta: Resultado de la operación.

---

## Posts

- **GET /posts**
  - Descripción: Lista de posts paginados y filtrados.
  - Parámetros: `page`, `size`, `idTopic`, `search`, `previous`, `order` (query).
  - Respuesta: `{ data: [posts], totalRows: <int> }`

- **GET /postsNextOrPrevious**
  - Descripción: Obtiene el siguiente o anterior post en un tema.
  - Parámetros: `idTopic`, `currentPostId` (query).
  - Respuesta: Datos del post.

- **GET /posts/:id**
  - Descripción: Obtiene post por ID.
  - Respuesta: Datos del post.

- **POST /posts/store**
  - Descripción: Crea un nuevo post.
  - Datos: Campos del post.
  - Respuesta: Post creado.

- **DELETE /posts/:id**
  - Descripción: Elimina un post por ID.
  - Respuesta: Resultado de la operación.

- **PATCH /posts/:id**
  - Descripción: Actualiza datos del post.
  - Datos: Campos a actualizar.
  - Respuesta: Post actualizado.

---

## Chat

- **DELETE /chat/delete/:id**
  - Descripción: Elimina un chat por ID.
  - Respuesta: Resultado de la operación.

- **PATCH /chat/view/:id**
  - Descripción: Marca el chat como visto.
  - Respuesta: Estado actualizado.

- **GET /chat/get**
  - Descripción: Obtiene los chats del usuario autenticado.
  - Respuesta: Array de chats.

- **GET /chat/getChatsCount**
  - Descripción: Obtiene la cantidad de chats no vistos.
  - Respuesta: Número de chats no vistos.

---

## Mensajes

- **DELETE /message/delete/:id**
  - Descripción: Elimina un mensaje por ID.
  - Respuesta: Resultado de la operación.

- **GET /message/get**
  - Descripción: Obtiene mensajes de un chat paginados.
  - Parámetros: `id_chat`, `page`, `size` (query).
  - Respuesta: Array de mensajes.

- **POST /message/store**
  - Descripción: Crea un nuevo mensaje en un chat.
  - Datos: `id_chat`, `id_sender`, `id_receiver`, `message` (body).
  - Respuesta: Mensaje creado.

---

## Pagos

- **GET /payment**
  - Descripción: Lista de pagos paginados y filtrados (solo superusuario).
  - Parámetros: `page`, `size`, `search` (query).
  - Respuesta: `{ data: [pagos], totalRows: <int> }`

- **POST /payment/order**
  - Descripción: Crea una orden de pago.
  - Datos: Campos de la orden.
  - Respuesta: Orden creada.

- **POST /payment**
  - Descripción: Registra un pago.
  - Datos: Campos del pago.
  - Respuesta: Pago registrado.

- **GET /paymentVerify**
  - Descripción: Verifica el estado de un pago.
  - Respuesta: Estado del pago.

---

## Stream

- **GET /stream**
  - Descripción: Lista de streams completados (solo superusuario).
  - Parámetros: `page`, `size`, `search` (query).
  - Respuesta: `{ data: [streams], totalRows: <int> }`

- **GET /stream/getActive**
  - Descripción: Obtiene streams activos.
  - Respuesta: Array de streams activos.

- **POST /stream**
  - Descripción: Crea un nuevo stream.
  - Datos: Campos del stream.
  - Respuesta: Stream creado.

- **PATCH /stream/:id**
  - Descripción: Actualiza datos del stream.
  - Datos: Campos a actualizar.
  - Respuesta: Stream actualizado.

- **PATCH /stream/:id/live**
  - Descripción: Marca el stream como "live".
  - Respuesta: Estado actualizado.

- **PATCH /stream/:id/reAnnounce**
  - Descripción: Reanuncia el stream.
  - Respuesta: Estado actualizado.

- **GET /stream/proxy/:token**
  - Descripción: Proxy para acceder al stream por token.
  - Respuesta: Stream.

---

## Mensajes de Stream

- **GET /streamMessage**
  - Descripción: Obtiene mensajes de stream.
  - Respuesta: Array de mensajes.

- **DELETE /streamMessage/:id**
  - Descripción: Elimina un mensaje de stream por ID.
  - Respuesta: Resultado de la operación.

- **POST /streamMessage**
  - Descripción: Crea un nuevo mensaje en el stream.
  - Datos: `user_id`, `username`, `message` (body).
  - Respuesta: Mensaje creado.

---

## Autenticación

Todos los endpoints (excepto algunos de lectura) requieren autenticación mediante token JWT en el header `Authorization`.

---

## Notas
- Los endpoints que permiten paginación usan los parámetros `page` y `size`.
- Los endpoints que permiten búsqueda usan el parámetro `search`.
- Las respuestas de error tienen el formato `{ response: <mensaje> }`.
