import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts';
import api from '../services/api';
import { toast } from 'react-toastify';
import moment from 'moment';
import { FiCalendar, FiFileText, FiPlusCircle, FiSend, FiX } from 'react-icons/fi';
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

  useEffect(() => {
    fetchLeaveHistory();
    
    // Set up auto-refresh every 30 seconds to ensure data is fresh
    const interval = setInterval(() => {
      fetchLeaveHistory();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchLeaveHistory = async () => {
    try {
      setLoading(true);
      // Add cache-busting parameter to ensure fresh data
      const timestamp = new Date().getTime();
      const response = await api.get(`/leaves/my-leaves?page=1&limit=500&_t=${timestamp}`);
      setLeaveHistory(response.data?.data?.leaves || []);
    } catch (error) {
      console.error('Error fetching leave history:', error);
      toast.error('Failed to load leave history');
    } finally {
      setLoading(false);
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

      const response = await api.post('/leaves/request', requestData);
      
      console.log('Leave submission response:', response.data);
      
      toast.success('Leave request submitted successfully!');
      setFormData({
        leaveType: 'casual',
        fromDate: '',
        toDate: '',
        reason: '',
        isHalfDay: false,
        halfDayType: 'morning'
      });
      setShowForm(false);
      fetchLeaveHistory(); // Refresh the list
      
    } catch (error) {
      console.error('Leave submission error:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
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
          <FiFileText className="section-icon" />
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