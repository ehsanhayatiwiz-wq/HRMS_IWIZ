import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
// moment.js removed - using native Date methods
import { FiCheckCircle, FiXCircle, FiCalendar, FiTrendingUp, FiRefreshCw, FiClock } from 'react-icons/fi';
import Button from '../components/common/Button';
import './Dashboard.css';

const Attendance = () => {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [reCheckingIn, setReCheckingIn] = useState(false);
  const [reCheckingOut, setReCheckingOut] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [canCheckOut, setCanCheckOut] = useState(false);
  const [canReCheckIn, setCanReCheckIn] = useState(false);
  const [canReCheckOut, setCanReCheckOut] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      console.log('Fetching attendance data...');
      
      const [todayRes, historyRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/history?page=1&limit=10')
      ]);

      const todayData = todayRes.data.data;
      setTodayAttendance(todayData.attendance);
      setCanCheckIn(todayData.canCheckIn);
      setCanCheckOut(todayData.canCheckOut);
      setCanReCheckIn(todayData.canReCheckIn);
      setCanReCheckOut(todayData.canReCheckOut);
      setAttendanceHistory(historyRes.data.data.attendance);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      await api.post('/attendance/checkin');
      toast.success('Check-in successful!');
      fetchAttendanceData();
    } catch (error) {
      console.error('Check-in error:', error);
      
      // Handle specific "already checked in" error
      if (error.response?.status === 400 && error.response?.data?.message === 'Already checked in today') {
        toast.info('Already checked in today');
        // Refresh data to show current status
        fetchAttendanceData();
      } else {
        toast.error(error.response?.data?.message || 'Check-in failed');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true);
      await api.post('/attendance/checkout');
      toast.success('Check-out successful!');
      fetchAttendanceData();
    } catch (error) {
      console.error('Check-out error:', error);
      
      // Handle specific "already checked out" error
      if (error.response?.status === 400 && error.response?.data?.message === 'Already checked out today') {
        toast.info('Already checked out today');
        fetchAttendanceData();
      } else if (error.response?.status === 400 && error.response?.data?.message === 'No check-in record found for today') {
        toast.error('Please check in first before checking out');
      } else {
        toast.error(error.response?.data?.message || 'Check-out failed');
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const handleReCheckIn = async () => {
    try {
      setReCheckingIn(true);
      await api.post('/attendance/re-checkin');
      toast.success('Re-check-in successful!');
      fetchAttendanceData();
    } catch (error) {
      console.error('Re-check-in error:', error);
      
      // Handle specific re-check-in errors
      if (error.response?.status === 400) {
        const message = error.response?.data?.message;
        if (message === 'Already re-checked in today') {
          toast.info('Already re-checked in today');
          fetchAttendanceData();
        } else if (message === 'No initial check-in found for today') {
          toast.error('Please check in first before re-checking in');
        } else if (message === 'Please check out from your first session before re-checking in') {
          toast.error('Please check out from your first session before re-checking in');
        } else {
          toast.error(message || 'Re-check-in failed');
        }
      } else {
        toast.error(error.response?.data?.message || 'Re-check-in failed');
      }
    } finally {
      setReCheckingIn(false);
    }
  };

  const handleReCheckOut = async () => {
    try {
      setReCheckingOut(true);
      await api.post('/attendance/re-checkout');
      toast.success('Re-check-out successful!');
      fetchAttendanceData();
    } catch (error) {
      console.error('Re-check-out error:', error);
      
      // Handle specific re-check-out errors
      if (error.response?.status === 400) {
        const message = error.response?.data?.message;
        if (message === 'Already re-checked out today') {
          toast.info('Already re-checked out today');
          fetchAttendanceData();
        } else if (message === 'No re-check-in record found for today') {
          toast.error('Please re-check in first before re-checking out');
        } else {
          toast.error(message || 'Re-check-out failed');
        }
      } else {
        toast.error(error.response?.data?.message || 'Re-check-out failed');
      }
    } finally {
      setReCheckingOut(false);
    }
  };

  const getStatusBadge = (status) => {
    if (!status) {
      return (
        <span className="status-badge pending">
          UNKNOWN
        </span>
      );
    }
    
    const statusClasses = {
      present: 'status-badge approved',
      absent: 'status-badge rejected',
      late: 'status-badge warning',
      'half-day': 'status-badge warning',
      leave: 'status-badge inactive',
      're-checked-in': 'status-badge info'
    };
    
    return (
      <span className={statusClasses[status.toLowerCase()] || 'status-badge pending'}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Management</h1>
          <p className="page-subtitle">Track your daily attendance and view history</p>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Timezone: Pakistan (UTC+5) • Current time: {new Date(new Date().getTime() + 5 * 60 * 60 * 1000).toLocaleString('en-PK')} • 
            Day boundaries: 00:00 - 23:59 Pakistan time
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="neutral"
            onClick={fetchAttendanceData}
            disabled={loading}
            icon={<FiRefreshCw />}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Today's Attendance Card */}
      <div className="dashboard-grid">
        <div className="stat-card check-in-card">
          <div className="stat-card-header">
            <h3 className="stat-card-title">Today's Attendance</h3>
            <FiClock className="stat-card-icon" style={{ backgroundColor: '#6366f1' }} />
          </div>
          
          <div className="check-in-content">
            {todayAttendance ? (
              <div className="attendance-status">
                <div className="status-item">
                  <span className="status-label">First Check-in</span>
                  <span className="status-value">
                    {todayAttendance.checkInTime || 'Not checked in'}
                  </span>
                </div>
                
                <div className="status-item">
                  <span className="status-label">First Check-out</span>
                  <span className="status-value">
                    {todayAttendance.checkOutTime || 'Not checked out'}
                  </span>
                </div>
                
                {todayAttendance.reCheckInTime && (
                  <>
                    <div className="status-item">
                      <span className="status-label">Second Check-in</span>
                      <span className="status-value">
                        {todayAttendance.reCheckInTime}
                      </span>
                    </div>
                    
                    <div className="status-item">
                      <span className="status-label">Second Check-out</span>
                      <span className="status-value">
                        {todayAttendance.reCheckOutTime || 'Not checked out'}
                      </span>
                    </div>
                  </>
                )}
                
                <div className="status-item">
                  <span className="status-label">First Session</span>
                  <span className="status-value">
                    {todayAttendance.firstSessionHoursFormatted || (todayAttendance.firstSessionHours ? `${todayAttendance.firstSessionHours.toFixed(2)} hours` : '-')}
                  </span>
                </div>
                
                {todayAttendance.secondSessionHours > 0 && (
                  <div className="status-item">
                    <span className="status-label">Second Session</span>
                    <span className="status-value">
                      {todayAttendance.secondSessionHoursFormatted || `${todayAttendance.secondSessionHours.toFixed(2)} hours`}
                    </span>
                  </div>
                )}
                
                <div className="status-item">
                  <span className="status-label">Total Hours</span>
                  <span className="status-value">
                    {todayAttendance.totalHoursFormatted || (todayAttendance.totalHours ? `${todayAttendance.totalHours.toFixed(2)} hours` : '-')}
                  </span>
                </div>
                
                <div className="status-item">
                  <span className="status-label">Status</span>
                  <span className="status-value">
                    {getStatusBadge(todayAttendance.status || 'pending')}
                  </span>
                </div>
                
                <div className="status-item">
                  <span className="status-label">Check-ins Today</span>
                  <span className="status-value">
                    {todayAttendance.checkInCount || 1}
                  </span>
                </div>
              </div>
            ) : (
              <div className="no-attendance">
                <p>No attendance record for today</p>
              </div>
            )}
            
            <div className="attendance-actions" style={{ display: 'flex', gap: 12 }}>
              {canCheckIn ? (
                <Button
                  variant="primary"
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  icon={<FiCheckCircle />}
                >
                  {checkingIn ? 'Checking in...' : 'Check In'}
                </Button>
              ) : canCheckOut ? (
                <Button
                  variant="primary"
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  icon={<FiXCircle />}
                >
                  {checkingOut ? 'Checking out...' : 'Check Out'}
                </Button>
              ) : canReCheckIn ? (
                <Button
                  variant="secondary"
                  onClick={handleReCheckIn}
                  disabled={reCheckingIn}
                  icon={<FiRefreshCw />}
                >
                  {reCheckingIn ? 'Re-checking in...' : 'Re-Check In'}
                </Button>
              ) : canReCheckOut ? (
                <Button
                  variant="secondary"
                  onClick={handleReCheckOut}
                  disabled={reCheckingOut}
                  icon={<FiXCircle />}
                >
                  {reCheckingOut ? 'Re-checking out...' : 'Re-Check Out'}
                </Button>
              ) : (
                <div className="attendance-complete">
                  <div className="completed-message">
                    <FiCheckCircle className="icon" />
                    <span>Attendance completed for today</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="stat-card">
          <div className="stat-card-header">
            <h3 className="stat-card-title">This Month</h3>
            <FiTrendingUp className="stat-card-icon" style={{ backgroundColor: '#10b981' }} />
          </div>
          <div className="stat-card-value">
            {attendanceHistory.filter(att => {
              const attDate = new Date(att.date);
              const now = new Date();
              return attDate.getMonth() === now.getMonth() && 
                     attDate.getFullYear() === now.getFullYear() && 
                     (att.status === 'present' || att.status === 'late');
            }).length}
          </div>
          <div className="stat-card-subtitle">days present</div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="content-section">
        <div className="section-header">
          <h2>Attendance History</h2>
          <FiCalendar className="section-icon" />
        </div>
        
        {attendanceHistory.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.map((attendance, index) => (
                  <tr key={attendance.id || attendance._id || `attendance-${index}`}>
                    <td>{new Date(attendance.date).toLocaleDateString('en-PK', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                    <td>{attendance.checkInTime || '-'}</td>
                    <td>{attendance.checkOutTime || '-'}</td>
                    <td>
                      {attendance.totalHoursFormatted || (attendance.totalHours ? `${attendance.totalHours.toFixed(2)}h` : '-')}
                    </td>
                    <td>
                      {getStatusBadge(attendance.status || 'pending')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <FiCalendar className="empty-state-icon" />
            <h3 className="empty-state-title">No attendance records</h3>
            <p className="empty-state-description">
              Your attendance history will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance; 