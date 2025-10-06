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
 * Code Example Schema
 */
const codeExampleSchema = new Schema({
  code: {
    type: String,
    required: true
  },
  file: {
    type: String,
    required: true
  },
  line: {
    type: Number,
    required: true
  },
  context: {
    type: String,
    required: true
  }
}, { _id: false });

/**
 * Analysis Insight Schema (from DependencyAnalyzer)
 */
const analysisInsightSchema = new Schema({
  type: {
    type: String,
    enum: ['warning', 'info', 'suggestion', 'error'],
    required: true
  },
  category: {
    type: String,
    enum: ['architecture', 'performance', 'maintainability', 'security'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  impact: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  affectedFiles: [{
    type: String,
    trim: true
  }],
  codeExamples: [codeExampleSchema]
}, { _id: false });

/**
 * Recommendation Schema (from DependencyAnalyzer)
 */
const recommendationSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['refactor', 'optimize', 'security', 'architecture'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  benefits: [{
    type: String,
    trim: true
  }],
  effort: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  implementation: [{
    type: String,
    trim: true
  }]
}, { _id: false });

/**
 * Analysis Result Schema based on PRD specifications
 */
const analysisResultSchema = new Schema<IAnalysisResult>({
  projectId: {
    type: Schema.Types.ObjectId,
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
  },
  // Phase 1: AI-generated insights and recommendations
  insights: [analysisInsightSchema],
  recommendations: [recommendationSchema],
  
  // Phase 2: Advanced Analysis Results
  security: {
    type: Schema.Types.Mixed,
    description: 'Security vulnerability analysis results from Phase 2.1'
  },
  codeSmells: {
    type: Schema.Types.Mixed,
    description: 'Code smell detection results from Phase 2.2'
  },
  metrics: {
    type: Schema.Types.Mixed,
    description: 'Enhanced complexity and quality metrics from Phase 2.3'
  },
  api: {
    type: Schema.Types.Mixed,
    description: 'Comprehensive API endpoint analysis from Phase 2.4'
  },
  database: {
    type: Schema.Types.Mixed,
    description: 'Database schema analysis results from Phase 2.5'
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
analysisResultSchema.index({ projectId: 1 }, { unique: true });
analysisResultSchema.index({ createdAt: -1 });
analysisResultSchema.index({ 'components.type': 1 });
analysisResultSchema.index({ 'apiEndpoints.method': 1 });
// Phase 1: Indexes for insights and recommendations
analysisResultSchema.index({ 'insights.impact': 1 });
analysisResultSchema.index({ 'insights.category': 1 });
analysisResultSchema.index({ 'recommendations.priority': 1 });
analysisResultSchema.index({ 'recommendations.type': 1 });
// Phase 2: Indexes for advanced analysis results
analysisResultSchema.index({ 'security.summary.totalIssues': 1 });
analysisResultSchema.index({ 'security.summary.issuesBySeverity.critical': 1 });
analysisResultSchema.index({ 'codeSmells.summary.totalSmells': 1 });
analysisResultSchema.index({ 'api.statistics.totalEndpoints': 1 });
analysisResultSchema.index({ 'database.statistics.totalEntities': 1 });

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

analysisResultSchema.methods.getInsightsByImpact = function(impact: string) {
  return this.insights?.filter((insight: any) => insight.impact === impact) || [];
};

analysisResultSchema.methods.getRecommendationsByPriority = function(priority: string) {
  return this.recommendations?.filter((rec: any) => rec.priority === priority) || [];
};

analysisResultSchema.methods.getCriticalIssues = function() {
  const criticalInsights = this.insights?.filter((i: any) => i.impact === 'critical') || [];
  const criticalRecs = this.recommendations?.filter((r: any) => r.priority === 'critical') || [];
  return { insights: criticalInsights, recommendations: criticalRecs };
};

// Phase 2: Helper methods for advanced analysis results
analysisResultSchema.methods.getSecurityIssuesBySeverity = function(severity: string) {
  return this.security?.issues?.filter((issue: any) => issue.severity === severity) || [];
};

analysisResultSchema.methods.getCodeSmellsByType = function(type: string) {
  return this.codeSmells?.smells?.filter((smell: any) => smell.type === type) || [];
};

analysisResultSchema.methods.getApiEndpointsByFramework = function(framework: string) {
  return this.api?.endpoints?.filter((endpoint: any) => endpoint.framework === framework) || [];
};

analysisResultSchema.methods.getDatabaseEntitiesByORM = function(ormType: string) {
  return this.database?.entities?.filter((entity: any) => entity.orm?.type === ormType) || [];
};

analysisResultSchema.methods.getPhase2Summary = function() {
  return {
    security: {
      totalIssues: this.security?.summary?.totalIssues || 0,
      criticalIssues: this.security?.summary?.issuesBySeverity?.critical || 0,
      highIssues: this.security?.summary?.issuesBySeverity?.high || 0
    },
    codeSmells: {
      totalSmells: this.codeSmells?.summary?.totalSmells || 0,
      criticalSmells: this.codeSmells?.summary?.bySeverity?.critical || 0,
      highSmells: this.codeSmells?.summary?.bySeverity?.high || 0
    },
    api: {
      totalEndpoints: this.api?.statistics?.totalEndpoints || 0,
      frameworks: this.api?.frameworks?.length || 0,
      authenticatedEndpoints: this.api?.statistics?.authenticatedEndpoints || 0
    },
    database: {
      totalEntities: this.database?.statistics?.totalEntities || 0,
      totalRelationships: this.database?.statistics?.totalRelationships || 0,
      issues: this.database?.issues?.length || 0
    },
    metrics: {
      couplingIndex: this.metrics?.couplingIndex || 0,
      cohesionIndex: this.metrics?.cohesionIndex || 0,
      instabilityIndex: this.metrics?.instabilityIndex || 0
    }
  };
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
