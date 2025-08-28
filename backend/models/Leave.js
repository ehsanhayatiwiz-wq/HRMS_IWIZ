const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'User ID is required']
  },
  userType: {
    type: String,
    enum: ['admin', 'employee'],
    required: [true, 'User type is required']
  },
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'annual', 'maternity', 'paternity', 'bereavement', 'other'],
    required: [true, 'Leave type is required']
  },
  fromDate: {
    type: Date,
    required: [true, 'From date is required']
  },
  toDate: {
    type: Date,
    required: [true, 'To date is required']
  },
  totalDays: {
    type: Number,
    required: [true, 'Total days is required'],
    min: [0.5, 'Leave must be at least 0.5 days']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDayType: {
    type: String,
    enum: ['morning', 'afternoon'],
    required: function() {
      return this.isHalfDay;
    }
  },
  salaryDeduction: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
leaveSchema.index({ userId: 1, userType: 1, fromDate: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ approvedBy: 1 });
leaveSchema.index({ leaveType: 1 });
leaveSchema.index({ userType: 1 });

// Calculate total days excluding weekends
leaveSchema.methods.calculateTotalDays = function() {
  const startDate = new Date(this.fromDate);
  const endDate = new Date(this.toDate);
  let totalDays = 0;
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
      totalDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  if (this.isHalfDay) {
    totalDays = totalDays * 0.5;
  }
  
  return totalDays;
};

// Check for overlapping leaves
leaveSchema.statics.checkLeaveOverlap = async function(userId, fromDate, toDate, excludeId = null) {
  const query = {
    userId,
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
    status: { $in: ['pending', 'approved'] }
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const overlappingLeave = await this.findOne(query);
  return !!overlappingLeave;
};

// Get user's leave balance
leaveSchema.statics.getUserLeaveBalance = async function(userId, userType) {
  if (userType === 'admin') {
    const admin = await mongoose.model('Admin').findById(userId);
    return admin ? 0 : 0; // Admins typically don't have leave balance
  } else {
    const employee = await mongoose.model('Employee').findById(userId);
    return employee ? employee.leaveBalance : 0;
  }
};

// Update user's leave balance after approval/rejection
leaveSchema.statics.updateUserLeaveBalance = async function(userId, userType, leaveDays, action) {
  if (userType === 'employee') {
    const Employee = mongoose.model('Employee');
    const employee = await Employee.findById(userId);
    
    if (employee) {
      if (action === 'approve') {
        employee.leaveBalance = Math.max(0, employee.leaveBalance - leaveDays);
      } else if (action === 'reject' || action === 'cancel') {
        employee.leaveBalance += leaveDays;
      }
      
      await employee.save();
    }
  }
};

// Calculate salary deduction for extra leaves
leaveSchema.methods.calculateSalaryDeduction = function(userSalary, leaveBalance) {
  if (this.totalDays <= leaveBalance) {
    return 0;
  }
  
  const extraDays = this.totalDays - leaveBalance;
  const dailySalary = userSalary / 30; // Assuming 30 days per month
  return extraDays * dailySalary;
};

// Pre-save middleware to calculate total days
leaveSchema.pre('save', function(next) {
  if (this.fromDate && this.toDate) {
    this.totalDays = this.calculateTotalDays();
  }
  next();
});

// Static method to get leaves by date range
leaveSchema.statics.getLeavesByDateRange = async function(userId, startDate, endDate) {
  return await this.find({
    userId,
    fromDate: { $gte: startDate },
    toDate: { $lte: endDate }
  }).sort({ fromDate: 1 });
};

// Static method to get pending leaves for admin
leaveSchema.statics.getPendingLeaves = async function() {
  return await this.find({ status: 'pending' })
    .populate('userId', 'fullName employeeId department email')
    .sort({ createdAt: -1 });
};

// Virtual for formatted from date
leaveSchema.virtual('fromDateFormatted').get(function() {
  return new Date(this.fromDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted to date
leaveSchema.virtual('toDateFormatted').get(function() {
  return new Date(this.toDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for leave duration text
leaveSchema.virtual('durationText').get(function() {
  if (this.isHalfDay) {
    return `${this.totalDays} half day(s)`;
  }
  return `${this.totalDays} day(s)`;
});

// Virtual for status color
leaveSchema.virtual('statusColor').get(function() {
  const colors = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    cancelled: 'secondary'
  };
  return colors[this.status] || 'primary';
});

module.exports = mongoose.model('Leave', leaveSchema); 