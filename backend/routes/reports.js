const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { protect, authorize } = require('../middleware/auth');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const ReportGenerator = require('../utils/reportGenerator');

// Middleware to ensure only admins (or HR) can access reports
router.use(protect, authorize('admin', 'hr'));

// Generate Employee Report PDF
router.get('/employees', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const employees = await Employee.find({}).sort({ createdAt: -1 });
    const reportGen = new ReportGenerator();

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=employee-report.pdf');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Handle PDF errors
    doc.on('error', (error) => {
      console.error('PDF generation error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'PDF generation failed' });
      }
    });
    
    // Handle response errors
    res.on('error', (error) => {
      console.error('Response error during PDF generation:', error);
      doc.destroy();
    });

    // Create professional header
    reportGen.createHeader(doc, 'Employee Report', `Total Employees: ${employees.length}`);

    // Summary metrics
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(emp => emp.status === 'active').length;
    const departments = [...new Set(employees.map(emp => emp.department))].length;
    const avgLeaveBalance = employees.reduce((sum, emp) => sum + (emp.leaveBalance || 0), 0) / totalEmployees;

    const summaryMetrics = [
      { label: 'Total Employees', value: totalEmployees, color: reportGen.colors.primary },
      { label: 'Active Employees', value: activeEmployees, color: reportGen.colors.success },
      { label: 'Departments', value: departments, color: reportGen.colors.info },
      { label: 'Average Leave Balance', value: `${avgLeaveBalance.toFixed(1)} days`, color: reportGen.colors.warning }
    ];

    reportGen.createSummarySection(doc, 'Summary', summaryMetrics);

    // Employee table
    const tableHeaders = ['Name', 'Employee ID', 'Department', 'Position', 'Status', 'Leave Balance', 'Join Date'];
    const tableData = employees.map(emp => [
      emp.fullName || 'N/A',
      emp.employeeId || 'N/A',
      emp.department || 'N/A',
      emp.position || 'N/A',
      emp.status || 'N/A',
      `${emp.leaveBalance || 0} days`,
      reportGen.formatDate(emp.dateOfJoining)
    ]);

    const columnWidths = [120, 80, 100, 100, 60, 80, 80];
    reportGen.createTable(doc, tableHeaders, tableData, { columnWidths });

    // Create footer
    reportGen.createFooter(doc);

    // Finalize PDF
    doc.end();
    
    // Ensure response is properly closed
    res.on('finish', () => {
      console.log('PDF employee report generated successfully');
    });
    
    res.on('error', (error) => {
      console.error('PDF employee report error:', error);
    });
    
    // Handle stream end
    doc.on('end', () => {
      console.log('PDF employee report stream ended successfully');
    });
  } catch (error) {
    console.error('Error generating employee report:', error);
    res.status(500).json({ 
      message: 'Failed to generate employee report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Generate Attendance Report PDF
router.get('/attendance', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const attendanceRecords = await Attendance.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    const reportGen = new ReportGenerator();
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    // Sanitize filename to prevent issues
    const sanitizedStartDate = startDate.replace(/[^a-zA-Z0-9]/g, '-');
    const sanitizedEndDate = endDate.replace(/[^a-zA-Z0-9]/g, '-');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${sanitizedStartDate}-to-${sanitizedEndDate}.pdf`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Handle PDF errors
    doc.on('error', (error) => {
      console.error('PDF generation error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'PDF generation failed' });
      }
    });
    
    // Handle response errors
    res.on('error', (error) => {
      console.error('Response error during PDF generation:', error);
      doc.destroy();
    });

    // Create professional header
    reportGen.createHeader(doc, 'Attendance Report', `Period: ${startDate} to ${endDate}`);

    // Summary metrics
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
    const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
    const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const avgHoursPerDay = totalRecords > 0 ? totalHours / totalRecords : 0;

    const summaryMetrics = [
      { label: 'Total Records', value: totalRecords, color: reportGen.colors.primary },
      { label: 'Present', value: presentCount, color: reportGen.colors.success },
      { label: 'Absent', value: absentCount, color: reportGen.colors.danger },
      { label: 'Late', value: lateCount, color: reportGen.colors.warning },
      { label: 'Total Hours', value: `${totalHours.toFixed(2)}h`, color: reportGen.colors.info },
      { label: 'Average Hours/Day', value: `${avgHoursPerDay.toFixed(2)}h`, color: reportGen.colors.secondary }
    ];

    reportGen.createSummarySection(doc, 'Summary', summaryMetrics);

    // Attendance table
    const tableHeaders = ['Employee', 'Employee ID', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'];
    const tableData = attendanceRecords.map(record => [
      record.userId?.fullName || 'Unknown',
      record.userId?.employeeId || 'N/A',
      record.userId?.department || 'N/A',
      reportGen.formatDate(record.date),
      reportGen.formatTime(record.checkIn?.time),
      reportGen.formatTime(record.checkOut?.time),
      `${(record.totalHours || 0).toFixed(2)}h`,
      record.status || 'N/A'
    ]);

    const columnWidths = [100, 80, 80, 70, 70, 70, 50, 60];
    reportGen.createTable(doc, tableHeaders, tableData, { columnWidths });

    // Create footer
    reportGen.createFooter(doc);

    // Finalize PDF
    doc.end();
    
    // Ensure response is properly closed
    res.on('finish', () => {
      console.log('PDF attendance report generated successfully');
    });
    
    res.on('error', (error) => {
      console.error('PDF attendance report error:', error);
    });
    
    // Handle stream end
    doc.on('end', () => {
      console.log('PDF attendance report stream ended successfully');
    });
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ 
      message: 'Failed to generate attendance report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Generate Leave Report PDF
router.get('/leaves', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const leaves = await Leave.find({
      fromDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    const reportGen = new ReportGenerator();
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=leave-report-${startDate}-to-${endDate}.pdf`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    
    doc.pipe(res);

    // Handle PDF errors
    doc.on('error', (error) => {
      console.error('PDF generation error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'PDF generation failed' });
      }
    });
    
    // Handle response errors
    res.on('error', (error) => {
      console.error('Response error during PDF generation:', error);
      doc.destroy();
    });

    // Create professional header
    reportGen.createHeader(doc, 'Leave Report', `Period: ${startDate} to ${endDate}`);

    // Summary metrics
    const totalLeaves = leaves.length;
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
    const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
    const rejectedLeaves = leaves.filter(l => l.status === 'rejected').length;
    const totalDays = leaves.reduce((sum, l) => sum + (l.totalDays || 0), 0);
    const avgDaysPerLeave = totalLeaves > 0 ? totalDays / totalLeaves : 0;

    const summaryMetrics = [
      { label: 'Total Leave Requests', value: totalLeaves, color: reportGen.colors.primary },
      { label: 'Pending', value: pendingLeaves, color: reportGen.colors.warning },
      { label: 'Approved', value: approvedLeaves, color: reportGen.colors.success },
      { label: 'Rejected', value: rejectedLeaves, color: reportGen.colors.danger },
      { label: 'Total Days Requested', value: `${totalDays.toFixed(1)} days`, color: reportGen.colors.info },
      { label: 'Average Days/Leave', value: `${avgDaysPerLeave.toFixed(1)} days`, color: reportGen.colors.secondary }
    ];

    reportGen.createSummarySection(doc, 'Summary', summaryMetrics);

    // Leave table
    const tableHeaders = ['Employee', 'Employee ID', 'Department', 'Leave Type', 'From Date', 'To Date', 'Days', 'Status', 'Reason'];
    const tableData = leaves.map(leave => [
      leave.userId?.fullName || 'Unknown',
      leave.userId?.employeeId || 'N/A',
      leave.userId?.department || 'N/A',
      leave.leaveType || 'N/A',
      reportGen.formatDate(leave.fromDate),
      reportGen.formatDate(leave.toDate),
      `${leave.totalDays || 0} days`,
      leave.status || 'N/A',
      leave.reason || 'N/A'
    ]);

    const columnWidths = [90, 70, 70, 60, 70, 70, 50, 60, 100];
    reportGen.createTable(doc, tableHeaders, tableData, { columnWidths });

    // Create footer
    reportGen.createFooter(doc);

    doc.end();
    
    // Ensure response is properly closed
    res.on('finish', () => {
      console.log('PDF leave report generated successfully');
    });
    
    res.on('error', (error) => {
      console.error('PDF leave report error:', error);
    });
    
    // Handle stream end
    doc.on('end', () => {
      console.log('PDF leave report stream ended successfully');
    });
  } catch (error) {
    console.error('Error generating leave report:', error);
    res.status(500).json({ 
      message: 'Failed to generate leave report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Generate Performance Report PDF
router.get('/performance', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const attendanceRecords = await Attendance.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    const reportGen = new ReportGenerator();
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=performance-report-${startDate}-to-${endDate}.pdf`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    
    doc.pipe(res);

    // Handle PDF errors
    doc.on('error', (error) => {
      console.error('PDF generation error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'PDF generation failed' });
      }
    });
    
    // Handle response errors
    res.on('error', (error) => {
      console.error('Response error during PDF generation:', error);
      doc.destroy();
    });

    // Create professional header
    reportGen.createHeader(doc, 'Performance Report', `Period: ${startDate} to ${endDate}`);

    // Summary metrics
    const totalHours = attendanceRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const avgHoursPerDay = attendanceRecords.length > 0 ? totalHours / attendanceRecords.length : 0;
    const totalRecords = attendanceRecords.length;
    const uniqueEmployees = new Set(attendanceRecords.map(r => r.userId?._id?.toString())).size;
    const avgHoursPerEmployee = uniqueEmployees > 0 ? totalHours / uniqueEmployees : 0;

    const summaryMetrics = [
      { label: 'Total Records', value: totalRecords, color: reportGen.colors.primary },
      { label: 'Unique Employees', value: uniqueEmployees, color: reportGen.colors.info },
      { label: 'Total Hours Worked', value: `${totalHours.toFixed(2)}h`, color: reportGen.colors.success },
      { label: 'Average Hours/Day', value: `${avgHoursPerDay.toFixed(2)}h`, color: reportGen.colors.warning },
      { label: 'Average Hours/Employee', value: `${avgHoursPerEmployee.toFixed(2)}h`, color: reportGen.colors.secondary }
    ];

    reportGen.createSummarySection(doc, 'Performance Summary', summaryMetrics);

    // Employee performance table
    const employeeStats = {};
    attendanceRecords.forEach(record => {
      const eId = record.userId?._id;
      if (!employeeStats[eId]) {
        employeeStats[eId] = {
          name: record.userId?.fullName || 'Unknown',
          employeeId: record.userId?.employeeId || 'N/A',
          department: record.userId?.department || 'N/A',
          totalHours: 0,
          daysPresent: 0
        };
      }
      employeeStats[eId].totalHours += record.totalHours || 0;
      employeeStats[eId].daysPresent += 1;
    });

    const tableHeaders = ['Employee', 'Employee ID', 'Department', 'Days Present', 'Total Hours', 'Average Hours/Day', 'Performance Rating'];
    const tableData = Object.values(employeeStats).map(stats => {
      const avgHours = stats.daysPresent > 0 ? stats.totalHours / stats.daysPresent : 0;
      let rating = 'Good';
      if (avgHours >= 8) rating = 'Excellent';
      else if (avgHours >= 7) rating = 'Good';
      else if (avgHours >= 6) rating = 'Average';
      else rating = 'Below Average';
      
      return [
        stats.name,
        stats.employeeId,
        stats.department,
        stats.daysPresent,
        `${stats.totalHours.toFixed(2)}h`,
        `${avgHours.toFixed(2)}h`,
        rating
      ];
    });

    const columnWidths = [100, 80, 80, 70, 80, 90, 80];
    reportGen.createTable(doc, tableHeaders, tableData, { columnWidths });

    // Create footer
    reportGen.createFooter(doc);

    doc.end();
    
    // Ensure response is properly closed
    res.on('finish', () => {
      console.log('PDF performance report generated successfully');
    });
    
    res.on('error', (error) => {
      console.error('PDF performance report error:', error);
    });
    
    // Handle stream end
    doc.on('end', () => {
      console.log('PDF performance report stream ended successfully');
    });
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({ 
      message: 'Failed to generate performance report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// CSV Export Routes
router.get('/employees/csv', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const employees = await Employee.find({}).sort({ createdAt: -1 });
    const reportGen = new ReportGenerator();

    const headers = ['Name', 'Employee ID', 'Email', 'Department', 'Position', 'Phone', 'Status', 'Leave Balance', 'Date of Joining'];
    const data = employees.map(employee => [
      employee.fullName || 'N/A',
      employee.employeeId || 'N/A',
      employee.email || 'N/A',
      employee.department || 'N/A',
      employee.position || 'N/A',
      employee.phone || 'N/A',
      employee.status || 'N/A',
      employee.leaveBalance || 0,
      reportGen.formatDate(employee.dateOfJoining)
    ]);

    const csv = reportGen.generateCSV(headers, data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=employee-report.csv');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting employee CSV:', error);
    res.status(500).json({ 
      message: 'Failed to export employee CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/attendance/csv', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const attendanceRecords = await Attendance.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    const reportGen = new ReportGenerator();

    const headers = ['Employee Name', 'Employee ID', 'Department', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Status'];
    const data = attendanceRecords.map(record => [
      record.userId?.fullName || 'Unknown',
      record.userId?.employeeId || 'N/A',
      record.userId?.department || 'N/A',
      reportGen.formatDate(record.date),
      reportGen.formatTime(record.checkIn?.time),
      reportGen.formatTime(record.checkOut?.time),
      record.totalHours || 0,
      record.status || 'N/A'
    ]);

    const csv = reportGen.generateCSV(headers, data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${startDate}-to-${endDate}.csv`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting attendance CSV:', error);
    res.status(500).json({ 
      message: 'Failed to export attendance CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/leaves/csv', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const leaves = await Leave.find({
      fromDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    const reportGen = new ReportGenerator();

    const headers = ['Employee Name', 'Employee ID', 'Department', 'Leave Type', 'From Date', 'To Date', 'Total Days', 'Status', 'Reason'];
    const data = leaves.map(leave => [
      leave.userId?.fullName || 'Unknown',
      leave.userId?.employeeId || 'N/A',
      leave.userId?.department || 'N/A',
      leave.leaveType || 'N/A',
      reportGen.formatDate(leave.fromDate),
      reportGen.formatDate(leave.toDate),
      leave.totalDays || 0,
      leave.status || 'N/A',
      leave.reason || 'N/A'
    ]);

    const csv = reportGen.generateCSV(headers, data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leave-report-${startDate}-to-${endDate}.csv`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting leave CSV:', error);
    res.status(500).json({ 
      message: 'Failed to export leave CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

router.get('/performance/csv', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const attendanceRecords = await Attendance.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    const employeeStats = {};
    attendanceRecords.forEach(record => {
      const eId = record.userId?._id;
      if (!employeeStats[eId]) {
        employeeStats[eId] = {
          name: record.userId?.fullName || 'Unknown',
          employeeId: record.userId?.employeeId || 'N/A',
          department: record.userId?.department || 'N/A',
          totalHours: 0,
          daysPresent: 0
        };
      }
      employeeStats[eId].totalHours += record.totalHours || 0;
      employeeStats[eId].daysPresent += 1;
    });

    const reportGen = new ReportGenerator();

    const headers = ['Employee Name', 'Employee ID', 'Department', 'Days Present', 'Total Hours', 'Average Hours Per Day', 'Performance Rating'];
    const data = Object.values(employeeStats).map(stats => {
      const avgHours = stats.daysPresent > 0 ? stats.totalHours / stats.daysPresent : 0;
      let rating = 'Good';
      if (avgHours >= 8) rating = 'Excellent';
      else if (avgHours >= 7) rating = 'Good';
      else if (avgHours >= 6) rating = 'Average';
      else rating = 'Below Average';
      
      return [
        stats.name,
        stats.employeeId,
        stats.department,
        stats.daysPresent,
        stats.totalHours.toFixed(2),
        avgHours.toFixed(2),
        rating
      ];
    });

    const csv = reportGen.generateCSV(headers, data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=performance-report-${startDate}-to-${endDate}.csv`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting performance CSV:', error);
    res.status(500).json({ 
      message: 'Failed to export performance CSV',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
