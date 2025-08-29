import React, { useState, useEffect } from 'react';
import { FiDownload, FiCalendar, FiUsers, FiBarChart2, FiCheck, FiRefreshCw } from 'react-icons/fi';
import Button from '../components/common/Button';
import api from '../services/api';
import { toast } from 'react-toastify';
import { formatCurrency } from '../utils/helpers';
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
        // Fix month/year handling - ensure we get the correct month (1-12) and year
        const month = parseInt(selectedMonth.split('-')[1]); // Extract month from YYYY-MM format
        const year = parseInt(selectedYear);
        
        console.log('Fetching payroll data for month:', month, 'year:', year);
        
        const [payrollsRes, summaryRes] = await Promise.all([
          api.get(`/payroll/all?page=${currentPage}&limit=10&month=${month}&year=${year}`),
          api.get(`/payroll/reports/summary?month=${month}&year=${year}`)
        ]);
        
        console.log('Payrolls response:', payrollsRes.data);
        console.log('Summary response:', summaryRes.data);
        
        setPayrolls(payrollsRes.data?.data?.payrolls || []);
        setTotalPages(payrollsRes.data?.data?.pagination?.totalPages || 1);
        setSummary(summaryRes.data?.data?.summary || {});
        
        console.log('Summary data set:', summaryRes.data?.data?.summary);
      } else if (activeTab === 'generate') {
        // Fetch recent payrolls for reference
        const response = await api.get('/payroll/all?page=1&limit=5');
        setPayrolls(response.data?.data?.payrolls || []);
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      console.error('Error details:', error.response?.data);
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
      const month = parseInt(selectedMonth.split('-')[1]); // Extract month from YYYY-MM format
      const year = parseInt(selectedYear);
      
      console.log('Generating payroll for month:', month, 'year:', year);
      
      const response = await api.post('/payroll/generate', { month, year });
      
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
      const response = await api.get(`/payroll/${payrollId}/download`, {
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
      await api.put(`/payroll/${payrollId}/status`, { status });
      toast.success('Payroll status updated successfully');
      fetchPayrollData();
    } catch (error) {
      console.error('Error updating payroll status:', error);
      console.error('Error response:', error.response?.data);
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

      {/* Debug Section */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h4>Debug Info</h4>
        <p>Summary Data: {JSON.stringify(summary, null, 2)}</p>
        <Button 
          variant="secondary" 
          icon={<FiRefreshCw />}
          onClick={async () => {
            try {
              const response = await api.get('/payroll/debug');
              console.log('Debug response:', response.data);
              alert('Check console for debug info');
            } catch (error) {
              console.error('Debug error:', error);
              console.error('Debug error response:', error.response?.data);
              console.error('Debug error status:', error.response?.status);
              console.error('Debug error headers:', error.response?.headers);
              alert(`Debug failed (${error.response?.status || 'unknown'}) - check console`);
            }
          }}
        >
          Debug Payroll Data
        </Button>
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
                        <Button variant="secondary" onClick={() => downloadSalarySlip(payroll.id || payroll._id)} icon={<FiDownload />} />
                        <Button variant="primary" onClick={() => updatePayrollStatus(payroll.id || payroll._id, 'paid')} disabled={payroll.status === 'paid'} icon={<FiCheck />} />
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
            <Button
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </Button>
            <span>Page {currentPage} of {totalPages}</span>
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
          
          <Button
            className="generate-btn"
            onClick={generatePayroll}
            disabled={generating}
            variant="primary"
            icon={generating ? <FiRefreshCw className="spinning" /> : <FiCalendar />}
          >
            {generating ? 'Generating Payroll...' : `Generate Payroll for ${moment(selectedMonth).format('MMMM YYYY')}`}
          </Button>
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
