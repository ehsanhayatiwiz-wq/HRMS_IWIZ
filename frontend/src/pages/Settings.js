import React, { useState } from 'react';
import Button from '../components/common/Button';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

const Settings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
    // Optionally, apply theme to app here
  };

  const handleNotificationChange = (e) => {
    setNotifications({
      ...notifications,
      [e.target.name]: e.target.checked,
    });
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    setSubmitting(true);
    try {
      // Add cache-busting to ensure fresh data
      const timestamp = new Date().getTime();
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        _t: timestamp
      });
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Force re-authentication with new credentials and redirect to login
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Password change failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      {/* Theme Section */}
      <div className="content-section">
        <div className="section-header">
          <h2>Theme</h2>
        </div>
        <div className="form-group">
          <label>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === 'light'}
              onChange={handleThemeChange}
            />
            Light
          </label>
          <label style={{ marginLeft: '1rem' }}>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === 'dark'}
              onChange={handleThemeChange}
            />
            Dark
          </label>
        </div>
      </div>

      {/* Notification Preferences Section */}
      <div className="content-section">
        <div className="section-header">
          <h2>Notification Preferences</h2>
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="email"
              checked={notifications.email}
              onChange={handleNotificationChange}
            />
            Email Notifications
          </label>
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="sms"
              checked={notifications.sms}
              onChange={handleNotificationChange}
            />
            SMS Notifications
          </label>
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="push"
              checked={notifications.push}
              onChange={handleNotificationChange}
            />
            Push Notifications
          </label>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="content-section">
        <div className="section-header">
          <h2>Change Password</h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordInputChange}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordInputChange}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" variant="accent" disabled={submitting}>
            {submitting ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Settings; 