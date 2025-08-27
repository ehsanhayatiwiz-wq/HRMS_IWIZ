const express = require('express');
const { body, validationResult } = require('express-validator');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const { protect, authorize } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// @route   POST /api/payroll/generate
// @desc    Generate monthly payroll for all employees (Admin only)
// @access  Private (Admin)
router.post('/generate', protect, authorize('admin'), [
  body('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1 and 12'),
  body('year')
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Year must be between 2020 and 2030')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { month, year } = req.body;

    // Check if payroll already exists for this month
    const existingPayrolls = await Payroll.find({ month, year });
    if (existingPayrolls.length > 0) {
      return res.status(400).json({
        message: `Payroll for ${month}/${year} has already been generated`
      });
    }

    // Generate payroll for all active employees
    const payrolls = await Payroll.generateMonthlyPayroll(month, year, req.user.id);

    res.json({
      success: true,
      message: `Payroll generated successfully for ${payrolls.length} employees`,
      data: {
        generatedCount: payrolls.length,
        month,
        year
      }
    });

  } catch (error) {
    console.error('Payroll generation error:', error);
    res.status(500).json({
      message: 'Server error during payroll generation',
      error: error.message
    });
  }
});

// @route   GET /api/payroll/all
// @desc    Get all payroll records (Admin only)
// @access  Private (Admin)
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, month, year, status } = req.query;
    
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const payrolls = await Payroll.find(filter)
      .populate('employeeId', 'fullName email employeeId department')
      .populate('generatedBy', 'fullName adminId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Payroll.countDocuments(filter);

    res.json({
      success: true,
      data: {
        payrolls,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({
      message: 'Server error while fetching payrolls'
    });
  }
});

// @route   GET /api/payroll/:employeeId
// @desc    Get payroll records for specific employee (Employee can only see their own)
// @access  Private
router.get('/:employeeId', protect, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { page = 1, limit = 12 } = req.query;

    // Check if user is requesting their own payroll or is admin
    if (req.userRole === 'employee' && req.user._id.toString() !== employeeId) {
      return res.status(403).json({
        message: 'You can only view your own payroll records'
      });
    }

    const payrolls = await Payroll.find({ employeeId })
      .populate('employeeId', 'fullName email employeeId department')
      .populate('generatedBy', 'fullName adminId')
      .sort({ year: -1, month: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Payroll.countDocuments({ employeeId });

    res.json({
      success: true,
      data: {
        payrolls,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get employee payroll error:', error);
    res.status(500).json({
      message: 'Server error while fetching payroll records'
    });
  }
});

// @route   GET /api/payroll/:payrollId/download
// @desc    Download salary slip as PDF (Employee can only download their own)
// @access  Private
router.get('/:payrollId/download', protect, async (req, res) => {
  try {
    const { payrollId } = req.params;

    const payroll = await Payroll.findById(payrollId)
      .populate('employeeId', 'fullName email employeeId department position')
      .populate('generatedBy', 'fullName adminId');

    if (!payroll) {
      return res.status(404).json({
        message: 'Payroll record not found'
      });
    }

    // Check if user is requesting their own payroll or is admin
    if (req.userRole === 'employee' && req.user._id.toString() !== payroll.employeeId._id.toString()) {
      return res.status(403).json({
        message: 'You can only download your own salary slip'
      });
    }

    // Generate PDF
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=salary_slip_${payroll.employeeId.employeeId}_${payroll.month}_${payroll.year}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('SALARY SLIP', { align: 'center' });
    doc.moveDown();
    
    // Employee Information
    doc.fontSize(14).text('Employee Information');
    doc.fontSize(12).text(`Name: ${payroll.employeeId.fullName}`);
    doc.fontSize(12).text(`Employee ID: ${payroll.employeeId.employeeId}`);
    doc.fontSize(12).text(`Department: ${payroll.employeeId.department}`);
    doc.fontSize(12).text(`Position: ${payroll.employeeId.position}`);
    doc.fontSize(12).text(`Month: ${payroll.month}/${payroll.year}`);
    doc.moveDown();

    // Salary Breakdown
    doc.fontSize(14).text('Salary Breakdown');
    doc.fontSize(12).text(`Basic Salary: $${payroll.basicSalary.toFixed(2)}`);
    doc.moveDown();

    // Allowances
    doc.fontSize(12).text('Allowances:');
    doc.fontSize(10).text(`  Housing: $${payroll.allowances.housing.toFixed(2)}`);
    doc.fontSize(10).text(`  Transport: $${payroll.allowances.transport.toFixed(2)}`);
    doc.fontSize(10).text(`  Meal: $${payroll.allowances.meal.toFixed(2)}`);
    doc.fontSize(10).text(`  Medical: $${payroll.allowances.medical.toFixed(2)}`);
    doc.fontSize(10).text(`  Other: $${payroll.allowances.other.toFixed(2)}`);
    doc.fontSize(12).text(`Total Allowances: $${payroll.totalAllowances.toFixed(2)}`);
    doc.moveDown();

    // Overtime
    if (payroll.overtime.amount > 0) {
      doc.fontSize(12).text(`Overtime (${payroll.overtime.hours} hours): $${payroll.overtime.amount.toFixed(2)}`);
      doc.moveDown();
    }

    // Deductions
    doc.fontSize(12).text('Deductions:');
    doc.fontSize(10).text(`  Absent Days: $${payroll.deductions.absent.toFixed(2)}`);
    doc.fontSize(10).text(`  Half Days: $${payroll.deductions.halfDay.toFixed(2)}`);
    doc.fontSize(10).text(`  Tax: $${payroll.deductions.tax.toFixed(2)}`);
    doc.fontSize(10).text(`  Insurance: $${payroll.deductions.insurance.toFixed(2)}`);
    doc.fontSize(10).text(`  Other: $${payroll.deductions.other.toFixed(2)}`);
    doc.fontSize(12).text(`Total Deductions: $${payroll.totalDeductions.toFixed(2)}`);
    doc.moveDown();

    // Net Pay
    doc.fontSize(16).text(`Net Pay: $${payroll.netPay.toFixed(2)}`, { align: 'right' });
    doc.moveDown();

    // Attendance Summary
    doc.fontSize(14).text('Attendance Summary');
    doc.fontSize(12).text(`Total Days: ${payroll.attendanceData.totalDays}`);
    doc.fontSize(12).text(`Present Days: ${payroll.attendanceData.presentDays}`);
    doc.fontSize(12).text(`Absent Days: ${payroll.attendanceData.absentDays}`);
    doc.fontSize(12).text(`Half Days: ${payroll.attendanceData.halfDays}`);
    doc.fontSize(12).text(`Overtime Hours: ${payroll.attendanceData.overtimeHours}`);
    doc.moveDown();

    // Footer
    doc.fontSize(10).text(`Generated on: ${new Date(payroll.generatedAt).toLocaleDateString()}`);
    doc.fontSize(10).text(`Generated by: ${payroll.generatedBy.fullName}`);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Download salary slip error:', error);
    res.status(500).json({
      message: 'Server error while generating salary slip'
    });
  }
});

// @route   PUT /api/payroll/:payrollId/status
// @desc    Update payroll status (Admin only)
// @access  Private (Admin)
router.put('/:payrollId/status', protect, authorize('admin'), [
  body('status')
    .isIn(['draft', 'generated', 'paid'])
    .withMessage('Status must be draft, generated, or paid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { payrollId } = req.params;
    const { status } = req.body;

    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({
        message: 'Payroll record not found'
      });
    }

    payroll.status = status;
    if (status === 'paid') {
      payroll.paidAt = new Date();
    }

    await payroll.save();

    res.json({
      success: true,
      message: 'Payroll status updated successfully',
      data: { payroll }
    });

  } catch (error) {
    console.error('Update payroll status error:', error);
    res.status(500).json({
      message: 'Server error while updating payroll status'
    });
  }
});

// @route   GET /api/payroll/reports/summary
// @desc    Get payroll summary report (Admin only)
// @access  Private (Admin)
router.get('/reports/summary', protect, authorize('admin'), async (req, res) => {
  try {
    const { month, year } = req.query;

    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const payrolls = await Payroll.find(filter)
      .populate('employeeId', 'fullName department');

    const summary = {
      totalEmployees: payrolls.length,
      totalBasicSalary: 0,
      totalAllowances: 0,
      totalOvertime: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      byDepartment: {}
    };

    payrolls.forEach(payroll => {
      summary.totalBasicSalary += payroll.basicSalary;
      summary.totalAllowances += payroll.totalAllowances;
      summary.totalOvertime += payroll.overtime.amount;
      summary.totalDeductions += payroll.totalDeductions;
      summary.totalNetPay += payroll.netPay;

      const dept = payroll.employeeId.department;
      if (!summary.byDepartment[dept]) {
        summary.byDepartment[dept] = {
          count: 0,
          totalNetPay: 0
        };
      }
      summary.byDepartment[dept].count++;
      summary.byDepartment[dept].totalNetPay += payroll.netPay;
    });

    res.json({
      success: true,
      data: { summary }
    });

  } catch (error) {
    console.error('Payroll summary error:', error);
    res.status(500).json({
      message: 'Server error while generating summary'
    });
  }
});

module.exports = router;
