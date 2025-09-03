import mongoose, { Schema, Document } from 'mongoose';
import { IDocumentation, DocumentSection, Diagram } from '@/types';

/**
 * Document Section Schema
 */
const documentSectionSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Section title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['markdown', 'diagram', 'code'],
    default: 'markdown'
  },
  order: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

/**
 * Diagram Schema
 */
const diagramSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Diagram title cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: ['architecture', 'database', 'flow', 'sequence'],
    required: true
  },
  mermaidCode: {
    type: String,
    required: true
  },
  description: {
    type: String,
    maxlength: [500, 'Diagram description cannot exceed 500 characters']
  }
}, { _id: false });

/**
 * Documentation Schema based on PRD specifications
 */
const documentationSchema = new Schema<IDocumentation>({
  projectId: {
    type: String,
    ref: 'Project',
    required: [true, 'Project ID is required'],
    unique: true
  },
  sections: [documentSectionSchema],
  diagrams: [diagramSchema],
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  lastEditedBy: {
    type: String,
    ref: 'User',
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  exportFormats: [{
    format: {
      type: String,
      enum: ['pdf', 'html', 'markdown', 'docx']
    },
    url: String,
    generatedAt: Date,
    fileSize: Number
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for performance
documentationSchema.index({ projectId: 1 });
documentationSchema.index({ lastEditedBy: 1 });
documentationSchema.index({ isPublished: 1 });
documentationSchema.index({ version: -1 });

// Instance Methods
documentationSchema.methods.addSection = function(section: DocumentSection) {
  this.sections.push(section);
  this.sections.sort((a: any, b: any) => a.order - b.order);
  this.version += 1;
  return this.save();
};

documentationSchema.methods.sortSectionsByOrder = function() {
  this.sections.sort((a: any, b: any) => a.order - b.order);
  return this;
};

documentationSchema.methods.updateSectionContent = function(title: string, content: string) {
  const section = this.sections.find((s: any) => s.title === title);
  if (section) {
    section.content = content;
    section.lastModified = new Date();
  }
  return this;
};

documentationSchema.methods.updateSection = function(sectionId: string, updates: Partial<DocumentSection>) {
  const section = this.sections.find((s: any) => s.id === sectionId);
  if (section) {
    Object.assign(section, updates);
    this.version += 1;
    return this.save();
  }
  throw new Error('Section not found');
};

documentationSchema.methods.removeSection = function(sectionId: string) {
  this.sections = this.sections.filter((s: any) => s.id !== sectionId);
  this.version += 1;
  return this.save();
};

documentationSchema.methods.addDiagram = function(d: any) {
  this.diagrams.push(d);
  return this.save();
};

documentationSchema.methods.updateDiagram = function(diagramId: string, updates: Partial<Diagram>) {
  const diagram = this.diagrams.find((d: any) => d.id === diagramId);
  if (diagram) {
    Object.assign(diagram, updates);
    this.version += 1;
    return this.save();
  }
  throw new Error('Diagram not found');
};

documentationSchema.methods.publish = function() {
  this.isPublished = true;
  this.publishedAt = new Date();
  return this.save();
};

documentationSchema.methods.unpublish = function() {
  this.isPublished = false;
  this.publishedAt = undefined;
  return this.save();
};

documentationSchema.methods.findSectionByTitle = function(title: string) {
  return this.sections.find((s: any) => s.title === title);
};

// Static Methods
documentationSchema.statics.findByProject = function(projectId: string) {
  return this.findOne({ projectId })
    .populate('projectId', 'name status')
    .populate('lastEditedBy', 'name email');
};

documentationSchema.statics.findPublished = function() {
  return this.find({ isPublished: true })
    .populate('projectId', 'name status')
    .populate('lastEditedBy', 'name email')
    .sort({ publishedAt: -1 });
};

// Pre-save middleware
documentationSchema.pre('save', function(next) {
  this.lastEditedAt = new Date();
  next();
});

export const Documentation = mongoose.model<IDocumentation>('Documentation', documentationSchema);
