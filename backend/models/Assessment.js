const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee ID is required']
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },
  assessorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Assessor ID is required']
  },
  assessmentId: {
    type: String,
    unique: true,
    required: [true, 'Assessment ID is required']
  },
  assessmentDate: {
    type: Date,
    default: Date.now
  },
  period: {
    startDate: {
      type: Date,
      required: [true, 'Assessment period start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'Assessment period end date is required']
    }
  },
  criteria: {
    technicalSkills: {
      score: {
        type: Number,
        required: true,
        min: 1,
        max: 10
      },
      comments: String
    },
    communication: {
      score: {
        type: Number,
        required: true,
        min: 1,
        max: 10
      },
      comments: String
    },
    teamwork: {
      score: {
        type: Number,
        required: true,
        min: 1,
        max: 10
      },
      comments: String
    },
    problemSolving: {
      score: {
        type: Number,
        required: true,
        min: 1,
        max: 10
      },
      comments: String
    },
    leadership: {
      score: {
        type: Number,
        required: true,
        min: 1,
        max: 10
      },
      comments: String
    },
    productivity: {
      score: {
        type: Number,
        required: true,
        min: 1,
        max: 10
      },
      comments: String
    }
  },
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
    required: true
  },
  strengths: [String],
  areasForImprovement: [String],
  recommendations: [String],
  goals: [{
    goal: String,
    targetDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue'],
      default: 'pending'
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'approved', 'rejected'],
    default: 'draft'
  },
  comments: {
    employee: String,
    assessor: String,
    hr: String
  },
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
assessmentSchema.index({ assessmentId: 1 });
assessmentSchema.index({ employeeId: 1 });
assessmentSchema.index({ projectId: 1 });
assessmentSchema.index({ assessorId: 1 });
assessmentSchema.index({ status: 1 });
assessmentSchema.index({ assessmentDate: -1 });

// Generate assessment ID
assessmentSchema.statics.generateAssessmentId = async function() {
  const count = await this.countDocuments();
  const year = new Date().getFullYear();
  return `ASSESS${year}${String(count + 1).padStart(4, '0')}`;
};

// Calculate overall score before saving
assessmentSchema.pre('save', function(next) {
  if (this.isModified('criteria')) {
    const scores = [
      this.criteria.technicalSkills.score,
      this.criteria.communication.score,
      this.criteria.teamwork.score,
      this.criteria.problemSolving.score,
      this.criteria.leadership.score,
      this.criteria.productivity.score
    ];
    
    this.overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 10);
    
    // Calculate grade based on overall score
    if (this.overallScore >= 95) this.grade = 'A+';
    else if (this.overallScore >= 90) this.grade = 'A';
    else if (this.overallScore >= 85) this.grade = 'B+';
    else if (this.overallScore >= 80) this.grade = 'B';
    else if (this.overallScore >= 75) this.grade = 'C+';
    else if (this.overallScore >= 70) this.grade = 'C';
    else if (this.overallScore >= 60) this.grade = 'D';
    else this.grade = 'F';
  }
  next();
});

// Virtual for assessment period duration
assessmentSchema.virtual('periodDuration').get(function() {
  if (!this.period.startDate || !this.period.endDate) return 0;
  const diffTime = Math.abs(this.period.endDate - this.period.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for grade color
assessmentSchema.virtual('gradeColor').get(function() {
  const colors = {
    'A+': 'success',
    'A': 'success',
    'B+': 'info',
    'B': 'info',
    'C+': 'warning',
    'C': 'warning',
    'D': 'danger',
    'F': 'danger'
  };
  return colors[this.grade] || 'secondary';
});

module.exports = mongoose.model('Assessment', assessmentSchema);
