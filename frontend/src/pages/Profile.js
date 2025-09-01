import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiEdit2, FiSave, FiX, FiKey } from 'react-icons/fi';
import './Profile.css';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    address: user?.address || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : ''
  });

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
      address: user?.address || '',
      dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : ''
    });
    setEditing(false);
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">Profile</h1>
        <p className="profile-subtitle">Manage your personal information and account settings</p>
      </div>

      {/* Profile Information */}
      <div className="profile-card">
        {submitting && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
        
        <div className="profile-avatar">
          <div className="avatar-container">
            <FiUser className="avatar-icon" />
          </div>
        </div>
        
        <div className="profile-actions">
          {!editing ? (
            <button className="action-button secondary" onClick={() => setEditing(true)}>
              <FiEdit2 /> Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="action-button neutral" onClick={cancelEdit} disabled={submitting}>
                <FiX /> Cancel
              </button>
            </div>
          )}
        </div>
        
        <div className="profile-details">
          {editing ? (
            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-section">
                <h3 className="form-section-title">Personal Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fullName" className="form-label">
                      <FiUser /> Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={profileData.fullName}
                      onChange={handleProfileInputChange}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      <FiMail /> Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="form-input"
                    />
                    <small className="form-help">Email cannot be changed</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">
                      <FiPhone /> Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileInputChange}
                      className="form-input"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="dateOfBirth" className="form-label">
                      <FiCalendar /> Date of Birth
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={profileData.dateOfBirth}
                      onChange={handleProfileInputChange}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="address" className="form-label">
                    <FiMapPin /> Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={profileData.address}
                    onChange={handleProfileInputChange}
                    className="form-textarea"
                    rows="3"
                    placeholder="Enter your address"
                  />
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="action-button primary" disabled={submitting}>
                    <FiSave /> {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="profile-info">
              <div className="info-row">
                <FiUser className="info-icon" />
                <div className="info-content">
                  <span className="info-label">Full Name</span>
                  <span className={`info-value ${!user?.fullName ? 'empty' : ''}`}>
                    {user?.fullName || 'Not provided'}
                  </span>
                </div>
              </div>

              <div className="info-row">
                <FiMail className="info-icon" />
                <div className="info-content">
                  <span className="info-label">Email</span>
                  <span className={`info-value ${!user?.email ? 'empty' : ''}`}>
                    {user?.email || 'Not provided'}
                  </span>
                </div>
              </div>

              <div className="info-row">
                <FiPhone className="info-icon" />
                <div className="info-content">
                  <span className="info-label">Phone</span>
                  <span className={`info-value ${!user?.phone ? 'empty' : ''}`}>
                    {user?.phone || 'Not provided'}
                  </span>
                </div>
              </div>

              <div className="info-row">
                <FiCalendar className="info-icon" />
                <div className="info-content">
                  <span className="info-label">Date of Birth</span>
                  <span className={`info-value ${!user?.dateOfBirth ? 'empty' : ''}`}>
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
                  <span className={`info-value ${!user?.address ? 'empty' : ''}`}>
                    {user?.address && typeof user.address === 'object'
                      ? [user.address.street, user.address.city, user.address.state, user.address.zipCode, user.address.country]
                          .filter(Boolean)
                          .join(', ')
                      : user?.address || 'Not provided'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Work Information */}
      <div className="profile-card">
        <h3 className="form-section-title">Work Information</h3>
        <div className="profile-info">
          <div className="info-row">
            <FiUser className="info-icon" />
            <div className="info-content">
              <span className="info-label">Employee ID</span>
              <span className={`info-value ${!user?.employeeId ? 'empty' : ''}`}>
                {user?.employeeId || 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="info-row">
            <FiMapPin className="info-icon" />
            <div className="info-content">
              <span className="info-label">Department</span>
              <span className={`info-value ${!user?.department ? 'empty' : ''}`}>
                {user?.department || 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="info-row">
            <FiUser className="info-icon" />
            <div className="info-content">
              <span className="info-label">Position</span>
              <span className={`info-value ${!user?.position ? 'empty' : ''}`}>
                {user?.position || 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="info-row">
            <FiCalendar className="info-icon" />
            <div className="info-content">
              <span className="info-label">Date of Joining</span>
              <span className={`info-value ${!user?.dateOfJoining ? 'empty' : ''}`}>
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
          </div>
          
          <div className="info-row">
            <FiCalendar className="info-icon" />
            <div className="info-content">
              <span className="info-label">Leave Balance</span>
              <span className="info-value">
                {user?.leaveBalance || 15} days
              </span>
            </div>
          </div>
          
          <div className="info-row">
            <FiUser className="info-icon" />
            <div className="info-content">
              <span className="info-label">Status</span>
              <span className={`info-value ${((user?.status || '').toLowerCase() === 'active' || user?.isActive) ? 'active' : 'inactive'}`}>
                {user?.status ? String(user.status).replace('_', ' ').toUpperCase() : (user?.isActive ? 'ACTIVE' : 'INACTIVE')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="password-section">
        <div className="password-header">
          <h3 className="password-title">Security Settings</h3>
          <button 
            className={`action-button ${showPasswordForm ? 'neutral' : 'secondary'}`}
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            {showPasswordForm ? <><FiX /> Cancel</> : <><FiKey /> Change Password</>}
          </button>
        </div>
        
        {showPasswordForm && (
          <form onSubmit={handlePasswordSubmit} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword" className="form-label">
                <FiKey /> Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordInputChange}
                className="form-input"
                required
                placeholder="Enter current password"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="newPassword" className="form-label">
                  <FiKey /> New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange}
                  className="form-input"
                  minLength="6"
                  required
                  placeholder="Enter new password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  <FiKey /> Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  className="form-input"
                  minLength="6"
                  required
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <div className="password-actions">
              <button type="submit" className="action-button primary" disabled={submitting}>
                <FiKey /> {submitting ? 'Changing Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile; 