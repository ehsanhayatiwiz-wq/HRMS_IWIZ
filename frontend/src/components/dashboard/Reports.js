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
      color: 'primary',
      endpoint: '/reports/attendance',
      csvEndpoint: '/reports/attendance/csv'
    },
    {
      id: 'leave',
      title: 'Leave Summary',
      description: 'Leave usage and balance report',
      icon: <FiFileText />,
      color: 'success',
      endpoint: '/reports/leaves',
      csvEndpoint: '/reports/leaves/csv'
    },
    {
      id: 'employee',
      title: 'Employee Report',
      description: 'Complete employee information and statistics',
      icon: <FiUsers />,
      color: 'info',
      endpoint: '/reports/employees',
      csvEndpoint: '/reports/employees/csv'
    },
    {
      id: 'performance',
      title: 'Performance Trends',
      description: 'Employee performance analysis and trends',
      icon: <FiBarChart2 />,
      color: 'warning',
      endpoint: '/reports/performance',
      csvEndpoint: '/reports/performance/csv'
    }
  ];

  const handleGenerateReport = async (type) => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setLoading(true);
    
    try {
      const endpoint = reportTypes.find(r => r.id === type)?.endpoint;
      if (!endpoint) {
        toast.error('Invalid report type');
        return;
      }

      const response = await api.get(endpoint, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${reportTypes.find(r => r.id === type)?.title} generated successfully!`);
    } catch (error) {
      // Error generating report
      toast.error('Failed to generate report');
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
      const endpoint = reportTypes.find(r => r.id === type)?.csvEndpoint;
      if (!endpoint) {
        toast.error('Invalid report type');
        return;
      }

      const response = await api.get(endpoint, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          format: 'csv'
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${reportTypes.find(r => r.id === type)?.title} exported successfully!`);
    } catch (error) {
      // Error exporting CSV
      toast.error('Failed to export CSV');
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
