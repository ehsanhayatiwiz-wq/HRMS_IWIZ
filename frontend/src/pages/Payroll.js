import React, { useState, useEffect } from 'react';
import { FiDownload, FiCalendar, FiUsers, FiBarChart2, FiCheck, FiRefreshCw } from 'react-icons/fi';

import api from '../services/api';
import { toast } from 'react-toastify';
import { formatCurrency } from '../utils/helpers';
// Using native Date methods instead of moment.js for better performance
import './Payroll.css';

const Payroll = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [payrolls, setPayrolls] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fetchInProgress, setFetchInProgress] = useState(false);

  // Helper function to safely parse month and year
  const parseMonthYear = (monthStr, yearStr) => {
    try {
      const month = parseInt(monthStr.split('-')[1]); // Extract month from YYYY-MM format
      const year = parseInt(yearStr);
      
      if (isNaN(month) || month < 1 || month > 12) {
        toast.info('Invalid month, using current month');
        return { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
      }
      
      if (isNaN(year) || year < 2020 || year > 2030) {
        toast.info('Invalid year, using current year');
        return { month, year: new Date().getFullYear() };
      }
      
      return { month, year };
    } catch (error) {
      // Error parsing month/year
      return { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
    }
  };

  const fetchPayrollData = async () => {
    if (fetchInProgress.current) {
      return;
    }

    try {
      fetchInProgress.current = true;
      setLoading(true);

      const month = selectedMonth;
      const year = selectedYear;

      if (!month || !year) {
        toast.error('Please select both month and year');
        return;
      }

      const [payrollsRes, summaryRes] = await Promise.all([
        api.get(`/payroll?month=${month}&year=${year}`),
        api.get(`/payroll/summary?month=${month}&year=${year}`)
      ]);

      setPayrolls(payrollsRes.data?.data?.payrolls || []);
      setSummary(summaryRes.data?.data?.summary || {});
      setTotalPages(payrollsRes.data?.data?.pagination?.totalPages || 1);
    } catch (error) {
      // Error fetching payroll data
      toast.error('Failed to load payroll data');
      setPayrolls([]);
      setSummary({});
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [activeTab, selectedMonth, selectedYear, currentPage]);

  const handleGeneratePayroll = async () => {
    try {
      setGenerating(true);
      
      const month = selectedMonth;
      const year = selectedYear;

      if (!month || !year) {
        toast.error('Please select both month and year');
        return;
      }

      await api.post('/payroll/generate', { month, year });
      toast.success('Payroll generated successfully');
      fetchPayrollData();
    } catch (error) {
      // Error generating payroll
      toast.error(error.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadSalarySlip = async (payrollId) => {
    try {
      const response = await api.get(`/payroll/${payrollId}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `salary-slip-${payrollId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Salary slip downloaded successfully');
    } catch (error) {
      // Error downloading salary slip
      toast.error('Failed to download salary slip');
    }
  };

  const handleUpdateStatus = async (payrollId, status) => {
    try {
      await api.put(`/payroll/${payrollId}/status`, { status });
      toast.success('Payroll status updated successfully');
      fetchPayrollData();
    } catch (error) {
      // Error updating payroll status
      toast.error('Failed to update payroll status');
    }
  };

  const renderOverview = () => (
    <div className="payroll-overview">
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">
            <FiUsers />
          </div>
          <div className="card-content">
            <h3>{summary.employeesActive || summary.totalEmployees || 0}</h3>
            <p>Total Employees</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">Rs</div>
          <div className="card-content">
            <h3>{formatCurrency(summary.totalNetPay || 0)}</h3>
            <p>Total Net Pay</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">Rs</div>
          <div className="card-content">
            <h3>{formatCurrency(summary.totalAllowances || 0)}</h3>
            <p>Total Allowances</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">Rs</div>
          <div className="card-content">
            <h3>{formatCurrency(summary.totalDeductions || 0)}</h3>
            <p>Total Deductions</p>
          </div>
        </div>
      </div>



      {/* Department Breakdown */}
      {summary.byDepartment && Object.keys(summary.byDepartment).length > 0 && (
        <div className="department-breakdown">
          <h3>Department Breakdown</h3>
          <div className="department-grid">
            {Object.entries(summary.byDepartment).map(([dept, data]) => (
              <div key={dept} className="department-card">
                <h4>{dept}</h4>
                <p>Employees: {data.count}</p>
                <p>Total Pay: {formatCurrency(data.totalNetPay || 0)}</p>
                <p>Average: {formatCurrency((data.totalNetPay / data.count) || 0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payroll List */}
      <div className="payroll-list">
        <div className="list-header">
          <h3>Recent Payrolls</h3>
          <div className="header-actions" style={{ display: 'flex', gap: 12 }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="month-select"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date(2024, i, 1);
                return (
                  <option key={i + 1} value={date.toISOString().slice(0, 7)}>
                    {date.toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                );
              })}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="year-select"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading payroll data...</div>
        ) : (
          <div className="payroll-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Month/Year</th>
                  <th>Basic Salary</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((payroll) => (
                  <tr key={payroll.id || payroll._id}>
                    <td>
                      <div className="employee-info">
                        <div className="employee-name">{payroll.employeeId?.fullName || payroll.employeeName || payroll.employeeId || 'Unknown'}</div>
                      </div>
                    </td>
                    <td>{payroll.month}/{payroll.year}</td>
                    <td>{formatCurrency(payroll.basicSalary)}</td>
                    <td>{formatCurrency(payroll.totalAllowances)}</td>
                    <td>{formatCurrency(payroll.totalDeductions)}</td>
                    <td className="net-pay">{formatCurrency(payroll.netPay)}</td>
                    <td>
                      <span className={`status-badge ${payroll.status}`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons" style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn-secondary" onClick={() => handleDownloadSalarySlip(payroll.id || payroll._id)}>
                  <FiDownload />
                </button>
                <button className="btn-primary" onClick={() => handleUpdateStatus(payroll.id || payroll._id, 'paid')} disabled={payroll.status === 'paid'}>
                  <FiCheck />
                </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              className="btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              className="btn-secondary"
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

  const renderGenerate = () => (
    <div className="payroll-generate">
      <div className="generate-section">
        <h3>Generate Monthly Payroll</h3>
        <p>Generate payroll for all active employees for the selected month.</p>
        
        <div className="generate-form">
          <div className="form-group">
            <label>Select Month and Year:</label>
            <div className="date-inputs">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="month-select"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date(2024, i, 1);
                  return (
                    <option key={i + 1} value={date.toISOString().slice(0, 7)}>
                      {date.toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  );
                })}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="year-select"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          
          <button
            className="btn-primary generate-btn"
            onClick={handleGeneratePayroll}
            disabled={generating}
          >
            {generating ? <FiRefreshCw className="spinning" /> : <FiCalendar />}
            {generating ? 'Generating Payroll...' : `Generate Payroll for ${new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
          </button>
        </div>
      </div>

      {/* Recent Payrolls */}
      <div className="recent-payrolls">
        <h3>Recent Payrolls</h3>
        <div className="payroll-table">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Month/Year</th>
                <th>Net Pay</th>
                <th>Status</th>
                <th>Generated</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((payroll) => (
                <tr key={payroll.id || payroll._id}>
                  <td>{payroll.employeeId?.fullName || payroll.employeeName || payroll.employeeId || 'Unknown'}</td>
                  <td>{payroll.month}/{payroll.year}</td>
                  <td className="net-pay">{formatCurrency(payroll.netPay)}</td>
                  <td>
                    <span className={`status-badge ${payroll.status}`}>
                      {payroll.status}
                    </span>
                  </td>
                  <td>{new Date(payroll.generatedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="payroll-page">
      <div className="page-header">
        <div>
          <h2>Payroll Management</h2>
          <p>Manage employee payroll, generate salary slips, and track payments</p>
        </div>
        <button
          className="btn-secondary"
          onClick={fetchPayrollData}
          disabled={loading || fetchInProgress}
        >
          <FiRefreshCw />
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div className="payroll-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FiBarChart2 />
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          <FiCalendar />
          Generate Payroll
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'generate' && renderGenerate()}
      </div>
    </div>
  );
};

export default Payroll;
