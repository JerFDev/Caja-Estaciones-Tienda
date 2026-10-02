import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const { user, isAuthenticated } = useAuth();

  // Si no ha iniciado sesión, redirigir a Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta requiere ADMIN y el usuario es EMPRENDEDOR, redirigir a Caja (POS)
  if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
    return <Navigate to="/ventas" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
