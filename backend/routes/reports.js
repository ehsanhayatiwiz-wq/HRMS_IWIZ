const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { protect, authorize } = require('../middleware/auth');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

// Middleware to ensure only admins (or HR) can access reports
router.use(protect, authorize('admin', 'hr'));

// Generate Employee Report PDF
router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find({}).sort({ createdAt: -1 });

    const doc = new PDFDocument();
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

    doc.fontSize(24).text('Employee Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).text('Employee Details', { underline: true });
    doc.moveDown();

    employees.forEach((employee, index) => {
      doc.fontSize(10).text(`${index + 1}. ${employee.fullName}`, { continued: true });
      doc.text(` - ${employee.employeeId}`, { continued: true });
      doc.text(` - ${employee.department}`, { continued: true });
      doc.text(` - ${employee.position}`, { continued: true });
      doc.text(` - ${employee.status}`, { continued: true });
      doc.text(` - ${employee.leaveBalance} days leave`, { align: 'right' });
      doc.moveDown(0.5);
    });

    // Finalize PDF
    doc.end();
    
    // Ensure response is properly closed
    res.on('finish', () => {
      console.log('PDF report generated successfully');
    });
    
    res.on('error', (error) => {
      console.error('PDF report error:', error);
    });
    
    // Handle stream end
    doc.on('end', () => {
      console.log('PDF stream ended successfully');
    });
  } catch (error) {
    console.error('Error generating employee report:', error);
    res.status(500).json({ message: 'Failed to generate employee report' });
  }
});

// Generate Attendance Report PDF
router.get('/attendance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const attendanceRecords = await Attendance.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    // Sanitize filename to prevent issues
    const sanitizedStartDate = startDate.replace(/[^a-zA-Z0-9]/g, '-');
    const sanitizedEndDate = endDate.replace(/[^a-zA-Z0-9]/g, '-');
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

    // Header with brand bar, optional logo, and title
    doc.rect(doc.page.margins.left, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 28)
      .fill('#4A90E2');
    const fs = require('fs');
    const path = require('path');
    const logoPath = path.join(__dirname, '../public/logo.png');
    let x = doc.page.margins.left + 12;
    try {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, x, doc.y - 20, { width: 24, height: 24 });
        x += 32;
      }
    } catch (_) {}
    doc.fill('#FFFFFF').fontSize(14).text('IWIZ HRMS Attendance Report', x, doc.y - 22, { align: 'left' });
    doc.moveDown(2);
    doc.fill('#2C3E50');
    doc.fontSize(11).text(`Period: ${startDate} to ${endDate}`);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`);
    doc.moveDown(1.5);

    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
    const lateCount = attendanceRecords.filter(r => r.status === 'late').length;

    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Total Records: ${totalRecords}`);
    doc.fontSize(10).text(`Present: ${presentCount}`);
    doc.fontSize(10).text(`Absent: ${absentCount}`);
    doc.fontSize(10).text(`Late: ${lateCount}`);
    doc.moveDown(2);

    // Table header
    const tableTop = doc.y;
    const col = [doc.page.margins.left, 170, 260, 360, 430, 500];
    const drawRow = (y, row, isHeader = false) => {
      const fill = isHeader ? '#F4F6F8' : '#FFFFFF';
      doc.rect(doc.page.margins.left, y - 12, doc.page.width - doc.page.margins.left - doc.page.margins.right, 24).fill(fill).stroke('#E5E7EB');
      doc.fill('#2C3E50').font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
      doc.text(row[0], col[0] + 8, y - 8, { width: col[1] - col[0] - 16 });
      doc.text(row[1], col[1] + 8, y - 8, { width: col[2] - col[1] - 16 });
      doc.text(row[2], col[2] + 8, y - 8, { width: col[3] - col[2] - 16 });
      doc.text(row[3], col[3] + 8, y - 8, { width: col[4] - col[3] - 16 });
      doc.text(row[4], col[4] + 8, y - 8, { width: col[5] - col[4] - 16 });
    };
    drawRow(tableTop + 14, ['Employee', 'Emp ID', 'Department', 'Date', 'Hours'], true);

    let y = tableTop + 42;
    attendanceRecords.forEach((record) => {
      if (y > doc.page.height - doc.page.margins.bottom - 24) {
        doc.addPage();
        drawRow(doc.y + 14, ['Employee', 'Emp ID', 'Department', 'Date', 'Hours'], true);
        y = doc.y + 42;
      }
      drawRow(y, [
        record.userId?.fullName || 'Unknown',
        record.userId?.employeeId || 'N/A',
        record.userId?.department || 'N/A',
        new Date(record.date).toLocaleDateString(),
        `${(record.totalHours || 0).toFixed(2)}h`
      ]);
      y += 26;
    });

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
      console.log('PDF attendance stream ended successfully');
    });
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ message: 'Failed to generate attendance report' });
  }
});

// Generate Leave Report PDF
router.get('/leaves', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const leaves = await Leave.find({
      fromDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=leave-report-${startDate}-to-${endDate}.pdf`);
    doc.pipe(res);

    doc.fontSize(24).text('Leave Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    const totalLeaves = leaves.length;
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
    const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
    const rejectedLeaves = leaves.filter(l => l.status === 'rejected').length;

    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Total Leave Requests: ${totalLeaves}`);
    doc.fontSize(10).text(`Pending: ${pendingLeaves}`);
    doc.fontSize(10).text(`Approved: ${approvedLeaves}`);
    doc.fontSize(10).text(`Rejected: ${rejectedLeaves}`);
    doc.moveDown(2);

    doc.fontSize(14).text('Leave Details', { underline: true });
    doc.moveDown();

    leaves.forEach((leave, index) => {
      doc.fontSize(10).text(`${index + 1}. ${leave.userId?.fullName || 'Unknown'}`, { continued: true });
      doc.text(` - ${leave.userId?.employeeId || 'N/A'}`, { continued: true });
      doc.text(` - ${leave.leaveType}`, { continued: true });
      doc.text(` - ${leave.fromDate.toLocaleDateString()} to ${leave.toDate.toLocaleDateString()}`, { continued: true });
      doc.text(` - ${leave.totalDays} days`, { continued: true });
      doc.text(` - ${leave.status}`, { align: 'right' });
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error('Error generating leave report:', error);
    res.status(500).json({ message: 'Failed to generate leave report' });
  }
});

// Generate Performance Report PDF
router.get('/performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const attendanceRecords = await Attendance.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=performance-report-${startDate}-to-${endDate}.pdf`);
    doc.pipe(res);

    doc.fontSize(24).text('Performance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    const totalHours = attendanceRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0);
    const avgHoursPerDay = totalHours / attendanceRecords.length || 0;
    const totalRecords = attendanceRecords.length;

    doc.fontSize(14).text('Performance Summary', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Total Attendance Records: ${totalRecords}`);
    doc.fontSize(10).text(`Total Hours Worked: ${totalHours.toFixed(2)}h`);
    doc.fontSize(10).text(`Average Hours Per Day: ${avgHoursPerDay.toFixed(2)}h`);
    doc.moveDown(2);

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

    Object.values(employeeStats).forEach((stats, index) => {
      doc.fontSize(10).text(`${index + 1}. ${stats.name}`, { continued: true });
      doc.text(` - ${stats.employeeId}`, { continued: true });
      doc.text(` - ${stats.department}`, { continued: true });
      doc.text(` - ${stats.daysPresent} days`, { continued: true });
      doc.text(` - ${stats.totalHours.toFixed(2)}h total`, { align: 'right' });
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({ message: 'Failed to generate performance report' });
  }
});

// CSV Export Routes
router.get('/employees/csv', async (req, res) => {
  try {
    const employees = await Employee.find({}).sort({ createdAt: -1 });

    let csv = 'Name,Employee ID,Email,Department,Position,Phone,Status,Leave Balance,Date of Joining\n';
    employees.forEach(employee => {
      csv += `"${employee.fullName}","${employee.employeeId}","${employee.email}","${employee.department}","${employee.position}","${employee.phone}","${employee.status}","${employee.leaveBalance}","${employee.dateOfJoining.toLocaleDateString()}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=employee-report.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting employee CSV:', error);
    res.status(500).json({ message: 'Failed to export employee CSV' });
  }
});

router.get('/attendance/csv', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const attendanceRecords = await Attendance.find({
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    let csv = 'Employee Name,Employee ID,Department,Date,Check In,Check Out,Total Hours,Status\n';
    attendanceRecords.forEach(record => {
      csv += `"${record.userId?.fullName || 'Unknown'}","${record.userId?.employeeId || 'N/A'}","${record.userId?.department || 'N/A'}","${record.date.toLocaleDateString()}","${record.checkIn?.time ? record.checkIn.time.toLocaleTimeString() : '-'}","${record.checkOut?.time ? record.checkOut.time.toLocaleTimeString() : '-'}","${record.totalHours || 0}","${record.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${startDate}-to-${endDate}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting attendance CSV:', error);
    res.status(500).json({ message: 'Failed to export attendance CSV' });
  }
});

router.get('/leaves/csv', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const leaves = await Leave.find({
      fromDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('userId', 'fullName employeeId department');

    let csv = 'Employee Name,Employee ID,Department,Leave Type,From Date,To Date,Total Days,Status,Reason\n';
    leaves.forEach(leave => {
      csv += `"${leave.userId?.fullName || 'Unknown'}","${leave.userId?.employeeId || 'N/A'}","${leave.userId?.department || 'N/A'}","${leave.leaveType}","${leave.fromDate.toLocaleDateString()}","${leave.toDate.toLocaleDateString()}","${leave.totalDays}","${leave.status}","${leave.reason}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leave-report-${startDate}-to-${endDate}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting leave CSV:', error);
    res.status(500).json({ message: 'Failed to export leave CSV' });
  }
});

router.get('/performance/csv', async (req, res) => {
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

    let csv = 'Employee Name,Employee ID,Department,Days Present,Total Hours,Average Hours Per Day\n';
    Object.values(employeeStats).forEach(stats => {
      const avgHours = stats.daysPresent > 0 ? stats.totalHours / stats.daysPresent : 0;
      csv += `"${stats.name}","${stats.employeeId}","${stats.department}","${stats.daysPresent}","${stats.totalHours.toFixed(2)}","${avgHours.toFixed(2)}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=performance-report-${startDate}-to-${endDate}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting performance CSV:', error);
    res.status(500).json({ message: 'Failed to export performance CSV' });
  }
});

module.exports = router;
