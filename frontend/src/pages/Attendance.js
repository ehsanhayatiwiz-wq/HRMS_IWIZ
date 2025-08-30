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
  const [canReCheckIn] = useState(false);
  const [canReCheckOut] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      const [todayRes, historyRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/history')
      ]);

      if (todayRes.data.success) {
        setTodayAttendance(todayRes.data.data.attendance);
        setCanCheckIn(todayRes.data.data.canCheckIn);
        setCanCheckOut(todayRes.data.data.canCheckOut);
      }

      if (historyRes.data.success) {
        setAttendanceHistory(historyRes.data.data.attendance);
      }
    } catch (error) {
      // Error fetching attendance data
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
      // Check-in error
      toast.error(error.response?.data?.message || 'Check-in failed');
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
      // Check-out error
      toast.error(error.response?.data?.message || 'Check-out failed');
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
      // Re-check-in error
      toast.error(error.response?.data?.message || 'Re-check-in failed');
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
      // Re-check-out error
      toast.error(error.response?.data?.message || 'Re-check-out failed');
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
            Timezone: Pakistan (UTC+5) • Current time: {new Date(new Date().getTime() + 5 * 60 * 60 * 1000).toLocaleString('en-PK', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })} • 
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
              // Convert both dates to Karachi timezone for comparison
              const attKarachiDate = new Date(attDate.getTime() + 5 * 60 * 60 * 1000);
              const nowKarachiDate = new Date(now.getTime() + 5 * 60 * 60 * 1000);
              return attKarachiDate.getMonth() === nowKarachiDate.getMonth() && 
                     attKarachiDate.getFullYear() === nowKarachiDate.getFullYear() && 
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
                    <td>{new Date(attendance.date).toLocaleDateString('en-PK', { 
                      weekday: 'long',
                      year: 'numeric', 
                      month: 'long', 
                      day: '2-digit' 
                    })}</td>
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