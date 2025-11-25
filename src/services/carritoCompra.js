import api, { ENDPOINTS, cachedGet, extractArray } from './api';

// ===== CARRITO =====
// Lógica relacionada con carrito extraída desde src/services/api.js
export const carritoAPI = {
  // Obtener carrito del usuario
  getByUserId: async (userId) => {
    try {
      // Usar cachedGet para deduplicar solicitudes repetidas del carrito del mismo usuario y evitar límites de velocidad.
      const url = `${ENDPOINTS.CART}?user_id=${userId}&active=true`;
      const data = await cachedGet(url, 300000); // TTL de 5 min
      return data;
    } catch (error) {
      console.error('Error al obtener carrito:', error);
      throw error;
    }
  },

  // Crear carrito para usuario (si no existe)
  create: async (userId) => {
    try {
      // Asegurar que enviamos el campo que Xano espera: user_id
      const response = await api.post(ENDPOINTS.CART, {
        user_id: userId,
        // El esquema de Xano usa boolean `active`
        active: true,
        status: 'open'
      });
      return response.data;
    } catch (error) {
      console.error('Error al crear carrito:', error);
      throw error;
    }
  },

  // Agregar item al carrito
  addItem: async (userId, itemData) => {
    try {
      // Enviar tanto campos en español como en inglés y snapshots opcionales
      const payload = {
        // Identificador del servicio (campo principal esperado por algunos Function Stacks)
        servicio_id: itemData.servicio_id || itemData.service_id || itemData.id,
        service_id: itemData.service_id || itemData.servicio_id || itemData.id,

        // Cantidad y subtotal
        cantidad: itemData.cantidad || itemData.quantity || 1,
        quantity: itemData.quantity || itemData.cantidad || 1,
        subtotal: itemData.subtotal ?? itemData.sub_total ?? null,

        // Opcionales: snapshots para mantener nombre/proveedor/precio al momento de la compra
        unit_price: itemData.unit_price ?? itemData.price ?? itemData.precio ?? null,
        precio_unitario: itemData.unit_price ?? itemData.price ?? itemData.precio ?? null,
        service_name: itemData.service_name || itemData.nombre || itemData.name || null,
        service_provider: itemData.provider || itemData.proveedor || null
      };

      const response = await api.post(`${ENDPOINTS.CART}/${userId}/item`, payload);
      return response.data;
    } catch (error) {
      console.error('Error al agregar item al carrito:', error);
      throw error;
    }
  },
  // Agregar detalle directamente (POST /cart_detail) usando cart_id
  addDetail: async (cartId, itemData) => {
    try {
      const payload = {
        cart_id: cartId,
        service_id: itemData.service_id || itemData.servicio_id || itemData.id,
        service_name: itemData.service_name || itemData.nombre || itemData.name || null,
        provider: itemData.service_provider || itemData.proveedor || itemData.provider || null,
        unit_price: itemData.unit_price ?? itemData.price ?? itemData.precio ?? null,
        quantity: itemData.quantity ?? itemData.cantidad ?? 1,
        subtotal: itemData.subtotal ?? null,
        metadata: itemData.metadata ?? null,
        // Información de reserva si existe
        reservation_date: itemData.reservation_date || null,
        reservation_time: itemData.reservation_time || null,
        reservation_datetime: itemData.reservation_datetime || null
      };

      const response = await api.post(ENDPOINTS.CART_DETAILS, payload);
      return response.data;
    } catch (error) {
      console.error('Error al agregar detalle de carrito:', error?.response?.data || error.message);
      throw error;
    }
  },

  // Actualizar cantidad de item en carrito
  updateItem: async (userId, itemId, cantidad) => {
    try {
      const response = await api.put(`${ENDPOINTS.CART}/${userId}/item/${itemId}`, { cantidad });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar item del carrito:', error);
      throw error;
    }
  },

  // Eliminar item del carrito
  removeItem: async (userId, itemId) => {
    try {
      const response = await api.delete(`${ENDPOINTS.CART}/${userId}/item/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar item del carrito:', error);
      throw error;
    }
  },

  // Limpiar carrito
  clear: async (userId) => {
    try {
      // Algunos Function Stacks exponen DELETE /cart/{cart_id} mientras otros esperan
      // DELETE /cart?user_id={userId} o /cart/{cartId}. Probar ambos patrones y
      // manejar 404 (no-op) con elegancia para que los flujos de admin (aprobar pago) no fallen
      // cuando no hay carrito que limpiar.
      // Si userId parece un cart id numérico, preferir /cart/{id}
      const asId = Number(userId);
      if (!Number.isNaN(asId) && String(userId).trim() !== '') {
        try {
          const resp = await api.delete(`${ENDPOINTS.CART}/${asId}`);
          return resp.data;
        } catch (err) {
          // Si no se encuentra, continuar para probar delete estilo query (algunas configuraciones)
          if (err.response?.status !== 404) throw err;
        }
      }

      // Intentar DELETE /cart?user_id={userId}
      try {
        const resp2 = await api.delete(`${ENDPOINTS.CART}?user_id=${encodeURIComponent(userId)}`);
        return resp2.data;
      } catch (err2) {
        // Si 404 o Not Found, tratar como no-op exitoso (carrito ya limpiado)
        if (err2.response?.status === 404 || err2.response?.data?.code === 'ERROR_CODE_NOT_FOUND') {
          console.info('clear: carrito no encontrado, nada que limpiar para', userId);
          return null;
        }
        console.error('Error al limpiar carrito:', err2);
        throw err2;
      }
    } catch (error) {
      console.error('Error al limpiar carrito (final):', error);
      throw error;
    }
  },
  // Obtener carrito por ID (GET /cart/{cart_id})
  getById: async (cartId) => {
    try {
      // Usar cachedGet para reducir GETs duplicados del mismo cart id (ayuda a evitar 429)
      const url = `${ENDPOINTS.CART}/${cartId}`;
      const data = await cachedGet(url, 300000); // 5 minutos
      return data;
    } catch (error) {
      // Si el carrito no existe, Xano devuelve 404 con cuerpo { code: 'ERROR_CODE_NOT_FOUND', message: 'Not Found.' }
      const respData = error?.response?.data;
      if (error?.response?.status === 404 || respData?.code === 'ERROR_CODE_NOT_FOUND') {
        console.info('getById: carrito no encontrado, devolviendo null para id=', cartId);
        return null;
      }

      console.error('Error al obtener carrito por id:', respData || error.message);
      throw error;
    }
  },

  // Obtener detalles del carrito (GET /cart_detail?cart_id=)
  getDetails: async (cartId, ttl = 300000) => {
    try {
      const DEFAULT_TTL = 300000; // 5 minutos
      const useTtl = ttl || DEFAULT_TTL;
      const url = `${ENDPOINTS.CART_DETAILS}?cart_id=${cartId}`;
      // Usar cachedGet para reducir peticiones repetidas
      const data = await cachedGet(url, useTtl);
      // Normalizar respuesta a arreglo de detalles
      const list = extractArray(data);
      return list.map(d => ({
        id: d.id,
        created_at: d.created_at || d.creado_en || null,
        // cantidad: campo en español y quantity: campo estandar
        cantidad: d.cantidad ?? d.quantity ?? null,
        quantity: d.quantity ?? d.cantidad ?? null,
        subtotal: d.subtotal ?? d.sub_total ?? null,
        cart_id: d.cart_id ?? d.cartId ?? d.carrito_id ?? null,
        service_id: d.service_id ?? d.serviceId ?? d.servicio_id ?? null,
        // Nombre del servicio según esquema local (nombre_servicio) o variantes
        nombre_servicio: d.nombre_servicio || d.service_name || d.name || d.nombre || null,
        // Mantener el objeto raw por si es necesario para debugging
        _raw: d
      }));
    } catch (error) {
      console.error('Error al obtener detalles del carrito:', error?.response?.data || error.message);
      throw error;
    }
  },

  // Función de alto nivel para añadir servicio al carrito con soporte para reservas
  addToCart: async (serviceData) => {
    try {
      const userId = serviceData.user_id;
      if (!userId) {
        throw new Error('user_id es requerido para añadir al carrito');
      }

      // 1. Verificar si el usuario tiene carrito activo
      let cart;
      try {
        const existingCarts = await carritoAPI.getByUserId(userId);
        const activeCarts = extractArray(existingCarts).filter(c => c.active === true);
        cart = activeCarts.length > 0 ? activeCarts[0] : null;
      } catch {
        cart = null;
      }

      // 2. Crear carrito si no existe
      if (!cart) {
        cart = await carritoAPI.create(userId);
      }

      // 3. Preparar datos del detalle del carrito
      const cartDetailData = {
        cart_id: cart.id,
        service_id: serviceData.service_id,
        service_name: serviceData.service_name,
        provider: serviceData.provider,
        unit_price: serviceData.unit_price,
        quantity: serviceData.quantity || 1,
        subtotal: serviceData.subtotal || (serviceData.unit_price * (serviceData.quantity || 1))
      };

      // 4. Añadir información de reserva si existe
      if (serviceData.time_slot_id) {
        cartDetailData.time_slot_id = serviceData.time_slot_id;
      }
      
      if (serviceData.reservation_date) {
        cartDetailData.reservation_date = serviceData.reservation_date;
      }

      if (serviceData.start_time && serviceData.end_time) {
        cartDetailData.reservation_time = `${serviceData.start_time} - ${serviceData.end_time}`;
      }

      // 5. Crear detalle en carrito
      const cartDetail = await carritoAPI.addDetail(cart.id, cartDetailData);

      return {
        cart,
        cartDetail,
        success: true
      };

    } catch (error) {
      console.error('Error en addToCart:', error);
      throw error;
    }
  }
};

export default carritoAPI;
