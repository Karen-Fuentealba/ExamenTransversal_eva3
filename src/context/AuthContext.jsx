/**
 * AuthContext - Contexto de Autenticación
 * 
 * Este archivo gestiona toda la lógica de autenticación de la aplicación.
 * Proporciona funciones para login, registro, actualización de perfil y logout.
 * Mantiene el estado del usuario autenticado y su token JWT en localStorage.
 * Verifica roles (admin/cliente) y estados de bloqueo de usuarios.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
/* eslint-disable react-refresh/only-export-components */
import { authAPI, utils } from '../services/api';
import { usuariosAPI } from '../services/usuarios';

// Crear el contexto de autenticación
const AuthContext = createContext();

/**
 * Hook personalizado useAuth
 * Permite acceder al contexto de autenticación desde cualquier componente.
 * Proporciona funciones y estados relacionados con la autenticación del usuario.
 * Si se usa fuera del AuthProvider, devuelve valores por defecto para evitar errores.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // En entornos de HMR o montajes temporales el provider puede no estar disponible.
    // Para evitar que la app se rompa, devolvemos un fallback con funciones seguras y avisamos en consola.
    console.warn('useAuth utilizado fuera de AuthProvider — devolviendo valores por defecto (temporal).');
    return {
      user: null,
      token: null,
      hasTokenConfigured: false,
      isBlocked: false,
      canInteract: () => false,
      login: async () => ({ success: false, error: 'AuthProvider no disponible' }),
      register: async () => ({ success: false, error: 'AuthProvider no disponible' }),
      updateProfile: async () => ({ success: false, error: 'AuthProvider no disponible' }),
      logout: async () => {},
      isAdmin: () => false,
      isAuthenticated: () => false,
      getRedirectPath: () => '/',
      loading: false
    };
  }
  return context;
};

/**
 * AuthProvider - Proveedor del Contexto de Autenticación
 * Envuelve la aplicación y proporciona el contexto de autenticación a todos los componentes hijos.
 * Gestiona el estado global del usuario, token, loading y estado de bloqueo.
 */
export const AuthProvider = ({ children }) => {
  // Estados principales del contexto
  const [user, setUser] = useState(null); // Datos del usuario autenticado
  const [token, setToken] = useState(null); // Token JWT de autenticación
  const [loading, setLoading] = useState(true); // Estado de carga inicial
  const [hasTokenConfigured, setHasTokenConfigured] = useState(false); // Indica si el token está configurado en las peticiones
  const [isBlocked, setIsBlocked] = useState(false); // Indica si el usuario está bloqueado

  /**
   * useEffect de inicialización
   * Se ejecuta al montar el componente.
   * Recupera los datos del usuario y token desde localStorage si existen.
   * Configura el token en las peticiones HTTP si está disponible.
   */
  useEffect(() => {
    const initializeAuth = async () => {
      let savedUser = null;
      let savedToken = null;
      try {
        savedUser = localStorage.getItem('ambienteFestUser');
        savedToken = localStorage.getItem('ambienteFestToken');

        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            setIsBlocked(parsed && (parsed.state === false || String(parsed.state) === 'false'));
          } catch (e) {
            console.error('Error parseando savedUser desde localStorage:', e, savedUser);
          }
        }

        if (savedToken) {
          setToken(savedToken);
          try {
            await utils.setAuthToken(savedToken);
            setHasTokenConfigured(true);
          } catch (e) {
            console.warn('No se pudo configurar token desde savedToken:', e);
          }
        }
      } catch (err) {
        console.error('Error al inicializar autenticación:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Función login
   * Autentica al usuario con email y contraseña.
   * Busca al usuario en la base de datos, verifica su contraseña.
   * Si el usuario está bloqueado, no configura el token.
   * Si la autenticación es exitosa, guarda el usuario y token en localStorage.
   */
  const login = async (email, password) => {
    try {
      // Sanitizar entradas para evitar espacios en blanco innecesarios
      const safeEmail = (email || '').toString().trim().toLowerCase();
      const safePassword = (password || '').toString().trim();

      // Buscar usuario por email en la base de datos
      const foundUser = await usuariosAPI.findByEmail(safeEmail);
      if (!foundUser) return { success: false, error: 'Credenciales incorrectas' };

      // Verificar que la contraseña coincida
      if (foundUser.password !== safePassword) return { success: false, error: 'Credenciales incorrectas' };

      // Crear objeto de usuario sin la contraseña para seguridad
      const userWithoutPassword = { ...foundUser };
      delete userWithoutPassword.password;
      delete userWithoutPassword.clave_hash;
      delete userWithoutPassword.password_hash;

      // Si el usuario está bloqueado, no configurar el token
      if (foundUser.state === false || String(foundUser.state) === 'false') {
        setUser(userWithoutPassword);
        setIsBlocked(true);
        setToken(null);
        setHasTokenConfigured(false);
  try { await utils.clearAuthToken(); } catch (e) { console.warn('clearAuthToken failed during blocked login:', e); }
  try { localStorage.setItem('ambienteFestUser', JSON.stringify(userWithoutPassword)); } catch (e) { console.warn('localStorage setItem user failed:', e); }
  try { localStorage.removeItem('ambienteFestToken'); } catch (e) { console.warn('localStorage removeItem token failed:', e); }
        return { success: true, user: userWithoutPassword, blocked: true, message: 'Usuario bloqueado, contacte con el administrador.' };
      }

      // Login normal: intentar obtener token JWT desde la API de autenticación
      setUser(userWithoutPassword);
  try { localStorage.setItem('ambienteFestUser', JSON.stringify(userWithoutPassword)); } catch (e) { console.warn('localStorage setItem user failed:', e); }

      try {
        // Intentar obtener token desde la API de autenticación de Xano
        const authResp = await authAPI.login(safeEmail, safePassword);
        // Buscar el token en diferentes posibles ubicaciones de la respuesta
        const possibleToken = authResp?.authToken || authResp?.token || authResp?.access_token || authResp?.data?.authToken || authResp?.data?.token || (Array.isArray(authResp) && authResp[0] && (authResp[0].authToken || authResp[0].token));
        if (possibleToken) {
          setToken(possibleToken);
          try {
            // Configurar el token en las peticiones HTTP y guardarlo en localStorage
            await utils.setAuthToken(possibleToken);
            localStorage.setItem('ambienteFestToken', possibleToken);
            setHasTokenConfigured(true);
          } catch (e) {
            console.warn('No se pudo configurar token tras login:', e);
          }
        }
      } catch (e) {
        console.warn('No se obtuvo token desde auth API tras login (puede ser normal):', e?.message || e);
      }

      setIsBlocked(false);
      return { success: true, user: userWithoutPassword };
    } catch (err) {
      console.error('Error en login (data API):', err);
      return { success: false, error: 'Error al iniciar sesión' };
    }
  };

  /**
   * Función register
   * Registra un nuevo usuario en la base de datos.
   * Por defecto asigna role_id=1 (cliente) si no se especifica.
   * Intenta obtener el token JWT tras el registro para autenticar automáticamente.
   * Guarda el usuario y token en localStorage.
   */
  const register = async (userData) => {
    try {
      // Asegurar que el usuario tenga role_id=1 (cliente) por defecto
      const payload = { ...userData, role_id: userData.role_id || 1 };
      const created = await usuariosAPI.create(payload);

      // Crear objeto de usuario sin contraseña para seguridad
      const userWithoutPassword = { ...created };
      delete userWithoutPassword.password;
      delete userWithoutPassword.clave_hash;
      delete userWithoutPassword.password_hash;

      // Guardar usuario en el estado y localStorage
      setUser(userWithoutPassword);
  try { localStorage.setItem('ambienteFestUser', JSON.stringify(userWithoutPassword)); } catch (e) { console.warn('localStorage setItem user failed:', e); }

      try {
        // Intentar autenticar automáticamente tras el registro para obtener el token
        const authResp = await authAPI.login(payload.email || payload.email_address || payload.email, payload.password);
        const possibleToken = authResp?.authToken || authResp?.token || authResp?.access_token || authResp?.data?.authToken || authResp?.data?.token || (Array.isArray(authResp) && authResp[0] && (authResp[0].authToken || authResp[0].token));
        if (possibleToken) {
          setToken(possibleToken);
          try {
            // Configurar token en peticiones y guardarlo en localStorage
            await utils.setAuthToken(possibleToken);
            localStorage.setItem('ambienteFestToken', possibleToken);
            setHasTokenConfigured(true);
          } catch (e) {
            console.warn('No se pudo configurar token tras registro:', e);
          }
        }
      } catch (e) {
        console.warn('No se pudo obtener token desde auth API tras registro (ok):', e?.message || e);
      }

      return { success: true, user: userWithoutPassword, id: created.id, role_id: created.role_id || created.rol_id };
    } catch (err) {
      console.error('Error creando usuario (data API):', err);
      const status = err.response?.status;
      // Manejar errores específicos como email duplicado
      if (status === 409 || status === 422) return { success: false, error: 'El email o RUN ya está registrado' };
      return { success: false, error: err.response?.data?.message || err.message || 'Error al registrarse' };
    }
  };

  /**
   * Función logout
   * Cierra la sesión del usuario.
   * Limpia todos los estados relacionados con la autenticación.
   * Elimina el usuario y token de localStorage.
   * Limpia el token de las peticiones HTTP.
   */
  const logout = async () => {
    setUser(null);
    setToken(null);
    setIsBlocked(false);
    localStorage.removeItem('ambienteFestUser');
    localStorage.removeItem('ambienteFestToken');
  try { await utils.clearAuthToken(); } catch (e) { console.warn('clearAuthToken failed during logout:', e); }
    setHasTokenConfigured(false);
  };

  /**
   * Función isAdmin
   * Verifica si el usuario actual es administrador.
   * Retorna true si el rol es admin o role_id es 2.
   */
  const isAdmin = () => user && (user.rol === 'admin' || user.role_id === 2 || user.rol_id === 2);

  /**
   * Función getRedirectPath
   * Determina la ruta a la que debe redirigirse el usuario según su rol.
   * Administradores van a /admin, clientes a /, usuarios bloqueados a /.
   */
  const getRedirectPath = (userData = user) => {
    if (!userData) return '/';
    if (userData.state === false || String(userData.state) === 'false') return '/';
    if (userData.role_id === 2 || userData.rol_id === 2 || userData.rol === 'admin') return '/admin';
    return '/';
  };

  /**
   * Función isAuthenticated
   * Verifica si hay un usuario autenticado actualmente.
   */
  const isAuthenticated = () => user !== null;

  /**
   * Función updateProfile
   * Actualiza los datos del perfil del usuario autenticado.
   * Valida que exista un usuario con ID antes de actualizar.
   * Actualiza el usuario en el estado y localStorage.
   * Verifica si el usuario fue bloqueado durante la actualización.
   */
  const updateProfile = async (updates) => {
    if (!user || !user.id) return { success: false, error: 'No hay usuario autenticado' };
    try {
      // Actualizar el usuario en la base de datos
      const updated = await usuariosAPI.update(user.id, updates);
      // Limpiar contraseñas del objeto de usuario
      const clean = { ...updated };
      delete clean.password;
      delete clean.password_hash;
      // Actualizar estado y localStorage
      setUser(clean);
  try { localStorage.setItem('ambienteFestUser', JSON.stringify(clean)); } catch (e) { console.warn('localStorage setItem failed:', e); }
      // Verificar si el usuario fue bloqueado durante la actualización
      setIsBlocked(clean && (clean.state === false || String(clean.state) === 'false'));
      return { success: true, user: clean };
    } catch (err) {
      console.error('Error actualizando perfil del usuario:', err);
      const status = err?.response?.status;
      let message = 'Error al actualizar el perfil';
      if (status === 404) message = 'Usuario no encontrado';
      if (status === 409) message = 'Email ya registrado';
      return { success: false, error: message };
    }
  };

  /**
   * Objeto value que contiene todos los estados y funciones del contexto.
   * Este objeto se proporciona a través del Provider a todos los componentes hijos.
   */
  const value = {
    user, // Datos del usuario autenticado
    token, // Token JWT de autenticación
    hasTokenConfigured, // Indica si el token está configurado
    isBlocked, // Indica si el usuario está bloqueado
    canInteract: () => !isBlocked, // Verifica si el usuario puede interactuar
    login, // Función para iniciar sesión
    register, // Función para registrar nuevo usuario
    updateProfile, // Función para actualizar perfil
    logout, // Función para cerrar sesión
    isAdmin, // Función para verificar si es administrador
    isAuthenticated, // Función para verificar si está autenticado
    getRedirectPath, // Función para obtener ruta de redirección
    loading // Estado de carga inicial
  };

  // Proveer el contexto a todos los componentes hijos
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
