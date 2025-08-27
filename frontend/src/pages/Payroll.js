import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiDownload, FiCalendar, FiUsers, FiBarChart2, FiCheck, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';
import './Payroll.css';

const Payroll = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [payrolls, setPayrolls] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [generating, setGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'overview') {
        const [payrollsRes, summaryRes] = await Promise.all([
          axios.get(`/api/payroll/all?page=${currentPage}&limit=10&month=${moment(selectedMonth).month() + 1}&year=${selectedYear}`),
          axios.get(`/api/payroll/reports/summary?month=${moment(selectedMonth).month() + 1}&year=${selectedYear}`)
        ]);
        
        setPayrolls(payrollsRes.data.data.payrolls);
        setTotalPages(payrollsRes.data.data.pagination.totalPages);
        setSummary(summaryRes.data.data.summary);
      } else if (activeTab === 'generate') {
        // Fetch recent payrolls for reference
        const response = await axios.get('/api/payroll/all?page=1&limit=5');
        setPayrolls(response.data.data.payrolls);
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [activeTab, selectedMonth, selectedYear, currentPage]);

  const generatePayroll = async () => {
    try {
      setGenerating(true);
      const month = moment(selectedMonth).month() + 1;
      const year = parseInt(selectedYear);
      
      const response = await axios.post('/api/payroll/generate', { month, year });
      
      toast.success(response.data.message);
      fetchPayrollData();
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast.error(error.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const downloadSalarySlip = async (payrollId) => {
    try {
      const response = await axios.get(`/api/payroll/${payrollId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `salary_slip_${payrollId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Salary slip downloaded successfully');
    } catch (error) {
      console.error('Error downloading salary slip:', error);
      toast.error('Failed to download salary slip');
    }
  };

  const updatePayrollStatus = async (payrollId, status) => {
    try {
      await axios.put(`/api/payroll/${payrollId}/status`, { status });
      toast.success('Payroll status updated successfully');
      fetchPayrollData();
    } catch (error) {
      console.error('Error updating payroll status:', error);
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
            <h3>{summary.totalEmployees || 0}</h3>
            <p>Total Employees</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">
            <FiDollarSign />
          </div>
          <div className="card-content">
            <h3>${(summary.totalNetPay || 0).toLocaleString()}</h3>
            <p>Total Net Pay</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">
            <FiBarChart2 />
          </div>
          <div className="card-content">
            <h3>${(summary.totalAllowances || 0).toLocaleString()}</h3>
            <p>Total Allowances</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">
            <FiDollarSign />
          </div>
          <div className="card-content">
            <h3>${(summary.totalDeductions || 0).toLocaleString()}</h3>
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
                <p>Total Pay: ${data.totalNetPay?.toLocaleString() || 0}</p>
                <p>Average: ${(data.totalNetPay / data.count)?.toFixed(2) || 0}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payroll List */}
      <div className="payroll-list">
        <div className="list-header">
          <h3>Recent Payrolls</h3>
          <div className="header-actions">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="month-select"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={moment().month(i).format('YYYY-MM')}>
                  {moment().month(i).format('MMMM')}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="year-select"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = moment().year() - 2 + i;
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
                  <tr key={payroll._id}>
                    <td>
                      <div className="employee-info">
                        <div className="employee-name">{payroll.employeeId?.fullName}</div>
                        <div className="employee-id">{payroll.employeeId?.employeeId}</div>
                      </div>
                    </td>
                    <td>{payroll.month}/{payroll.year}</td>
                    <td>${payroll.basicSalary?.toFixed(2)}</td>
                    <td>${payroll.totalAllowances?.toFixed(2)}</td>
                    <td>${payroll.totalDeductions?.toFixed(2)}</td>
                    <td className="net-pay">${payroll.netPay?.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${payroll.status}`}>
                        {payroll.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-info btn-sm"
                          onClick={() => downloadSalarySlip(payroll._id)}
                          title="Download Salary Slip"
                        >
                          <FiDownload />
                        </button>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => updatePayrollStatus(payroll._id, 'paid')}
                          disabled={payroll.status === 'paid'}
                          title="Mark as Paid"
                        >
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
          <div className="pagination">
            <button
              className="btn btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
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
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={moment().month(i).format('YYYY-MM')}>
                    {moment().month(i).format('MMMM')}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="year-select"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = moment().year() - 2 + i;
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
            className="btn btn-primary generate-btn"
            onClick={generatePayroll}
            disabled={generating}
          >
            {generating ? (
              <>
                <FiRefreshCw className="spinning" />
                Generating Payroll...
              </>
            ) : (
              <>
                <FiCalendar />
                Generate Payroll for {moment(selectedMonth).format('MMMM YYYY')}
              </>
            )}
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
                <tr key={payroll._id}>
                  <td>{payroll.employeeId?.fullName}</td>
                  <td>{payroll.month}/{payroll.year}</td>
                  <td className="net-pay">${payroll.netPay?.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${payroll.status}`}>
                      {payroll.status}
                    </span>
                  </td>
                  <td>{moment(payroll.generatedAt).format('MMM DD, YYYY')}</td>
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
        <h2>Payroll Management</h2>
        <p>Manage employee payroll, generate salary slips, and track payments</p>
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
