import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { 
  FiEdit, 
  FiTrash2, 
  FiEye, 
  FiSearch, 
  FiDownload,
  FiUserPlus,
  FiUser
} from 'react-icons/fi';
import './EmployeeManagement.css';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/helpers';

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payrollInfo, setPayrollInfo] = useState({ loading: false, hasCurrentMonth: false, lastPayroll: null, count: 0 });
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    department: '',
    position: '',
    phone: '',
    dateOfBirth: '',
    salary: '',
    leaveBalance: 15
  });
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);

  const departments = [
    'IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Design', 'Management'
  ];

  const statuses = ['active', 'inactive', 'terminated', 'on_leave'];

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/employees?page=${currentPage}&limit=10&search=${searchTerm}&department=${filterDepartment}&status=${filterStatus}`);
      setEmployees(response.data.data.employees);
      setTotalPages(response.data.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterDepartment, filterStatus]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (autoGeneratePassword) {
        // Use admin secure endpoint (auto emails credentials)
        const payload = {
          fullName: formData.fullName,
          email: formData.email,
          department: formData.department,
          position: formData.position,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          salary: formData.salary,
          dateOfJoining: new Date().toISOString().slice(0,10)
        };
        
        console.log('Adding employee with payload:', payload);
        const response = await api.post('/admin/add-employee', payload);
        console.log('Employee added successfully:', response.data);
      } else {
        // Manual password path
        const payload = { ...formData };
        await api.post('/employees', payload);
      }
      toast.success('Employee added successfully!');
      setShowAddModal(false);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        department: '',
        position: '',
        phone: '',
        dateOfBirth: '',
        salary: '',
        leaveBalance: 15
      });
      setAutoGeneratePassword(true);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/employees/${selectedEmployee.id}`, formData);
      toast.success('Employee updated successfully!');
      setShowEditModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await api.delete(`/employees/${employeeId}`);
        toast.success('Employee deleted successfully!');
        fetchEmployees();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete employee');
      }
    }
  };

  const handleStatusChange = async (employeeId, newStatus) => {
    try {
      await api.patch(`/employees/${employeeId}/status`, { status: newStatus });
      toast.success('Employee status updated successfully!');
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update employee status');
    }
  };

  const handleResetPassword = async (employeeId) => {
    if (!window.confirm('Reset this employee\'s password and email new credentials?')) return;
    try {
      await api.post(`/admin/employees/${employeeId}/reset-password`);
      toast.success('Password reset. Email sent with new credentials.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
    // Load payroll summary for the employee
    (async () => {
      try {
        setPayrollInfo(prev => ({ ...prev, loading: true }));
        const resp = await api.get(`/payroll/${employee.id}?page=1&limit=12`);
        const payrolls = resp?.data?.data?.payrolls || [];
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const hasCurrentMonth = payrolls.some(p => Number(p.month) === currentMonth && Number(p.year) === currentYear);
        const lastPayroll = payrolls[0] || null; // API already sorts year desc, month desc
        setPayrollInfo({ loading: false, hasCurrentMonth, lastPayroll, count: payrolls.length });
      } catch (e) {
        setPayrollInfo({ loading: false, hasCurrentMonth: false, lastPayroll: null, count: 0 });
      }
    })();
  };

  const handleEditClick = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      fullName: employee.fullName,
      email: employee.email,
      password: '',
      department: employee.department,
      position: employee.position,
      phone: employee.phone,
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      salary: employee.salary,
      leaveBalance: employee.leaveBalance
    });
    setShowEditModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const downloadEmployeeReport = async () => {
    try {
      const response = await api.get('/reports/employees', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employee-report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Employee report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download employee report');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="employee-management">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Management</h1>
          <p className="page-subtitle">Manage employee information and records</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 12 }}>
          <Button variant="primary" onClick={() => setShowAddModal(true)} icon={<FiUserPlus />}>Add Employee</Button>
          <Button variant="secondary" onClick={downloadEmployeeReport} icon={<FiDownload />}>Download Report</Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-filter">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="filter-controls">
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="filter-select"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.employeeId}</td>
                <td>
                  <div className="employee-info">
                    <div className="employee-avatar">
                      {employee.profilePicture ? (
                        <img src={employee.profilePicture} alt={employee.fullName} />
                      ) : (
                        <FiUser />
                      )}
                    </div>
                    <div>
                      <div className="employee-name">{employee.fullName}</div>
                      <div className="employee-phone">{employee.phone}</div>
                    </div>
                  </div>
                </td>
                <td>{employee.department}</td>
                <td>{employee.position}</td>
                <td>{employee.email}</td>
                <td>
                  <span className={`badge badge-${employee.status === 'active' ? 'success' : employee.status === 'inactive' ? 'warning' : 'danger'}`}>
                    {employee.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button
                      variant="secondary"
                      onClick={() => handleViewEmployee(employee)}
                      icon={<FiEye />}
                      title="View"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => handleEditClick(employee)}
                      icon={<FiEdit />}
                    />
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteEmployee(employee.id)}
                      icon={<FiTrash2 />}
                    />
                    <Button
                      variant="accent"
                      onClick={() => handleResetPassword(employee.id)}
                    >
                      🔒
                    </Button>
                    <select
                      value={employee.status}
                      onChange={(e) => handleStatusChange(employee.id, e.target.value)}
                      className="status-select"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Button
            variant="secondary"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Employee</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddEmployee} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="form-input"
                      disabled={autoGeneratePassword}
                      placeholder={autoGeneratePassword ? 'Auto-generated' : 'Enter a password'}
                      required={!autoGeneratePassword}
                    />
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={autoGeneratePassword}
                        onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                      />
                      Auto-generate
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Salary</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', gap: 12 }}>
                <Button type="button" variant="neutral" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={actionLoading}>
                  {actionLoading ? 'Adding...' : (autoGeneratePassword ? 'Add & Email Credentials' : 'Add Employee')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Employee</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditEmployee} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Salary</label>
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', gap: 12 }}>
                <Button type="button" variant="neutral" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Update Employee</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h3>Employee Details</h3>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="employee-details">
                <div className="employee-header">
                  <div className="employee-avatar-large">
                    {selectedEmployee.profilePicture ? (
                      <img src={selectedEmployee.profilePicture} alt={selectedEmployee.fullName} />
                    ) : (
                      <FiUser />
                    )}
                  </div>
                  <div className="employee-info-large">
                    <h4>{selectedEmployee.fullName}</h4>
                    <p className="employee-id">{selectedEmployee.employeeId}</p>
                    <p className="employee-position">{selectedEmployee.position}</p>
                  </div>
                </div>
                
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedEmployee.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Department:</label>
                    <span>{selectedEmployee.department}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{selectedEmployee.phone}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date of Birth:</label>
                    <span>{new Date(selectedEmployee.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date of Joining:</label>
                    <span>{new Date(selectedEmployee.dateOfJoining).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Salary:</label>
                    <span>{formatCurrency(selectedEmployee.salary)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Leave Balance:</label>
                    <span>{selectedEmployee.leaveBalance} days</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={`badge badge-${selectedEmployee.status === 'active' ? 'success' : selectedEmployee.status === 'inactive' ? 'warning' : 'danger'}`}>
                      {selectedEmployee.status}
                    </span>
                  </div>
                  <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                    <label>Payroll Summary:</label>
                    {payrollInfo.loading ? (
                      <span>Loading...</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>
                          Current Month Generated: <strong>{payrollInfo.hasCurrentMonth ? 'Yes' : 'No'}</strong>
                        </span>
                        <span>
                          Total Payroll Records: <strong>{payrollInfo.count}</strong>
                        </span>
                        {payrollInfo.lastPayroll && (
                          <span>
                            Last Payroll: <strong>{payrollInfo.lastPayroll.month}/{payrollInfo.lastPayroll.year}</strong> • Net Pay: <strong>{formatCurrency(payrollInfo.lastPayroll.netPay)}</strong> • Status: <span className={`status-badge ${payrollInfo.lastPayroll.status}`}>{payrollInfo.lastPayroll.status}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => {
                setShowViewModal(false);
                handleEditClick(selectedEmployee);
              }}>
                Edit Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
