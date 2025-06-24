import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

const PrivateRoute: React.FC = () => {
  const { token, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // Render child routes
  return <Outlet />;
};

export default PrivateRoute; 