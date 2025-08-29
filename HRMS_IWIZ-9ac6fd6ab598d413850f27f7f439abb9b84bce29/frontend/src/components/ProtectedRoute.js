import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, requirePasswordChange = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin' && user.role !== 'hr') {
    // If a non-admin tries to access admin routes, send them to employee dashboard
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  if (requirePasswordChange && (user?.passwordResetRequired || user?.isFirstLogin || user?.mustChangePassword)) {
    if (location.pathname !== '/change-password') {
      return <Navigate to="/change-password" replace />;
    }
  }

  return children;
};

export default ProtectedRoute; 