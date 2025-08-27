const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    maxlength: [500, 'Project description cannot exceed 500 characters']
  },
  projectId: {
    type: String,
    unique: true,
    required: [true, 'Project ID is required']
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'on_hold', 'cancelled'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  budget: {
    type: Number,
    default: 0
  },
  assignedEmployees: [{
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    role: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    hoursAllocated: {
      type: Number,
      default: 0
    }
  }],
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Design']
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tags: [String],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
projectSchema.index({ projectId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ department: 1 });
projectSchema.index({ manager: 1 });

// Generate project ID
projectSchema.statics.generateProjectId = async function() {
  const count = await this.countDocuments();
  const year = new Date().getFullYear();
  return `PROJ${year}${String(count + 1).padStart(4, '0')}`;
};

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  if (!this.startDate || !this.endDate) return 0;
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for project status color
projectSchema.virtual('statusColor').get(function() {
  const colors = {
    planning: 'warning',
    active: 'success',
    completed: 'info',
    on_hold: 'secondary',
    cancelled: 'danger'
  };
  return colors[this.status] || 'primary';
});

module.exports = mongoose.model('Project', projectSchema);
