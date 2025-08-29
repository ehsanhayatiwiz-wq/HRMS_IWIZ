const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: [true, 'User ID is required']
  },
  userModel: {
    type: String,
    required: true,
    enum: ['Admin', 'Employee']
  },
  userType: {
    type: String,
    enum: ['admin', 'employee'],
    required: [true, 'User type is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  // First check-in session
  checkIn: {
    time: {
      type: Date,
      required: [true, 'Check-in time is required']
    },
    location: {
      type: String,
      default: 'Office'
    },
    ipAddress: String,
    deviceInfo: String
  },
  checkOut: {
    time: {
      type: Date,
      default: null
    },
    location: {
      type: String,
      default: 'Office'
    },
    ipAddress: String,
    deviceInfo: String
  },
  // Second check-in session (for re-check-in)
  reCheckIn: {
    time: {
      type: Date,
      default: null
    },
    location: {
      type: String,
      default: 'Office'
    },
    ipAddress: String,
    deviceInfo: String
  },
  reCheckOut: {
    time: {
      type: Date,
      default: null
    },
    location: {
      type: String,
      default: 'Office'
    },
    ipAddress: String,
    deviceInfo: String
  },
  // Session hours
  firstSessionHours: {
    type: Number,
    default: 0,
    min: 0
  },
  secondSessionHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'leave', 're-checked-in'],
    default: 'present'
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  checkInCount: {
    type: Number,
    default: 1,
    min: 1,
    max: 2
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ userType: 1 });

// Virtual properties for formatted times
attendanceSchema.virtual('checkInTimeFormatted').get(function() {
  if (!this.checkIn || !this.checkIn.time) return null;
  return new Date(this.checkIn.time).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Karachi'
  });
});

attendanceSchema.virtual('checkOutTimeFormatted').get(function() {
  if (!this.checkOut || !this.checkOut.time) return null;
  return new Date(this.checkOut.time).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Karachi'
  });
});

attendanceSchema.virtual('reCheckInTimeFormatted').get(function() {
  if (!this.reCheckIn || !this.reCheckIn.time) return null;
  return new Date(this.reCheckIn.time).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Karachi'
  });
});

attendanceSchema.virtual('reCheckOutTimeFormatted').get(function() {
  if (!this.reCheckOut || !this.reCheckOut.time) return null;
  return new Date(this.reCheckOut.time).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Karachi'
  });
});

// Calculate hours before saving
attendanceSchema.pre('save', function(next) {
  // Calculate first session hours
  if (this.checkIn && this.checkIn.time && this.checkOut && this.checkOut.time) {
    const firstSessionMs = this.checkOut.time - this.checkIn.time;
    this.firstSessionHours = Math.round((firstSessionMs / (1000 * 60 * 60)) * 100) / 100;
  }

  // Calculate second session hours
  if (this.reCheckIn && this.reCheckIn.time && this.reCheckOut && this.reCheckOut.time) {
    const secondSessionMs = this.reCheckOut.time - this.reCheckIn.time;
    this.secondSessionHours = Math.round((secondSessionMs / (1000 * 60 * 60)) * 100) / 100;
  }

  // Calculate total hours
  this.totalHours = this.firstSessionHours + this.secondSessionHours;

  // Update status based on check-ins
  if (this.reCheckIn && this.reCheckIn.time) {
    this.status = 're-checked-in';
    this.checkInCount = 2;
  }

  next();
});

// Static method to check if user can re-check-in
attendanceSchema.statics.getKarachiDayRangeUtc = function(baseDate = new Date()) {
  // Convert current UTC time to Karachi local wall clock by adding +5h,
  // then clamp to midnight and convert back to UTC
  const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no DST
  const karachiClock = new Date(baseDate.getTime() + KARACHI_OFFSET_MS);
  const startKarachiUTC = Date.UTC(karachiClock.getUTCFullYear(), karachiClock.getUTCMonth(), karachiClock.getUTCDate(), 0, 0, 0, 0);
  const startUtc = new Date(startKarachiUTC - KARACHI_OFFSET_MS);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  
  // Debug logging for timezone calculations
  console.log('Karachi timezone calculation:', {
    baseDate: baseDate.toISOString(),
    karachiClock: karachiClock.toISOString(),
    startKarachiUTC: new Date(startKarachiUTC).toISOString(),
    startUtc: startUtc.toISOString(),
    endUtc: endUtc.toISOString(),
    karachiDayStart: new Date(startUtc.getTime() + KARACHI_OFFSET_MS).toISOString(),
    karachiDayEnd: new Date(endUtc.getTime() + KARACHI_OFFSET_MS).toISOString()
  });
  
  return { startUtc, endUtc };
};

attendanceSchema.statics.canReCheckIn = async function(userId, userType, date) {
  const { startUtc, endUtc } = this.getKarachiDayRangeUtc(date || new Date());

  const attendance = await this.findOne({
    userId,
    userType,
    date: { $gte: startUtc, $lt: endUtc }
  });

  if (!attendance) {
    return { canReCheckIn: false, reason: 'No initial check-in found for today' };
  }

  if (!attendance.checkOut || !attendance.checkOut.time) {
    return { canReCheckIn: false, reason: 'Please check out from your first session before re-checking in' };
  }

  if (attendance.reCheckIn && attendance.reCheckIn.time) {
    return { canReCheckIn: false, reason: 'Already re-checked in today' };
  }

  return { canReCheckIn: true, attendance };
};

// Static method to get today's attendance
attendanceSchema.statics.getTodayAttendance = async function(userId, userType) {
  const { startUtc, endUtc } = this.getKarachiDayRangeUtc(new Date());
  return await this.findOne({
    userId,
    userType,
    date: { $gte: startUtc, $lt: endUtc }
  });
};

module.exports = mongoose.model('Attendance', attendanceSchema); 