import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useAuth();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="app-container">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
        user={user}
        isMobileOpen={isMobileOpen}
        onMobileToggle={toggleMobileSidebar}
      />
      {isMobileOpen && (
        <div 
          className="mobile-overlay" 
          onClick={toggleMobileSidebar}
          aria-label="Close sidebar"
        />
      )}
      <div className="main-wrapper">
        <Header 
          onSidebarToggle={toggleSidebar}
          onMobileSidebarToggle={toggleMobileSidebar}
          user={user}
        />
        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 