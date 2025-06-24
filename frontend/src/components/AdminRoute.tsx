import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';

const AdminRoute: React.FC = () => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  // If not admin, redirect to dashboard
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  // Render child routes
  return <Outlet />;
};

export default AdminRoute; 