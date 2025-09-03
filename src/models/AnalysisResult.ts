import mongoose, { Schema, Document } from 'mongoose';
import { IAnalysisResult, Component, Dependency, ApiEndpoint, DatabaseSchema, ComplexityMetrics } from '@/types';

/**
 * Component Schema
 */
const componentSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['function', 'class', 'module', 'component'],
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  startLine: {
    type: Number,
    required: true,
    min: 1
  },
  endLine: {
    type: Number,
    required: true,
    min: 1
  },
  description: String,
  parameters: [{
    name: String,
    type: String,
    required: Boolean,
    description: String
  }],
  returnType: String,
  dependencies: [String]
}, { _id: false });

/**
 * Dependency Schema
 */
const dependencySchema = new Schema({
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['import', 'require', 'call', 'inheritance'],
    required: true
  },
  filePath: {
    type: String,
    required: true
  }
}, { _id: false });

/**
 * API Endpoint Schema
 */
const apiEndpointSchema = new Schema({
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    required: true
  },
  path: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  handler: {
    type: String,
    required: true
  },
  parameters: [{
    name: String,
    type: String,
    required: Boolean,
    description: String
  }],
  responses: [{
    statusCode: Number,
    description: String,
    schema: Schema.Types.Mixed
  }]
}, { _id: false });

/**
 * Database Schema
 */
const databaseSchemaSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['table', 'collection'],
    required: true
  },
  fields: [{
    name: String,
    type: String,
    required: Boolean,
    unique: Boolean,
    index: Boolean
  }],
  relationships: [{
    type: {
      type: String,
      enum: ['oneToOne', 'oneToMany', 'manyToMany']
    },
    target: String,
    foreignKey: String
  }]
}, { _id: false });

/**
 * Complexity Metrics Schema
 */
const complexityMetricsSchema = new Schema({
  cyclomaticComplexity: {
    type: Number,
    default: 0,
    min: 0
  },
  linesOfCode: {
    type: Number,
    default: 0,
    min: 0
  },
  maintainabilityIndex: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  technicalDebt: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

/**
 * Analysis Result Schema based on PRD specifications
 */
const analysisResultSchema = new Schema<IAnalysisResult>({
  projectId: {
    type: String,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },
  components: [componentSchema],
  dependencies: [dependencySchema],
  apiEndpoints: [apiEndpointSchema],
  databaseSchemas: [databaseSchemaSchema],
  architecturePatterns: [{
    type: String,
    trim: true
  }],
  complexityMetrics: {
    type: complexityMetricsSchema,
    default: () => ({})
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      delete (ret as any).id;
    }
  }
});

// Indexes for performance
analysisResultSchema.index({ projectId: 1 });
analysisResultSchema.index({ generatedAt: -1 });
analysisResultSchema.index({ 'components.type': 1 });
analysisResultSchema.index({ 'apiEndpoints.method': 1 });

// Instance Methods
analysisResultSchema.methods.getComponentsByType = function(type: string) {
  return this.components.filter((component: Component) => component.type === type);
};

analysisResultSchema.methods.getApiEndpointsByMethod = function(method: string) {
  return this.apiEndpoints.filter((endpoint: ApiEndpoint) => endpoint.method === method);
};

analysisResultSchema.methods.getDependenciesByType = function(type: string) {
  return this.dependencies.filter((dependency: Dependency) => dependency.type === type);
};

// Static Methods
analysisResultSchema.statics.findByProject = function(projectId: string) {
  return this.findOne({ projectId }).populate('projectId', 'name status');
};

analysisResultSchema.statics.getAnalysisStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        avgComponents: { $avg: { $size: '$components' } },
        avgDependencies: { $avg: { $size: '$dependencies' } },
        avgApiEndpoints: { $avg: { $size: '$apiEndpoints' } },
        avgComplexity: { $avg: '$complexityMetrics.cyclomaticComplexity' }
      }
    }
  ]);
};

export const AnalysisResult = mongoose.model<IAnalysisResult>('AnalysisResult', analysisResultSchema);
