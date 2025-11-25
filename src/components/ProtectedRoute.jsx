// ProtectedRoute - asegura rutas que requieren autenticación/roles
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * Wrapper para rutas que requieren que el usuario esté autenticado.
 * Opcionalmente puede restringir el acceso a administradores.
 *
 * Props:
 * - children: componente(s) que se renderizarán si la validación pasa
 * - adminOnly: boolean, si true solo usuarios admins pueden acceder
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading, isBlocked } = useAuth();
  const location = useLocation();

  if (loading) {
    // Mostrar spinner mientras se resuelve el estado de autenticación
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    // Redirigir al login guardando la ubicación actual para volver después
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si el usuario está bloqueado, no permitir acceso a rutas internas (solo inicio)
  if (isBlocked) {
    if (location.pathname !== '/') {
      return <Navigate to="/" replace />;
    }
  }

  if (adminOnly && !isAdmin()) {
    // Redirigir al home si el usuario no tiene permisos de admin
    return <Navigate to="/" replace />;
  }

  // Si pasa las validaciones, renderizar los hijos
  return children;
};

export default ProtectedRoute;
