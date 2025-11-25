import api, { ENDPOINTS, cachedGet, extractArray } from './api';
import { uploadImages } from './imagenes';

// Mapper simplificado: devuelve exactamente los campos que espera la interfaz de administración.
const mapServiceFromXano = (x) => {
  if (!x) return null;

  const safeGet = (keys, fallback = null) => {
    for (const k of keys) {
      if (typeof x[k] !== 'undefined' && x[k] !== null) return x[k];
    }
    return fallback;
  };

  // intentar extraer una URL de imagen usable (primer candidato) y normalizarla a URL absoluta
  const extractImage = (field) => {
    if (!field) return null;
    
    let rawPath = null;
    
    if (typeof field === 'string') {
      rawPath = field;
    } else if (Array.isArray(field) && field.length) {
      const first = field[0];
      if (!first) return null;
      if (typeof first === 'string') {
        rawPath = first;
      } else {
        rawPath = first.path || first.url || first.file_url || null;
      }
    } else if (typeof field === 'object') {
      rawPath = field.path || field.url || field.file_url || null;
    }
    
    if (!rawPath) return null;
    
    // Normalizar a URL absoluta: si comienza con / (ruta relativa), anteponer la base de Xano
    if (rawPath.startsWith('/')) {
      return `https://x8ki-letl-twmt.n7.xano.io${rawPath}`;
    }
    
    // Si ya comienza con http/https, devolver tal cual
    return rawPath;
  };

  // extraer múltiples imágenes como array de URLs normalizadas
  const extractImages = (field) => {
    if (!field) return [];
    const urls = [];

    const pushUrl = (rawPath) => {
      if (!rawPath) return;
      if (typeof rawPath !== 'string') return;
      if (rawPath.startsWith('/')) urls.push(`https://x8ki-letl-twmt.n7.xano.io${rawPath}`);
      else urls.push(rawPath);
    };

    if (typeof field === 'string') {
      pushUrl(field);
    } else if (Array.isArray(field)) {
      for (const it of field) {
        if (!it) continue;
        if (typeof it === 'string') pushUrl(it);
        else if (typeof it === 'object') {
          const p = it.path || it.url || it.file_url || it.file?.url || null;
          if (p) pushUrl(p);
        }
      }
    } else if (typeof field === 'object') {
      const p = field.path || field.url || field.file_url || field.file?.url || null;
      if (p) pushUrl(p);
    }

    // Deduplicate while preserving order
    const seen = new Set();
    return urls.filter(u => {
      if (seen.has(u)) return false; seen.add(u); return true;
    });
  };

  const imagenRaw = safeGet(['imagen', 'image', 'image_file', 'imagen_data', 'images'], null);
  const imagenesArray = extractImages(imagenRaw);
  const imagenUrl = imagenesArray.length ? imagenesArray[0] : null;

  const rawAvailability = safeGet(['availability', 'disponibilidad', 'availability_text', 'available', 'disponible'], null);
  let disponibilidad = null;
  let disponible = null;
  if (typeof rawAvailability === 'string') {
    disponibilidad = rawAvailability;
    const lower = rawAvailability.toLowerCase();
    if (lower === 'true' || lower === 'disponible' || lower.includes('disponible')) disponible = true;
    else if (lower === 'false' || lower === 'no disponible' || lower.includes('no disponible')) disponible = false;
  } else if (typeof rawAvailability === 'boolean') {
    disponible = rawAvailability;
    disponibilidad = rawAvailability ? 'Disponible' : 'No disponible';
  } else if (typeof rawAvailability === 'number') {
    disponible = Boolean(rawAvailability);
    disponibilidad = disponible ? 'Disponible' : 'No disponible';
  } else {
    disponibilidad = null;
    disponible = null;
  }

  const ratingValue = Number(safeGet(['rating', 'valoracion'], 0)) || 0;
  const numRatingsValue = Number(safeGet(['num_ratings', 'num_valoraciones', 'numValoraciones'], 0)) || 0;

  return {
    id: safeGet(['id', 'service_id', 'ID'], null),
    creado_en: safeGet(['created_at', 'creado_en', 'createdAt'], null),
    nombre: safeGet(['name', 'nombre', 'title', 'service_name'], ''),
    descripcion: safeGet(['description', 'descripcion', 'content'], ''),
    precio: Number(safeGet(['price', 'precio'], 0)) || 0,
    proveedor: safeGet(['provider', 'proveedor', 'user', 'user_id'], null),
    disponibilidad: disponibilidad,
    disponible: disponible,
    // Normalizar campos de rating para que la UI encuentre 'rating' o 'valoracion'
    rating: ratingValue,
    valoracion: ratingValue,
    Calificación: ratingValue,
    // Normalizar conteo de valoraciones
    num_ratings: numRatingsValue,
    num_valoraciones: numRatingsValue,
    numValoraciones: numRatingsValue,
    estado: safeGet(['state', 'estado'], null),
    user_id: safeGet(['user_id', 'userId', 'provider_id'], null),
    service_category_id: safeGet(['service_category_id', 'category_id', 'serviceCategoryId'], null),
    // `imagen` kept for backward compatibility (first image) and `imagenes` contains all available image URLs
    imagen: imagenUrl,
    imagenes: imagenesArray,
    _raw: x
  };
};

// Al enviar datos a Xano, incluiremos tanto claves en español como en inglés
// para aumentar la compatibilidad con distintos Function Stacks. Supuesto: Xano
// aceptará las claves proporcionadas o ignorará las desconocidas.
const mapServiceToXano = (s) => {
  if (!s) return {};

  const payload = {};
  if (typeof s.nombre !== 'undefined') payload.name = s.nombre;
  if (typeof s.descripcion !== 'undefined') payload.description = s.descripcion;
  if (typeof s.precio !== 'undefined') payload.price = Number(s.precio);
  if (typeof s.proveedor !== 'undefined') payload.provider = s.proveedor;
  if (typeof s.disponibilidad !== 'undefined') {
    const v = s.disponibilidad;
    if (typeof v === 'boolean') {
      payload.available = v;
      payload.availability = v ? 'Disponible' : 'No disponible';
    } else if (typeof v === 'string') {
      payload.availability = v;
      const lower = v.toLowerCase();
      if (lower === 'true' || lower.includes('disp')) payload.available = true;
      else if (lower === 'false' || lower.includes('no disp')) payload.available = false;
    } else if (typeof v === 'number') {
      payload.available = Boolean(v);
      payload.availability = payload.available ? 'Disponible' : 'No disponible';
    }
  }
  if (typeof s.Calificación !== 'undefined') payload.rating = Number(s.Calificación);
  if (typeof s.num_ratings !== 'undefined') payload.num_ratings = Number(s.num_ratings);
  if (typeof s.user_id !== 'undefined') payload.user_id = s.user_id;
  if (typeof s.service_category_id !== 'undefined') payload.service_category_id = s.service_category_id;

  // Also set Spanish-named fields so front/back can be compatible
  if (typeof s.nombre !== 'undefined') payload.nombre = s.nombre;
  if (typeof s.descripcion !== 'undefined') payload.descripcion = s.descripcion;
  if (typeof s.precio !== 'undefined') payload.precio = Number(s.precio);
  if (typeof s.imagen !== 'undefined') payload.imagen = s.imagen;

  return payload;
};

// Crear servicio; opcionalmente subir imágenes primero
async function createServiceWithImage(data, imageFiles) {
  try {
    const payload = mapServiceToXano(data);

    if (imageFiles) {
      const uploadResult = await uploadImages(imageFiles);
      // uploadImages devuelve { urls, xanoObjects }
      if (uploadResult && uploadResult.xanoObjects) {
        payload.imagen = uploadResult.xanoObjects;
      } else if (uploadResult && uploadResult.urls) {
        payload.imagen = uploadResult.urls;
      }
    }

    const response = await api.post(ENDPOINTS.SERVICES, payload);
    return mapServiceFromXano(response.data);
  } catch (err) {
    console.error('createServiceWithImage error:', err.response?.data || err.message || err);
    throw err;
  }
}

export const serviciosAPI = {
  getAll: async ({ ttl = 120000, limit } = {}) => {
    try {
      const data = await (ttl ? cachedGet(ENDPOINTS.SERVICES, ttl) : api.get(ENDPOINTS.SERVICES).then(r => r.data));
      const list = extractArray(data);
      const mapped = list.map(mapServiceFromXano);
      if (limit) return mapped.slice(0, limit);
      return mapped;
    } catch (error) {
      console.error('serviciosAPI.getAll error:', error.response?.data || error.message || error);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${ENDPOINTS.SERVICES}/${id}`);
      return mapServiceFromXano(response.data);
    } catch (error) {
      console.error('serviciosAPI.getById error:', error.response?.data || error.message || error);
      throw error;
    }
  },

  create: async (serviceData, imageFiles) => {
    try {
      if (imageFiles) return await createServiceWithImage(serviceData, imageFiles);
      const payload = mapServiceToXano(serviceData);
      const response = await api.post(ENDPOINTS.SERVICES, payload);
      return mapServiceFromXano(response.data);
    } catch (error) {
      console.error('serviciosAPI.create error:', error.response?.data || error.message || error);
      throw error;
    }
  },

  update: async (id, serviceData, imageFiles) => {
    try {
      const payload = mapServiceToXano(serviceData);
      if (imageFiles) {
        const uploadResult = await uploadImages(imageFiles);
        if (uploadResult && uploadResult.xanoObjects) payload.imagen = uploadResult.xanoObjects;
        else if (uploadResult && uploadResult.urls) payload.imagen = uploadResult.urls;
      }
      const response = await api.patch(`${ENDPOINTS.SERVICES}/${id}`, payload);
      return mapServiceFromXano(response.data);
    } catch (error) {
      console.error('serviciosAPI.update error:', error.response?.data || error.message || error);
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`${ENDPOINTS.SERVICES}/${id}`);
      return response.data;
    } catch (error) {
      console.error('serviciosAPI.delete error:', error.response?.data || error.message || error);
      throw error;
    }
  }
};

export default serviciosAPI;

// ===== CATEGORÍAS (Servicios) =====

export const getServiceCategories = async () => {
  try {
    const data = await cachedGet(ENDPOINTS.SERVICE_CATEGORIES || '/service_category', 300000);
    return extractArray(data);
  } catch (error) {
    console.error('Error al obtener categorías de servicios:', error);
    console.log('Error details:', error.response?.data || error.message);
    // Return empty array to prevent UI crashes
    return [];
  }
};

export const categoriasAPI = { getServicios: getServiceCategories };

// ===== HORARIOS / TIME SLOTS =====
// Gestión simplificada de franjas horarias con horarios como texto
export const scheduleAPI = {
  // Obtener franjas horarias de un servicio
  getTimeSlots: async (serviceId) => {
    try {
      const params = serviceId ? `?service_id=${serviceId}` : '';
      const resp = await api.get(`/service_time_slot${params}`);
      const allSlots = extractArray(resp.data || resp);
      
      // Filtro adicional por service_id en frontend para mayor seguridad
      if (serviceId) {
        return allSlots.filter(slot => slot.service_id == serviceId);
      }
      
      return allSlots;
    } catch (err) {
      console.error('scheduleAPI.getTimeSlots error', err?.response?.data || err.message || err);
      throw err;
    }
  },

  // Obtener solo franjas horarias disponibles (futuras y no reservadas)
  getAvailableTimeSlots: async (serviceId) => {
    try {
      console.log('🔍 getAvailableTimeSlots called for serviceId:', serviceId);
      const params = serviceId ? `?service_id=${serviceId}` : '';
      const resp = await api.get(`/service_time_slot${params}`);
      const allSlots = extractArray(resp.data || resp);
      
      console.log('📊 Raw slots received from API:', allSlots.length, allSlots);
      
      // Obtener reservas existentes para este servicio
      let reservedSlotIds = [];
      try {
        const reservationsResp = await api.get(`/service_reservation?service_id=${serviceId}`);
        const reservations = extractArray(reservationsResp.data || reservationsResp);
        reservedSlotIds = reservations.map(r => r.time_slot_id).filter(Boolean);
        console.log('🚫 Reserved slot IDs:', reservedSlotIds);
      } catch (err) {
        console.warn('Could not fetch reservations, assuming no reserved slots:', err);
      }
      
      // Filtrar slots disponibles
      const availableSlots = allSlots.filter(slot => {
        console.log(`🔍 Checking slot ${slot.id}: service_id=${slot.service_id}, date=${slot.date}, time=${slot.start_time}-${slot.end_time}`);
        
        // FILTRO CRÍTICO: Solo slots del servicio específico
        if (slot.service_id != serviceId) {
          console.log(`❌ Filtering out slot ${slot.id} - wrong service_id: ${slot.service_id} (expected: ${serviceId})`);
          return false;
        }
        
        // Excluir slots ya reservados
        if (reservedSlotIds.includes(slot.id)) {
          console.log(`🚫 Filtering out reserved slot ${slot.id}`);
          return false;
        }
        
        // Excluir slots automáticos con horarios 00:00
        const startTime = String(slot.start_time || '');
        if (startTime === '00:00' || startTime === '00:00:00' || startTime === '') {
          console.log(`⏰ Filtering out automatic slot ${slot.id} with time: ${startTime}`);
          return false;
        }
        
        // Solo slots de hoy en adelante (comparar solo fecha, no hora exacta)
        try {
          if (!slot.date) {
            console.log(`📅 Filtering out slot ${slot.id} - missing date`);
            return false;
          }
          
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
          const slotDateStr = slot.date.includes('T') ? slot.date.split('T')[0] : slot.date;
          
          const isToday = slotDateStr === todayStr;
          const isFuture = slotDateStr > todayStr;
          const isValidDate = isToday || isFuture;
          
          if (!isValidDate) {
            console.log(`⏰ Filtering out past slot ${slot.id}: ${slotDateStr} (today: ${todayStr})`);
          }
          
          return isValidDate;
        } catch (error) {
          console.log(`❌ Filtering out slot ${slot.id} - date parsing error:`, error);
          return false;
        }
      });
      
      console.log('✅ Final available slots:', availableSlots.length, availableSlots);
      
      // Ordenar por fecha y hora
      return availableSlots.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
      
    } catch (err) {
      console.error('scheduleAPI.getAvailableTimeSlots error', err?.response?.data || err.message || err);
      throw err;
    }
  },

  // Crear nueva franja horaria
  // payload: { service_id, date, start_time, end_time, created_by }
  createTimeSlot: async (payload) => {
    try {
      // Validar que start_time no sea mayor que end_time
      if (payload.start_time && payload.end_time) {
        if (payload.start_time >= payload.end_time) {
          throw new Error('La hora de inicio debe ser menor que la hora de fin');
        }
      }
      
      const resp = await api.post('/service_time_slot', payload);
      return resp.data;
    } catch (err) {
      console.error('scheduleAPI.createTimeSlot error', err?.response?.data || err.message || err);
      throw err;
    }
  },

  // Actualizar franja horaria existente
  // payload: { date?, start_time?, end_time?, service_id? }
  updateTimeSlot: async (id, payload) => {
    try {
      // Validar que start_time no sea mayor que end_time
      if (payload.start_time && payload.end_time) {
        if (payload.start_time >= payload.end_time) {
          throw new Error('La hora de inicio debe ser menor que la hora de fin');
        }
      }
      
      const resp = await api.put(`/service_time_slot/${id}`, payload);
      return resp.data;
    } catch (err) {
      console.error('scheduleAPI.updateTimeSlot error', err?.response?.data || err.message || err);
      throw err;
    }
  },

  // Eliminar franja horaria
  deleteTimeSlot: async (id) => {
    try {
      const resp = await api.delete(`/service_time_slot/${id}`);
      return resp.data;
    } catch (err) {
      console.error('scheduleAPI.deleteTimeSlot error', err?.response?.data || err.message || err);
      throw err;
    }
  },

  // Crear reserva para una franja específica
  createReservation: async ({ service_id, user_id, time_slot_id, notes }) => {
    try {
      const payload = { service_id, user_id, time_slot_id, notes };
      const resp = await api.post('/service_reservation', payload);
      return resp.data;
    } catch (err) {
      console.error('scheduleAPI.createReservation error', err?.response?.data || err.message || err);
      throw err;
    }
  }
};
