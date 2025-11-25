import api, { ENDPOINTS, cachedGet, extractArray } from './api';

// Mapear usuario desde la forma de Xano al frontend
const mapUserFromXano = (xanoUser) => {
  if (!xanoUser) return null;
  return {
    id: xanoUser.id,
    nombre: xanoUser.name || xanoUser.nombre,
    apellidos: xanoUser.last_name || xanoUser.apellidos,
    email: xanoUser.email,
    role_id: xanoUser.role_id,
    rol: xanoUser.role_id === 2 ? 'admin' : 'cliente',
    // Preservar cualquier campo tipo contraseña devuelto por el backend. Algunos Function Stacks
    // almacenan un `password` plano (no ideal pero usado en configuraciones anteriores) — AuthContext
    // depende de comparar `foundUser.password` con la contraseña enviada para
    // verificación local. También preservar campos hash si están presentes.
    password: xanoUser.password || xanoUser.clave || xanoUser.password_plain || null,
    password_hash: xanoUser.password_hash || xanoUser.clave_hash || null,
    creado_en: xanoUser.created_at || xanoUser.creado_en,
    state: typeof xanoUser.state === 'undefined' ? true : (xanoUser.state === true || xanoUser.state === 1 || String(xanoUser.state) === 'true')
  };
};

const mapUserToXano = (frontendUser) => {
  const data = {
    name: frontendUser.nombre || frontendUser.name || '',
    last_name: frontendUser.apellidos || frontendUser.last_name || '',
    email: frontendUser.email || '',
    password: frontendUser.password || '',
    role_id: frontendUser.rol || frontendUser.role_id || 1,
    state: typeof frontendUser.state !== 'undefined' ? frontendUser.state : true
  };
  // Normalizar rol
  if (data.role_id === 'admin' || data.role_id === '2' || data.role_id === 2) {
    data.role_id = 2;
  } else {
    data.role_id = 1;
  }
  return data;
};

export const usuariosAPI = {
  getAll: async () => {
    try {
      const data = await cachedGet(ENDPOINTS.USERS);
      const list = extractArray(data);
      return list.map(mapUserFromXano);
    } catch (err) {
      console.error('usuariosAPI.getAll error', err);
      throw err;
    }
  },

  getById: async (id) => {
    try {
      // Usar cachedGet para deduplicar/cachear en memoria las solicitudes del mismo user id
      const data = await cachedGet(`${ENDPOINTS.USERS}/${id}`, 300000); // TTL de 5min
      return mapUserFromXano(data || null);
    } catch (err) {
      console.error('usuariosAPI.getById error', err);
      throw err;
    }
  },

  create: async (userData) => {
    try {
      const payload = mapUserToXano(userData);
      if (userData.password) payload.password = userData.password;
      const res = await api.post(ENDPOINTS.USERS, payload);
      return mapUserFromXano(res.data);
    } catch (err) {
      console.error('usuariosAPI.create error', err);
      throw err;
    }
  },

  update: async (id, userData) => {
    try {
      const payload = mapUserToXano(userData);
      const res = await api.patch(`${ENDPOINTS.USERS}/${id}`, payload);
      return mapUserFromXano(res.data);
    } catch (err) {
      console.error('usuariosAPI.update error', err);
      throw err;
    }
  },

  delete: async (id) => {
    try {
      const res = await api.delete(`${ENDPOINTS.USERS}/${id}`);
      return res.data;
    } catch (err) {
      console.error('usuariosAPI.delete error', err);
      throw err;
    }
  },

  findByEmail: async (email) => {
    try {
      const res = await cachedGet(ENDPOINTS.USERS, 300000); // reutilizar lista de usuarios cacheada
      const list = extractArray(res || []);
      const mapped = list.map(mapUserFromXano);
      return mapped.find(u => u.email === email) || null;
    } catch (err) {
      console.error('usuariosAPI.findByEmail error', err);
      return null;
    }
  }
};

export const rolesAPI = {
  getAll: async () => {
    try {
      const res = await api.get(ENDPOINTS.ROLES || '/role');
      return res.data;
    } catch (err) {
      console.error('rolesAPI.getAll error', err);
      return [ { id: 1, nombre: 'cliente' }, { id: 2, nombre: 'admin' } ];
    }
  }
};

export default usuariosAPI;
