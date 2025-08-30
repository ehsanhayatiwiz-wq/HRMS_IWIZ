import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
// Using native Date methods instead of moment.js for better performance
import { FiPlus, FiCalendar, FiClock, FiFileText, FiCheckCircle, FiXCircle, FiClock as FiClockIcon } from 'react-icons/fi';
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

  const [fetchInProgress, setFetchInProgress] = useState(false);
  
  const fetchLeaveHistory = async () => {
    if (fetchInProgress) {
      return;
    }

    try {
      setFetchInProgress(true);
      setLoading(true);

      const response = await api.get('/leaves/my-leaves');
      
      if (response.data.success) {
        setLeaveHistory(response.data.data.leaves || []);
      }
    } catch (error) {
      // Error fetching leave history
      toast.error('Failed to load leave history');
    } finally {
      setLoading(false);
      setFetchInProgress(false);
    }
  };

  useEffect(() => {
    fetchLeaveHistory();
  }, []);

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    
    if (!formData.fromDate || !formData.toDate || !formData.reason) {
      toast.error('Please fill in all required fields');
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

      const response = await api.post('/leaves/request', requestData);
      
      if (response.data.success) {
        toast.success('Leave request submitted successfully');
        setShowForm(false);
        fetchLeaveHistory();
        
        // Reset form
        setFormData({
          leaveType: 'casual',
          fromDate: '',
          toDate: '',
          reason: '',
          isHalfDay: false,
          halfDayType: 'morning'
        });
      }
    } catch (error) {
      // Leave submission error
      const message = error.response?.data?.message || 'Failed to submit leave request';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getLeaveTypeIcon = (leaveType) => {
    switch (leaveType) {
      case 'sick':
        return '🏥';
      case 'casual':
        return '🎯';
      case 'annual':
        return '🏖️';
      case 'maternity':
        return '👶';
      case 'paternity':
        return '👨‍👩‍👧‍👦';
      case 'bereavement':
        return '🕊️';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading leave history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Leave Management</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          variant="primary"
          icon={<FiPlus />}
        >
          {showForm ? 'Cancel' : 'Request Leave'}
        </Button>
      </div>

      {showForm && (
        <div className="leave-form-container">
          <form onSubmit={handleSubmitLeave} className="leave-form">
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
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="fromDate">From Date *</label>
                <input
                  type="date"
                  id="fromDate"
                  name="fromDate"
                  value={formData.fromDate}
                  onChange={handleInputChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
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
                  min={formData.fromDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reason">Reason *</label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  placeholder="Please provide a reason for your leave request..."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group checkbox-group">
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

              {formData.isHalfDay && (
                <div className="form-group">
                  <label htmlFor="halfDayType">Half Day Type</label>
                  <select
                    id="halfDayType"
                    name="halfDayType"
                    value={formData.halfDayType}
                    onChange={handleInputChange}
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                  </select>
                </div>
              )}
            </div>

            <div className="form-actions">
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                icon={<FiClock />}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
                icon={<FiXCircle />}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="leave-history-section">
        <div className="section-header">
          <h2>Leave History</h2>
          <Button
            onClick={fetchLeaveHistory}
            variant="secondary"
            icon={<FiClockIcon />}
            disabled={fetchInProgress}
          >
            Refresh
          </Button>
        </div>

        {leaveHistory.length === 0 ? (
          <div className="no-data">
            <FiFileText size={48} />
            <p>No leave requests found</p>
          </div>
        ) : (
          <div className="leave-history-table">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Applied On</th>
                </tr>
              </thead>
              <tbody>
                {leaveHistory.map((leave) => (
                  <tr key={leave.id || leave._id}>
                    <td>
                      <span className="leave-type">
                        {getLeaveTypeIcon(leave.leaveType)} {leave.leaveType}
                      </span>
                    </td>
                    <td>
                      <span className="date">
                        <FiCalendar /> {new Date(leave.fromDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      <span className="date">
                        <FiCalendar /> {new Date(leave.toDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      <span className="days">
                        {leave.totalDays || leave.days || 1} day(s)
                      </span>
                    </td>
                    <td>
                      <span className="reason" title={leave.reason}>
                        {leave.reason.length > 50 ? `${leave.reason.substring(0, 50)}...` : leave.reason}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td>
                      <span className="date">
                        {new Date(leave.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaves; 