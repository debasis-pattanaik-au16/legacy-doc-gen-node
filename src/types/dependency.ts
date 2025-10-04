/**
 * Dependency analysis types and interfaces
 * Provides comprehensive dependency tracking and relationship mapping
 */

export interface DependencyNode {
  id: string;
  name: string;
  type: DependencyType;
  source: string;
  target: string;
  importType: ImportType;
  isExternal: boolean;
  isCircular?: boolean;
  version?: string;
  line: number;
  column: number;
}

export type DependencyType = 
  | 'import'
  | 'require'
  | 'dynamic_import'
  | 'export'
  | 'inheritance'
  | 'composition'
  | 'aggregation'
  | 'usage'
  | 'call'
  | 'reference';

export type ImportType = 
  | 'default'
  | 'named'
  | 'namespace'
  | 'side_effect'
  | 'type_only'
  | 'dynamic';

export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyEdge[];
  clusters: DependencyCluster[];
  circularDependencies: CircularDependency[];
  externalLibraries: ExternalLibrary[];
  metadata: DependencyGraphMetadata;
}

export interface DependencyGraphNode {
  id: string;
  name: string;
  type: 'file' | 'module' | 'component' | 'function' | 'class';
  path: string;
  size: number;
  complexity: number;
  dependencies: string[];
  dependents: string[];
  isEntry: boolean;
  isLeaf: boolean;
  layer: number;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  type: DependencyType;
  weight: number;
  isCircular: boolean;
  metadata: EdgeMetadata;
}

export interface DependencyCluster {
  id: string;
  name: string;
  nodes: string[];
  type: 'module' | 'feature' | 'layer' | 'circular';
  cohesion: number;
  coupling: number;
}

export interface CircularDependency {
  id: string;
  cycle: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
  suggestions: string[];
}

export interface ExternalLibrary {
  name: string;
  version?: string;
  type: 'npm' | 'pip' | 'gem' | 'maven' | 'nuget' | 'unknown';
  usageCount: number;
  files: string[];
  isDevDependency: boolean;
  license?: string;
  vulnerabilities: Vulnerability[];
}

export interface Vulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  fixedIn?: string;
}

export interface EdgeMetadata {
  importedSymbols: string[];
  usageFrequency: number;
  lastModified: Date;
  confidence: number;
}

export interface DependencyGraphMetadata {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  avgDependencies: number;
  circularCount: number;
  externalCount: number;
  generatedAt: Date;
  analysisTime: number;
}

export interface ComponentRelationship {
  id: string;
  source: ComponentReference;
  target: ComponentReference;
  type: RelationshipType;
  strength: number;
  description: string;
  examples: CodeExample[];
}

export interface ComponentReference {
  id: string;
  name: string;
  type: string;
  file: string;
  line: number;
}

export type RelationshipType = 
  | 'extends'
  | 'implements'
  | 'uses'
  | 'calls'
  | 'instantiates'
  | 'composes'
  | 'aggregates'
  | 'depends_on'
  | 'similar_to'
  | 'overrides';

export interface CodeExample {
  code: string;
  file: string;
  line: number;
  context: string;
}

export interface DependencyAnalysisOptions {
  includeExternal: boolean;
  detectCircular: boolean;
  analyzeComponents: boolean;
  includeDevDependencies: boolean;
  maxDepth: number;
  excludePatterns: string[];
  includePatterns: string[];
}

export interface DependencyAnalysisResult {
  graph: DependencyGraph;
  relationships: ComponentRelationship[];
  insights: AnalysisInsight[];
  recommendations: Recommendation[];
  metrics: DependencyMetrics;
  security?: any; // SecurityAnalysisResult from @/types/security
}

export interface AnalysisInsight {
  type: 'warning' | 'info' | 'suggestion' | 'error';
  category: 'architecture' | 'performance' | 'maintainability' | 'security';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedFiles: string[];
  codeExamples: CodeExample[];
}

export interface Recommendation {
  id: string;
  type: 'refactor' | 'optimize' | 'security' | 'architecture';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  benefits: string[];
  effort: 'low' | 'medium' | 'high';
  implementation: string[];
}

export interface DependencyMetrics {
  totalDependencies: number;
  externalDependencies: number;
  circularDependencies: number;
  avgDependenciesPerFile: number;
  maxDependencyDepth: number;
  couplingIndex: number;
  cohesionIndex: number;
  instabilityIndex: number;
  abstractnessIndex: number;
}
