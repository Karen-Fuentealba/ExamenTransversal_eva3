import api from './api';

/**
 * Servicio para gestionar contactos
 * Conecta con los endpoints de la tabla 'contact' de Xano
 */

const CONTACT_ENDPOINTS = {
  BASE: '/contact'
};

export const contactoAPI = {
  /**
   * Obtener todos los registros de contacto
   * @returns {Promise<Array>} Lista de mensajes de contacto
   */
  getAll: async () => {
    try {
      const response = await api.get(CONTACT_ENDPOINTS.BASE);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo contactos:', error);
      throw error;
    }
  },

  /**
   * Crear un nuevo mensaje de contacto
   * @param {Object} contactData - Datos del contacto
   * @param {string} contactData.name - Nombre del contacto
   * @param {string} contactData.email - Email del contacto
   * @param {string} contactData.message - Mensaje del contacto
   * @returns {Promise<Object>} Contacto creado
   */
  create: async (contactData) => {
    try {
      const response = await api.post(CONTACT_ENDPOINTS.BASE, contactData);
      return response.data;
    } catch (error) {
      console.error('Error creando contacto:', error);
      throw error;
    }
  },

  /**
   * Obtener un mensaje de contacto específico por ID
   * @param {number} contactId - ID del contacto
   * @returns {Promise<Object>} Datos del contacto
   */
  getById: async (contactId) => {
    try {
      const response = await api.get(`${CONTACT_ENDPOINTS.BASE}/${contactId}`);
      return response.data;
    } catch (error) {
      console.error(`Error obteniendo contacto ${contactId}:`, error);
      throw error;
    }
  },

  /**
   * Actualizar un mensaje de contacto completo
   * @param {number} contactId - ID del contacto
   * @param {Object} contactData - Datos actualizados del contacto
   * @returns {Promise<Object>} Contacto actualizado
   */
  update: async (contactId, contactData) => {
    try {
      const response = await api.put(`${CONTACT_ENDPOINTS.BASE}/${contactId}`, contactData);
      return response.data;
    } catch (error) {
      console.error(`Error actualizando contacto ${contactId}:`, error);
      throw error;
    }
  },

  /**
   * Actualizar parcialmente un mensaje de contacto
   * @param {number} contactId - ID del contacto
   * @param {Object} partialData - Datos parciales a actualizar
   * @returns {Promise<Object>} Contacto actualizado
   */
  partialUpdate: async (contactId, partialData) => {
    try {
      const response = await api.patch(`${CONTACT_ENDPOINTS.BASE}/${contactId}`, partialData);
      return response.data;
    } catch (error) {
      console.error(`Error actualizando parcialmente contacto ${contactId}:`, error);
      throw error;
    }
  },

  /**
   * Eliminar un mensaje de contacto (solo administradores)
   * @param {number} contactId - ID del contacto
   * @returns {Promise<Object>} Confirmación de eliminación
   */
  delete: async (contactId) => {
    try {
      const response = await api.delete(`${CONTACT_ENDPOINTS.BASE}/${contactId}`);
      return response.data;
    } catch (error) {
      console.error(`Error eliminando contacto ${contactId}:`, error);
      throw error;
    }
  }
};

export default contactoAPI;