import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { FiDownload, FiFileText, FiBarChart2, FiUsers, FiCalendar } from 'react-icons/fi';
import './Reports.css';
import Button from '../common/Button';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  // Removed unused reportType state to satisfy eslint
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const reportTypes = [
    {
      id: 'attendance',
      title: 'Attendance Report',
      description: 'Monthly attendance summary for all employees',
      icon: <FiCalendar />,
      color: 'primary'
    },
    {
      id: 'leave',
      title: 'Leave Summary',
      description: 'Leave usage and balance report',
      icon: <FiFileText />,
      color: 'success'
    },
    {
      id: 'employee',
      title: 'Employee Report',
      description: 'Complete employee information and statistics',
      icon: <FiUsers />,
      color: 'info'
    },
    {
      id: 'performance',
      title: 'Performance Trends',
      description: 'Employee performance analysis and trends',
      icon: <FiBarChart2 />,
      color: 'warning'
    }
  ];

  const handleGenerateReport = async (type) => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      let filename = '';

      switch (type) {
        case 'attendance':
          endpoint = `/reports/attendance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          filename = `attendance-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;
          break;
        case 'leave':
          endpoint = `/reports/leaves?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          filename = `leave-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;
          break;
        case 'employee':
          endpoint = `/reports/employees`;
          filename = `employee-report-${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'performance':
          endpoint = `/reports/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          filename = `performance-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`;
          break;
        default:
          throw new Error('Invalid report type');
      }

      const response = await api.get(endpoint, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${reportTypes.find(r => r.id === type)?.title} generated successfully!`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (type) => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      let filename = '';

      switch (type) {
        case 'attendance':
          endpoint = `/reports/attendance/csv?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          filename = `attendance-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
          break;
        case 'leave':
          endpoint = `/reports/leaves/csv?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          filename = `leave-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
          break;
        case 'employee':
          endpoint = `/reports/employees/csv`;
          filename = `employee-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'performance':
          endpoint = `/reports/performance/csv?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          filename = `performance-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
          break;
        default:
          throw new Error('Invalid report type');
      }

      const response = await api.get(endpoint, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${reportTypes.find(r => r.id === type)?.title} exported as CSV successfully!`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-component">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Generate comprehensive reports and export data</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="date-range-section">
        <h3>Select Date Range</h3>
        <div className="date-inputs">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="reports-grid">
        {reportTypes.map((report) => (
          <div key={report.id} className={`report-card report-card-${report.color}`}>
            <div className="report-card-header">
              <div className={`report-icon report-icon-${report.color}`}>
                {report.icon}
              </div>
              <h4 className="report-title">{report.title}</h4>
            </div>
            
            <p className="report-description">{report.description}</p>
            
            <div className="report-actions" style={{ display: 'flex', gap: 12 }}>
              <Button
                variant={report.id === 'performance' ? 'accent' : 'primary'}
                onClick={() => handleGenerateReport(report.id)}
                disabled={loading || (report.id !== 'employee' && (!dateRange.startDate || !dateRange.endDate))}
                icon={<FiDownload />}
              >
                Download PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleExportCSV(report.id)}
                disabled={loading || (report.id !== 'employee' && (!dateRange.startDate || !dateRange.endDate))}
                icon={<FiDownload />}
              >
                Export CSV
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats section removed to avoid static placeholders */}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Generating report...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
