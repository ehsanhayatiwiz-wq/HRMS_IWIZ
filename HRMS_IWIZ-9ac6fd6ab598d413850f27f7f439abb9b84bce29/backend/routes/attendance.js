const express = require('express');
const { body, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');
const moment = require('moment');

const router = express.Router();

// @route   POST /api/attendance/checkin
// @desc    Check in for the day
// @access  Private
router.post('/checkin', protect, async (req, res) => {
  try {
    console.log('Check-in request from user:', req.user.id);
    
    const userId = req.user.id;
    const userType = req.userRole;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      userId,
      userType,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance && existingAttendance.checkIn.time) {
      return res.status(400).json({ 
        message: 'Already checked in today',
        checkInTime: existingAttendance.checkInTimeFormatted
      });
    }

    // Create or update attendance record
    let attendance;
    if (existingAttendance) {
      attendance = existingAttendance;
    } else {
      attendance = new Attendance({ 
        userId, 
        userType,
        date: today 
      });
    }

    attendance.checkIn = {
      time: new Date(),
      location: req.body.location || 'Office',
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent']
    };

    await attendance.save();

    console.log('Check-in successful for user:', userId);

    res.json({
      success: true,
      message: 'Check-in successful',
      data: {
        checkInTime: attendance.checkInTimeFormatted,
        isLate: attendance.isLate,
        lateMinutes: attendance.lateMinutes
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Server error during check-in' });
  }
});

// @route   POST /api/attendance/checkout
// @desc    Check out for the day
// @access  Private
router.post('/checkout', protect, async (req, res) => {
  try {
    console.log('Check-out request from user:', req.user.id);
    
    const userId = req.user.id;
    const userType = req.userRole;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance
    const attendance = await Attendance.findOne({
      userId,
      userType,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance || !attendance.checkIn.time) {
      return res.status(400).json({ message: 'No check-in record found for today' });
    }

    if (attendance.checkOut.time) {
      return res.status(400).json({ 
        message: 'Already checked out today',
        checkOutTime: attendance.checkOutTimeFormatted
      });
    }

    // Update check-out
    attendance.checkOut = {
      time: new Date(),
      location: req.body.location || 'Office',
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent']
    };

    await attendance.save();

    console.log('Check-out successful for user:', userId);

    res.json({
      success: true,
      message: 'Check-out successful',
      data: {
        checkOutTime: attendance.checkOutTimeFormatted,
        totalHours: attendance.totalHours,
        canReCheckIn: true
      }
    });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: 'Server error during check-out' });
  }
});

// @route   POST /api/attendance/re-checkin
// @desc    Re-check in for the day (second check-in)
// @access  Private
router.post('/re-checkin', protect, async (req, res) => {
  try {
    console.log('Re-check-in request from user:', req.user.id);
    
    const userId = req.user.id;
    const userType = req.userRole;
    const today = new Date();

    // Check if user can re-check-in
    const canReCheckInResult = await Attendance.canReCheckIn(userId, userType, today);
    
    if (!canReCheckInResult.canReCheckIn) {
      return res.status(400).json({ 
        message: canReCheckInResult.reason 
      });
    }

    const attendance = canReCheckInResult.attendance;

    // Update re-check-in
    attendance.reCheckIn = {
      time: new Date(),
      location: req.body.location || 'Office',
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent']
    };

    await attendance.save();

    console.log('Re-check-in successful for user:', userId);

    res.json({
      success: true,
      message: 'Re-check-in successful',
      data: {
        reCheckInTime: attendance.reCheckInTimeFormatted,
        firstSessionHours: attendance.firstSessionHours,
        totalHours: attendance.totalHours
      }
    });

  } catch (error) {
    console.error('Re-check-in error:', error);
    res.status(500).json({ message: 'Server error during re-check-in' });
  }
});

// @route   POST /api/attendance/re-checkout
// @desc    Re-check out for the day (second check-out)
// @access  Private
router.post('/re-checkout', protect, async (req, res) => {
  try {
    console.log('Re-check-out request from user:', req.user.id);
    
    const userId = req.user.id;
    const userType = req.userRole;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance
    const attendance = await Attendance.findOne({
      userId,
      userType,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance || !attendance.reCheckIn || !attendance.reCheckIn.time) {
      return res.status(400).json({ message: 'No re-check-in record found for today' });
    }

    if (attendance.reCheckOut && attendance.reCheckOut.time) {
      return res.status(400).json({ 
        message: 'Already re-checked out today',
        reCheckOutTime: attendance.reCheckOutTimeFormatted
      });
    }

    // Update re-check-out
    attendance.reCheckOut = {
      time: new Date(),
      location: req.body.location || 'Office',
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent']
    };

    await attendance.save();

    console.log('Re-check-out successful for user:', userId);

    res.json({
      success: true,
      message: 'Re-check-out successful',
      data: {
        reCheckOutTime: attendance.reCheckOutTimeFormatted,
        firstSessionHours: attendance.firstSessionHours,
        secondSessionHours: attendance.secondSessionHours,
        totalHours: attendance.totalHours
      }
    });

  } catch (error) {
    console.error('Re-check-out error:', error);
    res.status(500).json({ message: 'Server error during re-check-out' });
  }
});

// @route   GET /api/attendance/today
// @desc    Get today's attendance
// @access  Private
router.get('/today', protect, async (req, res) => {
  try {
    console.log('Get today attendance for user:', req.user.id);
    
    const userId = req.user.id;
    const userType = req.userRole;

    const attendance = await Attendance.getTodayAttendance(userId, userType);

    if (!attendance) {
      return res.json({
        success: true,
        data: {
          attendance: null,
          canCheckIn: true,
          canCheckOut: false,
          canReCheckIn: false
        }
      });
    }

    // Determine what actions are available
    const canCheckIn = !attendance.checkIn || !attendance.checkIn.time;
    const canCheckOut = attendance.checkIn && attendance.checkIn.time && !attendance.checkOut.time;
    const canReCheckIn = attendance.checkOut && attendance.checkOut.time && !attendance.reCheckIn.time;
    const canReCheckOut = attendance.reCheckIn && attendance.reCheckIn.time && !attendance.reCheckOut.time;

    console.log('Today attendance found for user:', userId);

    res.json({
      success: true,
      data: {
        attendance: {
          checkInTime: attendance.checkInTimeFormatted,
          checkOutTime: attendance.checkOutTimeFormatted,
          reCheckInTime: attendance.reCheckInTimeFormatted,
          reCheckOutTime: attendance.reCheckOutTimeFormatted,
          totalHours: attendance.totalHours,
          firstSessionHours: attendance.firstSessionHours,
          secondSessionHours: attendance.secondSessionHours,
          status: attendance.status,
          checkInCount: attendance.checkInCount
        },
        canCheckIn,
        canCheckOut,
        canReCheckIn,
        canReCheckOut
      }
    });

  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ message: 'Server error while fetching today\'s attendance' });
  }
});

// @route   GET /api/attendance/history
// @desc    Get attendance history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    console.log('Get attendance history for user:', req.user.id);
    
    const userId = req.user.id;
    const userType = req.userRole;
    const { page = 1, limit = 10, startDate, endDate } = req.query;

    // Build query
    const query = { userId, userType };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    console.log(`Found ${attendance.length} attendance records for user:`, userId);

    res.json({
      success: true,
      data: {
        attendance: attendance.map(record => ({
          date: record.date,
          checkInTime: record.checkInTimeFormatted,
          checkOutTime: record.checkOutTimeFormatted,
          reCheckInTime: record.reCheckInTimeFormatted,
          reCheckOutTime: record.reCheckOutTimeFormatted,
          totalHours: record.totalHours,
          firstSessionHours: record.firstSessionHours,
          secondSessionHours: record.secondSessionHours,
          status: record.status,
          checkInCount: record.checkInCount
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
    console.error('Get attendance history error:', error);
    res.status(500).json({ message: 'Server error while fetching attendance history' });
  }
});

// @route   GET /api/attendance/all
// @desc    Get all attendance records (Admin only)
// @access  Private (Admin)
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Get all attendance records request from admin:', req.user.id);
    
    const { page = 1, limit = 20, date, employeeId, status } = req.query;
    
    // Build query
    const query = { userType: 'employee' };
    
    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(searchDate);
      nextDate.setDate(nextDate.getDate() + 1);
      query.date = { $gte: searchDate, $lt: nextDate };
    }
    
    if (employeeId) {
      query.userId = employeeId;
    }
    
    if (status) {
      query.status = status;
    }

    const attendance = await Attendance.find(query)
      .populate('userId', 'fullName employeeId department')
      .sort({ date: -1, 'checkIn.time': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    console.log(`Found ${attendance.length} attendance records`);
    
    // Debug: Log the first record to see the structure
    if (attendance.length > 0) {
      console.log('First attendance record structure:', JSON.stringify(attendance[0], null, 2));
      console.log('First record userId:', attendance[0].userId);
      console.log('First record userId.fullName:', attendance[0].userId?.fullName);
    }

    res.json({
      success: true,
      data: {
        attendance: attendance.map(record => ({
          id: record._id,
          employeeId: record.userId?.employeeId || 'N/A',
          employeeName: record.userId?.fullName || 'Unknown',
          department: record.userId?.department || 'N/A',
          date: record.date,
          checkInTime: record.checkInTimeFormatted,
          checkOutTime: record.checkOutTimeFormatted,
          reCheckInTime: record.reCheckInTimeFormatted,
          reCheckOutTime: record.reCheckOutTimeFormatted,
          totalHours: record.totalHours,
          firstSessionHours: record.firstSessionHours,
          secondSessionHours: record.secondSessionHours,
          status: record.status,
          checkInCount: record.checkInCount,
          isLate: record.isLate,
          lateMinutes: record.lateMinutes
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
    console.error('Get all attendance error:', error);
    res.status(500).json({ message: 'Server error while fetching attendance records' });
  }
});

// @route   GET /api/attendance/stats
// @desc    Get attendance statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Get attendance stats request from admin:', req.user.id);
    
    const { date } = req.query;
    
    let query = { userType: 'employee' };
    
    if (date) {
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(searchDate);
      nextDate.setDate(nextDate.getDate() + 1);
      query.date = { $gte: searchDate, $lt: nextDate };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.date = { $gte: today, $lt: tomorrow };
    }

    const totalRecords = await Attendance.countDocuments(query);
    const presentRecords = await Attendance.countDocuments({
      ...query,
      status: { $in: ['present', 'late', 're-checked-in'] }
    });
    const lateRecords = await Attendance.countDocuments({
      ...query,
      isLate: true
    });
    const absentRecords = totalRecords - presentRecords;

    // Get department-wise attendance
    const departmentStats = await Attendance.aggregate([
      { $match: query },
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
          present: {
            $sum: {
              $cond: [
                { $in: ['$status', ['present', 'late', 're-checked-in']] },
                1,
                0
              ]
            }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    console.log('Attendance stats retrieved successfully');

    res.json({
      success: true,
      data: {
        totalRecords,
        presentRecords,
        lateRecords,
        absentRecords,
        attendanceRate: totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0,
        departmentStats: departmentStats.map(stat => ({
          department: stat._id,
          present: stat.present,
          total: stat.total,
          rate: stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0
        }))
      }
    });

  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ message: 'Server error while fetching attendance statistics' });
  }
});

module.exports = router; 