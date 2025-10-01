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
  // Cloud storage URLs
  cloudStorageUrls?: {
    readme?: string;
    apiDocs?: string;
    architecture?: string;
    components?: string;
    dependencies?: string;
    zipArchive?: string;
  };
  // Cloud storage keys (internal paths in storage)
  cloudStorageKeys?: {
    readme?: string;
    apiDocs?: string;
    architecture?: string;
    components?: string;
    dependencies?: string;
    zipArchive?: string;
  };
  // Storage provider type
  cloudStorageProvider?: 'local' | 'oracle_cloud' | 'aws_s3' | 'azure_blob' | 'gcp';
  // Cloud storage metadata
  cloudStorageMetadata?: {
    uploadedAt?: Date;
    totalSize?: number;
    region?: string;
    bucket?: string;
    urlExpiresAt?: Date;
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
  updateCloudStorage(
    urls: { readme?: string; apiDocs?: string; architecture?: string; components?: string; dependencies?: string; zipArchive?: string },
    keys: { readme?: string; apiDocs?: string; architecture?: string; components?: string; dependencies?: string; zipArchive?: string },
    provider: string,
    metadata?: { totalSize?: number; region?: string; bucket?: string; urlExpiresAt?: Date }
  ): Promise<IDocumentationJob>;
  getSignedUrls(expiresIn?: number): Promise<{ readme?: string; apiDocs?: string; architecture?: string; components?: string; dependencies?: string; zipArchive?: string }>;
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
 * Cloud Storage URLs Schema
 */
const cloudStorageUrlsSchema = new Schema({
  readme: { type: String, trim: true },
  apiDocs: { type: String, trim: true },
  architecture: { type: String, trim: true },
  components: { type: String, trim: true },
  dependencies: { type: String, trim: true },
  zipArchive: { type: String, trim: true }
}, { _id: false });

/**
 * Cloud Storage Keys Schema (internal storage paths)
 */
const cloudStorageKeysSchema = new Schema({
  readme: { type: String, trim: true },
  apiDocs: { type: String, trim: true },
  architecture: { type: String, trim: true },
  components: { type: String, trim: true },
  dependencies: { type: String, trim: true },
  zipArchive: { type: String, trim: true }
}, { _id: false });

/**
 * Cloud Storage Metadata Schema
 */
const cloudStorageMetadataSchema = new Schema({
  uploadedAt: { type: Date },
  totalSize: { type: Number, min: 0 },
  region: { type: String, trim: true },
  bucket: { type: String, trim: true },
  urlExpiresAt: { type: Date }
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
  cloudStorageUrls: {
    type: cloudStorageUrlsSchema,
    default: () => ({})
  },
  cloudStorageKeys: {
    type: cloudStorageKeysSchema,
    default: () => ({})
  },
  cloudStorageProvider: {
    type: String,
    enum: {
      values: ['local', 'oracle_cloud', 'aws_s3', 'azure_blob', 'gcp'],
      message: 'Storage provider must be one of: local, oracle_cloud, aws_s3, azure_blob, gcp'
    },
    default: 'local',
    index: true
  },
  cloudStorageMetadata: {
    type: cloudStorageMetadataSchema,
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
// Cloud storage indexes
documentationJobSchema.index({ cloudStorageProvider: 1, status: 1 });
documentationJobSchema.index({ 'cloudStorageMetadata.uploadedAt': 1 });

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

/**
 * Update cloud storage information for the job
 * Stores URLs, keys, provider, and metadata for cloud-stored documentation
 */
documentationJobSchema.methods.updateCloudStorage = function(
  urls: { readme?: string; apiDocs?: string; architecture?: string; components?: string; dependencies?: string; zipArchive?: string },
  keys: { readme?: string; apiDocs?: string; architecture?: string; components?: string; dependencies?: string; zipArchive?: string },
  provider: string,
  metadata?: { totalSize?: number; region?: string; bucket?: string; urlExpiresAt?: Date }
): Promise<IDocumentationJob> {
  this.cloudStorageUrls = { ...this.cloudStorageUrls?.toObject(), ...urls };
  this.cloudStorageKeys = { ...this.cloudStorageKeys?.toObject(), ...keys };
  this.cloudStorageProvider = provider as any;
  
  // Update metadata
  const currentMetadata = this.cloudStorageMetadata?.toObject() || {};
  this.cloudStorageMetadata = {
    uploadedAt: new Date(),
    totalSize: metadata?.totalSize || currentMetadata.totalSize,
    region: metadata?.region || currentMetadata.region,
    bucket: metadata?.bucket || currentMetadata.bucket,
    urlExpiresAt: metadata?.urlExpiresAt || currentMetadata.urlExpiresAt
  };
  
  return this.save();
};

/**
 * Get signed URLs for all cloud-stored files
 * Regenerates signed URLs if they are expired or near expiration
 */
documentationJobSchema.methods.getSignedUrls = async function(
  expiresIn?: number
): Promise<{ readme?: string; apiDocs?: string; architecture?: string; components?: string; dependencies?: string; zipArchive?: string }> {
  // Import storage provider factory dynamically to avoid circular dependencies
  const { StorageProviderFactory } = await import('../services/storage/StorageProviderFactory');
  
  // Check if URLs need refresh
  const urlExpiresAt = this.cloudStorageMetadata?.urlExpiresAt;
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  // If URLs are still valid for more than 5 minutes, return existing URLs
  if (urlExpiresAt && urlExpiresAt > fiveMinutesFromNow && this.cloudStorageUrls) {
    return this.cloudStorageUrls.toObject();
  }
  
  // Need to regenerate URLs
  if (!this.cloudStorageKeys || !this.cloudStorageProvider) {
    throw new Error('Cloud storage keys or provider not available');
  }
  
  try {
    const provider = StorageProviderFactory.create(this.cloudStorageProvider as any);
    const newUrls: any = {};
    const keys = this.cloudStorageKeys.toObject();
    
    // Generate signed URLs for each file
    const urlPromises = Object.entries(keys).map(async ([fileType, key]) => {
      if (key) {
        try {
          const signedUrl = await provider.getSignedUrl(key as string, { expiresIn });
          newUrls[fileType] = signedUrl;
        } catch (error: any) {
          console.error(`Failed to generate signed URL for ${fileType}:`, error.message);
        }
      }
    });
    
    await Promise.all(urlPromises);
    
    // Update URLs and expiry in database
    const expirySeconds = expiresIn || 3600;
    const newExpiresAt = new Date(now.getTime() + expirySeconds * 1000);
    
    this.cloudStorageUrls = newUrls;
    if (this.cloudStorageMetadata) {
      this.cloudStorageMetadata.urlExpiresAt = newExpiresAt;
    } else {
      this.cloudStorageMetadata = {
        urlExpiresAt: newExpiresAt
      };
    }
    
    await this.save();
    
    return newUrls;
  } catch (error: any) {
    console.error('Failed to get signed URLs:', error);
    throw new Error(`Failed to generate signed URLs: ${error.message}`);
  }
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
