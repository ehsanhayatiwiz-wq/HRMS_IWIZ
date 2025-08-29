const express = require('express');
const { body, validationResult } = require('express-validator');
const Leave = require('../models/Leave');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/leaves/request
// @desc    Request a leave
// @access  Private
router.post('/request', protect, [
  body('leaveType')
    .isIn(['sick', 'casual', 'annual', 'maternity', 'paternity', 'bereavement', 'other'])
    .withMessage('Please select a valid leave type'),
  body('fromDate')
    .notEmpty()
    .withMessage('Please provide a from date'),
  body('toDate')
    .notEmpty()
    .withMessage('Please provide a to date'),
  body('reason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),
  body('isHalfDay')
    .optional()
    .isBoolean()
    .withMessage('isHalfDay must be a boolean'),
  body('halfDayType')
    .optional()
    .isIn(['morning', 'afternoon'])
    .withMessage('Half day type must be morning or afternoon')
], async (req, res) => {
  try {
    console.log('Leave request received:', req.body);
    console.log('User ID:', req.user.id);
    console.log('User Role:', req.userRole);
    
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
      leaveType, 
      fromDate, 
      toDate, 
      reason, 
      isHalfDay = false, 
      halfDayType 
    } = req.body;

    console.log('Parsed request data:', { leaveType, fromDate, toDate, reason, isHalfDay, halfDayType });

    const userId = req.user.id;
    const userType = req.userRole;

    // Validate dates - handle different date formats
    let fromDateObj, toDateObj;
    
    try {
      fromDateObj = new Date(fromDate);
      toDateObj = new Date(toDate);
      
      // Check if dates are valid
      if (isNaN(fromDateObj.getTime())) {
        return res.status(400).json({ message: 'Invalid from date format' });
      }
      if (isNaN(toDateObj.getTime())) {
        return res.status(400).json({ message: 'Invalid to date format' });
      }
    } catch (error) {
      console.error('Date parsing error:', error);
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('Date validation:', { fromDateObj, toDateObj, today });

    if (fromDateObj < today) {
      return res.status(400).json({ message: 'From date cannot be in the past' });
    }

    if (toDateObj < fromDateObj) {
      return res.status(400).json({ message: 'To date cannot be before from date' });
    }

    // Check for overlapping leaves
    console.log('Checking for overlapping leaves...');
    const hasOverlap = await Leave.checkLeaveOverlap(userId, fromDateObj, toDateObj);
    console.log('Overlap check result:', hasOverlap);
    
    if (hasOverlap) {
      return res.status(400).json({ message: 'Leave request overlaps with existing approved or pending leaves' });
    }

    // Calculate total days
    const timeDiff = toDateObj.getTime() - fromDateObj.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    const totalDays = isHalfDay ? 0.5 : dayDiff;

    console.log('Calculated total days:', totalDays);

    // Create leave request
    const leaveRequest = new Leave({
      userId,
      userType,
      leaveType,
      fromDate: fromDateObj,
      toDate: toDateObj,
      totalDays,
      reason,
      isHalfDay,
      halfDayType,
      status: 'pending'
    });

    await leaveRequest.save();

    console.log('Leave request saved successfully');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: {
        id: leaveRequest._id,
        leaveType: leaveRequest.leaveType,
        fromDate: leaveRequest.fromDate,
        toDate: leaveRequest.toDate,
        totalDays: leaveRequest.totalDays,
        status: leaveRequest.status,
        reason: leaveRequest.reason
      }
    });

  } catch (error) {
    console.error('Leave request error:', error);
    res.status(500).json({ message: 'Server error during leave request' });
  }
});

// @route   GET /api/leaves/my-leaves
// @desc    Get user's leave history
// @access  Private
router.get('/my-leaves', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    let query = { userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    
    const leaves = await Leave.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Leave.countDocuments(query);

    res.json({
      success: true,
      data: {
        leaves: leaves.map(leave => ({
          id: leave._id,
          leaveType: leave.leaveType,
          fromDate: leave.fromDateFormatted,
          toDate: leave.toDateFormatted,
          totalDays: leave.totalDays,
          reason: leave.reason,
          status: leave.status,
          isHalfDay: leave.isHalfDay,
          halfDayType: leave.halfDayType,
          approvedBy: leave.approvedBy,
          approvedAt: leave.approvedAt,
          rejectionReason: leave.rejectionReason,
          createdAt: leave.createdAt
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
    console.error('Get my leaves error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/leaves/pending
// @desc    Get pending leave requests (Admin only)
// @access  Private (Admin)
router.get('/pending', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const leaves = await Leave.getPendingLeaves();

    // Prevent any intermediary/proxy/browser caching of admin lists
    res.set('Cache-Control', 'no-store');

    res.json({
      success: true,
      data: {
        leaves: leaves.map(leave => ({
          id: leave._id,
          employeeName: leave.userId.fullName,
          employeeId: leave.userId.employeeId,
          department: leave.userId.department,
          email: leave.userId.email,
          leaveType: leave.leaveType,
          fromDate: leave.fromDateFormatted,
          toDate: leave.toDateFormatted,
          totalDays: leave.totalDays,
          reason: leave.reason,
          isHalfDay: leave.isHalfDay,
          halfDayType: leave.halfDayType,
          createdAt: leave.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Get pending leaves error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/leaves/all
// @desc    Get all leave requests (Admin only)
// @access  Private (Admin)
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Get all leave requests request from admin:', req.user.id);
    
    const { page = 1, limit = 20, status, leaveType, employeeId } = req.query;
    
    // Build query - include all leaves regardless of stored userType to avoid legacy data exclusion
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (leaveType) {
      query.leaveType = leaveType;
    }
    
    if (employeeId) {
      query.userId = employeeId;
    }

    const leaves = await Leave.find(query)
      .populate('userId', 'fullName employeeId department email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Leave.countDocuments(query);

    console.log(`Found ${leaves.length} leave requests`);
    
    // Debug: Log the first record to see the structure
    if (leaves.length > 0) {
      console.log('First leave record structure:', JSON.stringify(leaves[0], null, 2));
      console.log('First record userId:', leaves[0].userId);
      console.log('First record userId.fullName:', leaves[0].userId?.fullName);
    }

    // Prevent any intermediary/proxy/browser caching of admin lists
    res.set('Cache-Control', 'no-store');

    res.json({
      success: true,
      data: {
        leaves: leaves.map(leave => ({
          id: leave._id,
          employeeId: leave.userId?.employeeId || leave.userId?._id || 'N/A',
          employeeName: leave.userId?.fullName || leave.userId?.email || 'Unknown',
          department: leave.userId?.department || 'N/A',
          leaveType: leave.leaveType,
          fromDate: leave.fromDateFormatted || leave.fromDate,
          toDate: leave.toDateFormatted || leave.toDate,
          totalDays: leave.totalDays,
          reason: leave.reason,
          status: leave.status,
          isHalfDay: leave.isHalfDay,
          halfDayType: leave.halfDayType,
          createdAt: leave.createdAt,
          approvedBy: leave.approvedBy,
          approvedAt: leave.approvedAt,
          rejectionReason: leave.rejectionReason
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
    console.error('Get all leaves error:', error);
    res.status(500).json({ message: 'Server error while fetching leave requests' });
  }
});

// @route   PUT /api/leaves/:id/approve
// @desc    Approve leave request (Admin only)
// @access  Private (Admin)
router.put('/:id/approve', protect, authorize('admin'), [
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    console.log('Approve leave request:', req.params.id);
    console.log('Request body:', req.body);
    console.log('User ID:', req.user.id);
    console.log('User Role:', req.userRole);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    console.log('Finding leave by ID:', req.params.id);
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      console.log('Leave not found');
      return res.status(404).json({ message: 'Leave request not found' });
    }
    console.log('Leave found:', leave._id, 'Status:', leave.status);

    if (leave.status !== 'pending') {
      console.log('Leave is not pending, current status:', leave.status);
      return res.status(400).json({ message: 'Leave request is not pending' });
    }

    console.log('Updating leave status to approved...');
    // Update leave status
    leave.status = 'approved';
    leave.approvedBy = req.user.id;
    leave.approvedAt = new Date();
    leave.notes = req.body.notes || leave.notes;

    console.log('Saving leave...');
    await leave.save();
    console.log('Leave saved successfully');

    console.log('Updating user leave balance...');
    // Update employee's leave balance
    try {
      await Leave.updateUserLeaveBalance(leave.userId, leave.userType, leave.totalDays, 'approve');
      console.log('Leave balance updated successfully');
    } catch (balanceError) {
      console.error('Error updating leave balance:', balanceError);
      // Don't fail the approval if balance update fails
    }

    console.log('Leave request approved successfully');

    res.json({
      success: true,
      message: 'Leave request approved successfully',
      data: {
        leave: {
          id: leave._id,
          status: leave.status,
          approvedBy: leave.approvedBy,
          approvedAt: leave.approvedAt,
          notes: leave.notes
        }
      }
    });

  } catch (error) {
    console.error('Approve leave error details:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    res.status(500).json({ message: 'Server error while approving leave request' });
  }
});

// @route   PUT /api/leaves/:id/reject
// @desc    Reject leave request (Admin only)
// @access  Private (Admin)
router.put('/:id/reject', protect, authorize('admin'), [
  body('rejectionReason').trim().isLength({ min: 5, max: 500 }).withMessage('Rejection reason must be between 5 and 500 characters')
], async (req, res) => {
  try {
    console.log('Reject leave request:', req.params.id);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Leave request is not pending' });
    }

    // Update leave status
    leave.status = 'rejected';
    leave.approvedBy = req.user.id;
    leave.approvedAt = new Date();
    leave.rejectionReason = req.body.rejectionReason;

    await leave.save();

    console.log('Leave request rejected successfully');

    res.json({
      success: true,
      message: 'Leave request rejected successfully',
      data: {
        leave: {
          id: leave._id,
          status: leave.status,
          approvedBy: leave.approvedBy,
          approvedAt: leave.approvedAt,
          rejectionReason: leave.rejectionReason
        }
      }
    });

  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ message: 'Server error while rejecting leave request' });
  }
});

// @route   GET /api/leaves/stats
// @desc    Get leave statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Get leave stats request from admin:', req.user.id);
    
    const { startDate, endDate } = req.query;
    
    let dateQuery = {};
    if (startDate && endDate) {
      dateQuery = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const totalLeaves = await Leave.countDocuments({ userType: 'employee', ...dateQuery });
    const pendingLeaves = await Leave.countDocuments({ userType: 'employee', status: 'pending', ...dateQuery });
    const approvedLeaves = await Leave.countDocuments({ userType: 'employee', status: 'approved', ...dateQuery });
    const rejectedLeaves = await Leave.countDocuments({ userType: 'employee', status: 'rejected', ...dateQuery });

    // Get leave type breakdown
    const leaveTypeStats = await Leave.aggregate([
      { $match: { userType: 'employee', ...dateQuery } },
      {
        $group: {
          _id: '$leaveType',
          count: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get department-wise leave stats
    const departmentStats = await Leave.aggregate([
      { $match: { userType: 'employee', ...dateQuery } },
      {
        $lookup: {
          from: 'employees',
          localField: 'userId',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $group: {
          _id: '$employee.department',
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    console.log('Leave stats retrieved successfully');

    res.json({
      success: true,
      data: {
        totalLeaves,
        pendingLeaves,
        approvedLeaves,
        rejectedLeaves,
        approvalRate: totalLeaves > 0 ? Math.round((approvedLeaves / totalLeaves) * 100) : 0,
        leaveTypeStats: leaveTypeStats.map(stat => ({
          type: stat._id,
          total: stat.count,
          approved: stat.approved,
          rejected: stat.rejected,
          pending: stat.pending
        })),
        departmentStats: departmentStats.map(stat => ({
          department: stat._id,
          total: stat.total,
          approved: stat.approved,
          rejected: stat.rejected,
          pending: stat.pending
        }))
      }
    });

  } catch (error) {
    console.error('Get leave stats error:', error);
    res.status(500).json({ message: 'Server error while fetching leave statistics' });
  }
});

module.exports = router; 