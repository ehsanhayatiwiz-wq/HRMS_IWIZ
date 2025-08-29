const express = require('express');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    console.log('Get profile request for user:', req.user.id);
    
    // Try to find user in Admin collection first
    let user = await Admin.findById(req.user.id);
    let userType = 'admin';

    // If not found in Admin, try Employee collection
    if (!user) {
      user = await Employee.findById(req.user.id);
      userType = 'employee';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Profile found for user type:', userType);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: userType,
          department: user.department,
          position: user.position,
          phone: user.phone,
          address: user.address,
          dateOfBirth: user.dateOfBirth,
          dateOfJoining: user.dateOfJoining,
          salary: user.salary,
          profilePicture: user.profilePicture,
          emergencyContact: user.emergencyContact,
          ...(userType === 'admin' ? { adminId: user.adminId } : { employeeId: user.employeeId, leaveBalance: user.leaveBalance })
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('address.street')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('address.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('address.state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('address.zipCode')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Zip code is required'),
  body('address.country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Emergency contact name is required'),
  body('emergencyContact.relationship')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Emergency contact relationship is required'),
  body('emergencyContact.phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Emergency contact phone is required')
], async (req, res) => {
  try {
    console.log('Update profile request for user:', req.user.id);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    // Try to find user in Admin collection first
    let user = await Admin.findById(req.user.id);
    let userType = 'admin';

    // If not found in Admin, try Employee collection
    if (!user) {
      user = await Employee.findById(req.user.id);
      userType = 'employee';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user profile
    const updatedUser = await (userType === 'admin' ? Admin : Employee).findByIdAndUpdate(
      req.user.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    console.log('Profile updated successfully for user type:', userType);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: userType,
          department: updatedUser.department,
          position: updatedUser.position,
          phone: updatedUser.phone,
          address: updatedUser.address,
          dateOfBirth: updatedUser.dateOfBirth,
          dateOfJoining: updatedUser.dateOfJoining,
          salary: updatedUser.salary,
          profilePicture: updatedUser.profilePicture,
          emergencyContact: updatedUser.emergencyContact,
          ...(userType === 'admin' ? { adminId: updatedUser.adminId } : { employeeId: updatedUser.employeeId, leaveBalance: updatedUser.leaveBalance })
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// @route   GET /api/users/all
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/all', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      department, 
      role, 
      search,
      isActive 
    } = req.query;

    let query = {};

    // Apply filters
    if (department) query.department = department;
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    // Get users from both Admin and Employee collections
    const [adminUsers, employeeUsers] = await Promise.all([
      Admin.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Employee.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
    ]);

    const users = [
      ...adminUsers.map(user => ({ ...user.toObject(), role: 'admin' })),
      ...employeeUsers.map(user => ({ ...user.toObject(), role: 'employee' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const [adminTotal, employeeTotal] = await Promise.all([
      Admin.countDocuments(query),
      Employee.countDocuments(query)
    ]);
    const total = adminTotal + employeeTotal;

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          employeeId: user.employeeId || user.adminId,
          role: user.role,
          department: user.department,
          position: user.position,
          phone: user.phone,
          dateOfJoining: user.dateOfJoining,
          salary: user.salary,
          leaveBalance: user.leaveBalance || 0,
          isActive: user.isActive,
          profilePicture: user.profilePicture
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
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
// @access  Private (Admin)
router.get('/:id', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    // Try to find user in Admin collection first, then Employee
    let user = await Admin.findById(req.params.id).select('-password');
    if (!user) {
      user = await Employee.findById(req.params.id).select('-password');
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (Admin only)
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin', 'hr'), [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
  body('department')
    .optional()
    .isIn(['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Design'])
    .withMessage('Please select a valid department'),
  body('position')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Position is required'),
  body('salary')
    .optional()
    .isNumeric()
    .withMessage('Salary must be a number'),
  body('leaveBalance')
    .optional()
    .isNumeric()
    .withMessage('Leave balance must be a number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
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
      department,
      position,
      salary,
      leaveBalance,
      isActive
    } = req.body;

    // Try to find user in Admin collection first, then Employee
    let user = await Admin.findById(req.params.id);
    let userType = 'admin';
    if (!user) {
      user = await Employee.findById(req.params.id);
      userType = 'employee';
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (fullName) user.fullName = fullName;
    if (department) user.department = department;
    if (position) user.position = position;
    if (salary !== undefined) user.salary = salary;
    if (leaveBalance !== undefined && userType === 'employee') user.leaveBalance = leaveBalance;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          employeeId: user.employeeId || user.adminId,
          role: user.role,
          department: user.department,
          position: user.position,
          phone: user.phone,
          dateOfJoining: user.dateOfJoining,
          salary: user.salary,
          leaveBalance: user.leaveBalance,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error during user update' });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const [adminTotal, employeeTotal] = await Promise.all([
      Admin.countDocuments(),
      Employee.countDocuments()
    ]);
    const totalUsers = adminTotal + employeeTotal;
    
    const [adminActive, employeeActive] = await Promise.all([
      Admin.countDocuments({ isActive: true }),
      Employee.countDocuments({ isActive: true })
    ]);
    const activeUsers = adminActive + employeeActive;
    const inactiveUsers = totalUsers - activeUsers;

    // Department-wise user count
    const [adminDeptStats, employeeDeptStats] = await Promise.all([
      Admin.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    // Combine department stats
    const departmentStats = {};
    [...adminDeptStats, ...employeeDeptStats].forEach(stat => {
      departmentStats[stat._id] = (departmentStats[stat._id] || 0) + stat.count;
    });

    // Role-wise user count
    const roleStats = [
      { _id: 'admin', count: adminTotal },
      { _id: 'employee', count: employeeTotal }
    ];

    // Recent hires (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [adminRecent, employeeRecent] = await Promise.all([
      Admin.countDocuments({ dateOfJoining: { $gte: thirtyDaysAgo } }),
      Employee.countDocuments({ dateOfJoining: { $gte: thirtyDaysAgo } })
    ]);
    const recentHires = adminRecent + employeeRecent;

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        departmentStats: Object.entries(departmentStats).map(([dept, count]) => ({ _id: dept, count })),
        roleStats,
        recentHires
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 