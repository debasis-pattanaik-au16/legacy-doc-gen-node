import mongoose, { Schema, Document } from 'mongoose';
import { IProject } from '@/types';

/**
 * Project Schema based on PRD specifications
 */
const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['web', 'mobile', 'desktop', 'api', 'library', 'other'],
    default: 'web'
  },
  teamMembers: [{
    user: {
      type: String,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    permissions: [{
      type: String,
      enum: ['read', 'write', 'admin']
    }],
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['created', 'uploading', 'uploaded', 'analyzing', 'analyzed', 'generating', 'completed', 'failed'],
    default: 'created'
  },
  progress: {
    uploadProgress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100']
    },
    analysisProgress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100']
    },
    documentationProgress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100']
    }
  },
  codebaseMetadata: {
    fileCount: {
      type: Number,
      default: 0,
      min: [0, 'File count cannot be negative']
    },
    languages: [{
      type: String,
      trim: true
    }],
    totalLines: {
      type: Number,
      default: 0,
      min: [0, 'Total lines cannot be negative']
    },
    complexity: {
      type: Number,
      default: 0,
      min: [0, 'Complexity cannot be negative']
    }
  },
  uploadMetadata: {
    originalFileName: String,
    fileSize: {
      type: Number,
      min: [0, 'File size cannot be negative']
    },
    uploadPath: String,
    extractedPath: String,
    uploadProgress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100']
    },
    analysisProgress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100']
    }
  },
  errorDetails: {
    message: String,
    code: String,
    timestamp: Date,
    stack: String
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      delete (ret as any).id;
    }
  }
});

// Indexes for performance
projectSchema.index({ ownerId: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ teamMembers: 1 });
projectSchema.index({ 'codebaseMetadata.languages': 1 });

// Compound indexes
projectSchema.index({ ownerId: 1, status: 1 });
projectSchema.index({ ownerId: 1, createdAt: -1 });

// Virtual for project age
projectSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Instance Methods
projectSchema.methods.findMemberById = function(id: string) {
  return this.teamMembers.find((member: any) => member.user === id);
};

projectSchema.methods.addTeamMember = function(userId: string) {
  if (!this.teamMembers.includes(userId)) {
    this.teamMembers.push(userId);
  }
  return this.save();
};

projectSchema.methods.removeTeamMember = function(userId: string) {
  this.teamMembers = this.teamMembers.filter((id: any) => id.toString() !== userId);
  return this.save();
};

projectSchema.methods.updateStatus = function(status: string, errorDetails?: any) {
  this.status = status;
  if (errorDetails && status === 'error') {
    this.errorDetails = {
      ...errorDetails,
      timestamp: new Date()
    };
  }
  return this.save();
};

projectSchema.methods.updateProgress = function(uploadProgress?: number, analysisProgress?: number) {
  if (uploadProgress !== undefined) {
    this.uploadMetadata.uploadProgress = uploadProgress;
  }
  if (analysisProgress !== undefined) {
    this.uploadMetadata.analysisProgress = analysisProgress;
  }
  return this.save();
};

// Static Methods
projectSchema.statics.findByOwner = function(ownerId: string) {
  return this.find({ ownerId }).populate('ownerId', 'name email').sort({ createdAt: -1 });
};

projectSchema.statics.findByTeamMember = function(userId: string) {
  return this.find({ 
    $or: [
      { ownerId: userId },
      { teamMembers: userId }
    ]
  }).populate('ownerId', 'name email').sort({ createdAt: -1 });
};

projectSchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).populate('ownerId', 'name email').sort({ createdAt: -1 });
};

projectSchema.statics.getProjectStats = function(ownerId?: string) {
  const matchStage = ownerId ? { $match: { ownerId: new mongoose.Types.ObjectId(ownerId) } } : { $match: {} };
  
  return this.aggregate([
    matchStage,
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalFiles: { $sum: '$codebaseMetadata.fileCount' },
        totalLines: { $sum: '$codebaseMetadata.totalLines' }
      }
    }
  ]);
};

// Pre-save middleware
projectSchema.pre('save', function(next) {
  // Auto-update status based on progress
  if (this.uploadMetadata?.uploadProgress === 100 && this.status === 'uploading') {
    this.status = 'analyzing';
  }
  if (this.uploadMetadata?.analysisProgress === 100 && this.status === 'analyzing') {
    this.status = 'completed';
  }
  next();
});

export const Project = mongoose.model<IProject>('Project', projectSchema);
