# AmbienteFest - Plataforma de Gestión de Eventos

## Descripción General

AmbienteFest es una aplicación web desarrollada con React que conecta a usuarios con proveedores de servicios para eventos. La plataforma permite a los clientes explorar, reservar y contratar servicios para todo tipo de celebraciones como matrimonios, cumpleaños, baby showers, graduaciones y eventos corporativos.

El sistema cuenta con dos roles principales: administradores y clientes. Los administradores gestionan servicios, blogs informativos, usuarios y pagos. Los clientes pueden navegar por el catálogo de servicios, realizar reservas con horarios específicos, agregar servicios al carrito de compras y completar el proceso de pago.

La aplicación incluye funcionalidades completas de autenticación, gestión de carritos de compra, sistema de reservas con franjas horarias, publicación de blogs informativos, y un panel administrativo robusto para la gestión integral del negocio.

## Tecnologías Utilizadas

### Frontend
- React 18.3.1
- React Router DOM 6.28.0
- React Bootstrap 2.10.7
- Bootstrap 5.3.3
- Axios para peticiones HTTP
- Vite como herramienta de construcción

### Backend
El proyecto utiliza Xano como Backend as a Service (BaaS). Xano proporciona:
- API REST completamente funcional
- Base de datos PostgreSQL gestionada
- Autenticación y autorización
- Almacenamiento de archivos e imágenes
- Function Stacks para lógica de negocio

### Arquitectura del Backend

El backend está dividido en dos instancias principales de Xano:

1. API de Autenticación (api:KBcldO_7)
   - Gestión de inicio de sesión
   - Registro de usuarios
   - Validación de tokens

2. API Principal de Store (api:OdHOEeXs)
   - Gestión de servicios
   - Carritos de compra
   - Blogs y comentarios
   - Pagos y pedidos
   - Categorías y horarios

## Estructura de la Base de Datos

### Tablas Principales

#### usuarios (user)
- id: integer (primary key)
- name: text
- last_name: text
- email: email (unique)
- password: text (hasheado)
- role_id: integer (1=cliente, 2=admin)
- state: boolean (activo/bloqueado)
- created_at: timestamp

#### servicios (service)
- id: integer (primary key)
- nombre: text
- descripcion: text
- precio: float
- categoria: text
- service_category_id: integer
- imagen_url: text
- imagenes: json array
- disponibilidad: text
- proveedor: text
- valoracion: float
- estado: text
- created_at: timestamp

#### service_time_slot
- id: integer (primary key)
- service_id: integer (foreign key)
- date: date
- start_time: text
- end_time: text
- is_reserved: boolean
- created_by: integer
- created_at: timestamp

#### service_reservation
- id: integer (primary key)
- service_id: integer (foreign key)
- user_id: integer (foreign key)
- time_slot_id: integer (foreign key)
- status: text
- notes: text
- created_at: timestamp

#### carrito (cart)
- id: integer (primary key)
- user_id: integer (foreign key)
- active: boolean
- status: text
- created_at: timestamp

#### cart_detail
- id: integer (primary key)
- cart_id: integer (foreign key)
- service_id: integer (foreign key)
- service_name: text
- provider: text
- unit_price: float
- quantity: integer
- subtotal: float
- time_slot_id: integer
- reservation_date: text
- reservation_time: text
- created_at: timestamp

#### blogs (blog)
- id: integer (primary key)
- title: text
- content: text
- subtitulos: text
- category: text
- blog_category_id: integer
- imagen: json array
- publication_date: timestamp
- status: text
- user_id: integer (foreign key)
- created_at: timestamp

#### blog_comment
- id: integer (primary key)
- blog_id: integer (foreign key)
- user_id: integer (foreign key)
- content: text
- date: timestamp
- created_at: timestamp

#### payment
- id: integer (primary key)
- user_id: integer (foreign key)
- cart_id: integer (foreign key)
- total_amount: float
- payment_method: text
- status: text (pending, approved, rejected)
- payment_date: timestamp
- created_at: timestamp

#### contact
- id: integer (primary key)
- name: text
- email: email
- message: text
- created_at: timestamp

#### service_category
- id: integer (primary key)
- name: text
- descripcion: text

#### blog_category
- id: integer (primary key)
- name: text

## Instalación y Configuración

### Prerrequisitos

- Node.js versión 16.0 o superior
- npm  como gestor de paquetes
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Conexión a internet para acceder a las APIs de Xano

### Pasos de Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd Proyecto20nov
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
VITE_XANO_AUTH_BASE=https://x8ki-letl-twmt.n7.xano.io/api:KBcldO_7
VITE_XANO_STORE_BASE=https://x8ki-letl-twmt.n7.xano.io/api:OdHOEeXs
```

4. Ejecutar el proyecto en modo desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

5. Construir para producción:
```bash
npm run build
```

Los archivos de producción se generarán en la carpeta `dist`

6. Previsualizar la versión de producción:
```bash
npm run preview
```

## Usuarios de Prueba

### Cuenta de Administrador
- Email: admin@ambientefest.cl
- Contraseña: admin123
- Rol: Administrador
- Permisos: Acceso completo al panel de administración, gestión de servicios, usuarios, blogs, pagos y pedidos

### Cuenta de Cliente 1
- Email: cliente1@duoc.cl
- Contraseña: cliente123
- Rol: Cliente
- Permisos: Navegación de servicios, reservas, carrito de compras, comentarios en blogs

### Cuenta de Cliente 2
- Email: maria.gonzalez@gmail.com
- Contraseña: maria123
- Rol: Cliente
- Permisos: Navegación de servicios, reservas, carrito de compras, comentarios en blogs

### Notas sobre Autenticación

- El sistema valida dominios de email permitidos: @duoc.cl, @profesor.duoc.cl, @gmail.com, @ambientefest.cl
- Los usuarios bloqueados (state=false) no pueden iniciar sesión
- La sesión se mantiene mediante localStorage con el authToken

## Rutas y Endpoints

### Rutas Frontend (React Router)

#### Rutas Públicas
- `/` - Página principal con servicios destacados y formulario de contacto
- `/login` - Inicio de sesión y registro de usuarios
- `/servicios` - Catálogo completo de servicios con filtros
- `/blog` - Blog informativo con artículos categorizados
- `/nosotros` - Información sobre la empresa
- `/terminos` - Términos y condiciones
- `/politicas` - Política de privacidad

#### Rutas Protegidas (Requieren Autenticación)
- `/carrito` - Carrito de compras del usuario
- `/admin` - Panel de administración (solo administradores)

### Endpoints del Backend (Xano)

#### Autenticación
- `POST /auth/login` - Iniciar sesión
  - Body: { email, password }
  - Response: { authToken, user }

- `POST /auth/signup` - Registrar nuevo usuario
  - Body: { name, last_name, email, password }
  - Response: { authToken, user }

- `POST /auth/me` - Obtener datos del usuario autenticado
  - Headers: { Authorization: Bearer {token} }
  - Response: { user }

#### Usuarios
- `GET /user` - Obtener todos los usuarios (admin)
- `GET /user/{user_id}` - Obtener usuario por ID
- `POST /user` - Crear nuevo usuario
- `PATCH /user/{user_id}` - Actualizar usuario
- `DELETE /user/{user_id}` - Eliminar usuario

#### Servicios
- `GET /service` - Obtener todos los servicios
- `GET /service/{service_id}` - Obtener servicio por ID
- `POST /service` - Crear nuevo servicio (admin)
  - Body: { nombre, descripcion, precio, categoria, service_category_id, imagen, disponibilidad, proveedor }
- `PATCH /service/{service_id}` - Actualizar servicio (admin)
- `DELETE /service/{service_id}` - Eliminar servicio (admin)

#### Categorías de Servicios
- `GET /service_category` - Obtener todas las categorías
- `GET /service_category/{category_id}` - Obtener categoría por ID
- `POST /service_category` - Crear categoría (admin)
- `PATCH /service_category/{category_id}` - Actualizar categoría (admin)

#### Franjas Horarias (Time Slots)
- `GET /service_time_slot?service_id={id}` - Obtener horarios de un servicio
- `POST /service_time_slot` - Crear nueva franja horaria
  - Body: { service_id, date, start_time, end_time, created_by }
- `PUT /service_time_slot/{slot_id}` - Actualizar franja horaria
- `DELETE /service_time_slot/{slot_id}` - Eliminar franja horaria

#### Reservas
- `GET /service_reservation?service_id={id}` - Obtener reservas de un servicio
- `POST /service_reservation` - Crear reserva
  - Body: { service_id, user_id, time_slot_id, status, notes }

#### Carrito de Compras
- `GET /cart?user_id={id}&active=true` - Obtener carrito activo del usuario
- `GET /cart/{cart_id}` - Obtener carrito por ID
- `POST /cart` - Crear carrito
  - Body: { user_id, active, status }
- `DELETE /cart/{cart_id}` - Eliminar carrito

#### Detalles del Carrito
- `GET /cart_detail?cart_id={id}` - Obtener items del carrito
- `POST /cart_detail` - Agregar item al carrito
  - Body: { cart_id, service_id, service_name, provider, unit_price, quantity, subtotal, time_slot_id, reservation_date, reservation_time }
- `DELETE /cart_detail/{detail_id}` - Eliminar item del carrito

#### Blogs
- `GET /blog?imagen=%5B%5D` - Obtener todos los blogs
- `GET /blog/{blog_id}` - Obtener blog por ID
- `POST /blog` - Crear nuevo blog (admin)
  - Body: { title, content, subtitulos, category, blog_category_id, imagen, publication_date, status, user_id }
- `PATCH /blog/{blog_id}` - Actualizar blog (admin)
- `DELETE /blog/{blog_id}` - Eliminar blog (admin)

#### Categorías de Blog
- `GET /blog_category` - Obtener categorías de blog
- `POST /blog_category` - Crear categoría de blog (admin)

#### Comentarios de Blog
- `GET /blog_comment?blog_id={id}` - Obtener comentarios de un blog
- `POST /blog_comment` - Crear comentario (solo clientes)
  - Body: { blog_id, user_id, content, date }

#### Pagos
- `GET /payment` - Obtener todos los pagos (admin)
- `GET /payment/{payment_id}` - Obtener pago por ID
- `POST /payment` - Crear pago
  - Body: { user_id, cart_id, total_amount, payment_method, status }
- `PATCH /payment/{payment_id}` - Actualizar estado de pago (admin)
  - Body: { status }

#### Contacto
- `GET /contact` - Obtener todos los mensajes de contacto (admin)
- `POST /contact` - Enviar mensaje de contacto
  - Body: { name, email, message }
- `GET /contact/{contact_id}` - Obtener mensaje específico
- `DELETE /contact/{contact_id}` - Eliminar mensaje (admin)

#### Imágenes
- `POST /upload/image` - Subir imagen(s)
  - Body: FormData con archivos
  - Response: Array de objetos con { path, url, name, size, type }

## Flujos Principales de la Aplicación

### Flujo de Registro e Inicio de Sesión

1. El usuario accede a `/login`
2. Puede elegir entre iniciar sesión o registrarse
3. Para registro, completa: nombre, apellidos, email y contraseña
4. Sistema valida formato de email y longitud de contraseña
5. Xano crea el usuario con role_id=1 (cliente) por defecto
6. Se genera authToken que se almacena en localStorage
7. Usuario es redirigido según su rol: cliente a `/`, admin a `/admin`

### Flujo de Compra de Servicios

1. Cliente navega en `/servicios` y aplica filtros opcionales
2. Selecciona un servicio y hace clic en "Ver Detalle"
3. En el modal, visualiza detalles y horarios disponibles
4. Selecciona una franja horaria específica
5. Hace clic en "Reservar Este Horario"
6. Sistema crea una reserva en `service_reservation`
7. Servicio con reserva se agrega al carrito
8. Cliente puede continuar comprando o ir a `/carrito`
9. En carrito, revisa items y total
10. Hace clic en "Proceder al Pago"
11. Sistema crea registro en `payment` con status=pending
12. Administrador debe aprobar el pago desde `/admin`

### Flujo de Gestión de Servicios (Administrador)

1. Administrador inicia sesión y accede a `/admin`
2. Selecciona pestaña "Gestión de Servicios"
3. Puede crear nuevo servicio haciendo clic en "Nuevo Servicio"
4. Completa formulario: nombre, descripción, precio, categoría, proveedor, disponibilidad
5. Sube una o múltiples imágenes
6. Guarda el servicio
7. Sistema permite inmediatamente gestionar franjas horarias
8. Administrador crea slots con fecha, hora inicio y hora fin
9. Estos horarios quedan disponibles para reserva de clientes

### Flujo de Gestión de Blogs

1. Administrador accede a pestaña "Gestión de Blogs"
2. Crea nuevo blog con título, subtítulo, contenido, categoría
3. Sube imágenes asociadas
4. Define fecha de publicación
5. Blog queda visible en `/blog` para todos los usuarios
6. Clientes autenticados pueden comentar en blogs
7. Comentarios se almacenan en `blog_comment` con referencia al usuario

## Características Principales

### Sistema de Autenticación y Autorización

- Autenticación basada en JWT proporcionado por Xano
- Roles diferenciados: administrador (role_id=2) y cliente (role_id=1)
- Rutas protegidas con componente ProtectedRoute
- Validación de estado del usuario (bloqueado/activo)
- Sesión persistente con localStorage

### Gestión de Servicios

- CRUD completo de servicios desde panel admin
- Carga múltiple de imágenes por servicio
- Categorización mediante service_category
- Sistema de valoraciones (preparado para futura implementación)
- Filtros avanzados: categoría, precio, valoración

### Sistema de Reservas con Horarios

- Franjas horarias configurables por servicio
- Validación de disponibilidad en tiempo real
- Prevención de reservas duplicadas
- Reserva vinculada al carrito de compras
- Historial de reservas por usuario

### Carrito de Compras

- Gestión de carrito activo por usuario
- Múltiples servicios en un mismo carrito
- Cálculo automático de subtotales y total
- Información de reserva incluida en cada item
- Limpieza automática al aprobar pago

### Panel de Administración

- Dashboard unificado con pestañas para cada módulo
- Gestión de servicios con editor de horarios
- Gestión de usuarios con capacidad de bloqueo
- Gestión de blogs con editor rico
- Visualización de pagos y pedidos
- Aprobación/rechazo de pagos
- Búsqueda y filtros en todas las secciones

### Blog Informativo

- Sistema de publicación de artículos
- Categorización de contenido
- Carga múltiple de imágenes por blog
- Sistema de comentarios solo para clientes
- Filtrado por categoría
- Diseño responsive con tarjetas

### Formulario de Contacto

- Captura de nombre, email y mensaje
- Validación de formato de email
- Almacenamiento en tabla contact
- Feedback visual al usuario

## Arquitectura del Código

### Estructura de Carpetas

```
src/
├── assets/              # Recursos estáticos
├── components/          # Componentes reutilizables
│   ├── AdminScheduleEditor.jsx
│   ├── AvailableTimeSlots.jsx
│   ├── BlogCategorySelect.jsx
│   ├── EditarPerfil.jsx
│   ├── Footer.jsx
│   ├── ImagePreview.jsx
│   ├── LoginRedirect.jsx
│   ├── ModalBlog.jsx
│   ├── ModalDetalleServicio.jsx
│   ├── MultiFileInput.jsx
│   ├── MultiImageDisplay.jsx
│   ├── Navigation.jsx
│   ├── Nosotros.jsx
│   ├── Politicas.jsx
│   ├── ProtectedRoute.jsx
│   ├── ServiceCategorySelect.jsx
│   ├── Terminos.jsx
│   └── VerPerfilUsuario.jsx
├── context/            # Contextos de React
│   └── AuthContext.jsx
├── hooks/              # Custom hooks
│   └── useLoginRedirect.js
├── pages/              # Páginas principales
│   ├── Admin.jsx
│   ├── Blog.jsx
│   ├── Carrito.jsx
│   ├── GestionBlogs.jsx
│   ├── GestionPagos.jsx
│   ├── GestionServicios.jsx
│   ├── GestionUsuarios.jsx
│   ├── Home.jsx
│   ├── Login.jsx
│   └── Servicios.jsx
├── services/           # Servicios de API
│   ├── api.js
│   ├── blog.js
│   ├── carritoCompra.js
│   ├── contacto.js
│   ├── imagenes.js
│   ├── pagos.js
│   ├── servicios.js
│   └── usuarios.js
├── App.jsx             # Componente raíz
├── main.jsx            # Punto de entrada
├── index.css           # Estilos globales
└── styles.css          # Estilos personalizados
```

### Patrones de Diseño Utilizados

#### Context API para Estado Global
- AuthContext maneja autenticación y datos de usuario
- Provee funciones: login, register, logout, isAuthenticated, isAdmin
- Accesible desde cualquier componente mediante useAuth hook

#### Servicios Modulares
- Cada módulo de la API tiene su archivo de servicio
- Funciones reutilizables para operaciones CRUD
- Caché en memoria para reducir peticiones redundantes
- Normalización de datos entre frontend y Xano

#### Componentes Controlados
- Formularios manejados con useState
- Validación en tiempo real
- Feedback visual inmediato

#### Rutas Protegidas
- ProtectedRoute wrapper para rutas autenticadas
- Redirección automática a login si no autenticado
- Verificación de rol para rutas admin

## Caché y Optimización

### Sistema de Caché en Memoria

El archivo `api.js` implementa un sistema de caché para reducir peticiones redundantes:

```javascript
const cache = new Map();

cachedGet(url, ttl = 300000) {
  const now = Date.now();
  const cached = cache.get(url);
  
  if (cached && (now - cached.timestamp) < ttl) {
    return Promise.resolve(cached.data);
  }
  
  return api.get(url).then(response => {
    cache.set(url, { data: response.data, timestamp: now });
    return response.data;
  });
}
```

### TTL (Time To Live)

- Usuarios: 300000ms (5 minutos)
- Servicios: 300000ms (5 minutos)
- Carritos: 300000ms (5 minutos)
- Blogs: sin caché (requiere datos actualizados)

## Validaciones Implementadas

### Validación de Emails
- Formato estándar de email
- Dominios permitidos: @duoc.cl, @profesor.duoc.cl, @gmail.com, @ambientefest.cl

### Validación de Contraseñas
- Longitud mínima: 8 caracteres
- Sin restricciones adicionales de complejidad

### Validación de Nombres
- Solo letras y espacios
- Acepta caracteres con tildes
- Longitud máxima: 50 caracteres para nombre, 100 para apellidos

### Validación de Servicios
- Nombre requerido
- Descripción requerida
- Precio mayor a 0
- Categoría seleccionada

### Validación de Horarios
- Fecha no puede ser anterior a hoy
- Hora de inicio debe ser menor que hora de fin
- No permitir duplicados para mismo servicio, fecha y horario

## Manejo de Errores

### Errores de Red
- Timeout configurado a 15 segundos
- Retry automático no implementado (se puede agregar)
- Mensajes de error mostrados con componente Alert de Bootstrap

### Errores de Autenticación
- Token inválido: redirección a login
- Usuario bloqueado: mensaje específico
- Credenciales incorrectas: mensaje genérico por seguridad

### Errores de Validación
- Validación en frontend antes de enviar a backend
- Mensajes específicos por campo
- Feedback visual con estilos de Bootstrap

### Errores del Backend
- Códigos HTTP estándar
- Mensajes de error desde Xano
- Logging en consola para debugging

## Consideraciones de Seguridad

### Autenticación
- Contraseñas hasheadas en Xano
- Tokens JWT con expiración
- Validación de rol en cada operación sensible

### Autorización
- Verificación de rol admin en rutas protegidas
- Operaciones CRUD restringidas por rol
- Usuarios pueden modificar solo sus propios datos

### Prevención de Ataques
- Validación de entrada en frontend y backend
- Sanitización de datos antes de mostrar
- CORS configurado en Xano
- Rate limiting en Xano (configurable)

### Datos Sensibles
- No se exponen contraseñas en respuestas
- Tokens almacenados en localStorage (considerar httpOnly cookies para mayor seguridad)
- Información de pago simulada (no se procesan pagos reales)

## Limitaciones Conocidas

1. Sistema de pagos simulado, no integra pasarelas reales
2. Notificaciones por email no implementadas
3. Recuperación de contraseña pendiente
4. Sistema de valoraciones preparado pero no funcional
5. Chat en tiempo real no implementado
6. Exportación de reportes pendiente
7. Búsqueda global limitada a texto simple

## Mejoras Futuras

1. Integración con pasarelas de pago reales (Transbank, Mercadopago)
2. Sistema de notificaciones por email con SendGrid o similar
3. Recuperación de contraseña mediante enlace por correo
4. Implementación completa de sistema de valoraciones y reseñas
5. Dashboard con métricas y gráficos
6. Exportación de reportes en PDF y Excel
7. Búsqueda con Elasticsearch o Algolia
8. Chat en tiempo real con Socket.io
9. Aplicación móvil con React Native
10. Tests unitarios y de integración

## Solución de Problemas Comunes

### La aplicación no carga
- Verificar que Node.js está instalado: `node --version`
- Verificar que las dependencias están instaladas: `npm install`
- Verificar que el servidor de desarrollo está corriendo: `npm run dev`
- Revisar la consola del navegador para errores

### Error de conexión con Xano
- Verificar URLs en archivo .env
- Verificar conexión a internet
- Revisar consola para errores 401 (autenticación) o 403 (autorización)
- Verificar que el token no ha expirado

### No puedo iniciar sesión
- Verificar que el email tiene un dominio permitido
- Verificar que la contraseña es correcta
- Verificar que el usuario no está bloqueado (state=true)
- Limpiar localStorage: `localStorage.clear()`

### Las imágenes no se muestran
- Verificar que las URLs de imagen son absolutas
- Verificar que Xano devuelve path correcto
- Revisar consola para errores 404
- Verificar permisos de archivo en Xano

### El carrito no se actualiza
- Refrescar la página
- Verificar que hay un carrito activo para el usuario
- Revisar consola para errores de API
- Verificar que el usuario está autenticado


## Autores

- Antonella Aedo
- Karen Fuentealba

