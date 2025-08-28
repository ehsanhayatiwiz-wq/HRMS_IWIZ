import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiClock, 
  FiCalendar, 
  FiBarChart2,
  FiDollarSign,
  FiMenu,
  FiX,
  FiUser,
  FiSearch,
  FiLogOut
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';
import Button from '../common/Button';

const Sidebar = ({ collapsed, onToggle, user }) => {
  const { logout } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';
  const basePath = isAdmin ? '/admin' : '';
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    {
      title: 'Dashboard',
      icon: FiHome,
      path: `${basePath}/dashboard`,
      show: true
    },
    {
      title: 'Employees',
      icon: FiUsers,
      path: `${basePath}/employees`,
      show: isAdmin
    },
    {
      title: 'Attendance',
      icon: FiClock,
      path: `${basePath}/attendance`,
      show: true
    },
    {
      title: 'Leaves',
      icon: FiCalendar,
      path: `${basePath}/leaves`,
      show: true
    },
    {
      title: isAdmin ? 'Payroll' : 'My Payroll',
      icon: FiDollarSign,
      path: `${basePath}/payroll`,
      show: true
    },
    {
      title: 'Reports',
      icon: FiBarChart2,
      path: `${basePath}/reports`,
      show: isAdmin
    },
    {
      title: 'Profile',
      icon: FiUser,
      path: `${basePath}/profile`,
      show: true
    }
  ];

  const handleLogout = () => {
    logout();
  };

  // Filter menu items by search query
  const filteredMenuItems = menuItems.filter(item =>
    item.show && item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-logo">
            <img src={process.env.PUBLIC_URL + '/logo.png'} alt="IWIZ" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ height: 28 }} />
            {!collapsed && <span className="brand-text">IWIZ</span>}
          </div>
        </div>
        <Button variant="secondary" onClick={onToggle} icon={collapsed ? <FiMenu /> : <FiX />}></Button>
      </div>

      {/* Search Bar */}
      {!collapsed && (
        <div className="sidebar-search">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {filteredMenuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.title} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSearchQuery('')}
                >
                  <div className="icon-text-container">
                    <IconComponent className="nav-icon" />
                    {!collapsed && <span className="nav-text">{item.title}</span>}
                  </div>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Section */}
      <div className="sidebar-footer">
        <Button variant="neutral" onClick={handleLogout} icon={<FiLogOut />}>
          {!collapsed && 'Logout'}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar; 