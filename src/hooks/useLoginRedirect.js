import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const useLoginRedirect = () => {
  const { getRedirectPath } = useAuth();
  const navigate = useNavigate();

  const loginAndRedirect = async (loginFunction, email, password) => {
    try {
      const result = await loginFunction(email, password);
      
      if (result.success && result.user) {
        // Si el login devolvió que el usuario está bloqueado, redirigir al inicio y devolver el flag
        if (result.blocked) {
          setTimeout(() => navigate('/', { replace: true }), 100);
          return result;
        }

        // Obtener ruta de redirección basada en el rol
        const redirectPath = getRedirectPath(result.user);

        // Redirigir según el rol
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 100); // Pequeño delay para asegurar que el estado se actualice

        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Error en loginAndRedirect:', error);
      return { success: false, error: error.message };
    }
  };

  return { loginAndRedirect };
};