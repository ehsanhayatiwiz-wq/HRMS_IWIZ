const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
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
  employeeId: {
    type: String,
    unique: true,
    required: [true, 'Employee ID is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Design', 'Management']
  },
  position: {
    type: String,
    required: [true, 'Position is required']
  },
  phone: {
    type: String,
    required: false
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
    required: false
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  salary: {
    type: Number,
    default: 0,
    min: 0
  },
  salaryDetails: {
    basic: { type: Number, default: 0, min: 0 },
    housing: { type: Number, default: 0, min: 0 },
    transport: { type: Number, default: 0, min: 0 },
    meal: { type: Number, default: 0, min: 0 },
    medical: { type: Number, default: 0, min: 0 },
    other: { type: Number, default: 0, min: 0 }
  },
  overtimeRate: {
    type: Number,
    default: 0,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 10, // Default 10% tax rate
    min: 0,
    max: 100
  },
  insuranceRate: {
    type: Number,
    default: 5, // Default 5% insurance rate
    min: 0,
    max: 100
  },
  leaveBalance: {
    type: Number,
    default: 15,
    min: 0
  },
  assignedProjects: [{
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    role: String,
    startDate: Date,
    endDate: Date
  }],
  performanceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated', 'on_leave'],
    default: 'active'
  },
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  passwordResetRequired: {
    type: Boolean,
    default: false
  },
  mustChangePassword: {
    type: Boolean,
    default: false
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
  },
  skills: [String],
  certifications: [{
    name: String,
    issuer: String,
    dateObtained: Date,
    expiryDate: Date
  }]
}, {
  timestamps: true
});

// Remove redundant manual indexes to avoid duplicate index warnings
// employeeSchema.index({ email: 1 });
// employeeSchema.index({ employeeId: 1 });
// employeeSchema.index({ department: 1 });
// employeeSchema.index({ status: 1 });

// Hash password before saving
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate employee ID
employeeSchema.statics.generateEmployeeId = async function() {
  const year = new Date().getFullYear();
  const prefix = `IWIZ${year}`;

  // Find the latest employeeId for this year and increment the numeric suffix
  const latest = await this.findOne({ employeeId: { $regex: `^${prefix}` } })
    .sort({ employeeId: -1 })
    .lean();

  let nextNumber = 1;
  if (latest && latest.employeeId && typeof latest.employeeId === 'string') {
    const suffix = latest.employeeId.replace(prefix, '');
    const parsed = parseInt(suffix, 10);
    if (!Number.isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  // Ensure uniqueness in case of race conditions
  while (true) {
    const candidate = `${prefix}${String(nextNumber).padStart(4, '0')}`;
    const exists = await this.exists({ employeeId: candidate });
    if (!exists) return candidate;
    nextNumber += 1;
  }
};

// Virtual for full address
employeeSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}, ${this.address.country}`;
});

// JSON transform to exclude password
employeeSchema.methods.toJSON = function() {
  const employeeObject = this.toObject();
  delete employeeObject.password;
  return employeeObject;
};

module.exports = mongoose.model('Employee', employeeSchema);
