import React, { useState, useEffect, useCallback } from 'react';
import { FiClock, FiCalendar, FiTrendingUp, FiActivity, FiBell, FiCheck, FiX } from 'react-icons/fi';
import Button from '../components/common/Button';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts';
import './Dashboard.css';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, addNotification } = useNotifications();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [reCheckInLoading, setReCheckInLoading] = useState(false);
  const [reCheckOutLoading, setReCheckOutLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [todayStatus, setTodayStatus] = useState({
    canCheckIn: true,
    canCheckOut: false,
    canReCheckIn: false,
    canReCheckOut: false,
    attendance: null
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const [dashRes, todayRes] = await Promise.all([
        api.get('/dashboard/employee'),
        api.get('/attendance/today')
      ]);
      setDashboardData(dashRes.data?.data || {});
      if (todayRes?.data?.data) {
        setTodayStatus({
          canCheckIn: todayRes.data.data.canCheckIn,
          canCheckOut: todayRes.data.data.canCheckOut,
          canReCheckIn: todayRes.data.data.canReCheckIn,
          canReCheckOut: todayRes.data.data.canReCheckOut,
          attendance: todayRes.data.data.attendance
        });
      }
      
      // Check for new leave status updates and create notifications
      const recentLeaves = dashRes.data?.data?.recentLeaves || [];
      // Generate notifications for any approved/rejected leaves that are not yet in context
      recentLeaves.forEach(leave => {
        if (leave.status === 'approved' || leave.status === 'rejected') {
          const exists = notifications.some(n => n.id === leave.id && n.type === leave.status);
          if (!exists) {
            addNotification({
              id: leave.id,
              type: leave.status,
              title: `Leave Request ${leave.status === 'approved' ? 'Approved' : 'Rejected'}`,
              message: `Your ${leave.leaveType} leave from ${leave.fromDate} to ${leave.toDate} has been ${leave.status}`
            });
          }
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [addNotification, notifications]);

  useEffect(() => {
    fetchDashboardData();
    // Set up polling for leave status updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const markNotificationAsRead = (notificationId) => {
    markAsRead(notificationId);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <FiCheck className="status-icon approved" />;
      case 'rejected':
        return <FiX className="status-icon rejected" />;
      case 'pending':
        return <FiClock className="status-icon pending" />;
      default:
        return <FiActivity className="status-icon" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'pending':
        return 'status-pending';
      default:
        return 'status-default';
    }
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      await api.post('/attendance/checkin');
      toast.success('Check-in successful!');
      fetchDashboardData(); // Refresh data and action flags
    } catch (error) {
      const message = error.response?.data?.message || 'Check-in failed';
      toast.error(message);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckOutLoading(true);
    try {
      await api.post('/attendance/checkout');
      toast.success('Check-out successful!');
      fetchDashboardData();
    } catch (error) {
      const message = error.response?.data?.message || 'Check-out failed';
      toast.error(message);
    } finally {
      setCheckOutLoading(false);
    }
  };

  const handleReCheckIn = async () => {
    setReCheckInLoading(true);
    try {
      await api.post('/attendance/re-checkin');
      toast.success('Re-check-in successful!');
      fetchDashboardData();
    } catch (error) {
      const message = error.response?.data?.message || 'Re-check-in failed';
      toast.error(message);
    } finally {
      setReCheckInLoading(false);
    }
  };

  const handleReCheckOut = async () => {
    setReCheckOutLoading(true);
    try {
      await api.post('/attendance/re-checkout');
      toast.success('Re-check-out successful!');
      fetchDashboardData();
    } catch (error) {
      const message = error.response?.data?.message || 'Re-check-out failed';
      toast.error(message);
    } finally {
      setReCheckOutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Notification Header */}
      <div className="notification-header">
        <div className="notification-bell" onClick={() => setShowNotifications(!showNotifications)}>
          <FiBell className="bell-icon" />
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount}
            </span>
          )}
        </div>
        
        {showNotifications && (
          <div className="notifications-dropdown">
            <div className="notifications-header">
              <h4>Notifications</h4>
              <Button variant="secondary" onClick={markAllAsRead}>Mark all read</Button>
            </div>
            {notifications.length > 0 ? (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="notification-icon">
                      {notification.type === 'approved' ? <FiCheck className="approved" /> : <FiX className="rejected" />}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-notifications">No notifications</div>
            )}
          </div>
        )}
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Hey, {user?.fullName || 'Employee'} 👋</h1>
          <p className="page-subtitle">Welcome back! Here's your daily overview</p>
        </div>
      </div>

      {/* Check-in/Check-out Section */}
      <div className="dashboard-grid">
        <div className="stat-card check-in-card">
          <div className="stat-card-header">
            <h3 className="stat-card-title">Today's Attendance</h3>
            <FiClock className="stat-card-icon" style={{ backgroundColor: '#6366f1' }} />
          </div>
          
          <div className="check-in-content">
            {todayStatus.attendance ? (
              <div className="attendance-status">
                <div className="status-item">
                  <span className="status-label">Check-in:</span>
                  <span className="status-value">{todayStatus.attendance.checkInTime || '-'}</span>
                </div>
                {todayStatus.attendance.checkOutTime && (
                  <div className="status-item">
                    <span className="status-label">Check-out:</span>
                    <span className="status-value">{todayStatus.attendance.checkOutTime}</span>
                  </div>
                )}
                {todayStatus.attendance.reCheckInTime && (
                  <div className="status-item">
                    <span className="status-label">Re-Check-in:</span>
                    <span className="status-value">{todayStatus.attendance.reCheckInTime}</span>
                  </div>
                )}
                {todayStatus.attendance.reCheckOutTime && (
                  <div className="status-item">
                    <span className="status-label">Re-Check-out:</span>
                    <span className="status-value">{todayStatus.attendance.reCheckOutTime}</span>
                  </div>
                )}
                {Number(todayStatus.attendance.totalHours || 0) > 0 && (
                  <div className="status-item">
                    <span className="status-label">Hours worked:</span>
                    <span className="status-value">{todayStatus.attendance.totalHours}h</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-attendance">
                <p>No attendance record for today</p>
              </div>
            )}
            
            <div className="attendance-actions" style={{ display: 'flex', gap: 12 }}>
              {todayStatus.canCheckIn ? (
                <Button variant="primary" onClick={handleCheckIn} disabled={checkInLoading} icon={<FiClock />}>
                  {checkInLoading ? 'Checking in...' : 'Check In'}
                </Button>
              ) : todayStatus.canCheckOut ? (
                <Button variant="primary" onClick={handleCheckOut} disabled={checkOutLoading} icon={<FiClock />}>
                  {checkOutLoading ? 'Checking out...' : 'Check Out'}
                </Button>
              ) : todayStatus.canReCheckIn ? (
                <Button variant="secondary" onClick={handleReCheckIn} disabled={reCheckInLoading} icon={<FiClock />}>
                  {reCheckInLoading ? 'Re-checking in...' : 'Re-Check In'}
                </Button>
              ) : todayStatus.canReCheckOut ? (
                <Button variant="secondary" onClick={handleReCheckOut} disabled={reCheckOutLoading} icon={<FiClock />}>
                  {reCheckOutLoading ? 'Re-checking out...' : 'Re-Check Out'}
                </Button>
              ) : (
                <div className="attendance-complete">
                  <span className="complete-text">✓ Day Complete</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <h3 className="stat-card-title">Leave Balance</h3>
            <FiCalendar className="stat-card-icon" style={{ backgroundColor: '#10b981' }} />
          </div>
          <div className="stat-card-value">{dashboardData?.leaveBalance || 0}</div>
          <div className="stat-card-subtitle">days remaining</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <h3 className="stat-card-title">Monthly Attendance</h3>
            <FiTrendingUp className="stat-card-icon" style={{ backgroundColor: '#f59e0b' }} />
          </div>
          <div className="stat-card-value">{dashboardData?.monthlyStats?.presentDays || 0}</div>
          <div className="stat-card-subtitle">
            {dashboardData?.monthlyStats?.attendanceRate || 0}% attendance rate
          </div>
        </div>

        {/* Payroll card removed; payroll now available in sidebar as a primary nav item */}
      </div>

      {/* Recent Activity */}
      <div className="content-section">
        <div className="content-section-header">
          <h2 className="content-section-title">Recent Activity</h2>
          <FiActivity className="section-icon" />
        </div>
        <div className="content-section-body">
          {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
            <div className="activity-list">
              {dashboardData.recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-date">{activity.date}</div>
                  <div className="activity-details">
                    <div className="activity-time">
                      {activity.checkInTime} - {activity.checkOutTime || 'Not checked out'}
                    </div>
                    <div className="activity-hours">
                      {activity.totalHours > 0 ? `${activity.totalHours}h worked` : 'No hours recorded'}
                    </div>
                  </div>
                  <div className="activity-status">
                    <span className={`status-badge ${activity.status}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FiActivity className="empty-state-icon" />
              <h3 className="empty-state-title">No recent activity</h3>
              <p className="empty-state-description">
                Your attendance records will appear here once you start checking in.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Leaves */}
      <div className="content-section">
        <div className="content-section-header">
          <h2 className="content-section-title">Recent Leave Requests</h2>
          <FiCalendar className="section-icon" />
        </div>
        <div className="content-section-body">
          {dashboardData?.recentLeaves && dashboardData.recentLeaves.length > 0 ? (
            <div className="leaves-list">
              {dashboardData.recentLeaves.map((leave) => (
                <div key={leave.id} className={`leave-item ${getStatusClass(leave.status)}`}>
                  <div className="leave-header">
                    <div className="leave-type">
                      {getStatusIcon(leave.status)}
                      {leave.leaveType}
                    </div>
                    <span className={`status-badge ${getStatusClass(leave.status)}`}>
                      {leave.status}
                    </span>
                  </div>
                  <div className="leave-dates">
                    {leave.fromDate} - {leave.toDate}
                  </div>
                  <div className="leave-reason">
                    {leave.reason}
                  </div>
                  {leave.status === 'rejected' && (
                    <div className="rejection-reason">
                      <strong>Rejection Reason:</strong> {leave.rejectionReason || 'No reason provided'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FiCalendar className="empty-state-icon" />
              <h3 className="empty-state-title">No leave requests</h3>
              <p className="empty-state-description">
                Your leave requests will appear here once you submit them.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard; 