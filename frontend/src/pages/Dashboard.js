import React from 'react';
import { useAuth } from '../contexts';
import { Navigate } from 'react-router-dom';
import EmployeeDashboard from './EmployeeDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  // Enforce password change for first login
  if (user?.passwordResetRequired || user?.isFirstLogin || user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  // Route to appropriate dashboard based on user role
  if (user?.role === 'admin' || user?.role === 'hr') {
    return <AdminDashboard />;
  }

  return <EmployeeDashboard />;
};

export default Dashboard; 