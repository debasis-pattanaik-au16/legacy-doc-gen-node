import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Documentation Job Interface
 * Tracks the status and progress of documentation generation for projects
 */
export interface IDocumentationJob extends Document {
  _id: string;
  projectId: mongoose.Types.ObjectId;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  sections: string[]; // ['readme', 'api', 'architecture']
  generatedFiles: {
    readme?: string;
    apiDocs?: string;
    architecture?: string;
    components?: string;
    dependencies?: string;
  };
  // Cloud storage URLs (for future S3 integration)
  storageUrls?: {
    readme?: string;
    apiDocs?: string;
    architecture?: string;
    components?: string;
    dependencies?: string;
    archiveUrl?: string;
  };
  // Storage metadata
  storageProvider?: 'local' | 's3' | 'azure' | 'gcp';
  storageKeys?: {
    readme?: string;
    apiDocs?: string;
    architecture?: string;
    components?: string;
    dependencies?: string;
    archiveKey?: string;
  };
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  errorDetails?: {
    step: string;
    message: string;
    stack?: string;
    timestamp: Date;
  };
  userId: string; // User who initiated the job
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  updateProgress(progress: number, step: string): Promise<IDocumentationJob>;
  markCompleted(files: { readme?: string; apiDocs?: string; architecture?: string }): Promise<IDocumentationJob>;
  markFailed(error: string, step?: string, stack?: string): Promise<IDocumentationJob>;
  getExecutionTime(): number;
}

/**
 * Documentation Job Model Interface with static methods
 */
export interface IDocumentationJobModel extends Model<IDocumentationJob> {
  findByProject(projectId: string, userId?: string): Promise<IDocumentationJob[]>;
  findByUser(userId: string, status?: string): Promise<IDocumentationJob[]>;
  getActiveJobs(): Promise<IDocumentationJob[]>;
  getJobStats(userId?: string): Promise<any[]>;
}

/**
 * Generated Files Schema
 */
const generatedFilesSchema = new Schema({
  readme: {
    type: String,
    trim: true
  },
  apiDocs: {
    type: String,
    trim: true
  },
  architecture: {
    type: String,
    trim: true
  },
  components: {
    type: String,
    trim: true
  },
  dependencies: {
    type: String,
    trim: true
  }
}, { _id: false });

/**
 * Storage URLs Schema (for cloud storage references)
 */
const storageUrlsSchema = new Schema({
  readme: { type: String, trim: true },
  apiDocs: { type: String, trim: true },
  architecture: { type: String, trim: true },
  components: { type: String, trim: true },
  dependencies: { type: String, trim: true },
  archiveUrl: { type: String, trim: true }
}, { _id: false });

/**
 * Storage Keys Schema (for cloud storage key references)
 */
const storageKeysSchema = new Schema({
  readme: { type: String, trim: true },
  apiDocs: { type: String, trim: true },
  architecture: { type: String, trim: true },
  components: { type: String, trim: true },
  dependencies: { type: String, trim: true },
  archiveKey: { type: String, trim: true }
}, { _id: false });

/**
 * Error Details Schema
 */
const errorDetailsSchema = new Schema({
  step: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  stack: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/**
 * Documentation Job Schema
 */
const documentationJobSchema = new Schema<IDocumentationJob>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ['queued', 'processing', 'completed', 'failed'],
      message: 'Status must be one of: queued, processing, completed, failed'
    },
    default: 'queued',
    index: true
  },
  progress: {
    type: Number,
    min: [0, 'Progress cannot be less than 0'],
    max: [100, 'Progress cannot be greater than 100'],
    default: 0
  },
  currentStep: {
    type: String,
    default: 'Initializing documentation generation',
    trim: true,
    maxlength: [200, 'Current step description cannot exceed 200 characters']
  },
  sections: [{
    type: String,
    enum: {
      values: ['readme', 'api', 'architecture', 'components', 'dependencies'],
      message: 'Invalid section type'
    }
  }],
  generatedFiles: {
    type: generatedFilesSchema,
    default: () => ({})
  },
  storageUrls: {
    type: storageUrlsSchema,
    default: () => ({})
  },
  storageProvider: {
    type: String,
    enum: ['local', 's3', 'azure', 'gcp'],
    default: 'local'
  },
  storageKeys: {
    type: storageKeysSchema,
    default: () => ({})
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    index: true
  },
  errorMessage: {
    type: String,
    maxlength: [1000, 'Error message cannot exceed 1000 characters']
  },
  errorDetails: errorDetailsSchema,
  userId: {
    type: String,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      delete (ret as any).id;
      return ret;
    }
  }
});

// Compound Indexes for performance
documentationJobSchema.index({ projectId: 1, userId: 1 });
documentationJobSchema.index({ status: 1, createdAt: -1 });
documentationJobSchema.index({ userId: 1, status: 1 });
documentationJobSchema.index({ projectId: 1, status: 1 });

// Virtual for execution time calculation
documentationJobSchema.virtual('executionTime').get(function() {
  if (this.completedAt) {
    return this.completedAt.getTime() - this.startedAt.getTime();
  }
  return Date.now() - this.startedAt.getTime();
});

// Instance Methods
documentationJobSchema.methods.updateProgress = function(progress: number, step: string): Promise<IDocumentationJob> {
  this.progress = Math.max(0, Math.min(100, progress));
  this.currentStep = step;
  
  // Auto-update status based on progress
  if (progress === 0 && this.status === 'queued') {
    this.status = 'processing';
  }
  
  return this.save();
};

documentationJobSchema.methods.markCompleted = function(files: { readme?: string; apiDocs?: string; architecture?: string }): Promise<IDocumentationJob> {
  this.status = 'completed';
  this.progress = 100;
  this.currentStep = 'Documentation generation completed successfully';
  this.completedAt = new Date();
  this.generatedFiles = { ...this.generatedFiles.toObject(), ...files };
  this.errorMessage = undefined;
  this.errorDetails = undefined;
  
  return this.save();
};

documentationJobSchema.methods.markFailed = function(error: string, step?: string, stack?: string): Promise<IDocumentationJob> {
  this.status = 'failed';
  this.errorMessage = error;
  this.currentStep = `Failed: ${step || this.currentStep}`;
  this.completedAt = new Date();
  
  if (step) {
    this.errorDetails = {
      step,
      message: error,
      stack,
      timestamp: new Date()
    };
  }
  
  return this.save();
};

documentationJobSchema.methods.getExecutionTime = function(): number {
  if (this.completedAt) {
    return this.completedAt.getTime() - this.startedAt.getTime();
  }
  return Date.now() - this.startedAt.getTime();
};

// Static Methods
documentationJobSchema.statics.findByProject = function(projectId: string, userId?: string) {
  const query: any = { projectId };
  if (userId) query.userId = userId;
  
  return this.find(query)
    .populate('projectId', 'name status')
    .sort({ createdAt: -1 });
};

documentationJobSchema.statics.findByUser = function(userId: string, status?: string) {
  const query: any = { userId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('projectId', 'name status')
    .sort({ createdAt: -1 });
};

documentationJobSchema.statics.getActiveJobs = function() {
  return this.find({ 
    status: { $in: ['queued', 'processing'] }
  })
  .populate('projectId', 'name')
  .populate('userId', 'name email')
  .sort({ createdAt: 1 }); // FIFO order
};

documentationJobSchema.statics.getJobStats = function(userId?: string) {
  const matchStage = userId ? { $match: { userId } } : { $match: {} };
  
  return this.aggregate([
    matchStage,
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgExecutionTime: {
          $avg: {
            $cond: [
              { $ne: ['$completedAt', null] },
              { $subtract: ['$completedAt', '$startedAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
};

// Pre-save middleware
documentationJobSchema.pre('save', function(next) {
  // Ensure sections array has default values if empty
  if (this.sections.length === 0) {
    this.sections = ['readme', 'api', 'architecture'];
  }
  
  // Validate progress and status consistency
  if (this.status === 'completed' && this.progress !== 100) {
    this.progress = 100;
  }
  
  if (this.status === 'failed' && !this.errorMessage) {
    this.errorMessage = 'Documentation generation failed due to unknown error';
  }
  
  next();
});

// Post-save middleware for logging
documentationJobSchema.post('save', function(doc) {
  console.log(`DocumentationJob ${doc._id} updated: ${doc.status} - ${doc.progress}% - ${doc.currentStep}`);
});

export const DocumentationJob = mongoose.model<IDocumentationJob, IDocumentationJobModel>('DocumentationJob', documentationJobSchema);
