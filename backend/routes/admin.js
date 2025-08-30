const express = require('express');
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const { protect, authorize } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// @route   POST /api/admin/add-employee
// @desc    Add new employee (Admin only) with secure registration
// @access  Private (Admin)
router.post('/add-employee', protect, authorize('admin'), [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('department')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters'),
  body('position')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Position must be between 2 and 50 characters'),
  body('phone')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 characters'),
  body('salary')
    .isNumeric()
    .withMessage('Salary must be a number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { 
      fullName, 
      email, 
      password, 
      department, 
      position, 
      phone, 
      salary 
    } = req.body;

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    // Generate unique employee ID
    let employeeId;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      attempts++;
      const year = new Date().getFullYear();
      const suffix = Math.random().toString().slice(2, 6);
      employeeId = `IWIZ${year}${suffix}`;
      
      if (attempts > maxAttempts) {
        return res.status(500).json({ message: 'Failed to generate unique employee ID' });
      }
    } while (await Employee.findOne({ employeeId }));

    // Create employee
    const employee = new Employee({
      employeeId,
      fullName,
      email,
      password,
      department,
      position,
      phone,
      salary: Number(salary),
      role: 'employee'
    });

    await employee.save();

    res.status(201).json({
      success: true,
      message: 'Employee added successfully',
      data: {
        id: employee._id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        phone: employee.phone,
        salary: employee.salary,
        leaveBalance: employee.leaveBalance
      }
    });

  } catch (error) {
    console.error('Add employee error:', error);
    if (error && error.name === 'ValidationError') {
      const details = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation failed', errors: details });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or Employee ID already exists' });
    }
    res.status(500).json({ message: 'Server error while adding employee' });
  }
});

// @route   PUT /api/admin/employees/:employeeId/salary
// @desc    Update employee salary details (Admin only)
// @access  Private (Admin)
router.put('/employees/:employeeId/salary', protect, authorize('admin'), [
  body('salary')
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),
  body('salaryDetails.basic')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Basic salary must be a positive number'),
  body('salaryDetails.housing')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Housing allowance must be a positive number'),
  body('salaryDetails.transport')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Transport allowance must be a positive number'),
  body('salaryDetails.meal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Meal allowance must be a positive number'),
  body('salaryDetails.medical')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Medical allowance must be a positive number'),
  body('overtimeRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Overtime rate must be a positive number'),
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  body('insuranceRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Insurance rate must be between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { employeeId } = req.params;
    const { 
      salary, 
      salaryDetails, 
      overtimeRate, 
      taxRate, 
      insuranceRate 
    } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found'
      });
    }

    // Update salary information
    if (salary !== undefined) employee.salary = salary;
    if (salaryDetails) {
      Object.keys(salaryDetails).forEach(key => {
        if (salaryDetails[key] !== undefined) {
          employee.salaryDetails[key] = salaryDetails[key];
        }
      });
    }
    if (overtimeRate !== undefined) employee.overtimeRate = overtimeRate;
    if (taxRate !== undefined) employee.taxRate = taxRate;
    if (insuranceRate !== undefined) employee.insuranceRate = insuranceRate;

    await employee.save();

    res.json({
      success: true,
      message: 'Employee salary updated successfully',
      data: {
        employee: {
          id: employee._id,
          fullName: employee.fullName,
          salary: employee.salary,
          salaryDetails: employee.salaryDetails,
          overtimeRate: employee.overtimeRate,
          taxRate: employee.taxRate,
          insuranceRate: employee.insuranceRate
        }
      }
    });

  } catch (error) {
    console.error('Update employee salary error:', error);
    res.status(500).json({
      message: 'Server error while updating employee salary'
    });
  }
});

// @route   POST /api/admin/employees/:employeeId/reset-password
// @desc    Reset employee password (Admin only)
// @access  Private (Admin)
router.post('/employees/:employeeId/reset-password', protect, authorize('admin'), async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found'
      });
    }

    // Generate new temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    employee.password = tempPassword;
    employee.passwordResetRequired = true;
    await employee.save();

    // Email service removed for simplicity


    res.json({
      success: true,
      message: 'Employee password reset successfully.',
      data: {
        employee: {
          id: employee._id,
          fullName: employee.fullName,
          email: employee.email
        }
      }
    });

  } catch (error) {
    console.error('Reset employee password error:', error);
    res.status(500).json({
      message: 'Server error while resetting employee password'
    });
  }
});

// @route   GET /api/admin/employees/salary-summary
// @desc    Get salary summary for all employees (Admin only)
// @access  Private (Admin)
router.get('/employees/salary-summary', protect, authorize('admin'), async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'active' })
      .select('fullName employeeId department salary salaryDetails');

    const summary = {
      totalEmployees: employees.length,
      totalSalary: 0,
      averageSalary: 0,
      byDepartment: {}
    };

    employees.forEach(employee => {
      summary.totalSalary += employee.salary || 0;

      const dept = employee.department;
      if (!summary.byDepartment[dept]) {
        summary.byDepartment[dept] = {
          count: 0,
          totalSalary: 0,
          averageSalary: 0
        };
      }
      summary.byDepartment[dept].count++;
      summary.byDepartment[dept].totalSalary += employee.salary || 0;
    });

    // Calculate averages
    summary.averageSalary = summary.totalEmployees > 0 
      ? summary.totalSalary / summary.totalEmployees 
      : 0;

    Object.keys(summary.byDepartment).forEach(dept => {
      const deptData = summary.byDepartment[dept];
      deptData.averageSalary = deptData.count > 0 
        ? deptData.totalSalary / deptData.count 
        : 0;
    });

    res.json({
      success: true,
      data: { summary }
    });

  } catch (error) {
    console.error('Get salary summary error:', error);
    res.status(500).json({
      message: 'Server error while generating salary summary'
    });
  }
});

// @route   PATCH /api/admin/employees/:employeeId/status
// @desc    Update employee status (Admin only)
// @access  Private (Admin)
router.patch('/employees/:employeeId/status', protect, authorize('admin'), [
  body('status')
    .isIn(['active', 'inactive', 'terminated', 'on_leave'])
    .withMessage('Status must be active, inactive, terminated, or on_leave')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { employeeId } = req.params;
    const { status } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found'
      });
    }

    // Update status
    employee.status = status;
    employee.isActive = status === 'active';
    
    // If terminated, set termination date
    if (status === 'terminated') {
      employee.terminationDate = new Date();
    }

    await employee.save();

    res.json({
      success: true,
      message: 'Employee status updated successfully',
      data: {
        employee: {
          id: employee._id,
          fullName: employee.fullName,
          status: employee.status,
          isActive: employee.isActive
        }
      }
    });

  } catch (error) {
    console.error('Update employee status error:', error);
    res.status(500).json({
      message: 'Server error while updating employee status'
    });
  }
});

// Maintenance: Normalize legacy employee records
// @route   POST /api/admin/maintenance/activate-legacy
// @desc    Set status='active', isActive=true, and ensure dateOfJoining for legacy/inconsistent employees
// @access  Private (Admin)
router.post('/maintenance/activate-legacy', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    // Match employees that are inactive, missing status, or missing DoJ
    const filter = {
      $or: [
        { isActive: { $ne: true } },
        { status: { $ne: 'active' } },
        { dateOfJoining: { $exists: false } },
        { dateOfJoining: null }
      ]
    };

    const updates = {
      $set: {
        status: 'active',
        isActive: true
      }
    };

    // First pass: set status/isActive
    const result1 = await Employee.updateMany(filter, updates);

    // Second pass: fix missing dateOfJoining without overwriting valid dates
    const result2 = await Employee.updateMany(
      { $or: [ { dateOfJoining: { $exists: false } }, { dateOfJoining: null } ] },
      { $set: { dateOfJoining: now } }
    );

    res.json({
      success: true,
      message: 'Legacy employees normalized successfully',
      data: {
        statusUpdated: result1.modifiedCount || result1.nModified || 0,
        joiningDateFixed: result2.modifiedCount || result2.nModified || 0
      }
    });
  } catch (error) {
    console.error('Activate legacy employees error:', error);
    res.status(500).json({ message: 'Server error while normalizing legacy employees' });
  }
});

module.exports = router;
