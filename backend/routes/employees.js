const express = require('express');
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const crypto = require('crypto');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/employees
// @desc    Get all employees (Admin only)
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Get all employees request from admin:', req.user.id);
    
    const { page = 1, limit = 10, search, department, status } = req.query;
    
    // Build query
    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department) {
      query.department = department;
    }
    
    if (status) {
      query.status = status;
    }

    const employees = await Employee.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Employee.countDocuments(query);

    console.log(`Found ${employees.length} employees`);

    res.json({
      success: true,
      data: {
        employees: employees.map(emp => ({
          id: emp._id,
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          email: emp.email,
          department: emp.department,
          position: emp.position,
          status: emp.status,
          leaveBalance: emp.leaveBalance,
          dateOfJoining: emp.dateOfJoining,
          phone: emp.phone,
          isActive: emp.isActive
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error while fetching employees' });
  }
});

// @route   GET /api/employees/:id
// @desc    Get employee by ID (Admin only)
// @access  Private (Admin)
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Get employee by ID request:', req.params.id);
    
    const employee = await Employee.findById(req.params.id).select('-password');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    console.log('Employee found:', employee.fullName);

    res.json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          status: employee.status,
          leaveBalance: employee.leaveBalance,
          dateOfJoining: employee.dateOfJoining,
          phone: employee.phone,
          address: employee.address,
          emergencyContact: employee.emergencyContact,
          skills: employee.skills,
          certifications: employee.certifications,
          isActive: employee.isActive
        }
      }
    });

  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Server error while fetching employee' });
  }
});

// @route   POST /api/employees
// @desc    Create new employee (Admin only)
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), [
  body('fullName').trim().isLength({ min: 2, max: 50 }).withMessage('Full name must be between 2 and 50 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[0-9])(?=.*[^A-Za-z0-9]).+$/).withMessage('Password must include a number and symbol'),
  body('department').trim().isIn(['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Design', 'Management']).withMessage('Department must be IT, HR, Finance, Marketing, Sales, Operations, Design, or Management'),
  body('position').trim().notEmpty().withMessage('Position is required'),
  body('phone').optional().trim().notEmpty().withMessage('Phone number is required'),
  body('dateOfJoining').optional().isISO8601().withMessage('Invalid date format'),
  body('salary').optional().isNumeric().withMessage('Salary must be a number')
], async (req, res) => {
  try {
    console.log('Create employee request:', req.body);
    
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
      dateOfJoining,
      salary,
      address,
      emergencyContact
    } = req.body;

    // Check if email already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Ensure a password is set; if admin left it blank, auto-generate one
    const finalPassword = (password && password.trim().length > 0)
      ? password
      : crypto.randomBytes(8).toString('hex');

    // Generate employee ID
    const employeeId = await Employee.generateEmployeeId();

    // Create new employee
    const employee = new Employee({
      fullName,
      email,
      password: finalPassword,
      employeeId,
      department,
      position,
      phone,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
      salary,
      address,
      emergencyContact,
      leaveBalance: 20,
      status: 'active',
      mustChangePassword: true
    });

    await employee.save();

    console.log('Employee created successfully:', employee.fullName);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          status: employee.status,
          leaveBalance: employee.leaveBalance
        }
      }
    });

  } catch (error) {
    console.error('Create employee error:', error);
    if (error && error.name === 'ValidationError') {
      const details = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation failed', errors: details });
    }
    res.status(500).json({ message: 'Server error while creating employee' });
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee (Admin only)
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), [
  body('fullName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Full name must be between 2 and 50 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('department').optional().trim().notEmpty().withMessage('Department is required'),
  body('position').optional().trim().notEmpty().withMessage('Position is required'),
  body('status').optional().isIn(['active', 'inactive', 'on_leave', 'terminated']).withMessage('Invalid status'),
  body('leaveBalance').optional().isNumeric().withMessage('Leave balance must be a number')
], async (req, res) => {
  try {
    console.log('Update employee request:', req.params.id, req.body);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Never require password on update unless explicitly changing it
    const updateData = { ...req.body };
    if (updateData.password === '') delete updateData.password;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    console.log('Employee updated successfully:', updatedEmployee.fullName);

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: {
        employee: {
          id: updatedEmployee._id,
          employeeId: updatedEmployee.employeeId,
          fullName: updatedEmployee.fullName,
          email: updatedEmployee.email,
          department: updatedEmployee.department,
          position: updatedEmployee.position,
          status: updatedEmployee.status,
          leaveBalance: updatedEmployee.leaveBalance
        }
      }
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error while updating employee' });
  }
});

// @route   PATCH /api/employees/:id/status
// @desc    Update employee status (Admin only)
// @access  Private (Admin)
router.patch('/:id/status', protect, authorize('admin'), [
  body('status')
    .isIn(['active', 'inactive', 'on_leave', 'terminated'])
    .withMessage('Invalid status')
], async (req, res) => {
  try {
    console.log('Update employee status request:', req.params.id, req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { status } = req.body;
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.status = status;
    await employee.save();

    console.log('Employee status updated successfully:', employee.fullName, '->', status);

    res.json({
      success: true,
      message: 'Employee status updated successfully',
      data: {
        employee: {
          id: employee._id,
          fullName: employee.fullName,
          status: employee.status
        }
      }
    });

  } catch (error) {
    console.error('Update employee status error:', error);
    res.status(500).json({ message: 'Server error while updating employee status' });
  }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee completely (Admin only)
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Delete employee request:', req.params.id);
    
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Hard delete - remove employee completely
    // First, clean up related records
    console.log('Cleaning up related records for employee:', employee.fullName);
    
    // Delete attendance records
    const attendanceDeleted = await Attendance.deleteMany({ 
      userId: employee._id, 
      userType: 'employee' 
    });
    console.log(`Deleted ${attendanceDeleted.deletedCount} attendance records`);
    
    // Delete leave records
    const leavesDeleted = await Leave.deleteMany({ 
      userId: employee._id, 
      userType: 'employee' 
    });
    console.log(`Deleted ${leavesDeleted.deletedCount} leave records`);
    
    // Delete payroll records
    const Payroll = require('../models/Payroll');
    const payrollDeleted = await Payroll.deleteMany({ 
      employeeId: employee._id 
    });
    console.log(`Deleted ${payrollDeleted.deletedCount} payroll records`);
    
    // Finally, delete the employee
    await Employee.findByIdAndDelete(employee._id);

    console.log('Employee completely deleted:', employee.fullName);

    res.json({
      success: true,
      message: 'Employee deleted successfully',
      data: {
        deletedEmployee: employee.fullName,
        relatedRecordsDeleted: {
          attendance: attendanceDeleted.deletedCount,
          leaves: leavesDeleted.deletedCount,
          payroll: payrollDeleted.deletedCount
        }
      }
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error while deleting employee' });
  }
});

// @route   GET /api/employees/stats/overview
// @desc    Get employee statistics (Admin only)
// @access  Private (Admin)
router.get('/stats/overview', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Get employee stats request from admin:', req.user.id);
    
    const totalEmployees = await Employee.countDocuments({ isActive: true });
    const activeEmployees = await Employee.countDocuments({ isActive: true, status: 'active' });
    const onLeaveEmployees = await Employee.countDocuments({ isActive: true, status: 'on_leave' });
    const inactiveEmployees = await Employee.countDocuments({ isActive: true, status: 'inactive' });

    // Get today's attendance stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const presentToday = await Attendance.countDocuments({
      userType: 'employee',
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['present', 'late', 're-checked-in'] }
    });

    const lateToday = await Attendance.countDocuments({
      userType: 'employee',
      date: { $gte: today, $lt: tomorrow },
      isLate: true
    });

    // Get pending leave requests
    const pendingLeaves = await Leave.countDocuments({
      userType: 'employee',
      status: 'pending'
    });

    console.log('Employee stats retrieved successfully');

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        onLeaveEmployees,
        inactiveEmployees,
        presentToday,
        lateToday,
        pendingLeaves,
        attendanceRate: totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({ message: 'Server error while fetching employee statistics' });
  }
});

module.exports = router;
