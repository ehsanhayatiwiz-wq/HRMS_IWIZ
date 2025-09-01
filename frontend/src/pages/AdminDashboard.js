import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiUsers, FiClock, FiFileText, FiBarChart2, FiSearch, FiDownload, FiCheck, FiX, FiEdit, FiTrash2, FiEye, FiCalendar, FiUser, FiTrendingUp, FiTrendingDown, FiBell, FiDollarSign, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Reports } from '../components/dashboard';
// moment.js removed - using native Date methods
import './AdminDashboard.css';
import Payroll from './Payroll';
import Button from '../components/common/Button';

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

  const fetchDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      if (activeSection === 'dashboard') {
        const timestamp = new Date().getTime();
        const [adminRes, employeesRes, leavesRes] = await Promise.all([
          api.get('/dashboard/admin'),
          api.get('/employees?page=1&limit=10'),
          api.get(`/leaves/all?page=1&limit=20&status=pending&_t=${timestamp}`)
        ]);

        const s = adminRes.data?.data?.employeeStats || {};
        setStats({
          totalEmployees: s.totalEmployees || 0,
          presentToday: s.presentToday || 0,
          pendingLeaves: s.pendingLeaves || 0,
          totalLeaves: s.totalLeaves || 0,
          attendanceRate: s.attendanceRate || 0,
          onLeaveToday: s.onLeaveEmployees || 0
        });
        setEmployees(employeesRes.data?.data?.employees || []);
        
        // Debug: Log the leave requests data for dashboard (normalized to employeeId)
        console.log('Dashboard leaves API response:', leavesRes.data);
        console.log('Dashboard leave records:', leavesRes.data?.data?.leaves);
        if (leavesRes.data?.data?.leaves?.length > 0) {
          const first = leavesRes.data.data.leaves[0];
          console.log('First dashboard leave record:', first);
          console.log('First record employeeName:', first.employeeName);
          console.log('First record employeeId:', first.employeeId);
        }
        
        setLeaveRequests(leavesRes.data?.data?.leaves || []);
      } else if (activeSection === 'employees') {
        try {
          const response = await api.get(`/employees?page=${currentPage}&limit=20&search=${searchTerm}&department=${filterDepartment}`);
          setEmployees(response.data?.data?.employees || []);
          setTotalPages(response.data?.data?.pagination?.totalPages || 1);
        } catch (error) {
          console.error('Error fetching employees:', error);
          toast.error('Failed to load employees data');
          setEmployees([]);
          setTotalPages(1);
        }
      } else if (activeSection === 'attendance') {
        try {
          const response = await api.get(`/attendance/all?page=${currentPage}&limit=20&date=${selectedDate}`);
          console.log('Attendance API response:', response.data);
          console.log('Attendance records:', response.data?.data?.attendance);
          if (response.data?.data?.attendance?.length > 0) {
            console.log('First attendance record:', response.data.data.attendance[0]);
          }
          setAttendanceRecords(response.data?.data?.attendance || []);
          setTotalPages(response.data?.data?.pagination?.totalPages || 1);
        } catch (error) {
          console.error('Error fetching attendance:', error);
          toast.error('Failed to load attendance data');
          setAttendanceRecords([]);
          setTotalPages(1);
        }
      } else if (activeSection === 'leaves') {
        try {
          // Add cache-busting parameter to ensure fresh data
          const timestamp = new Date().getTime();
          const response = await api.get(`/leaves/all?page=${currentPage}&limit=20&status=${filterStatus}&_t=${timestamp}`);
          console.log('Leaves API response:', response.data);
          console.log('Leave records:', response.data?.data?.leaves);
          if (response.data?.data?.leaves?.length > 0) {
            console.log('First leave record:', response.data.data.leaves[0]);
          }
          setLeaveRequests(response.data?.data?.leaves || []);
          setTotalPages(response.data?.data?.pagination?.totalPages || 1);
        } catch (error) {
          console.error('Error fetching leaves:', error);
          toast.error('Failed to load leave data');
          setLeaveRequests([]);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (activeSection === 'dashboard') {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, [activeSection, currentPage, searchTerm, filterStatus, filterDepartment, selectedDate]);

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

  // Lightweight polling to keep data fresh while admin is viewing
  useEffect(() => {
    // Poll only on dynamic sections where data changes frequently
    const shouldPoll = activeSection === 'dashboard' || activeSection === 'leaves' || activeSection === 'employees' || activeSection === 'attendance';
    if (!shouldPoll) return;
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30s
    return () => clearInterval(interval);
  }, [activeSection, fetchDashboardData]);

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
    // Optimistic update
    const previousLeaves = leaveRequests;
    setLeaveRequests(prev => prev.map(l => l.id === leaveId ? { ...l, status: 'approved' } : l));
    try {
      const leave = previousLeaves.find(l => l.id === leaveId);
      await api.put(`/leaves/${leaveId}/approve`, { notes: 'Approved by admin' });
      toast.success('Leave request approved successfully!');
      if (leave) {
        addNotification({
          type: 'leave_approved',
          title: 'Leave Request Approved',
          message: `Your ${leave.leaveType} leave has been approved`,
          employeeId: leave.employeeId
        });
      }
      fetchDashboardData();
    } catch (error) {
      // Rollback on failure
      setLeaveRequests(previousLeaves);
      console.error('Approve leave error:', error);
      toast.error(error.response?.data?.message || 'Failed to approve leave request');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    // Optimistic update
    const previousLeaves = leaveRequests;
    setLeaveRequests(prev => prev.map(l => l.id === leaveId ? { ...l, status: 'rejected', rejectionReason: reason } : l));
    try {
      const leave = previousLeaves.find(l => l.id === leaveId);
      await api.put(`/leaves/${leaveId}/reject`, { rejectionReason: reason });
      toast.success('Leave request rejected successfully!');
      if (leave) {
        addNotification({
          type: 'leave_rejected',
          title: 'Leave Request Rejected',
          message: `Your ${leave.leaveType} leave has been rejected: ${reason}`,
          employeeId: leave.employeeId
        });
      }
      fetchDashboardData();
    } catch (error) {
      // Rollback on failure
      setLeaveRequests(previousLeaves);
      console.error('Reject leave error:', error);
      toast.error(error.response?.data?.message || 'Failed to reject leave request');
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
        await api.delete(`/employees/${employeeId}`);
        toast.success('Employee deleted successfully');
        fetchDashboardData();
      } catch (error) {
        toast.error('Failed to delete employee');
      }
    }
  };

  const handleSaveEmployee = async (employeeData) => {
    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, employeeData);
        toast.success('Employee updated successfully');
      } else {
        // Always use manual creation with admin-set temporary password
        const payload = {
          fullName: employeeData.fullName,
          email: employeeData.email,
          password: employeeData.password,
          department: employeeData.department,
          position: employeeData.position,
          phone: employeeData.phone,
          dateOfJoining: employeeData.joiningDate || new Date().toISOString(),
          salary: employeeData.salary,
          address: employeeData.address,
          leaveBalance: employeeData.leaveBalance
        };
        await api.post('/employees', payload);
        toast.success('Employee created successfully');
      }
      setShowEmployeeModal(false);
      setEditingEmployee(null);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save employee');
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
              <div className="stat-card primary">
                <div className="stat-card-icon">
                  <FiUsers />
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-card-value">{stats.totalEmployees}</h3>
                  <p className="stat-card-label">Total Employees</p>
                  <div className="stat-card-trend positive">
                    <FiTrendingUp />
                    <span>+12% from last month</span>
                  </div>
                </div>
              </div>
              
              <div className="stat-card success">
                <div className="stat-card-icon">
                  <FiClock />
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-card-value">{stats.presentToday}</h3>
                  <p className="stat-card-label">Present Today</p>
                  <div className="stat-card-trend positive">
                    <FiTrendingUp />
                    <span>+5% from yesterday</span>
                  </div>
                </div>
              </div>
              
              <div className="stat-card warning">
                <div className="stat-card-icon">
                  <FiFileText />
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-card-value">{stats.pendingLeaves}</h3>
                  <p className="stat-card-label">Pending Leaves</p>
                  <div className="stat-card-trend negative">
                    <FiTrendingDown />
                    <span>Requires attention</span>
                  </div>
                </div>
              </div>
              
              <div className="stat-card info">
                <div className="stat-card-icon">
                  <FiBarChart2 />
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-card-value">{stats.attendanceRate}%</h3>
                  <p className="stat-card-label">Attendance Rate</p>
                  <div className="stat-card-trend positive">
                    <FiTrendingUp />
                    <span>+3% this week</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons" style={{ display: 'flex', gap: 12 }}>
                <Button variant="primary" onClick={() => handleSidebarClick('leaves')} icon={<FiFileText />}>Review Leave Requests</Button>
                <Button variant="primary" onClick={() => handleSidebarClick('attendance')} icon={<FiClock />}>View Attendance</Button>
                <Button variant="secondary" onClick={() => handleSidebarClick('employees')} icon={<FiUsers />}>Manage Employees</Button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <div className="section-header">
                <h3>Recent Leave Requests</h3>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleSidebarClick('leaves')}
                >
                  View All
                </button>
              </div>
              
              <div className="activity-list">
                {leaveRequests.slice(0, 5).map((leave) => (
                  <div key={leave.id} className="activity-item">
                    <div className="activity-icon">
                      <FiFileText />
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">
                        {leave.employeeName || 'Unknown Employee'} requested {leave.leaveType} leave
                      </div>
                      <div className="activity-details">
                        {new Date(leave.fromDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} - {new Date(leave.toDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} • {leave.totalDays} days
                      </div>
                    </div>
                    <div className="activity-status">
                      <span className={`status-badge ${leave.status}`}>
                        {leave.status}
                      </span>
                    </div>
                  </div>
                ))}
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
                <Button variant="secondary" onClick={fetchDashboardData}>Refresh</Button>
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
                <Button variant="primary" onClick={() => { setEditingEmployee(null); setShowEmployeeModal(true); }} icon={<FiUser />}>Add Employee</Button>
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
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading employees...</p>
                </div>
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
                              <Button variant="secondary" onClick={() => handleEditEmployee(employee)} icon={<FiEdit />} />
                              <Button variant="danger" onClick={() => handleDeleteEmployee(employee.id)} icon={<FiTrash2 />} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <Button 
                        variant="secondary"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                      >
                        Previous
                      </Button>
                      <span className="page-info">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button 
                        variant="secondary"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                        Next
                      </Button>
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
                <Button variant="secondary" onClick={fetchDashboardData}>Refresh</Button>
                <Button variant="primary" onClick={downloadAttendanceReport} icon={<FiDownload />}>Export Report</Button>
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
                    console.log('Rendering attendance record:', record);
                    return (
                      <tr key={record._id}>
                        <td>
                          <div className="employee-info">
                            <div className="employee-avatar">
                              <FiUser />
                            </div>
                            <div>
                              <div className="employee-name">{record.employeeName || 'Unknown'}</div>
                            </div>
                          </div>
                        </td>
                        <td>{new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                        <td>
                          {record.checkInTime || '-'}
                        </td>
                        <td>
                          {record.checkOutTime || '-'}
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
                          <Button
                            variant="secondary"
                            title="View Details"
                            onClick={() => openAttendanceDetails(record)}
                            icon={<FiEye />}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Button 
                    variant="secondary"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    Previous
                  </Button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="secondary"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    Next
                  </Button>
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
                <Button variant="secondary" onClick={fetchDashboardData}>Refresh</Button>
                <Button variant="primary" onClick={downloadLeaveReport} icon={<FiDownload />}>Export Report</Button>
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
                    console.log('Rendering leave record:', leave);
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
        <div className="modal-overlay" onClick={closeAttendanceDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Attendance Details</h3>
              <button className="modal-close" onClick={closeAttendanceDetails}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Employee:</strong> {selectedAttendanceRecord.userId?.fullName || 'Unknown'}</p>
              <p><strong>Email:</strong> {selectedAttendanceRecord.userId?.email || 'Unknown'}</p>
              <p><strong>Date:</strong> {new Date(selectedAttendanceRecord.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
              <p><strong>Check-in:</strong> {selectedAttendanceRecord.checkIn?.time ? new Date(selectedAttendanceRecord.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</p>
              <p><strong>Check-out:</strong> {selectedAttendanceRecord.checkOut?.time ? new Date(selectedAttendanceRecord.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</p>
              <p><strong>Re-check-in:</strong> {selectedAttendanceRecord.reCheckIn?.time ? new Date(selectedAttendanceRecord.reCheckIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</p>
              <p><strong>Re-check-out:</strong> {selectedAttendanceRecord.reCheckOut?.time ? new Date(selectedAttendanceRecord.reCheckOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</p>
              <p><strong>Total Hours:</strong> {selectedAttendanceRecord.totalHours || 0}h</p>
              <p><strong>Status:</strong> {selectedAttendanceRecord.status}</p>
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="neutral" onClick={closeAttendanceDetails}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {leaveDetailsOpen && selectedLeaveRecord && (
        <div className="modal-overlay" onClick={() => setLeaveDetailsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Leave Details</h3>
              <button className="modal-close" onClick={() => setLeaveDetailsOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p><strong>Employee:</strong> {selectedLeaveRecord.employeeName || 'Unknown'} ({selectedLeaveRecord.employeeId || ''})</p>
              <p><strong>Type:</strong> {selectedLeaveRecord.leaveType}</p>
              <p><strong>From:</strong> {new Date(selectedLeaveRecord.fromDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
              <p><strong>To:</strong> {new Date(selectedLeaveRecord.toDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
              <p><strong>Days:</strong> {selectedLeaveRecord.totalDays}</p>
              <p><strong>Status:</strong> {selectedLeaveRecord.status}</p>
              {selectedLeaveRecord.reason && (
                <p><strong>Reason:</strong> {selectedLeaveRecord.reason}</p>
              )}
              {selectedLeaveRecord.rejectionReason && (
                <p><strong>Rejection Reason:</strong> {selectedLeaveRecord.rejectionReason}</p>
              )}
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="neutral" onClick={() => setLeaveDetailsOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
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
  );
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
      } else if (pwd.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else if (!/(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(pwd)) {
        newErrors.password = 'Password must include a number and a symbol';
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
      console.error('Error saving employee:', error);
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
                <option value="Operation">Operation</option>
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

export default AdminDashboard; 