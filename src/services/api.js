import axios from 'axios';

// ===== CONFIGURACIÓN DE ENDPOINTS =====
// Endpoints fijos independientes del idioma de Xano
export const ENDPOINTS = {
  // Usuarios (Xano traduce automáticamente tabla 'usuarios' a endpoint '/user')
  USERS: '/user',
  // Servicios (Xano traduce automáticamente tabla 'servicios' a endpoint '/service')  
  SERVICES: '/service',
  // Blogs (Xano traduce automáticamente tabla 'blogs' a endpoint '/blog')
  BLOGS: '/blog',
  // Categorías de servicios
  SERVICE_CATEGORIES: '/service_category',
  // Roles (Xano traduce automáticamente tabla 'roles' a endpoint '/role')
  ROLES: '/role',
  // Carrito (Xano traduce automáticamente tabla 'carrito' a endpoint '/cart')
  CART: '/cart',
  // Detalles del carrito
  CART_DETAILS: '/cart_detail',
  // Comentarios de blogs
  BLOG_COMMENTS: '/blog_comment',
  // Pagos
  PAYMENTS: '/payment'
};
// ===== CARRITO =====
// Carrito API moved to src/services/carritoCompra.js
// Use `carritoAPI` from `src/services/carritoCompra.js` to access cart endpoints.

// Configuración base de Axios para datos principales
const api = axios.create({
  baseURL: import.meta.env.VITE_XANO_STORE_BASE || 'https://x8ki-letl-twmt.n7.xano.io/api:OdHOEeXs',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Configuración base de Axios para autenticación
const authApiInstance = axios.create({
  baseURL: import.meta.env.VITE_XANO_AUTH_BASE || 'https://x8ki-letl-twmt.n7.xano.io/api:KBcldO_7',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Configuración de URL base y endpoints completada

// API para autenticación (si es diferente del store)
const authAxios = axios.create({
  baseURL: import.meta.env.VITE_XANO_AUTH_BASE || import.meta.env.VITE_XANO_STORE_BASE || 'https://x8ki-letl-twmt.n7.xano.io/api:PDQSRKQT',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptores para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si Xano devuelve 429, registrar un mensaje informativo. Los reintentos se manejan
    // mediante un interceptor separado más abajo.
    const resp = error.response?.data;
    const headers = error.response?.headers || {};
    const contentType = headers['content-type'] || headers['Content-Type'] || '';

    // Reduce noisy logging for expected 404 "Not Found" responses on cart endpoints.
    // Many flows intentionally try to delete or fetch a cart that may not exist
    // (e.g. after an order is processed). Keep info-level logging for those cases
    // but preserve error-level logs for other endpoints and status codes.
    const reqUrl = (error.config && error.config.url) ? String(error.config.url) : '';
    const status = error.response?.status;
    try {
      if (status === 404 && (reqUrl.includes(ENDPOINTS.CART) || reqUrl.includes(ENDPOINTS.CART_DETAILS))) {
        console.info('API Notice:', status, error.message || resp?.message || reqUrl);
        return Promise.reject(error);
      }
    } catch {
      // fallthrough to regular logging if something unexpected
    }

    console.error('API Error:', error.response?.status, error.message || resp?.message || contentType);
    return Promise.reject(error);
  }
);

authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    const resp = error.response?.data;
    console.error('Auth API Error:', error.response?.status, error.message || resp?.message);
    return Promise.reject(error);
  }
);

// Interceptor de reintento para 429 Too Many Requests en peticiones GET.
// Solo reintenta peticiones GET (idempotentes) hasta 2 veces, usando un backoff exponencial.
api.interceptors.response.use(undefined, async (error) => {
  const config = error.config || {};
  const method = (config.method || '').toUpperCase();
  const status = error.response?.status;

  // Manejo mejorado para 429: respetar Retry-After si viene, usar backoff exponencial con jitter.
  if (status === 429 && method === 'GET') {
    config.__retryCount = config.__retryCount || 0;
    const MAX_RETRIES = 3;
    if (config.__retryCount < MAX_RETRIES) {
      config.__retryCount += 1;

      // Si el servidor envía Retry-After, usarlo (puede ser segundos o una fecha)
      const ra = error.response?.headers?.['retry-after'] || error.response?.headers?.['Retry-After'];
      let delayMs = 0;
      if (ra) {
        const asInt = parseInt(ra, 10);
        if (!Number.isNaN(asInt)) {
          delayMs = asInt * 1000;
        } else {
          // Intentar parsear fecha HTTP
          const then = Date.parse(ra);
          if (!Number.isNaN(then)) {
            delayMs = Math.max(0, then - Date.now());
          }
        }
      }

      // Si no hay Retry-After, usar backoff exponencial base con jitter
      if (!delayMs) {
        const base = Math.pow(2, config.__retryCount) * 250; // 500ms, 1000ms, 2000ms
        const jitter = Math.floor(Math.random() * 250); // 0-250ms random
        delayMs = base + jitter;
      }

      await new Promise(res => setTimeout(res, delayMs));
      return api.request(config);
    }
  }

  return Promise.reject(error);
});

// ===== CACHÉ SIMPLE EN MEMORIA =====
// Reduce peticiones repetidas y ayuda a evitar límites de tasa (rate limits) en Xano durante
// el desarrollo. La caché almacena objetos { t, value, promise } para que llamadas
// concurrentes reutilicen la misma promesa en vuelo en lugar de emitir solicitudes HTTP duplicadas.
const simpleCache = new Map();

/**
 * cachedGet: GET with TTL-based in-memory cache and in-flight request dedup.
 * @param {string} url - endpoint path
 * @param {number} ttl - milliseconds to keep cache (default 120s)
 */
export async function cachedGet(url, ttl = 120000) {
  const now = Date.now();
    const key = String(api.defaults.baseURL) + '::' + url + '::' + ttl;
  const entry = simpleCache.get(key);

  // Devolver valor cacheado cuando aún esté fresco
  if (entry && entry.value && (now - entry.t) < ttl) {
    return entry.value;
  }

  // Si hay una petición en vuelo, esperar su promesa y luego devolver su valor
  if (entry && entry.promise) {
    try {
      await entry.promise;
      const latest = simpleCache.get(key);
      return latest ? latest.value : null;
    } catch (err) {
      // Si la petición en vuelo falló, eliminar la entrada de caché y relanzar el error
      simpleCache.delete(key);
      throw err;
    }
  }

  // De lo contrario, iniciar una nueva petición y almacenar la promesa para que otros
  // llamantes la reutilicen
  const p = api.get(url)
    .then(response => {
  // Guardar response.data cruda en la caché
      simpleCache.set(key, { t: Date.now(), value: response.data });
      return response.data;
    })
    .catch(err => {
      // En caso de error, limpiar la caché para permitir reintentos posteriores
      simpleCache.delete(key);
      throw err;
    });

  // Guardar la promesa para que las llamadas concurrentes esperen su resolución
  simpleCache.set(key, { t: now, promise: p });

  const data = await p;
  return data;
}

// Función auxiliar nueva: normalizar varias formas de respuesta de Xano a un arreglo de elementos
export function extractArray(responseData) {
  if (!responseData) return [];
  if (Array.isArray(responseData)) return responseData;
  // Envoltorios comunes usados por algunos Function Stacks
  if (Array.isArray(responseData.data)) return responseData.data;
  if (Array.isArray(responseData.result)) return responseData.result;
  if (Array.isArray(responseData.items)) return responseData.items;
  // Algunos endpoints devuelven { records: [...] }
  if (Array.isArray(responseData.records)) return responseData.records;
  // Reemplazo: si el objeto tiene claves numéricas, intentar tomar los valores
  try {
    const values = Object.values(responseData).filter(v => Array.isArray(v));
    if (values.length) return values[0];
  } catch {
  // ignorar
  }
  return [];
}

// Función auxiliar para mapear datos de usuario de Xano al frontend
const mapUserFromXano = (xanoUser) => {
  if (!xanoUser) return null;
  
  return {
    id: xanoUser.id,
    // Campos exactos de la tabla 'user' en Xano (SIN campo run)
    nombre: xanoUser.name,           // name (texto)
    apellidos: xanoUser.last_name,   // last_name (texto)
    email: xanoUser.email,           // email (correo)
    role_id: xanoUser.role_id,       // role_id (entero) - CAMPO PRINCIPAL
    rol_id: xanoUser.role_id,        // Alias para compatibilidad
    rol: xanoUser.role_id === 2 ? 'admin' : 'cliente', // ← CORREGIDO: 2 = admin, 1 = cliente
    password_hash: xanoUser.password_hash, // password_hash (contraseña)
    // Si el proyecto almacenara contraseñas en texto plano (no recomendado), incluirlo aquí
    password: xanoUser.password,
    creado_en: xanoUser.created_at,  // created_at (marca temporal)
    fechaRegistro: xanoUser.created_at,
    // Estado del usuario: true = activo/desbloqueado, false = bloqueado
    state: typeof xanoUser.state === 'undefined' ? true : (xanoUser.state === true || xanoUser.state === 1 || String(xanoUser.state) === 'true'),
  };
};

// Función auxiliar para mapear datos de usuario del frontend a Xano
// Usar campos exactos como están definidos en la tabla 'user' (SIN campo run)
const mapUserToXano = (frontendUser) => {
  // Crear objeto con todos los campos requeridos
  const xanoData = {
    // Campos obligatorios con valores predeterminados seguros
    name: "",
    last_name: "",
    email: "",
    password: "",
    role_id: 1  // Por defecto cliente (1), admin sería (2)
  };
  
  // Mapear campos obligatorios
  if (frontendUser.nombre && typeof frontendUser.nombre === 'string') {
    xanoData.name = frontendUser.nombre.trim();
  }
  
  if (frontendUser.apellidos && typeof frontendUser.apellidos === 'string') {
    xanoData.last_name = frontendUser.apellidos.trim();
  }
  
  if (frontendUser.email && typeof frontendUser.email === 'string') {
    xanoData.email = frontendUser.email.trim();
  }
  
  if (frontendUser.password && typeof frontendUser.password === 'string') {
    xanoData.password = frontendUser.password;
  }
  
  // role_id como integer
  if (frontendUser.rol) {
    xanoData.role_id = frontendUser.rol === 'admin' ? 2 : 1; // Corregido: admin = 2, cliente = 1
  }
  
  // Campos opcionales (si existen) - NOTE: no se incluye teléfono ya que no existe en la tabla

  // Permitir enviar el estado si se pasó desde la UI (true = activo, false = bloqueado)
  if (typeof frontendUser.state !== 'undefined') {
    // Convertir a boolean/número según lo que acepte el backend
    xanoData.state = frontendUser.state === true || frontendUser.state === 1 || String(frontendUser.state) === 'true' ? true : false;
  }
  
  return xanoData;
};


// ===== AUTENTICACIÓN =====
export const authAPI = {
  // Login usando la API de autenticación
  login: async (email, password) => {
    try {
      // Limpiar cualquier token previo
      delete authApiInstance.defaults.headers.common['Authorization'];
      // Sanear valores antes de enviarlos al servidor
      const safeEmail = (email || '').toString().trim();
      const safePassword = (password || '').toString();
      const response = await authApiInstance.post('/auth/login', {
        email: safeEmail,
        password: safePassword
      });
      // Intentar localizar el token en las distintas formas posibles que Xano puede devolver
      const raw = response.data;
      const token = raw?.authToken || raw?.token || raw?.accessToken || raw?.data?.authToken || raw?.data?.token || (Array.isArray(raw) && raw[0] && (raw[0].authToken || raw[0].token || raw[0].accessToken));

      if (token) {
        authApiInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      return response.data;
    } catch (error) {
      // Mejorar logging: imprimir cuerpo completo de la respuesta si está disponible
      try {
        const respBody = error.response?.data;
        console.error('Error en login (response body):', respBody);
        if (respBody && typeof respBody === 'object') {
          // Mostrar message/code si existen
          console.error('Login server message:', respBody.message || respBody.error || respBody.code || 'n/a');
        }
      } catch (e) {
        console.error('Error en login (no response body):', e?.message || error.message || error);
      }

      // Si es error 403 con credenciales válidas, podría ser rate limiting de auth
      if (error.response?.status === 403) {
        // 403 detected - possible rate limiting or denied access
      }

      throw error;
    }
  },

  // Registro usando la API de autenticación
  signup: async (userData) => {
    try {
  // intentando registrar usando la API de autenticación
      // Enviar la estructura completa que Xano espera para crear el usuario
      // Incluimos last_name y role_id para que el Function Stack pueda usarlos
      // Normalizar/validar campos para evitar enviar valores vacíos que rompan Function Stacks
      const resolvedEmail = (userData.email || userData.email_address || userData.emailAddress || '').toString().trim();
      const resolvedName = (userData.nombre || userData.name || '').toString().trim() || (resolvedEmail ? resolvedEmail.split('@')[0] : `user_${Date.now()}`);
      const resolvedLast = (userData.apellidos || userData.last_name || userData.lastName || '').toString().trim();
      const resolvedPassword = (userData.password || userData.password_plain || userData.passwordPlain || '').toString();
      let resolvedRole = Number(userData.rol_id ?? userData.role_id ?? userData.roleId ?? userData.role) || 1;
      if (!resolvedRole || resolvedRole < 1) resolvedRole = 1; // asegurar role_id válido

      const payload = {
        name: resolvedName,
        last_name: resolvedLast,
        email: resolvedEmail,
        password: resolvedPassword,
        role_id: resolvedRole,
        state: typeof userData.state !== 'undefined' ? userData.state : '1'
      };

      const response = await authApiInstance.post('/auth/signup', payload);
  // Registro exitoso (auth)

      // Verificación post-signup: asegurar que el record en /user existe y contiene password_hash
      try {
        const MAX_ATTEMPTS = 3;
        let created = null;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          // Intentar obtener el usuario por email directamente desde /user
          try {
            const usersResp = await api.get(ENDPOINTS.USERS);
            const list = extractArray(usersResp.data || usersResp);
            const mapped = list.map(mapUserFromXano);
            created = mapped.find(u => u.email === payload.email) || null;
          } catch {
            // ignore errors while attempting to locate the newly created user
            created = null;
          }
          if (created) break;
          // Esperar un poco antes del siguiente intento para permitir la propagación en Xano
          await new Promise(res => setTimeout(res, 300));
        }

        if (!created) {
          const err = new Error('Registro creado en auth, pero no existe record en /user (verifica Function Stack).');
          err.serverData = response.data;
          throw err;
        }

        if (!created.password_hash) {
          const err = new Error('La contraseña NO fue hasheada en el servidor: campo password_hash vacío. Revisar Hash Password en /auth/signup.');
          err.serverData = created;
          throw err;
        }

        // Todo OK
        return response.data; // Ya viene con el token
      } catch (verifyErr) {
  console.error('Verificación post-signup falló:', verifyErr.serverData || verifyErr.message || verifyErr);
        throw verifyErr;
      }
    } catch (error) {
        // Log básico
  console.error('Error en registro (authAPI.signup):', error.response?.data || error.message);
  // Si es 403, imprimir detalle completo (temporal)
        if (error.response?.status === 403) {
          try {
            console.error('Detalle 403 (server response):', JSON.stringify(error.response?.data, null, 2));
          } catch {
            console.error('Detalle 403 (server response) RAW:', error.response?.data);
          }
        }
        // Xano a veces retorna 403 con message "This account is already in use." and code ERROR_CODE_ACCESS_DENIED
        // Tratar ese caso como 'duplicate account' para mostrar mensaje amigable al usuario
        const respBody = error.response?.data || {};
        const respMessage = (respBody.message || '').toString().toLowerCase();
        const respCode = respBody.code || '';
        if (error.response?.status === 403 && (respMessage.includes('already in use') || respCode === 'ERROR_CODE_ACCESS_DENIED')) {
          const dupErr = new Error('El email ya está registrado en el sistema');
          dupErr.status = 409;
          dupErr.serverData = respBody;
          throw dupErr;
        }
        const serverMessage = (error.response?.data?.message || error.message || '').toString();
        const status = error.response?.status;

        // Si el error viene de nuestra verificación post-signup (registro creado pero sin hash o sin record),
        // re-lanzarlo para que el caller (AuthContext) lo maneje y muestre un mensaje amigable.
        const verificationErrors = [
          'registro creado en auth, pero no existe record en /user',
          'la contraseña no fue hasheada en el servidor',
          'no fue hasheada',
          'no se encontró'
        ];

        for (const ve of verificationErrors) {
          if (serverMessage.toLowerCase().includes(ve)) {
            // Re-throw original error to be handled upstream
            throw error;
          }
        }

        // Detectar errores de registro duplicado o validación y no intentar fallback para evitar doble creación
        const isDuplicate = (typeof serverMessage === 'string' && serverMessage.toLowerCase().includes('duplicate')) || status === 409 || status === 422;
        if (isDuplicate) {
          const err = new Error('El email ya está registrado en el sistema');
          err.status = status || 500;
          err.serverData = error.response?.data;
          throw err;
        }

        // No realizaremos fallback automático a /user porque provoca intentos duplicados y 500.
        console.error('No se realizará fallback a /user. Revisa la configuración de /auth/signup en Xano y el Function Stack.');
        const errFinal = new Error(error.response?.data?.message || error.message || 'Error en auth signup');
        errFinal.serverData = error.response?.data || error;
        throw errFinal;
    }
  },

  // Obtener perfil del usuario autenticado
  me: async (token) => {
    try {
      const response = await authApiInstance.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return mapUserFromXano(response.data);
    } catch (error) {
      console.error('Error al obtener perfil:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener perfil del usuario actual - Endpoint: GET /user/{user_id}
  getProfile: async (userId) => {
    try {
      const response = await api.get(`/user/${userId}`);
      return mapUserFromXano(response.data);
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      throw error;
    }
  }
};






// ===== FUNCIONES AUXILIARES =====

export const utils = {
  // Validar si la API está disponible
  checkApiHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  },

  //  Funciones de token (alias para compatibilidad)
  setAuthToken: (token) => tokenUtils.setAuthToken(token),
  clearAuthToken: () => tokenUtils.clearAuthToken(),
  hasToken: () => tokenUtils.hasToken(),
  getCurrentToken: () => tokenUtils.getCurrentToken(),

  // Inicializar datos por defecto (fallback)
  initializeDefaultData: async () => {
        try {
          // Crear usuario admin por defecto sin RUN para evitar errores de validación
          const adminUser = {
            nombre: "Admin",
            apellidos: "Sistema", 
            email: "admin@ambientefest.cl",
            password: "admin123",
            rol: "admin"
          };

          // Construir payload conforme a Xano
          const payload = mapUserToXano(adminUser);
          if (adminUser.password) payload.password = adminUser.password;
          await api.post(ENDPOINTS.USERS, payload);
          // Usuario admin creado por defecto
        } catch (error) {
          // Usuario admin ya existe o error al crear
          console.warn('initializeDefaultData: admin user creation skipped or failed', error);
        }
  }
};

// Utilidades para manejo de tokens
export const tokenUtils = {
  // Configurar token para todas las requests
  setAuthToken: (token) => {
    if (token) {
      // Configurar en ambas instancias de axios
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      authApiInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },
  
  // Limpiar token
  clearAuthToken: () => {
    delete api.defaults.headers.common['Authorization'];
    delete authApiInstance.defaults.headers.common['Authorization'];
  },
  
  // Verificar si hay token configurado
  hasToken: () => {
    return !!api.defaults.headers.common['Authorization'];
  },
  
  // Obtener token actual
  getCurrentToken: () => {
    const authHeader = api.defaults.headers.common['Authorization'];
    return authHeader ? authHeader.replace('Bearer ', '') : null;
  }
};

// Interceptor para manejar tokens expirados automáticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si recibimos 401 y tenemos token, significa que expiró
    if (error.response?.status === 401 && tokenUtils.hasToken()) {
      console.warn(' Token expirado - limpiando...');
      tokenUtils.clearAuthToken();
      localStorage.removeItem('ambienteFestToken');
      localStorage.removeItem('ambienteFestUser');
    }
    return Promise.reject(error);
  }
);

export default api;

//  Función para corregir el rol del admin
export const fixAdminRole = async () => {
  try {
    // Encontrar usuario admin
    const resp = await api.get(ENDPOINTS.USERS);
    const usuarios = (extractArray(resp.data || resp) || []).map(mapUserFromXano);
    const admin = usuarios.find(u => u.email === 'admin@ambientefest.cl');

    if (!admin) {
      return {
        success: false,
        message: 'Usuario admin no encontrado',
        error: 'Admin no existe en la base de datos'
      };
    }

    if (admin.role_id === 2 || admin.rol_id === 2) {
      return {
        success: true,
        message: 'Usuario admin ya tiene el rol correcto',
        user: admin,
        action: 'no_change_needed'
      };
    }

    const updateData = { role_id: 2 };
  const updateResp = await api.patch(`${ENDPOINTS.USERS}/${admin.id}`, updateData);
  const updatedUser = mapUserFromXano(updateResp.data);

    return {
      success: true,
      message: 'Rol del admin corregido exitosamente',
      user: updatedUser,
      action: 'updated',
      previous_role: admin.role_id || admin.rol_id || admin.rol,
      new_role: 2
    };
  } catch (error) {
    const errorDetails = {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code,
      payload: error.response?.data?.payload,
      fullResponse: error.response?.data
    };
    return {
      success: false,
      message: 'Error corrigiendo rol del admin',
      error: errorDetails
    };
  }
};
