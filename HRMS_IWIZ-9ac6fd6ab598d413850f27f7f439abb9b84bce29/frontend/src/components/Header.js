import React, { useState } from 'react';
import { FiBell, FiUser, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ onSidebarToggle, user, onShowNotifications }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const handleLogout = () => {
    logout();
    setShowProfileMenu(false);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowProfileMenu(false);
  };

  const handleNotificationClick = () => {
    if (onShowNotifications) {
      onShowNotifications();
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="sidebar-toggle-btn" onClick={onSidebarToggle}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div className="header-right">
        {/* Notifications */}
        <div className="header-item">
          <button className="notification-btn" onClick={handleNotificationClick}>
            <FiBell className="notification-icon" />
            {unreadCount > 0 && (
              <span className="notification-badge" aria-label={`You have ${unreadCount} unread notifications`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User Profile */}
        <div className="header-item">
          <div className="user-profile-dropdown">
            <button 
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="user-avatar">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt={user.fullName} />
                ) : (
                  <FiUser className="avatar-icon" />
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{user?.fullName}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            </button>

            {showProfileMenu && (
              <div className="profile-menu">
                <div className="menu-header">
                  <div className="menu-user-info">
                    <div className="menu-user-name">{user?.fullName}</div>
                    <div className="menu-user-email">{user?.email}</div>
                  </div>
                </div>
                
                <div className="menu-items">
                  <button className="menu-item" onClick={handleProfileClick}>
                    <div className="icon-text-container">
                      <FiUser className="menu-icon" />
                      <span>Profile</span>
                    </div>
                  </button>
                  <div className="menu-divider"></div>
                  <button className="menu-item menu-item-danger" onClick={handleLogout}>
                    <div className="icon-text-container">
                      <FiLogOut className="menu-icon" />
                      <span>Logout</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for closing menu */}
      {showProfileMenu && (
        <div 
          className="menu-overlay" 
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </header>
  );
};

export default Header; 