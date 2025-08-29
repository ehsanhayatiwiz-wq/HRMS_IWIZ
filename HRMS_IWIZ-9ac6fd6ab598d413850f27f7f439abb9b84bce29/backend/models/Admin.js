const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  adminId: {
    type: String,
    unique: true,
    required: [true, 'Admin ID is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Design', 'Management']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    default: 'Administrator'
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  address: {
    street: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    zipCode: { type: String, required: false },
    country: { type: String, required: false }
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  salary: {
    type: Number,
    default: 0
  },
  permissions: {
    canManageEmployees: { type: Boolean, default: true },
    canManageLeaves: { type: Boolean, default: true },
    canManageAttendance: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true },
    canManageSystem: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  }
}, {
  timestamps: true
});

// Remove redundant manual indexes to avoid duplicate index warnings
// adminSchema.index({ email: 1 });
// adminSchema.index({ adminId: 1 });
// adminSchema.index({ department: 1 });

// TEMPORARILY DISABLED: Hash password before saving
// adminSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   
//   try {
//     const salt = await bcrypt.genSalt(12);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// TEMPORARILY DISABLED: Compare password method (direct string comparison for testing)
adminSchema.methods.comparePassword = async function(candidatePassword) {
  // return await bcrypt.compare(candidatePassword, this.password);
  return candidatePassword === this.password;
};

// Generate admin ID
adminSchema.statics.generateAdminId = async function generateAdminId() {
  const year = new Date().getFullYear();
  const prefix = `ADMIN${year}`;

  // Find the latest adminId for this year and increment the numeric suffix
  const latest = await this.findOne({ adminId: { $regex: `^${prefix}` } })
    .sort({ adminId: -1 })
    .lean();

  let nextNumber = 1;
  if (latest && latest.adminId && typeof latest.adminId === 'string') {
    const suffix = latest.adminId.replace(prefix, '');
    const parsed = parseInt(suffix, 10);
    if (!Number.isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  // Ensure uniqueness in case of race conditions
  // Increment until we find a free identifier
  // This loop is short as collisions are rare
  // and bounded by a handful of attempts
  // (Mongo unique index will still protect at write time)
  //
  // Example: ADMIN20250001, ADMIN20250002, ...
  //
  // If there is still a duplicate, the caller will receive
  // a duplicate key error which is handled in the route.
  //
  // This function avoids most collisions compared to
  // countDocuments-based generation.
  while (true) {
    const candidate = `${prefix}${String(nextNumber).padStart(4, '0')}`;
    // exists() is efficient and returns null or {_id}
    const exists = await this.exists({ adminId: candidate });
    if (!exists) return candidate;
    nextNumber += 1;
  }
};

// Virtual for full address
adminSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}, ${this.address.country}`;
});

// JSON transform to exclude password
adminSchema.methods.toJSON = function() {
  const adminObject = this.toObject();
  delete adminObject.password;
  return adminObject;
};

module.exports = mongoose.model('Admin', adminSchema);
