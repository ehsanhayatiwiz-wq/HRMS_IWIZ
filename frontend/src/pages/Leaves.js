import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts';
import api from '../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';
import { FiCalendar, FiFileText, FiPlusCircle, FiSend, FiX, FiRefreshCw } from 'react-icons/fi';
import Button from '../components/common/Button';
import './Dashboard.css';

const Leaves = () => {
  const { user } = useAuth();
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    leaveType: 'casual',
    fromDate: '',
    toDate: '',
    reason: '',
    isHalfDay: false,
    halfDayType: 'morning'
  });

  // Handle race conditions and ensure data consistency
  const [fetchInProgress, setFetchInProgress] = useState(false);
  
  const safeFetchLeaveHistory = async () => {
    if (fetchInProgress) {
      return;
    }
    
    setFetchInProgress(true);
    try {
      await fetchLeaveHistory();
    } finally {
      setFetchInProgress(false);
    }
  };

  useEffect(() => {
    safeFetchLeaveHistory();
    
    // Set up auto-refresh every 30 seconds to ensure data is fresh
    const interval = setInterval(() => {
      safeFetchLeaveHistory();
    }, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Handle data synchronization between employee and admin views
  const syncWithAdminView = async () => {
    try {
      console.log('Syncing with admin view...');
      
      // Fetch data with different cache-busting strategies
      const strategies = [
        `_t=${Date.now()}`,
        `_t=${Date.now() + 1000}`,
        `_t=${Date.now() + 2000}`
      ];
      
      for (const strategy of strategies) {
        try {
          const response = await api.get(`/leaves/my-leaves?page=1&limit=9999&${strategy}`);
          const leaves = response.data?.data?.leaves || [];
          
          if (leaves.length > 0) {
            console.log(`Sync successful with strategy ${strategy}:`, leaves.length, 'records');
            setLeaveHistory(leaves);
            checkDataConsistency(leaves);
            break;
          }
        } catch (error) {
          console.warn(`Sync strategy ${strategy} failed:`, error);
        }
      }
    } catch (error) {
      console.error('Data synchronization failed:', error);
    }
  };

  // Check data consistency and log any issues
  const checkDataConsistency = (leaves) => {
    console.log('Checking data consistency for', leaves.length, 'leaves...');
    
    leaves.forEach((leave, index) => {
      if (!leave.id || !leave.leaveType || !leave.status) {
        console.warn('Incomplete leave record at index', index, ':', leave);
      }
    });
    
    // Check for duplicate IDs
    const ids = leaves.map(leave => leave.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.warn('Duplicate IDs detected in leave history');
    }
    
    console.log('Data consistency check completed');
  };

  // Force refresh leave history to ensure data consistency
  const forceRefreshLeaveHistory = async () => {
    try {
      console.log('Force refreshing leave history...');
      setLoading(true);
      
      // Clear current data first
      setLeaveHistory([]);
      
      // Fetch fresh data with cache busting
      const timestamp = new Date().getTime();
      const response = await api.get(`/leaves/my-leaves?page=1&limit=9999&_t=${timestamp}`);
      
      const leaves = response.data?.data?.leaves || [];
      console.log('Force refreshed leave history:', leaves.length, 'records');
      
      // Check data consistency
      checkDataConsistency(leaves);
      
      setLeaveHistory(leaves);
      toast.success('Leave history refreshed successfully');
    } catch (error) {
      console.error('Error force refreshing leave history:', error);
      toast.error('Failed to refresh leave history');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveHistory = async () => {
    if (fetchInProgress) {
      return;
    }

    try {
      fetchInProgress = true;
      setLoading(true);

      const response = await api.get('/leaves/my-leaves');
      
      if (response.data.success) {
        setLeaveHistory(response.data.data.leaves || []);
      }
    } catch (error) {
      console.error('Error fetching leave history:', error);
      toast.error('Failed to load leave history');
      setLeaveHistory([]);
    } finally {
      setLoading(false);
      fetchInProgress = false;
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.leaveType) errors.leaveType = 'Leave type is required';
    if (!formData.fromDate) errors.fromDate = 'From date is required';
    if (!formData.toDate) errors.toDate = 'To date is required';
    if (!formData.reason) errors.reason = 'Reason is required';
    
    if (formData.fromDate && formData.toDate) {
      const fromDate = moment(formData.fromDate);
      const toDate = moment(formData.toDate);
      
      if (fromDate.isAfter(toDate)) {
        errors.toDate = 'To date cannot be before from date';
      }
      
      if (fromDate.isBefore(moment(), 'day')) {
        errors.fromDate = 'From date cannot be in the past';
      }
    }
    
    if (formData.isHalfDay && !formData.halfDayType) {
      errors.halfDayType = 'Half day type is required';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(error => toast.error(error));
      return;
    }

    try {
      setSubmitting(true);
      
      const requestData = {
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        reason: formData.reason,
        isHalfDay: formData.isHalfDay,
        halfDayType: formData.isHalfDay ? formData.halfDayType : undefined
      };

      console.log('Submitting leave request:', requestData);
      console.log('API endpoint:', '/leaves/request');

      // Create optimistic leave record for immediate UI update
      const optimisticLeave = {
        id: `temp-${Date.now()}`, // Temporary ID
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        totalDays: formData.isHalfDay ? 0.5 : 
          Math.ceil((new Date(formData.toDate) - new Date(formData.fromDate)) / (1000 * 60 * 60 * 24)) + 1,
        reason: formData.reason,
        status: 'pending',
        isHalfDay: formData.isHalfDay,
        halfDayType: formData.isHalfDay ? formData.halfDayType : undefined,
        createdAt: new Date().toISOString()
      };

      // Add optimistic leave to the list immediately
      setLeaveHistory(prev => [optimisticLeave, ...prev]);

      const response = await api.post('/leaves/request', requestData);
      
      console.log('Leave submission response:', response.data);
      
      // Replace optimistic leave with real data from server
      const realLeave = {
        id: response.data.data.id,
        leaveType: response.data.data.leaveType,
        fromDate: response.data.data.fromDate,
        toDate: response.data.data.toDate,
        totalDays: response.data.data.totalDays,
        reason: response.data.data.reason,
        status: response.data.data.status,
        isHalfDay: formData.isHalfDay,
        halfDayType: formData.isHalfDay ? formData.halfDayType : undefined,
        createdAt: new Date().toISOString()
      };

      // Update the list with real data
      setLeaveHistory(prev => prev.map(leave => 
        leave.id === optimisticLeave.id ? realLeave : leave
      ));
      
      toast.success('Leave request submitted successfully!');
      
      // Reset form
      setFormData({
        leaveType: 'casual',
        fromDate: '',
        toDate: '',
        reason: '',
        isHalfDay: false,
        halfDayType: 'morning'
      });
      setShowForm(false);
      
      // Force a server refresh to ensure data consistency
      setTimeout(() => {
        safeFetchLeaveHistory();
      }, 1000);
      
      // Also force a refresh after 3 seconds to ensure admin dashboard sync
      setTimeout(() => {
        forceRefreshLeaveHistory();
      }, 3000);
      
    } catch (error) {
      console.error('Leave submission error:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      // Remove optimistic leave on error
      setLeaveHistory(prev => prev.filter(leave => !leave.id.startsWith('temp-')));
      
      const message = error.response?.data?.message || 'Failed to submit leave request';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getLeaveTypeLabel = (type) => {
    switch (type) {
      case 'sick':
        return 'Sick Leave';
      case 'casual':
        return 'Casual Leave';
      case 'annual':
        return 'Annual Leave';
      case 'maternity':
        return 'Maternity Leave';
      case 'paternity':
        return 'Paternity Leave';
      case 'bereavement':
        return 'Bereavement Leave';
      default:
        return type;
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'status-badge pending',
      approved: 'status-badge approved',
      rejected: 'status-badge rejected',
      cancelled: 'status-badge inactive'
    };
    
    return (
      <span className={statusClasses[status] || 'status-badge'}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading leave data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Request leaves and track your leave history</p>
        </div>
        <Button
          variant={showForm ? 'neutral' : 'primary'}
          onClick={() => setShowForm(!showForm)}
          icon={showForm ? <FiX /> : <FiPlusCircle />}
          style={{ paddingTop: 12, paddingBottom: 12 }}
        >
          {showForm ? 'Cancel' : 'Request Leave'}
        </Button>
      </div>

      {/* Leave Request Form */}
      {showForm && (
        <div className="content-section">
          <div className="section-header">
            <h2>Request Leave</h2>
            <FiFileText className="section-icon" />
          </div>
          
          <form onSubmit={handleSubmit} className="leave-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="leaveType">Leave Type *</label>
                <select
                  id="leaveType"
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="annual">Annual Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="bereavement">Bereavement Leave</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="isHalfDay"
                    checked={formData.isHalfDay}
                    onChange={handleInputChange}
                  />
                  Half Day Leave
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fromDate">From Date *</label>
                <input
                  type="date"
                  id="fromDate"
                  name="fromDate"
                  value={formData.fromDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="toDate">To Date *</label>
                <input
                  type="date"
                  id="toDate"
                  name="toDate"
                  value={formData.toDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {formData.isHalfDay && (
              <div className="form-group">
                <label htmlFor="halfDayType">Half Day Type *</label>
                <select
                  id="halfDayType"
                  name="halfDayType"
                  value={formData.halfDayType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="reason">Reason *</label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                rows="4"
                placeholder="Please provide a reason for your leave request..."
                required
              />
            </div>

            <div className="form-actions" style={{ display: 'flex', gap: 12 }}>
              <Button
                type="button"
                variant="neutral"
                onClick={() => setShowForm(false)}
                disabled={submitting}
                icon={<FiX />}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                disabled={submitting}
                icon={<FiSend />}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Leave Balance Card */}
      <div className="content-section">
        <div className="section-header">
          <h2>Leave Balance</h2>
          <FiCalendar className="section-icon" />
        </div>
        
        <div className="leave-balance-card">
          <div className="balance-item">
            <span className="balance-number">{user?.leaveBalance || 15}</span>
            <span className="balance-label">Days Remaining</span>
          </div>
          <div className="balance-info">
            <p>You have {user?.leaveBalance || 15} days of leave remaining this year</p>
            <p>Leave quota: 15 days per year</p>
          </div>
        </div>
      </div>

      {/* Leave History */}
      <div className="content-section">
        <div className="section-header">
          <h2>Leave History</h2>
          <div className="header-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Button 
              variant="secondary" 
              onClick={forceRefreshLeaveHistory}
              icon={<FiRefreshCw />}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Force Refresh'}
            </Button>
            <Button 
              variant="outline" 
              onClick={syncWithAdminView}
              icon={<FiRefreshCw />}
              disabled={loading}
            >
              Sync Data
            </Button>
            <FiFileText className="section-icon" />
          </div>
        </div>
        
        {leaveHistory.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Total Days</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {leaveHistory.map((leave) => (
                  <tr key={leave.id}>
                    <td>
                      <span className="leave-type-badge">
                        {getLeaveTypeLabel(leave.leaveType)}
                      </span>
                    </td>
                    <td>{leave.fromDate}</td>
                    <td>{leave.toDate}</td>
                    <td>{leave.totalDays} days</td>
                    <td>{getStatusBadge(leave.status)}</td>
                    <td className="reason-cell">
                      <div className="reason-text" title={leave.reason}>
                        {leave.reason}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <FiFileText className="empty-state-icon" />
            <h3 className="empty-state-title">No leave requests found</h3>
            <p className="empty-state-description">
              You haven't submitted any leave requests yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaves; 