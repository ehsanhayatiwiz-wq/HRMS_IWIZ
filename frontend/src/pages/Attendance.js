import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
// moment.js removed - using native Date methods
import { FiClock, FiCheckCircle, FiXCircle, FiCalendar, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
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
      const [todayRes, historyRes] = await Promise.all([
        axios.get('/api/attendance/today'),
        axios.get('/api/attendance/history?page=1&limit=10')
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
      await axios.post('/api/attendance/checkin');
      toast.success('Check-in successful!');
      fetchAttendanceData();
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error(error.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true);
      await axios.post('/api/attendance/checkout');
      toast.success('Check-out successful!');
      fetchAttendanceData();
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error(error.response?.data?.message || 'Check-out failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleReCheckIn = async () => {
    try {
      setReCheckingIn(true);
      await axios.post('/api/attendance/re-checkin');
      toast.success('Re-check-in successful!');
      fetchAttendanceData();
    } catch (error) {
      console.error('Re-check-in error:', error);
      toast.error(error.response?.data?.message || 'Re-check-in failed');
    } finally {
      setReCheckingIn(false);
    }
  };

  const handleReCheckOut = async () => {
    try {
      setReCheckingOut(true);
      await axios.post('/api/attendance/re-checkout');
      toast.success('Re-check-out successful!');
      fetchAttendanceData();
    } catch (error) {
      console.error('Re-check-out error:', error);
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
                    {todayAttendance.firstSessionHours ? `${todayAttendance.firstSessionHours.toFixed(2)} hours` : '-'}
                  </span>
                </div>
                
                {todayAttendance.secondSessionHours > 0 && (
                  <div className="status-item">
                    <span className="status-label">Second Session</span>
                    <span className="status-value">
                      {todayAttendance.secondSessionHours.toFixed(2)} hours
                    </span>
                  </div>
                )}
                
                <div className="status-item">
                  <span className="status-label">Total Hours</span>
                  <span className="status-value">
                    {todayAttendance.totalHours ? `${todayAttendance.totalHours.toFixed(2)} hours` : '-'}
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
            
            <div className="attendance-actions">
              {canCheckIn ? (
                <button
                  className="btn-check-in"
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                >
                  <FiCheckCircle />
                  {checkingIn ? 'Checking in...' : 'Check In'}
                </button>
              ) : canCheckOut ? (
                <button
                  className="btn-check-out"
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                >
                  <FiXCircle />
                  {checkingOut ? 'Checking out...' : 'Check Out'}
                </button>
              ) : canReCheckIn ? (
                <button
                  className="btn-check-in"
                  onClick={handleReCheckIn}
                  disabled={reCheckingIn}
                >
                  <FiRefreshCw />
                  {reCheckingIn ? 'Re-checking in...' : 'Re-Check In'}
                </button>
              ) : canReCheckOut ? (
                <button
                  className="btn-check-out"
                  onClick={handleReCheckOut}
                  disabled={reCheckingOut}
                >
                  <FiXCircle />
                  {reCheckingOut ? 'Re-checking out...' : 'Re-Check Out'}
                </button>
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
                    <td>{new Date(attendance.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                    <td>{attendance.checkInTime || '-'}</td>
                    <td>{attendance.checkOutTime || '-'}</td>
                    <td>
                      {attendance.totalHours ? `${attendance.totalHours.toFixed(2)}h` : '-'}
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