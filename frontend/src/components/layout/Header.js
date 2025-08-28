import React, { useState } from 'react';
import { FiBell, FiUser, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import './Header.css';
import Button from '../common/Button';

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
        <Button variant="secondary" onClick={onSidebarToggle}>Menu</Button>
      </div>

      <div className="header-right">
        {/* Brand (uses /logo.png if available) */}
        <div className="header-item">
          <img src={process.env.PUBLIC_URL + '/logo.png'} alt="IWIZ" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ height: 32 }} />
        </div>
        {/* Notifications */}
        <div className="header-item">
          <Button variant="secondary" onClick={handleNotificationClick} icon={<FiBell />}>
            {unreadCount > 0 && (
              <span className="notification-badge" aria-label={`You have ${unreadCount} unread notifications`}>
                {unreadCount}
              </span>
            )}
          </Button>
        </div>

        {/* User Profile */}
        <div className="header-item">
          <div className="user-profile-dropdown">
            <Button variant="secondary" onClick={() => setShowProfileMenu(!showProfileMenu)}>
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
            </Button>

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