// LoginRedirect - redirige al usuario autenticado según su rol
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * LoginRedirect
 * Componente wrapper que, al detectar un usuario autenticado, consulta
 * getRedirectPath(user) desde el contexto de autenticación y realiza
 * una navegación automática a la ruta correspondiente.
 *
 * Uso:
 * - Envolver la aplicación en este componente para aplicar redirección automática tras login.
 *
 * Notas:
 * - Lee user e isAuthenticated desde AuthContext.
 * - Evita loops comprobando window.location.pathname antes de navegar.
 */
const LoginRedirect = ({ children }) => {
  const { user, getRedirectPath, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Si el usuario está autenticado, calcular ruta de redirección y navegar
    if (isAuthenticated() && user) {
      const redirectPath = getRedirectPath(user);

      // Evitar navegar si ya estamos en la ruta objetivo
      if (redirectPath !== window.location.pathname) {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [user, navigate, isAuthenticated, getRedirectPath]);

  return children;
};

export default LoginRedirect;