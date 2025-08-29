import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiEdit2, FiSave, FiX, FiKey } from 'react-icons/fi';
import Button from '../components/common/Button';
import './Dashboard.css';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Profile form state - update when user data changes
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    address: user?.address || {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : ''
  });

  // Update profileData when user data changes
  useEffect(() => {
    console.log('Profile component: User data updated:', user);
    setProfileData({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      address: user?.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : ''
    });
  }, [user]);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      // Add cache-busting to ensure fresh data
      const timestamp = new Date().getTime();
      const result = await updateProfile({ ...profileData, _t: timestamp });
      if (result && result.success) {
        setEditing(false);
        toast.success('Profile updated successfully!');
      } else if (result && result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setSubmitting(true);
      const result = await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      if (result && result.success) {
        toast.success('Password changed successfully!');
      }
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setProfileData({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      address: user?.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : ''
    });
    setEditing(false);
  };

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your personal information and account settings</p>
      </div>

      {/* Profile Information */}
      <div className="content-section">
        <div className="section-header">
          <h2>Personal Information</h2>
          {!editing ? (
            <Button variant="secondary" icon={<FiEdit2 />} onClick={() => setEditing(true)}>Edit</Button>
          ) : (
            <div className="edit-actions" style={{ display: 'flex', gap: 12 }}>
              <Button variant="neutral" icon={<FiX />} onClick={cancelEdit} disabled={submitting}>Cancel</Button>
              <Button variant="primary" icon={<FiSave />} onClick={handleProfileSubmit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>

        <div className="profile-card">
          <div className="profile-avatar">
            <FiUser className="avatar-icon" />
          </div>
          
          <div className="profile-details">
            {editing ? (
              <form onSubmit={handleProfileSubmit} className="profile-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={profileData.fullName}
                      onChange={handleProfileInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="disabled-input"
                    />
                    <small>Email cannot be changed</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dateOfBirth">Date of Birth</label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={profileData.dateOfBirth}
                      onChange={handleProfileInputChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={typeof profileData.address === 'string' ? profileData.address : 
                      [profileData.address?.street, profileData.address?.city, profileData.address?.state, profileData.address?.zipCode, profileData.address?.country]
                        .filter(Boolean)
                        .join(', ')}
                    onChange={handleProfileInputChange}
                    rows="3"
                    placeholder="Enter your full address"
                  />
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-row">
                  <FiUser className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Full Name</span>
                    <span className="info-value">{user?.fullName || 'Not provided'}</span>
                  </div>
                </div>

                <div className="info-row">
                  <FiMail className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Email</span>
                    <span className="info-value">{user?.email || 'Not provided'}</span>
                  </div>
                </div>

                <div className="info-row">
                  <FiPhone className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{user?.phone || 'Not provided'}</span>
                  </div>
                </div>

                <div className="info-row">
                  <FiCalendar className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Date of Birth</span>
                    <span className="info-value">
                      {user?.dateOfBirth ? 
                        new Date(user.dateOfBirth).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : 
                        'Not provided'
                      }
                    </span>
                  </div>
                </div>

                <div className="info-row">
                  <FiMapPin className="info-icon" />
                  <div className="info-content">
                    <span className="info-label">Address</span>
                    <span className="info-value">{
                      user?.address
                        ? [user.address.street, user.address.city, user.address.state, user.address.zipCode, user.address.country]
                            .filter(Boolean)
                            .join(', ')
                        : 'Not provided'
                    }</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Work Information */}
      <div className="content-section">
        <div className="section-header">
          <h2>Work Information</h2>
        </div>
        
        <div className="work-info-card">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Employee ID</span>
              <span className="info-value">{user?.employeeId || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Department</span>
              <span className="info-value">{user?.department || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Position</span>
              <span className="info-value">{user?.position || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Date of Joining</span>
              <span className="info-value">
                {user?.dateOfJoining ? 
                  new Date(user.dateOfJoining).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 
                  'N/A'
                }
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Leave Balance</span>
              <span className="info-value">{user?.leaveBalance || 15} days</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className={`status-badge ${((user?.status || '').toLowerCase() === 'active' || user?.isActive) ? 'active' : 'inactive'}`}>
                {user?.status ? String(user.status).replace('_', ' ').toUpperCase() : (user?.isActive ? 'ACTIVE' : 'INACTIVE')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="content-section">
        <div className="section-header">
          <h2>Security</h2>
          <Button
            variant={showPasswordForm ? 'neutral' : 'accent'}
            icon={showPasswordForm ? <FiX /> : <FiKey />}
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </Button>
        </div>

        {showPasswordForm && (
          <div className="form-container">
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

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    minLength="6"
                    required
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
                    minLength="6"
                    required
                  />
                </div>
              </div>

              <div className="form-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button variant="neutral" onClick={() => setShowPasswordForm(false)} disabled={submitting} icon={<FiX />}>Cancel</Button>
                <Button variant="accent" type="submit" disabled={submitting} icon={<FiKey />}>{submitting ? 'Changing...' : 'Change Password'}</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 