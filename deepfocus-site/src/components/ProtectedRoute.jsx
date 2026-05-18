import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    // Redirect them to the login page if not logged in
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}
