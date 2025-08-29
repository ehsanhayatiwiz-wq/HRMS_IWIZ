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
    
    // Use Karachi timezone for consistent day boundaries
    const { startUtc, endUtc } = Attendance.getKarachiDayRangeUtc(new Date());
    const today = startUtc;

    console.log('Check-in timezone debug:', {
      userId,
      userType,
      currentTime: new Date().toISOString(),
      karachiTime: new Date(new Date().getTime() + 5 * 60 * 60 * 1000).toISOString(),
      startUtc: startUtc.toISOString(),
      endUtc: endUtc.toISOString(),
      karachiDayStart: new Date(startUtc.getTime() + 5 * 60 * 60 * 1000).toISOString(),
      karachiDayEnd: new Date(endUtc.getTime() + 5 * 60 * 60 * 1000).toISOString()
    });

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      userId,
      userType,
      date: { $gte: startUtc, $lt: endUtc }
    });

    console.log('Existing attendance check:', {
      userId,
      userType,
      today: today.toISOString(),
      startUtc: startUtc.toISOString(),
      endUtc: endUtc.toISOString(),
      existingAttendance: existingAttendance ? {
        id: existingAttendance._id,
        date: existingAttendance.date,
        hasCheckIn: !!existingAttendance.checkIn?.time,
        checkInTime: existingAttendance.checkInTimeFormatted
      } : null
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
        userModel: userType === 'admin' ? 'Admin' : 'Employee',
        date: startUtc // Use the Karachi day start time for consistency
      });
    }

    const currentTime = new Date();
    
    console.log('Check-in time storage:', {
      currentTime: currentTime.toISOString(),
      karachiTime: new Date(currentTime.getTime() + 5 * 60 * 60 * 1000).toISOString(),
      karachiFormatted: new Date(currentTime.getTime() + 5 * 60 * 60 * 1000).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
    });
    
    attendance.checkIn = {
      time: currentTime,
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
    
    // Use Karachi timezone for consistent day boundaries
    const { startUtc, endUtc } = Attendance.getKarachiDayRangeUtc(new Date());

    // Find today's attendance
    const attendance = await Attendance.findOne({
      userId,
      userType,
      date: { $gte: startUtc, $lt: endUtc }
    });

    console.log('Check-out validation:', {
      userId,
      userType,
      startUtc: startUtc.toISOString(),
      endUtc: endUtc.toISOString(),
      hasAttendance: !!attendance,
      hasCheckIn: attendance?.checkIn?.time,
      hasCheckOut: attendance?.checkOut?.time,
      checkInTime: attendance?.checkInTimeFormatted,
      checkOutTime: attendance?.checkOutTimeFormatted
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
    const currentTime = new Date();
    const timeDifference = currentTime - attendance.checkIn.time;
    const minimumTimeMs = 1 * 60 * 1000; // 1 minute minimum
    
    console.log('Check-out time validation:', {
      checkInTime: attendance.checkIn.time.toISOString(),
      checkOutTime: currentTime.toISOString(),
      timeDifferenceMs: timeDifference,
      minimumTimeMs: minimumTimeMs,
      isValid: timeDifference >= minimumTimeMs
    });
    
    if (timeDifference < minimumTimeMs) {
      return res.status(400).json({ 
        message: 'Please wait at least 1 minute before checking out',
        timeElapsed: Math.round(timeDifference / 1000) + ' seconds'
      });
    }
    
    console.log('Check-out time storage:', {
      currentTime: currentTime.toISOString(),
      karachiTime: new Date(currentTime.getTime() + 5 * 60 * 60 * 1000).toISOString(),
      karachiFormatted: new Date(currentTime.getTime() + 5 * 60 * 60 * 1000).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
    });
    
    attendance.checkOut = {
      time: currentTime,
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
        firstSessionHours: attendance.firstSessionHours,
        firstSessionHoursFormatted: attendance.firstSessionHoursFormatted,
        totalHours: attendance.totalHours,
        totalHoursFormatted: attendance.totalHoursFormatted,
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

    console.log('Re-check-in validation for user:', userId, 'date:', today.toISOString());
    
    // Check if user can re-check-in
    const canReCheckInResult = await Attendance.canReCheckIn(userId, userType, today);
    
    console.log('Re-check-in validation result:', canReCheckInResult);
    
    if (!canReCheckInResult.canReCheckIn) {
      return res.status(400).json({ 
        message: canReCheckInResult.reason 
      });
    }

    const attendance = canReCheckInResult.attendance;

    // Update re-check-in
    const currentTime = new Date();
    attendance.reCheckIn = {
      time: currentTime,
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
        firstSessionHoursFormatted: attendance.firstSessionHoursFormatted,
        totalHours: attendance.totalHours,
        totalHoursFormatted: attendance.totalHoursFormatted
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
    
    // Use Karachi timezone for consistent day boundaries
    const { startUtc, endUtc } = Attendance.getKarachiDayRangeUtc(new Date());

    // Find today's attendance
    const attendance = await Attendance.findOne({
      userId,
      userType,
      date: { $gte: startUtc, $lt: endUtc }
    });

    console.log('Re-check-out validation:', {
      userId,
      userType,
      startUtc: startUtc.toISOString(),
      endUtc: endUtc.toISOString(),
      hasAttendance: !!attendance,
      hasReCheckIn: attendance?.reCheckIn?.time,
      hasReCheckOut: attendance?.reCheckOut?.time,
      reCheckInTime: attendance?.reCheckInTimeFormatted,
      reCheckOutTime: attendance?.reCheckOutTimeFormatted
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
    const currentTime = new Date();
    const timeDifference = currentTime - attendance.reCheckIn.time;
    const minimumTimeMs = 1 * 60 * 1000; // 1 minute minimum
    
    console.log('Re-check-out time validation:', {
      reCheckInTime: attendance.reCheckIn.time.toISOString(),
      reCheckOutTime: currentTime.toISOString(),
      timeDifferenceMs: timeDifference,
      minimumTimeMs: minimumTimeMs,
      isValid: timeDifference >= minimumTimeMs
    });
    
    if (timeDifference < minimumTimeMs) {
      return res.status(400).json({ 
        message: 'Please wait at least 1 minute before re-checking out',
        timeElapsed: Math.round(timeDifference / 1000) + ' seconds'
      });
    }
    
    attendance.reCheckOut = {
      time: currentTime,
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
        firstSessionHoursFormatted: attendance.firstSessionHoursFormatted,
        secondSessionHours: attendance.secondSessionHours,
        secondSessionHoursFormatted: attendance.secondSessionHoursFormatted,
        totalHours: attendance.totalHours,
        totalHoursFormatted: attendance.totalHoursFormatted
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

    console.log('Today attendance lookup:', {
      userId,
      userType,
      attendanceFound: !!attendance,
      attendance: attendance ? {
        id: attendance._id,
        date: attendance.date,
        hasCheckIn: !!attendance.checkIn?.time,
        hasCheckOut: !!attendance.checkOut?.time,
        checkInTime: attendance.checkInTimeFormatted,
        checkOutTime: attendance.checkOutTimeFormatted
      } : null
    });

    if (!attendance) {
      return res.json({
        success: true,
        data: {
          attendance: null,
          canCheckIn: true,
          canCheckOut: false,
          canReCheckIn: false,
          canReCheckOut: false
        }
      });
    }

    // Determine what actions are available
    const canCheckIn = !attendance.checkIn || !attendance.checkIn.time;
    const canCheckOut = attendance.checkIn && attendance.checkIn.time && !attendance.checkOut.time;
    const canReCheckIn = attendance.checkOut && attendance.checkOut.time && !attendance.reCheckIn.time;
    const canReCheckOut = attendance.reCheckIn && attendance.reCheckIn.time && !attendance.reCheckOut.time;

    console.log('Today attendance found for user:', userId, {
      canCheckIn,
      canCheckOut,
      canReCheckIn,
      canReCheckOut,
      checkInTime: attendance.checkInTimeFormatted,
      checkOutTime: attendance.checkOutTimeFormatted
    });

    res.json({
      success: true,
      data: {
        attendance: {
          checkInTime: attendance.checkInTimeFormatted,
          checkOutTime: attendance.checkOutTimeFormatted,
          reCheckInTime: attendance.reCheckInTimeFormatted,
          reCheckOutTime: attendance.reCheckOutTimeFormatted,
          totalHours: attendance.totalHours,
          totalHoursFormatted: attendance.totalHoursFormatted,
          firstSessionHours: attendance.firstSessionHours,
          firstSessionHoursFormatted: attendance.firstSessionHoursFormatted,
          secondSessionHours: attendance.secondSessionHours,
          secondSessionHoursFormatted: attendance.secondSessionHoursFormatted,
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
      .populate('userId', 'fullName email employeeId department')
      .sort({ date: -1, 'checkIn.time': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    console.log('Raw attendance records from database:', attendance.length);
    if (attendance.length > 0) {
      console.log('First record userId:', attendance[0].userId);
      console.log('First record userId.fullName:', attendance[0].userId?.fullName);
      console.log('First record userId.email:', attendance[0].userId?.email);
      console.log('First record checkIn:', attendance[0].checkIn);
      console.log('First record checkOut:', attendance[0].checkOut);
    }

    const total = await Attendance.countDocuments(query);

    console.log(`Found ${attendance.length} attendance records`);
    
    // Debug: Log the first record to see the structure
    if (attendance.length > 0) {
      console.log('First attendance record structure:', JSON.stringify(attendance[0], null, 2));
      console.log('First record userId:', attendance[0].userId);
      console.log('First record userId.fullName:', attendance[0].userId?.fullName);
      console.log('First record transformed userId:', {
        _id: attendance[0].userId?._id,
        fullName: attendance[0].userId?.fullName || 'Unknown',
        email: attendance[0].userId?.email || 'Unknown',
        employeeId: attendance[0].userId?.employeeId || 'N/A',
        department: attendance[0].userId?.department || 'N/A'
      });
    }

    res.json({
      success: true,
      data: {
        attendance: attendance.map(record => ({
          id: record._id,
          userId: {
            _id: record.userId?._id,
            fullName: record.userId?.fullName || 'Unknown',
            email: record.userId?.email || 'Unknown',
            employeeId: record.userId?.employeeId || 'N/A',
            department: record.userId?.department || 'N/A'
          },
          date: record.date,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          reCheckIn: record.reCheckIn,
          reCheckOut: record.reCheckOut,
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

// @route   GET /api/attendance/timezone-test
// @desc    Test timezone calculations
// @access  Private
router.get('/timezone-test', protect, async (req, res) => {
  try {
    const now = new Date();
    const { startUtc, endUtc } = Attendance.getKarachiDayRangeUtc(now);
    
    // Test time formatting
    const testTime = new Date('2024-01-15T12:35:00.000Z'); // 12:35 PM UTC
    const karachiTime = new Date(testTime.getTime() + 5 * 60 * 60 * 1000); // 5:35 PM Karachi
    
    res.json({
      success: true,
      data: {
        currentTime: {
          utc: now.toISOString(),
          karachi: new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString(),
          karachiFormatted: new Date(now.getTime() + 5 * 60 * 60 * 1000).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
        },
        timeFormattingTest: {
          testTimeUTC: testTime.toISOString(),
          testTimeKarachi: karachiTime.toISOString(),
          formattedTime: testTime.toLocaleTimeString('en-PK', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Karachi'
          }),
          karachiFormatted: karachiTime.toLocaleTimeString('en-PK', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Karachi'
          })
        },
        dayBoundaries: {
          startUtc: startUtc.toISOString(),
          endUtc: endUtc.toISOString(),
          karachiDayStart: new Date(startUtc.getTime() + 5 * 60 * 60 * 1000).toISOString(),
          karachiDayEnd: new Date(endUtc.getTime() + 5 * 60 * 60 * 1000).toISOString(),
          karachiDayStartFormatted: new Date(startUtc.getTime() + 5 * 60 * 60 * 1000).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
          karachiDayEndFormatted: new Date(endUtc.getTime() + 5 * 60 * 60 * 1000).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
        },
        explanation: {
          karachiOffset: 'UTC+5 (5 hours ahead of UTC)',
          dayStart: '00:00:00 Karachi time',
          dayEnd: '23:59:59 Karachi time',
          example: 'If UTC time is 7:00 PM, Karachi time is 12:00 AM (next day)'
        }
      }
    });
  } catch (error) {
    console.error('Timezone test error:', error);
    res.status(500).json({ message: 'Server error during timezone test' });
  }
});

module.exports = router; 