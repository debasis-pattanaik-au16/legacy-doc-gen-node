import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { IUser, IUserModel, UserProfileDTO } from '../types';
import { config } from '@/config/env';

/**
 * User Schema based on PRD specifications
 */
const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'viewer'],
    default: 'user'
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date
  },
  
  // Profile & Settings (NEW)
  company: {
    type: String,
    trim: true,
    maxlength: [120, 'Company name cannot exceed 120 characters']
  },
  timezone: {
    type: String,
    default: 'UTC',
    required: true
  },
  avatarUrl: {
    type: String
  },
  notifications: {
    productUpdates: {
      type: Boolean,
      default: false
    },
    analysisReady: {
      type: Boolean,
      default: true
    }
  },
  preferences: {
    autoSave: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: {
    transform: function(doc: any, ret: any) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Update lastLogin on successful authentication
userSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('password')) {
    this.lastLogin = new Date();
  }
  next();
});

// Instance Methods
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function(): string {
  return jwt.sign(
    { 
      userId: this._id,
      email: this.email,
      role: this.role 
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE } as jwt.SignOptions
  );
};

userSchema.methods.generateRefreshToken = function(): string {
  return jwt.sign(
    { 
      userId: this._id,
      type: 'refresh'
    },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRE } as jwt.SignOptions
  );
};

userSchema.methods.generateEmailVerificationToken = function(): string {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  return token;
};

userSchema.methods.generatePasswordResetToken = function(): string {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return token;
};

/**
 * Convert user document to sanitized profile DTO
 * Excludes sensitive fields like password, tokens, etc.
 */
userSchema.methods.toProfileDTO = function(): UserProfileDTO {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    company: this.company,
    timezone: this.timezone,
    avatarUrl: this.avatarUrl,
    notifications: {
      productUpdates: this.notifications?.productUpdates ?? false,
      analysisReady: this.notifications?.analysisReady ?? true
    },
    preferences: {
      autoSave: this.preferences?.autoSave ?? false
    },
    role: this.role,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString()
  };
};

// Static Methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email }).select('+password');
};

userSchema.statics.findByResetToken = function(token: string) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
};

userSchema.statics.findByVerificationToken = function(token: string) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    emailVerificationToken: hashedToken,
    isEmailVerified: false
  });
};

// Virtual for user's projects count (will be populated when needed)
userSchema.virtual('projectsCount', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'ownerId',
  count: true
});

export const User = mongoose.model<IUser, IUserModel>('User', userSchema) as IUserModel;
