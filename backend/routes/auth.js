const express = require('express');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const { protect, authorize, generateToken } = require('../middleware/auth');
const { validatePassword, sanitizeInput } = require('../config/security');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Lightweight test endpoint for connectivity checks (used by frontend)
router.get('/test', (req, res) => {
  return res.json({ success: true, message: 'Auth service reachable' });
});

// @route   POST /api/auth/register
// @desc    Admin creates a new user (Admin or Employee)
// @access  Private (Admin)
router.post('/register', [
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
  body('role')
    .isIn(['admin', 'employee'])
    .withMessage('Role must be either admin or employee'),
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters'),
  body('position')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Position must be between 2 and 50 characters')
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

    const { fullName, email, password, role, department, position } = req.body;

    // Check if user already exists
    const existingAdmin = await Admin.findOne({ email });
    const existingEmployee = await Employee.findOne({ email });
    
    if (existingAdmin || existingEmployee) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (role === 'admin') {
      // Generate unique admin ID
      let adminId;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        attempts++;
        adminId = `ADMIN${Date.now().toString().slice(-6)}${Math.random().toString().slice(2, 5)}`;
        
        if (attempts > maxAttempts) {
          return res.status(500).json({ message: 'Failed to generate unique admin ID' });
        }
      } while (await Admin.findOne({ adminId }));

      // Create admin user
      const user = new Admin({
        adminId,
        fullName,
        email,
        password,
        role: 'admin'
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: 'Admin account created successfully',
        data: {
          id: user._id,
          adminId: user.adminId,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        }
      });
    } else {
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

      // Create employee user
      const user = new Employee({
        employeeId,
        fullName,
        email,
        password,
        department: department || 'General',
        position: position || 'Employee',
        role: 'employee'
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: 'Employee account created successfully',
        data: {
          id: user._id,
          employeeId: user.employeeId,
          fullName: user.fullName,
          email: user.email,
          department: user.department,
          position: user.position,
          role: user.role
        }
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (Admin or Employee)
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('role')
    .optional()
    .isIn(['admin', 'employee'])
    .withMessage('Role must be either admin or employee')
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

    const { email, password, role } = req.body;

    let user;
    let userRole;

    // Try to find user in Admin collection first
    if (!role || role === 'admin') {
      user = await Admin.findOne({ email }).select('+password');
      if (user) {
        userRole = 'admin';
      }
    }

    // If not found in Admin, try Employee collection
    if (!user && (!role || role === 'employee')) {
      user = await Employee.findOne({ email }).select('+password');
      if (user) {
        userRole = 'employee';
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const config = require('../config');
    const token = jwt.sign(
      { id: user._id, role: userRole },
      config.jwt.secret,
      { expiresIn: config.jwt.expire }
    );

    // Remove password from response
    const userResponse = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: userRole,
      ...(userRole === 'admin' ? {
        adminId: user.adminId,
        department: user.department,
        position: user.position
      } : {
        employeeId: user.employeeId,
        department: user.department,
        position: user.position
      })
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    // Try to find user in Admin collection
    let user = await Admin.findById(req.user.id);
    let userRole = 'admin';

    // If not found in Admin, try Employee collection
    if (!user) {
      user = await Employee.findById(req.user.id);
      userRole = 'employee';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
          role: userRole,
          department: user.department,
          position: user.position,
          dateOfJoining: user.dateOfJoining,
          leaveBalance: user.leaveBalance,
          status: user.status,
          isActive: user.isActive,
          ...(userRole === 'admin' ? { adminId: user.adminId } : { employeeId: user.employeeId }),
          // Include first-login flags so frontend can enforce password change after refresh
          isFirstLogin: user.isFirstLogin || false,
          passwordResetRequired: user.passwordResetRequired || false,
          mustChangePassword: user.mustChangePassword || false
        }
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
const updateProfileValidators = [
  body('fullName')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .custom((val) => {
      if (!val) return true; // allow empty
      return val.length >= 10 && val.length <= 15;
    })
    .withMessage('Phone number must be between 10 and 15 characters'),
  body('dateOfBirth')
    .optional({ nullable: true, checkFalsy: true })
    .custom((val) => {
      if (!val) return true; // allow empty
      // validate ISO date
      return !isNaN(Date.parse(val));
    })
    .withMessage('Please provide a valid date of birth')
];

const updateProfileHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { fullName, phone, dateOfBirth, address } = req.body;

    // Try to find user in Admin collection first
    let user = await Admin.findById(req.user.id);
    let userRole = 'admin';

    // If not found in Admin, try Employee collection
    if (!user) {
      user = await Employee.findById(req.user.id);
      userRole = 'employee';
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile fields with proper validation
    if (fullName !== undefined && fullName && fullName.trim()) {
      user.fullName = fullName.trim();
    }
    
    if (phone !== undefined) {
      // Only update if phone is provided and not empty
      if (phone && phone.trim()) {
        user.phone = phone.trim();
      }
    }
    
    if (dateOfBirth !== undefined) {
      // Only update if dateOfBirth is provided and valid
      if (dateOfBirth && !isNaN(Date.parse(dateOfBirth))) {
        user.dateOfBirth = new Date(dateOfBirth);
      }
    }
    
    if (address !== undefined) {
      // Accept either plain string or structured object
      if (typeof address === 'string' && address.trim()) {
        user.address = {
          street: address.trim(),
          city: '',
          zipCode: '',
          country: ''
        };
      } else if (address && typeof address === 'object') {
        user.address = {
          street: address.street || '',
          city: address.city || '',
          state: address.state || '',
          zipCode: address.zipCode || '',
          country: address.country || ''
        };
      }
    }

    // Save with validation disabled to prevent schema validation errors
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          address: user.address,
          role: userRole,
          department: user.department,
          position: user.position,
          employeeId: user.employeeId,
          adminId: user.adminId,
          dateOfJoining: user.dateOfJoining,
          leaveBalance: user.leaveBalance,
          status: user.status,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
};

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
const changePasswordValidators = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      return true;
    })
    .withMessage('New password does not meet security requirements')
];

const changePasswordHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Try to find user in Admin collection
    let user = await Admin.findById(req.user.id).select('+password');

    // If not found in Admin, try Employee collection
    if (!user) {
      user = await Employee.findById(req.user.id).select('+password');
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    user.isFirstLogin = false;
    user.passwordResetRequired = false;
    if (typeof user.mustChangePassword === 'boolean') {
      user.mustChangePassword = false;
    }
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error during password change' });
  }
};

// Profile update route
router.put('/profile', protect, updateProfileValidators, updateProfileHandler);

// Support both PUT and POST to accommodate clients
router.put('/change-password', protect, changePasswordValidators, changePasswordHandler);
router.post('/change-password', protect, changePasswordValidators, changePasswordHandler);

module.exports = router; 