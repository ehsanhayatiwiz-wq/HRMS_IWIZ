const express = require('express');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/employee
// @desc    Get employee dashboard data
// @access  Private
router.get('/employee', protect, authorize('employee'), async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.userRole;

    // Get employee's basic info
    const employee = await Employee.findById(userId).select('-password');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.findOne({
      userId,
      userType,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Get attendance stats for current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthlyAttendance = await Attendance.find({
      userId,
      userType,
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });

    const presentDays = monthlyAttendance.filter(att => att.status === 'present').length;
    const absentDays = monthlyAttendance.filter(att => att.status === 'absent').length;
    const totalWorkingDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const attendanceRate = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

    // Get leave stats
    const pendingLeaves = await Leave.countDocuments({
      userId,
      userType,
      status: 'pending'
    });

    const approvedLeaves = await Leave.countDocuments({
      userId,
      userType,
      status: 'approved'
    });

    const totalLeaves = await Leave.countDocuments({
      userId,
      userType
    });

    res.json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          department: employee.department,
          position: employee.position,
          leaveBalance: employee.leaveBalance
        },
        todayAttendance: todayAttendance ? {
          id: todayAttendance._id,
          status: todayAttendance.status,
          checkInTime: todayAttendance.checkInTime,
          checkOutTime: todayAttendance.checkOutTime,
          totalHours: todayAttendance.totalHours
        } : null,
        stats: {
          presentDays,
          absentDays,
          totalWorkingDays,
          attendanceRate,
          pendingLeaves,
          approvedLeaves,
          totalLeaves
        }
      }
    });

  } catch (error) {
    console.error('Get employee dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching employee dashboard' });
  }
});

// @route   GET /api/dashboard/admin
// @desc    Get admin dashboard data
// @access  Private (Admin)
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total employees count
    const totalEmployees = await Employee.countDocuments({ isActive: true });

    // Get today's attendance stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const presentToday = await Attendance.countDocuments({
      userType: 'employee',
      date: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'present'
    });

    const absentToday = await Attendance.countDocuments({
      userType: 'employee',
      date: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'absent'
    });

    // Get leave stats
    const pendingLeaves = await Leave.countDocuments({
      userType: 'employee',
      status: 'pending'
    });

    const totalLeaves = await Leave.countDocuments({
      userType: 'employee'
    });

    // Calculate attendance rate
    const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    // Get employees on leave today
    const onLeaveEmployees = await Leave.countDocuments({
      userType: 'employee',
      status: 'approved',
      fromDate: { $lte: today },
      toDate: { $gte: today }
    });

    res.json({
      success: true,
      data: {
        employeeStats: {
          totalEmployees,
          presentToday,
          absentToday,
          pendingLeaves,
          totalLeaves,
          attendanceRate,
          onLeaveEmployees
        }
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching admin dashboard' });
  }
});

// @route   GET /api/dashboard/attendance-report
// @desc    Get attendance report for admin
// @access  Private (Admin)
router.get('/attendance-report', protect, authorize('admin', 'hr'), async (req, res) => {
  try {
    const { date, department } = req.query;
    
    let query = {};
    
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

    let attendanceQuery = Attendance.find(query)
      .populate('userId', 'fullName employeeId department position')
      .sort({ 'checkIn.time': 1 });

    if (department) {
      attendanceQuery = attendanceQuery.populate({
        path: 'userId',
        match: { department: department }
      });
    }

    const attendance = await attendanceQuery;
    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      data: {
        attendance: attendance
          .filter(record => record.userId)
          .map(record => ({
            id: record._id,
            employeeName: record.userId.fullName,
            employeeId: record.userId.employeeId,
            department: record.userId.department,
            position: record.userId.position,
            checkInTime: record.checkInTimeFormatted,
            checkOutTime: record.checkOutTimeFormatted,
            totalHours: record.totalHours,
            status: record.status,
            isLate: record.isLate,
            lateMinutes: record.lateMinutes
          })),
        total,
        date: date || new Date().toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 