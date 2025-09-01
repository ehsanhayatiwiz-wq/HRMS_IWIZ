const express = require('express');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const { protect, authorize, generateToken } = require('../middleware/auth');
const { validatePassword, sanitizeInput } = require('../config/security');

const router = express.Router();

// Lightweight test endpoint for connectivity checks (used by frontend)
router.get('/test', (req, res) => {
  return res.json({ success: true, message: 'Auth service reachable' });
});

// @route   POST /api/auth/register
// @desc    Admin creates a new user (Admin or Employee)
// @access  Private (Admin)
router.post('/register', protect, authorize('admin'), [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .custom((value) => {
      const validation = validatePassword(value);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
      return true;
    })
    .withMessage('Password does not meet security requirements'),
  body('role')
    .isIn(['admin', 'employee'])
    .withMessage('Role must be either admin or employee'),
  body('department')
    .isIn(['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Design', 'Management'])
    .withMessage('Please select a valid department'),
  body('position')
    .trim()
    .notEmpty()
    .withMessage('Position is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
], async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { 
      fullName, 
      email, 
      password, 
      role,
      department, 
      position, 
      phone, 
      dateOfBirth, 
      address 
    } = req.body;

    // Sanitize inputs
    const sanitizedData = {
      fullName: sanitizeInput(fullName),
      email: sanitizeInput(email),
      password,
      role: sanitizeInput(role),
      department: sanitizeInput(department),
      position: sanitizeInput(position),
      phone: sanitizeInput(phone),
      dateOfBirth,
      address: address ? {
        street: sanitizeInput(address.street),
        city: sanitizeInput(address.city),
        state: sanitizeInput(address.state),
        zipCode: sanitizeInput(address.zipCode),
        country: sanitizeInput(address.country)
      } : undefined
    };

    console.log('Parsed registration data:', { fullName, email, role, department, position });

    // Check if user already exists in either collection
    const existingAdmin = await Admin.findOne({ email });
    const existingEmployee = await Employee.findOne({ email });
    
    if (existingAdmin || existingEmployee) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    let user;
    let token;

    if (role === 'admin') {
      // Create admin
      try {
        // Generate a unique adminId, retrying a few times in case of race conditions
        let attempts = 0;
        let created = null;
        while (attempts < 5 && !created) {
          attempts += 1;
          console.log('Generating admin ID (attempt %d)...', attempts);
          const adminId = await Admin.generateAdminId();

          // Quick existence check to minimize duplicate key errors
          const exists = await Admin.exists({ adminId });
          if (exists) {
            console.warn('Admin ID already exists pre-check:', adminId);
            continue;
          }

          console.log('Creating admin with ID:', adminId);
          try {
                    created = await Admin.create({
          fullName: sanitizedData.fullName,
          email: sanitizedData.email,
          password: sanitizedData.password,
          adminId,
          department: sanitizedData.department,
          position: sanitizedData.position,
          phone: sanitizedData.phone,
          dateOfBirth: sanitizedData.dateOfBirth,
          address: sanitizedData.address
        });
          } catch (createErr) {
            if (createErr && createErr.code === 11000) {
              console.warn('Duplicate adminId on create, retrying...');
              continue;
            }
            throw createErr;
          }
        }

        if (!created) {
          return res.status(500).json({ message: 'Failed to allocate a unique admin identifier. Please try again.' });
        }
        user = created;
        
        console.log('Admin created successfully:', user.adminId);
        
        token = generateToken(user._id, 'admin');
        console.log('Token generated for admin');
        
        res.status(201).json({
          success: true,
          message: 'Admin registered successfully',
          data: {
            user: {
              id: user._id,
              fullName: user.fullName,
              email: user.email,
              adminId: user.adminId,
              role: 'admin',
              department: user.department,
              position: user.position
            },
            token
          }
        });
      } catch (error) {
        console.error('Admin creation error:', error);
        
        // Handle duplicate key errors (email or adminId)
        if (error && (error.code === 11000 || error.name === 'MongoServerError')) {
          const dupField = Object.keys(error.keyPattern || {})[0] || 'field';
          const message = dupField === 'email' 
            ? 'User with this email already exists'
            : 'Duplicate admin identifier. Please try again.';
          return res.status(400).json({ message });
        }

        // Handle validation errors from Mongoose
        if (error && error.name === 'ValidationError') {
          const details = Object.values(error.errors).map(e => e.message);
          return res.status(400).json({ message: 'Validation failed', errors: details });
        }

        // Fallback
        return res.status(500).json({ message: 'Server error during admin registration', details: error.message });
      }
    } else {
      // Create employee
      const employeeId = await Employee.generateEmployeeId();
      user = await Employee.create({
        fullName: sanitizedData.fullName,
        email: sanitizedData.email,
        password: sanitizedData.password,
        employeeId,
        department: sanitizedData.department,
        position: sanitizedData.position,
        phone: sanitizedData.phone,
        dateOfBirth: sanitizedData.dateOfBirth,
        address: sanitizedData.address
      });
      
      token = generateToken(user._id, 'employee');
      
      console.log('Employee created successfully:', user.employeeId);
      
      res.status(201).json({
        success: true,
        message: 'Employee registered successfully',
        data: {
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            employeeId: user.employeeId,
            role: 'employee',
            department: user.department,
            position: user.position
          },
          token
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
    if (process.env.NODE_ENV !== 'production') {
      const masked = { ...req.body, password: req.body?.password ? '********' : undefined };
      console.log('[AUTH] Login request payload:', masked);
    }
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password, role } = req.body;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH] Login attempt for:', { email, role });
    }

    let user;
    let userRole;

    // Try to find user in Admin collection first
    if (!role || role === 'admin') {
      user = await Admin.findOne({ email }).select('+password');
      if (user) {
        userRole = 'admin';
        console.log('Found admin user');
      }
    }

    // If not found in Admin, try Employee collection
    if (!user && (!role || role === 'employee')) {
      user = await Employee.findOne({ email }).select('+password');
      if (user) {
        userRole = 'employee';
        console.log('Found employee user');
      }
    }

    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[AUTH] User not found for email=${email}`);
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[AUTH] Invalid password for user=${email}`);
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    let token;
    try {
      token = generateToken(user._id, userRole);
    } catch (err) {
      console.error('[AUTH] JWT error:', err?.message || err);
      return res.status(500).json({ success: false, message: 'JWT error while signing token' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH] Login successful for user:', { email, role: userRole });
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: userRole,
          department: user.department,
          position: user.position,
          isFirstLogin: user.isFirstLogin || false,
          passwordResetRequired: user.passwordResetRequired || false,
          mustChangePassword: user.mustChangePassword || false,
          ...(userRole === 'admin' ? { adminId: user.adminId } : { employeeId: user.employeeId })
        },
        token
      }
    });

  } catch (error) {
    console.error('[AUTH] Login error:', error?.message || error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    console.log('Get current user request for ID:', req.user.id);
    
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

    console.log('Current user found:', userRole);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: userRole,
          department: user.department,
          position: user.position,
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

    // Try to find user in Admin collection
    let user = await Admin.findById(req.user.id);

    // If not found in Admin, try Employee collection
    if (!user) {
      user = await Employee.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile fields
    if (fullName !== undefined) user.fullName = fullName || '';
    if (phone !== undefined) {
      // Only update if phone is not empty (since it's required)
      if (phone && phone.trim()) {
        user.phone = phone.trim();
      }
    }
    if (dateOfBirth !== undefined) {
      // Only update if dateOfBirth is provided (since it's required)
      if (dateOfBirth) {
        user.dateOfBirth = new Date(dateOfBirth);
      }
    }
    if (address !== undefined) {
      // Accept either plain string or structured object
      if (typeof address === 'string') {
        user.address = {
          street: address,
          city: '',
          zipCode: '',
          country: ''
        };
      } else {
        user.address = address;
      }
    }

    await user.save();

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
          address: user.address
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