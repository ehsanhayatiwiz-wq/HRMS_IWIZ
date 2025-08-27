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
router.get('/employee', protect, async (req, res) => {
  try {
    console.log('Get employee dashboard for user:', req.user.id);
    
    const userId = req.user.id;
    const userType = req.userRole;

    // Get today's attendance
    const todayAttendance = await Attendance.getTodayAttendance(userId, userType);

    // Get attendance summary for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const monthlyAttendance = await Attendance.find({
      userId,
      userType,
      date: { $gte: currentMonth, $lt: nextMonth }
    });

    const presentDays = monthlyAttendance.filter(att => 
      att.status === 'present' || att.status === 'late' || att.status === 're-checked-in'
    ).length;

    // Get recent activity (last 10 attendance records)
    const recentActivity = await Attendance.find({ userId, userType })
      .sort({ date: -1 })
      .limit(10);

    // Get user's leave balance
    let user;
    let leaveBalance = 0;
    
    if (userType === 'admin') {
      user = await Admin.findById(userId);
    } else {
      user = await Employee.findById(userId);
      leaveBalance = user.leaveBalance;
    }

    // Get recent leaves
    const recentLeaves = await Leave.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    console.log('Employee dashboard data retrieved successfully');

    res.json({
      success: true,
      data: {
        todayAttendance: todayAttendance ? {
          checkInTime: todayAttendance.checkInTimeFormatted,
          checkOutTime: todayAttendance.checkOutTimeFormatted,
          reCheckInTime: todayAttendance.reCheckInTimeFormatted,
          reCheckOutTime: todayAttendance.reCheckOutTimeFormatted,
          totalHours: todayAttendance.totalHours,
          firstSessionHours: todayAttendance.firstSessionHours,
          secondSessionHours: todayAttendance.secondSessionHours,
          status: todayAttendance.status,
          checkInCount: todayAttendance.checkInCount
        } : null,
        monthlyStats: {
          presentDays,
          totalDays: new Date().getDate(),
          attendanceRate: Math.round((presentDays / new Date().getDate()) * 100)
        },
        leaveBalance,
        recentActivity: recentActivity.map(activity => ({
          date: new Date(activity.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          checkInTime: activity.checkInTimeFormatted,
          checkOutTime: activity.checkOutTimeFormatted,
          reCheckInTime: activity.reCheckInTimeFormatted,
          reCheckOutTime: activity.reCheckOutTimeFormatted,
          totalHours: activity.totalHours,
          firstSessionHours: activity.firstSessionHours,
          secondSessionHours: activity.secondSessionHours,
          status: activity.status,
          checkInCount: activity.checkInCount
        })),
        recentLeaves: recentLeaves.map(leave => ({
          id: leave._id,
          leaveType: leave.leaveType,
          fromDate: new Date(leave.fromDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          toDate: new Date(leave.toDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          totalDays: leave.totalDays,
          status: leave.status,
          reason: leave.reason
        }))
      }
    });

  } catch (error) {
    console.error('Get employee dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard data' });
  }
});

// @route   GET /api/dashboard/admin
// @desc    Get admin dashboard data
// @access  Private (Admin)
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Get admin dashboard for user:', req.user.id);
    
    const userId = req.user.id;
    const userType = req.userRole;

    // Get today's attendance
    const todayAttendance = await Attendance.getTodayAttendance(userId, userType);

    // Get employee statistics
    const totalEmployees = await Employee.countDocuments({ isActive: true });
    const activeEmployees = await Employee.countDocuments({ isActive: true, status: 'active' });
    const onLeaveEmployees = await Employee.countDocuments({ isActive: true, status: 'on_leave' });

    // Get today's attendance summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendanceCount = await Attendance.countDocuments({
      userType: 'employee',
      date: { $gte: today, $lt: tomorrow }
    });

    const presentToday = await Attendance.countDocuments({
      userType: 'employee',
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['present', 'late', 're-checked-in'] }
    });

    // Get recent leaves
    const recentLeaves = await Leave.find({})
      .populate('userId', 'fullName employeeId department')
      .sort({ createdAt: -1 })
      .limit(10);

    // Count of pending leave requests (for dashboard card)
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

    console.log('Admin dashboard data retrieved successfully');

    res.json({
      success: true,
      data: {
        todayAttendance: todayAttendance ? {
          checkInTime: todayAttendance.checkInTimeFormatted,
          checkOutTime: todayAttendance.checkOutTimeFormatted,
          reCheckInTime: todayAttendance.reCheckInTimeFormatted,
          reCheckOutTime: todayAttendance.reCheckOutTimeFormatted,
          totalHours: todayAttendance.totalHours,
          firstSessionHours: todayAttendance.firstSessionHours,
          secondSessionHours: todayAttendance.secondSessionHours,
          status: todayAttendance.status,
          checkInCount: todayAttendance.checkInCount
        } : null,
        employeeStats: {
          totalEmployees,
          activeEmployees,
          onLeaveEmployees,
          presentToday,
          pendingLeaves,
          attendanceRate: totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0
        },
        recentLeaves: recentLeaves.map(leave => ({
          id: leave._id,
          employeeName: leave.userId?.fullName || 'Unknown',
          employeeId: leave.userId?.employeeId || 'N/A',
          department: leave.userId?.department || 'N/A',
          leaveType: leave.leaveType,
          fromDate: new Date(leave.fromDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          toDate: new Date(leave.toDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          totalDays: leave.totalDays,
          status: leave.status,
          reason: leave.reason
        }))
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching admin dashboard data' });
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