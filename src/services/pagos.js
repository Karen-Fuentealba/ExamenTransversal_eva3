import api, { ENDPOINTS, cachedGet } from './api';

// ===== PAGOS =====
// Lógica relacionada con pagos extraída desde src/services/api.js
export const pagosAPI = {
  // Crear nuevo pago
  create: async (pagoData) => {
    try {
      const dataToSend = {
        ...pagoData,
        fecha_pago: new Date().toISOString(),
        estado: pagoData.estado || 'pendiente'
      };
      // Usar ENDPOINTS.PAYMENTS (ruta estándar /payment)
      const response = await api.post(ENDPOINTS.PAYMENTS, dataToSend);
      return response.data;
    } catch (error) {
      console.error('Error al crear pago:', error);
      throw error;
    }
  },

  // Obtener pagos del usuario
  getByUserId: async (userId) => {
    try {
      // Muchos Function Stacks exponen /payment y esperan query param user_id
      const response = await api.get(`${ENDPOINTS.PAYMENTS}?user_id=${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener pagos:', error);
      throw error;
    }
  },

  // Obtener todos los pagos (solo admin)
  getAll: async () => {
    try {
      // Usar cachedGet para reducir peticiones repetidas y mitigar rate limits (TTL 60s)
      const data = await cachedGet(ENDPOINTS.PAYMENTS, 60000);
      return data;
    } catch (error) {
      console.error('Error al obtener todos los pagos:', error);
      throw error;
    }
  },

  // Actualizar estado del pago
  updateStatus: async (id, estado) => {
    try {
      // Enviar payload compatible: incluir tanto 'estado' (español) como 'status' (inglés)
      // Mapear valores comunes para mayor compatibilidad con distintos Function Stacks
      const mapToStatus = (e) => {
        if (!e) return null;
        const lower = String(e).toLowerCase();
        if (lower === 'aprobado' || lower === 'approved' || lower === 'approve') return 'approved';
        if (lower === 'rechazado' || lower === 'rejected' || lower === 'reject') return 'rejected';
        if (lower === 'pendiente' || lower === 'pending') return 'pending';
        return e;
      };

      const payload = { estado, status: mapToStatus(estado) };

      try {
        const response = await api.patch(`${ENDPOINTS.PAYMENTS}/${id}`, payload);
        return response.data;
      } catch (innerErr) {
        // Si el servidor responde 5xx al PATCH, intentar un PUT como fallback
        const statusCode = innerErr.response?.status;
        console.error('API Error:', statusCode, innerErr.message || innerErr);
        if (statusCode && statusCode >= 500) {
          const resp = await api.put(`${ENDPOINTS.PAYMENTS}/${id}`, payload);
          return resp.data;
        }
        throw innerErr;
      }
    } catch (error) {
      console.error('Error al actualizar estado del pago:', error);
      throw error;
    }
  }
};

export default pagosAPI;
