import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiUsers, FiClock, FiFileText, FiBarChart2, FiSearch, FiDownload, FiCheck, FiX, FiEdit, FiTrash2, FiEye, FiCalendar, FiUser, FiTrendingUp, FiTrendingDown, FiBell, FiDollarSign, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Reports } from '../components/dashboard';
// moment.js removed - using native Date methods
import './AdminDashboard.css';
import Payroll from './Payroll';


const sidebarItems = [
  { label: 'Dashboard Overview', icon: FiHome, section: 'dashboard' },
  { label: 'Employee Management', icon: FiUsers, section: 'employees' },
  { label: 'Attendance Management', icon: FiClock, section: 'attendance' },
  { label: 'Leave Management', icon: FiFileText, section: 'leaves' },
  { label: 'Payroll Management', icon: FiDollarSign, section: 'payroll' },
  { label: 'Reports & Analytics', icon: FiBarChart2, section: 'reports' }
];

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ 
    totalEmployees: 0, 
    presentToday: 0, 
    pendingLeaves: 0,
    totalLeaves: 0,
    attendanceRate: 0,
    onLeaveToday: 0
  });
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [attendanceDetailsOpen, setAttendanceDetailsOpen] = useState(false);
  const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState(null);
  const [leaveDetailsOpen, setLeaveDetailsOpen] = useState(false);
  const [selectedLeaveRecord, setSelectedLeaveRecord] = useState(null);
  
  const { logout } = useAuth();
  const { addNotification, unreadCount, markAllAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const inFlightRef = React.useRef(false);
  const [lastErrorAt, setLastErrorAt] = useState(0);
  const [pollIntervalMs, setPollIntervalMs] = useState(60000);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const fetchDashboardData = React.useCallback(async () => {
    try {
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      setLoading(true);
      
      if (activeSection === 'employees') {
        try {
          const response = await api.get(`/employees?page=${currentPage}&limit=20&search=${searchTerm}&department=${filterDepartment}&_t=${Date.now()}`);
          setEmployees(response.data?.data?.employees || []);
          setTotalPages(response.data?.data?.pagination?.totalPages || 1);
        } catch (error) {
          toast.error(error.userMessage || 'Failed to load employee data');
          setEmployees([]);
          setTotalPages(1);
        }
      } else if (activeSection === 'attendance') {
        try {
          const response = await api.get(`/attendance/all?page=${currentPage}&limit=20&date=${selectedDate}&_t=${Date.now()}`);
          setAttendanceRecords(response.data?.data?.attendance || []);
          setTotalPages(response.data?.data?.pagination?.totalPages || 1);
        } catch (error) {
          toast.error(error.userMessage || 'Failed to load attendance data');
          setAttendanceRecords([]);
          setTotalPages(1);
        }
      } else if (activeSection === 'leaves') {
        try {
          const timestamp = new Date().getTime();
          const response = await api.get(`/leaves/all?page=${currentPage}&limit=20&status=${filterStatus}&_t=${timestamp}`);
          setLeaveRequests(response.data?.data?.leaves || []);
          setTotalPages(response.data?.data?.pagination?.totalPages || 1);
        } catch (error) {
          toast.error(error.userMessage || 'Failed to load leave data');
          setLeaveRequests([]);
          setTotalPages(1);
        }
      }
    } catch (error) {
      // Error fetching dashboard data
      const now = Date.now();
      // Avoid spamming toasts on transient network issues
      const shouldToast = now - lastErrorAt > 10000; // 10s
      if (shouldToast) {
        const message = error.userMessage || error.response?.data?.message || 'Failed to load data. Please check your connection.';
        toast.error(message);
        setLastErrorAt(now);
      }

      // Backoff polling on failures up to 5 minutes
      setPollIntervalMs(prev => Math.min(prev * 2, 300000));
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [activeSection, currentPage, searchTerm, filterStatus, filterDepartment, selectedDate, pollIntervalMs, lastErrorAt]);

  // Add search and filter effects
  useEffect(() => {
    if (activeSection === 'employees' && (searchTerm || filterDepartment)) {
      setCurrentPage(1);
      // Use a timeout to avoid too many API calls during typing
      const timeoutId = setTimeout(() => {
        fetchDashboardData();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, filterDepartment, activeSection, fetchDashboardData]);

  useEffect(() => {
    if (activeSection === 'attendance' && selectedDate) {
      setCurrentPage(1);
      fetchDashboardData();
    }
  }, [selectedDate, activeSection, fetchDashboardData]);

  useEffect(() => {
    if (activeSection === 'leaves' && filterStatus) {
      setCurrentPage(1);
      fetchDashboardData();
    }
  }, [filterStatus, activeSection, fetchDashboardData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Lightweight polling with overlap protection and dynamic backoff
  useEffect(() => {
    // Poll only on dynamic sections where data changes frequently
    const shouldPoll = activeSection === 'dashboard' || activeSection === 'leaves' || activeSection === 'employees' || activeSection === 'attendance';
    if (!shouldPoll) return;
    const interval = setInterval(() => {
      if (!inFlightRef.current) fetchDashboardData();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [activeSection, fetchDashboardData, pollIntervalMs]);

  // Track online/offline to show a gentle banner
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Sync internal section state with the URL path (e.g., /admin/leaves → 'leaves')
  useEffect(() => {
    const path = location.pathname || '';
    let section = 'dashboard';
    if (path.startsWith('/admin/')) {
      const parts = path.split('/');
      section = parts[2] || 'dashboard';
    }
    const validSections = new Set(['dashboard', 'employees', 'attendance', 'leaves', 'payroll', 'reports']);
    const normalized = validSections.has(section) ? section : 'dashboard';
    if (normalized !== activeSection) {
      setActiveSection(normalized);
    }
  }, [location.pathname, activeSection]);

  const handleSidebarClick = (section) => {
    if (section === 'logout') {
      logout();
      return;
    }
    setActiveSection(section);
    setCurrentPage(1);
    setSearchTerm('');
    setFilterStatus('');
    setFilterDepartment('');
    // Ensure URL reflects the selected section for consistency with sidebar routing
    navigate(`/admin/${section}`);
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      const response = await api.put(`/leaves/${leaveId}/approve`, { notes: 'Approved by admin' });
      
      if (response.data.success) {
      toast.success('Leave request approved successfully!');
        
        // Find the leave to get employee info for notification
        const leave = leaveRequests.find(l => l.id === leaveId);
      if (leave) {
        addNotification({
          type: 'leave_approved',
          title: 'Leave Request Approved',
          message: `Your ${leave.leaveType} leave has been approved`,
          employeeId: leave.employeeId
        });
      }
        
        // Refresh data
      fetchDashboardData();
      } else {
        toast.error(response.data.message || 'Failed to approve leave request');
      }
    } catch (error) {
      toast.error(error.userMessage || error.response?.data?.message || 'Failed to approve leave request');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      const response = await api.put(`/leaves/${leaveId}/reject`, { rejectionReason: reason });
      
      if (response.data.success) {
      toast.success('Leave request rejected successfully!');
        
        // Find the leave to get employee info for notification
        const leave = leaveRequests.find(l => l.id === leaveId);
      if (leave) {
        addNotification({
          type: 'leave_rejected',
          title: 'Leave Request Rejected',
          message: `Your ${leave.leaveType} leave has been rejected: ${reason}`,
          employeeId: leave.employeeId
        });
      }
        
        // Refresh data
      fetchDashboardData();
      } else {
        toast.error(response.data.message || 'Failed to reject leave request');
      }
    } catch (error) {
      toast.error(error.userMessage || error.response?.data?.message || 'Failed to reject leave request');
    }
  };

  const openAttendanceDetails = (record) => {
    setSelectedAttendanceRecord(record);
    setAttendanceDetailsOpen(true);
  };

  const closeAttendanceDetails = () => {
    setAttendanceDetailsOpen(false);
    setSelectedAttendanceRecord(null);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setShowEmployeeModal(true);
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      try {
        const response = await api.delete(`/employees/${employeeId}`);
        if (response.data.success) {
        toast.success('Employee deleted successfully');
        fetchDashboardData();
        } else {
          toast.error(response.data.message || 'Failed to delete employee');
        }
      } catch (error) {
        toast.error(error.userMessage || error.response?.data?.message || 'Failed to delete employee');
      }
    }
  };

  const handleSaveEmployee = async (employeeData) => {
    try {
      if (editingEmployee) {
        // For updates, only send the fields that have changed and are not empty
        const updatePayload = {};
        
        if (employeeData.fullName && employeeData.fullName.trim()) updatePayload.fullName = employeeData.fullName.trim();
        if (employeeData.email && employeeData.email.trim()) updatePayload.email = employeeData.email.trim();
        if (employeeData.department && employeeData.department.trim()) updatePayload.department = employeeData.department.trim();
        if (employeeData.position && employeeData.position.trim()) updatePayload.position = employeeData.position.trim();
        if (employeeData.phone && employeeData.phone.trim()) updatePayload.phone = employeeData.phone.trim();
        if (employeeData.joiningDate) updatePayload.joiningDate = employeeData.joiningDate;
        if (employeeData.salary && employeeData.salary > 0) updatePayload.salary = Number(employeeData.salary);
        if (employeeData.address && Object.values(employeeData.address).some(val => val && val.trim())) {
          updatePayload.address = {};
          if (employeeData.address.street && employeeData.address.street.trim()) updatePayload.address.street = employeeData.address.street.trim();
          if (employeeData.address.city && employeeData.address.city.trim()) updatePayload.address.city = employeeData.address.city.trim();
          if (employeeData.address.zipCode && employeeData.address.zipCode.trim()) updatePayload.address.zipCode = employeeData.address.zipCode.trim();
          if (employeeData.address.country && employeeData.address.country.trim()) updatePayload.address.country = employeeData.address.country.trim();
        }
        if (employeeData.leaveBalance !== undefined && employeeData.leaveBalance >= 0) updatePayload.leaveBalance = Number(employeeData.leaveBalance);
        if (employeeData.status) updatePayload.status = employeeData.status;
        
        // Ensure we have at least one field to update
        if (Object.keys(updatePayload).length === 0) {
          toast.error('No changes detected');
          return;
        }
        
        const response = await api.put(`/employees/${editingEmployee.id}`, updatePayload);
        if (response.data.success) {
        toast.success('Employee updated successfully');
        } else {
          toast.error(response.data.message || 'Failed to update employee');
          return;
        }
      } else {
        // Always use manual creation with admin-set temporary password
        const payload = {
          fullName: employeeData.fullName,
          email: employeeData.email,
          password: employeeData.password,
          department: employeeData.department,
          position: employeeData.position,
          phone: employeeData.phone || '',
          dateOfJoining: employeeData.joiningDate || new Date().toISOString(),
          salary: employeeData.salary || 0,
          address: employeeData.address && Object.values(employeeData.address).some(val => val && val.trim()) ? employeeData.address : undefined,
          leaveBalance: employeeData.leaveBalance || 25
        };
        const response = await api.post('/employees', payload);
        if (response.data.success) {
        toast.success('Employee created successfully');
        } else {
          toast.error(response.data.message || 'Failed to create employee');
          return;
        }
      }
      setShowEmployeeModal(false);
      setEditingEmployee(null);
      fetchDashboardData();
    } catch (error) {
        toast.error(error.userMessage || error.response?.data?.message || 'Failed to save employee');
    }
  };

  const downloadAttendanceReport = async () => {
    try {
      // Align with backend reports endpoint; use the same date for start and end
      const response = await api.get(`/reports/attendance/csv?startDate=${selectedDate}&endDate=${selectedDate}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Attendance report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const downloadLeaveReport = async () => {
    try {
      // Align with backend reports endpoint; export across a wide date range
      const startDate = '1970-01-01';
      const endDate = new Date().toISOString().slice(0, 10);
      const response = await api.get(`/reports/leaves/csv?startDate=${startDate}&endDate=${endDate}` + (filterStatus ? `&status=${filterStatus}` : ''), {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leave_report_${filterStatus || 'all'}_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Leave report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const renderDashboardContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="dashboard-overview">
            {/* Stats Cards */}
            <div className="stats-grid">
              <StatsCard
                title="Total Employees"
                value={stats.totalEmployees}
                icon={FiUsers}
                trend="up"
                trendValue="+12%"
                color="primary"
              />
              <StatsCard
                title="Present Today"
                value={stats.presentToday}
                icon={FiClock}
                trend="up"
                trendValue="+5%"
                color="success"
              />
              <StatsCard
                title="Pending Leaves"
                value={stats.pendingLeaves}
                icon={FiFileText}
                trend="down"
                trendValue="-8%"
                color="warning"
              />
              <StatsCard
                title="Attendance Rate"
                value={`${stats.attendanceRate}%`}
                icon={FiTrendingUp}
                trend="up"
                trendValue="+3%"
                color="info"
              />
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-grid">
                <button 
                  className="action-card"
                  onClick={() => setActiveSection('employees')}
                >
                  <FiUsers size={24} />
                  <span>Manage Employees</span>
                </button>
                <button 
                  className="action-card"
                  onClick={() => setActiveSection('leaves')}
                >
                  <FiFileText size={24} />
                  <span>Review Leaves</span>
                </button>
                <button 
                  className="action-card"
                  onClick={() => setActiveSection('attendance')}
                >
                  <FiClock size={24} />
                  <span>View Attendance</span>
                </button>
                <button 
                  className="action-card"
                  onClick={() => setActiveSection('payroll')}
                >
                  <FiDollarSign size={24} />
                  <span>Generate Payroll</span>
                </button>
              </div>
              </div>
              
            {/* Recent Activity */}
            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {loading ? (
                  <LoadingSkeleton type="cards" rows={3} />
                ) : (
                  <div className="activity-item">
                    <div className="activity-icon">
                      <FiUsers size={16} />
                    </div>
                    <div className="activity-content">
                      <p>New employee registered</p>
                      <span className="activity-time">2 hours ago</span>
                      </div>
                      </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'employees':
        return (
          <div className="employees-section">
            <div className="section-header">
              <h3>Employee Management</h3>
              <div className="header-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="search-container">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search employees by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button className="btn-secondary" onClick={fetchDashboardData}>Refresh</button>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Departments</option>
                  <option value="IT">IT</option>
                  <option value="Operation">Operation</option>
                  <option value="Management">Management</option>
                </select>
                <button className="btn-primary" onClick={() => { setEditingEmployee(null); setShowEmployeeModal(true); }}>
                  <FiUser />
                  Add Employee
                </button>
              </div>
            </div>

            {/* Employee Stats Summary */}
            <div className="employee-stats">
              <div className="stat-item">
                <span className="stat-number">{employees.length}</span>
                <span className="stat-label">Total Employees</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {employees.filter(emp => emp.status === 'active').length}
                </span>
                <span className="stat-label">Active</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {employees.filter(emp => emp.status === 'inactive').length}
                </span>
                <span className="stat-label">Inactive</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {employees.filter(emp => emp.department === filterDepartment || !filterDepartment).length}
                </span>
                <span className="stat-label">In {filterDepartment || 'All'} Dept</span>
              </div>
            </div>
            
            <div className="table-container">
              {loading ? (
                <LoadingSkeleton type="table" rows={5} />
              ) : employees.length === 0 ? (
                <div className="empty-state">
                  <FiUsers className="empty-state-icon" />
                  <h3>No employees found</h3>
                  <p>
                    {searchTerm || filterDepartment 
                      ? `No employees match your search criteria. Try adjusting your filters.`
                      : 'No employees have been added yet. Click "Add Employee" to get started.'
                    }
                  </p>
                  {searchTerm || filterDepartment ? (
                    <button 
                      className="btn btn-secondary"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterDepartment('');
                      }}
                    >
                      Clear Filters
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Position</th>
                        <th>Join Date</th>
                        <th>Leave Balance</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((employee) => (
                        <tr key={employee.id}>
                          <td>
                            <div className="employee-info">
                              <div className="employee-avatar">
                                <FiUser />
                              </div>
                              <div>
                                <div className="employee-name">{employee.fullName}</div>
                                <div className="employee-email">{employee.email}</div>
                                <div className="employee-phone">{employee.phone || 'No phone'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-info">{employee.department}</span>
                          </td>
                          <td>{employee.position}</td>
                          <td>{new Date(employee.dateOfJoining || employee.joiningDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                          <td>
                            <span className="leave-balance">{employee.leaveBalance || 0} days</span>
                          </td>
                          <td>
                            <span className={`badge badge-${employee.status === 'active' ? 'success' : 'warning'}`}>
                              {employee.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons" style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-secondary" onClick={() => handleEditEmployee(employee)}>
                                <FiEdit />
                              </button>
                              <button className="btn btn-danger" onClick={() => handleDeleteEmployee(employee.id)}>
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <button 
                        className="btn btn-secondary"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                      >
                        Previous
                      </button>
                      <span className="page-info">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button 
                        className="btn btn-secondary"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="attendance-section">
            <div className="section-header">
              <h3>Attendance Management</h3>
              <div className="header-actions">
                <div className="date-filter">
                  <FiCalendar className="calendar-icon" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="date-input"
                  />
                </div>
                <div className="search-container">
                  <FiSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search attendance..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button className="btn-secondary" onClick={fetchDashboardData}>Refresh</button>
                <button className="btn-primary" onClick={downloadAttendanceReport}>
                  <FiDownload />
                  Export Report
                </button>
              </div>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Total Hours</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => {
                    return (
                      <tr key={record._id}>
                        <td>
                          <div className="employee-info">
                            <div className="employee-avatar">
                              <FiUser />
                            </div>
                            <div>
                              <div className="employee-name">{record.userId?.fullName || 'Unknown'}</div>
                              <div className="employee-email">{record.userId?.email || 'Unknown'}</div>
                            </div>
                          </div>
                        </td>
                        <td>{new Date(record.date).toLocaleDateString('en-PK', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Asia/Karachi' })}</td>
                        <td>
                          {record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                        </td>
                        <td>
                          {record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                        </td>
                        <td>
                          <span className="hours-display">
                            {record.totalHours || 0}h
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${record.status === 'present' ? 'success' : 'warning'}`}>
                            {record.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary"
                            title="View Details"
                            onClick={() => openAttendanceDetails(record)}
                          >
                            <FiEye />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button 
                    className="btn btn-secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    className="btn btn-secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'leaves':
        return (
          <div className="leaves-section">
            <div className="section-header">
              <h3>Leave Management</h3>
              <div className="header-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button className="btn-secondary" onClick={fetchDashboardData}>Refresh</button>
                <button className="btn-primary" onClick={downloadLeaveReport}>
                  <FiDownload />
                  Export Report
                </button>
              </div>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((leave) => {
                    return (
                      <tr key={leave.id}>
                      <td>
                        <div className="employee-info">
                          <div className="employee-avatar">
                            <FiUser />
                          </div>
                          <div>
                            <div className="employee-name">{leave.employeeName || 'Unknown'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{leave.leaveType}</span>
                      </td>
                      <td>{new Date(leave.fromDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                      <td>{new Date(leave.toDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                      <td>
                        <span className="days-display">
                          {leave.totalDays} days
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${leave.status === 'approved' ? 'success' : leave.status === 'rejected' ? 'danger' : 'warning'}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td>
                        {leave.status === 'pending' && (
                          <div className="action-buttons">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleApproveLeave(leave.id)}
                              title="Approve Leave"
                            >
                              <FiCheck />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRejectLeave(leave.id)}
                              title="Reject Leave"
                            >
                              <FiX />
                            </button>
                          </div>
                        )}
                        {leave.status !== 'pending' && (
                          <button
                            className="btn btn-info btn-sm"
                            title="View Details"
                            onClick={() => {
                              setSelectedLeaveRecord(leave);
                              setLeaveDetailsOpen(true);
                            }}
                          >
                            <FiEye />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'payroll':
        return <Payroll />;

      case 'reports':
        return <Reports />;

      default:
        return null;
    }
  };

  if (loading && activeSection === 'dashboard') {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="admin-dashboard">
      <header className="content-header">
        <div className="header-content">
          <h2>{sidebarItems.find(item => item.section === activeSection)?.label || 'Dashboard'}</h2>
          <div className="header-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => markAllAsRead()} title="Mark all notifications as read">
              <FiBell />
              {unreadCount > 0 && <span className="badge" style={{marginLeft: 6}}>{unreadCount}</span>}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={logout}>
              <FiUser />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="content-main">
        {renderDashboardContent()}
      </main>

      {attendanceDetailsOpen && selectedAttendanceRecord && (
          <AttendanceDetailsModal
            record={selectedAttendanceRecord}
            onClose={closeAttendanceDetails}
          />
      )}

      {leaveDetailsOpen && selectedLeaveRecord && (
          <LeaveDetailsModal
            leave={selectedLeaveRecord}
            onClose={() => setLeaveDetailsOpen(false)}
          />
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
        <EmployeeModal
          employee={editingEmployee}
          onSave={handleSaveEmployee}
          onClose={() => {
            setShowEmployeeModal(false);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
    </ErrorBoundary>
  );
};

// Add professional loading skeleton component
const LoadingSkeleton = ({ type = 'table', rows = 5 }) => {
  if (type === 'table') {
    return (
      <div className="skeleton-table">
        <div className="skeleton-header">
          <div className="skeleton-cell"></div>
          <div className="skeleton-cell"></div>
          <div className="skeleton-cell"></div>
          <div className="skeleton-cell"></div>
        </div>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="skeleton-row">
            <div className="skeleton-cell"></div>
            <div className="skeleton-cell"></div>
            <div className="skeleton-cell"></div>
            <div className="skeleton-cell"></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (type === 'cards') {
    return (
      <div className="skeleton-cards">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="skeleton-card">
            <div className="skeleton-card-header"></div>
            <div className="skeleton-card-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line"></div>
              <div className="skeleton-line short"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  return null;
};

// Employee Modal Component
const EmployeeModal = ({ employee, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    fullName: employee?.fullName || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    department: employee?.department || '',
    position: employee?.position || '',
            joiningDate: employee?.joiningDate ? new Date(employee.joiningDate).toISOString().slice(0, 10) : '',
    salary: employee?.salary || '',
    status: employee?.status || 'active',
    leaveBalance: employee?.leaveBalance || 25,
    password: '',
    address: employee?.address || {
      street: '',
      city: '',
      zipCode: '',
      country: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Phone is optional
    
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    
    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    }
    
    // Joining date is optional (defaults to today on create)
    
    if (formData.salary && formData.salary < 0) {
      newErrors.salary = 'Salary cannot be negative';
    }
    
    if (formData.leaveBalance < 0) {
      newErrors.leaveBalance = 'Leave balance cannot be negative';
    }

    if (!employee) {
      const pwd = (formData.password || '').trim();
      if (!pwd) {
        newErrors.password = 'Temporary password is required';
      } else if (pwd.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
    } catch (error) {
      // Error saving employee
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{employee ? 'Edit Employee' : 'Add New Employee'}</h3>
          <button className="modal-close" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className={errors.fullName ? 'error' : ''}
                placeholder="Enter full name"
              />
              {errors.fullName && <span className="error-message">{errors.fullName}</span>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'error' : ''}
                placeholder="Enter email address"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={errors.phone ? 'error' : ''}
                placeholder="Enter phone number"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>
            <div className="form-group">
              <label>Department *</label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className={errors.department ? 'error' : ''}
              >
                <option value="">Select Department</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Operations">Operations</option>
                <option value="Design">Design</option>
                <option value="Management">Management</option>
              </select>
              {errors.department && <span className="error-message">{errors.department}</span>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Position *</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                className={errors.position ? 'error' : ''}
                placeholder="Enter job position"
              />
              {errors.position && <span className="error-message">{errors.position}</span>}
            </div>
            <div className="form-group">
              <label>Temporary Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={errors.password ? 'error' : ''}
                placeholder="Set a strong temporary password"
                disabled={!!employee}
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                className={errors.joiningDate ? 'error' : ''}
              />
              {errors.joiningDate && <span className="error-message">{errors.joiningDate}</span>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Salary (Annual)</label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => handleInputChange('salary', e.target.value)}
                className={errors.salary ? 'error' : ''}
                placeholder="Enter annual salary"
                min="0"
              />
              {errors.salary && <span className="error-message">{errors.salary}</span>}
            </div>
            <div className="form-group">
              <label>Leave Balance</label>
              <input
                type="number"
                value={formData.leaveBalance}
                onChange={(e) => handleInputChange('leaveBalance', e.target.value)}
                className={errors.leaveBalance ? 'error' : ''}
                placeholder="Days available"
                min="0"
                max="365"
              />
              {errors.leaveBalance && <span className="error-message">{errors.leaveBalance}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h4>Address Information</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Street</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="Enter street address"
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  placeholder="Enter city"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>ZIP Code</label>
                <input
                  type="text"
                  value={formData.address.zipCode}
                  onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                  placeholder="Enter ZIP code"
                />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => handleAddressChange('country', e.target.value)}
                  placeholder="Enter country"
                />
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (employee ? 'Update Employee' : 'Add Employee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Professional Status Badge Component
const StatusBadge = ({ status, children }) => {
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      case 'active':
        return 'active';
      case 'inactive':
        return 'inactive';
      default:
        return 'pending';
    }
  };

  return (
    <span className={`status-badge ${getStatusClass(status)}`}>
      {children || status}
    </span>
  );
};

// Professional Stats Card Component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = 'primary' 
}) => {
  return (
    <div className={`stats-card stats-card-${color}`}>
      <div className="stats-card-header">
        <div className="stats-card-icon">
          <Icon size={24} />
        </div>
        <div className="stats-card-trend">
          {trend === 'up' && <FiTrendingUp size={16} />}
          {trend === 'down' && <FiTrendingDown size={16} />}
          <span className="trend-value">{trendValue}</span>
        </div>
      </div>
      <div className="stats-card-content">
        <h3 className="stats-card-title">{title}</h3>
        <div className="stats-card-value">{value}</div>
      </div>
    </div>
  );
};

// Professional Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">
              <FiAlertTriangle size={48} />
            </div>
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
            <div className="error-actions">
              <button 
                className="btn-primary"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
              <button 
                className="btn-secondary"
                onClick={() => this.setState({ hasError: false })}
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre>{this.state.error.toString()}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Attendance Details Modal Component
const AttendanceDetailsModal = ({ record, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Attendance Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Employee</label>
            <p>{record.userId?.fullName || 'Unknown'}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <p>{record.userId?.email || 'Unknown'}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Employee ID</label>
            <p>{record.userId?.employeeId || 'N/A'}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <p>{record.userId?.department || 'N/A'}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <p>{new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Check-in</label>
            <p>{record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Check-out</label>
            <p>{record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Re-check-in</label>
            <p>{record.reCheckIn?.time ? new Date(record.reCheckIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Re-check-out</label>
            <p>{record.reCheckOut?.time ? new Date(record.reCheckOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Total Hours</label>
            <p>{record.totalHours || 0}h</p>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <StatusBadge status={record.status}>{record.status}</StatusBadge>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// Leave Details Modal Component
const LeaveDetailsModal = ({ leave, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Leave Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Employee</label>
            <p>{leave.employeeName || 'Unknown'} ({leave.employeeId || ''})</p>
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <p>{leave.leaveType}</p>
          </div>
          <div className="form-group">
            <label className="form-label">From</label>
            <p>{new Date(leave.fromDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <p>{new Date(leave.toDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Days</label>
            <p>{leave.totalDays}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <StatusBadge status={leave.status}>{leave.status}</StatusBadge>
          </div>
          {leave.reason && (
            <div className="form-group">
              <label className="form-label">Reason</label>
              <p>{leave.reason}</p>
            </div>
          )}
          {leave.rejectionReason && (
            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <p>{leave.rejectionReason}</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 