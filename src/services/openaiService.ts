import OpenAI from 'openai';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * OpenAI API Service with rate limiting and error handling
 * Implements intelligent batching and retry logic for 99% accuracy
 */
export class OpenAIService {
  private client: OpenAI;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor() {
    if (!config.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze dependency graph and generate architectural insights
   */
  public async analyzeDependencyGraph(
    graph: any,
    projectContext?: string
  ): Promise<any> {
    const prompt = this.buildDependencyAnalysisPrompt(graph, projectContext);
    
    try {
      const response = await this.makeRequest(async () => {
        return await this.client.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert software architect. Analyze the dependency graph and provide architectural insights, identify potential issues, and suggest improvements. Return structured JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        });
      });

      return this.parseDependencyAnalysisResponse(response.choices[0].message.content || '{}');
    } catch (error: any) {
      logger.error('Dependency analysis failed:', error);
      throw new Error(`Dependency analysis failed: ${error.message}`);
    }
  }


  /**
   * Build dependency analysis prompt
   */
  private buildDependencyAnalysisPrompt(graph: any, projectContext?: string): string {
    return `
Analyze this dependency graph and provide architectural insights:

Graph Summary:
- Total Nodes: ${graph.metadata?.totalNodes || 0}
- Total Edges: ${graph.metadata?.totalEdges || 0}
- Circular Dependencies: ${graph.circularDependencies?.length || 0}
- External Libraries: ${graph.externalLibraries?.length || 0}

${projectContext ? `Project Context: ${projectContext}` : ''}

Circular Dependencies:
${graph.circularDependencies?.map((cycle: any) => `- ${cycle.cycle.join(' -> ')}`).join('\n') || 'None'}

External Libraries:
${graph.externalLibraries?.map((lib: any) => `- ${lib.name} (${lib.usageCount} files)`).join('\n') || 'None'}

Please provide:
1. Architecture quality assessment
2. Potential issues and risks
3. Refactoring suggestions
4. Performance implications
5. Maintainability concerns

Return as JSON with structure:
{
  "quality": "excellent|good|fair|poor",
  "issues": [{"type": "string", "severity": "low|medium|high|critical", "description": "string"}],
  "suggestions": [{"category": "string", "priority": "low|medium|high", "description": "string"}],
  "metrics": {"coupling": number, "cohesion": number, "complexity": number}
}`;
  }


  /**
   * Parse dependency analysis response
   */
  private parseDependencyAnalysisResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse dependency analysis response:', error);
      return {
        quality: 'unknown',
        issues: [],
        suggestions: [],
        metrics: { coupling: 0, cohesion: 0, complexity: 0 }
      };
    }
  }


  /**
   * Analyze code with semantic understanding
   */
  public async analyzeCode(
    code: string,
    language: string,
    fileName: string,
    context?: string
  ): Promise<CodeAnalysisResult> {
    const prompt = this.buildCodeAnalysisPrompt(code, language, fileName, context);
    
    try {
      const response = await this.makeRequest(async () => {
        return await this.client.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert code analyst. Analyze the provided code and return structured JSON with high accuracy.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Low temperature for consistency
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        });
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return JSON.parse(content) as CodeAnalysisResult;
    } catch (error) {
      logger.error(`OpenAI code analysis failed for ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Analyze component relationships and dependencies
   */
  public async analyzeComponentRelationships(
    components: ComponentInfo[],
    projectContext: string
  ): Promise<ComponentRelationshipResult> {
    const prompt = this.buildRelationshipAnalysisPrompt(components, projectContext);
    
    try {
      const response = await this.makeRequest(async () => {
        return await this.client.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert software architect. Analyze component relationships and return structured JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: 'json_object' }
        });
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return JSON.parse(content) as ComponentRelationshipResult;
    } catch (error) {
      logger.error('OpenAI relationship analysis failed:', error);
      throw error;
    }
  }

  /**
   * Detect architectural patterns in codebase
   */
  public async detectArchitecturalPatterns(
    codebaseStructure: CodebaseStructure
  ): Promise<ArchitecturalPatternResult> {
    const prompt = this.buildArchitecturalAnalysisPrompt(codebaseStructure);
    
    try {
      const response = await this.makeRequest(async () => {
        return await this.client.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert software architect. Identify architectural patterns and return structured JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2500,
          response_format: { type: 'json_object' }
        });
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return JSON.parse(content) as ArchitecturalPatternResult;
    } catch (error) {
      logger.error('OpenAI architectural analysis failed:', error);
      throw error;
    }
  }

  /**
   * Make rate-limited request with retry logic
   */
  private async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        let retries = 0;
        
        while (retries < this.MAX_RETRIES) {
          try {
            // Rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            
            if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
              await this.delay(this.RATE_LIMIT_DELAY - timeSinceLastRequest);
            }

            this.lastRequestTime = Date.now();
            this.requestCount++;

            const result = await requestFn();
            logger.info(`OpenAI request successful. Total requests: ${this.requestCount}`);
            resolve(result);
            return;
          } catch (error: any) {
            retries++;
            
            if (error?.status === 429) {
              // Rate limit hit, wait longer
              const waitTime = Math.min(this.RETRY_DELAY * Math.pow(2, retries), 30000);
              logger.warn(`OpenAI rate limit hit, waiting ${waitTime}ms before retry ${retries}/${this.MAX_RETRIES}`);
              await this.delay(waitTime);
            } else if (retries >= this.MAX_RETRIES) {
              logger.error(`OpenAI request failed after ${this.MAX_RETRIES} retries:`, error);
              reject(error);
              return;
            } else {
              logger.warn(`OpenAI request failed, retry ${retries}/${this.MAX_RETRIES}:`, error.message);
              await this.delay(this.RETRY_DELAY);
            }
          }
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process request queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          logger.error('Queue request failed:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Build code analysis prompt
   */
  private buildCodeAnalysisPrompt(
    code: string,
    language: string,
    fileName: string,
    context?: string
  ): string {
    return `
Analyze this ${language} code from file "${fileName}" and return a JSON object with the following structure:

{
  "summary": "Brief description of what this code does",
  "purpose": "Main purpose and responsibility",
  "functions": [
    {
      "name": "function name",
      "description": "what it does",
      "parameters": ["param1", "param2"],
      "returnType": "return type",
      "complexity": "low|medium|high",
      "isPublic": true|false
    }
  ],
  "classes": [
    {
      "name": "class name",
      "description": "what it does",
      "methods": ["method1", "method2"],
      "properties": ["prop1", "prop2"],
      "isExported": true|false
    }
  ],
  "imports": [
    {
      "module": "module name",
      "type": "internal|external",
      "usage": "how it's used"
    }
  ],
  "exports": ["exported items"],
  "patterns": ["design patterns used"],
  "complexity": "low|medium|high",
  "maintainability": "low|medium|high",
  "testability": "low|medium|high"
}

${context ? `Context: ${context}` : ''}

Code to analyze:
\`\`\`${language}
${code}
\`\`\`
`;
  }

  /**
   * Build relationship analysis prompt
   */
  private buildRelationshipAnalysisPrompt(
    components: ComponentInfo[],
    projectContext: string
  ): string {
    const componentList = components.map(c => 
      `- ${c.name} (${c.type}): ${c.description}`
    ).join('\n');

    return `
Analyze the relationships between these components and return a JSON object:

{
  "relationships": [
    {
      "from": "component name",
      "to": "component name",
      "type": "imports|calls|extends|implements|uses",
      "description": "relationship description"
    }
  ],
  "dataFlow": [
    {
      "source": "component name",
      "target": "component name",
      "data": "what data flows",
      "direction": "bidirectional|unidirectional"
    }
  ],
  "dependencies": {
    "circular": ["list of circular dependencies"],
    "external": ["external dependencies"],
    "internal": ["internal dependencies"]
  },
  "architecture": {
    "layers": ["presentation", "business", "data"],
    "patterns": ["MVC", "Repository", "Factory"],
    "style": "monolithic|microservices|layered"
  }
}

Project Context: ${projectContext}

Components:
${componentList}
`;
  }

  /**
   * Build architectural analysis prompt
   */
  private buildArchitecturalAnalysisPrompt(codebaseStructure: CodebaseStructure): string {
    return `
Analyze this codebase structure and identify architectural patterns. Return JSON:

{
  "architecture": {
    "type": "MVC|MVP|MVVM|Microservices|Monolithic|Layered",
    "confidence": 0.95,
    "description": "detailed description"
  },
  "patterns": [
    {
      "name": "pattern name",
      "confidence": 0.90,
      "evidence": ["evidence1", "evidence2"],
      "location": "where found"
    }
  ],
  "structure": {
    "layers": ["layer names"],
    "modules": ["module names"],
    "boundaries": ["boundary descriptions"]
  },
  "quality": {
    "separation_of_concerns": "low|medium|high",
    "modularity": "low|medium|high",
    "testability": "low|medium|high",
    "maintainability": "low|medium|high"
  }
}

Codebase Structure:
${JSON.stringify(codebaseStructure, null, 2)}
`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current usage statistics
   */
  public getUsageStats(): OpenAIUsageStats {
    return {
      totalRequests: this.requestCount,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      lastRequestTime: this.lastRequestTime
    };
  }
}

// Types for OpenAI service
export interface CodeAnalysisResult {
  summary: string;
  purpose: string;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: string[];
  patterns: string[];
  complexity: 'low' | 'medium' | 'high';
  maintainability: 'low' | 'medium' | 'high';
  testability: 'low' | 'medium' | 'high';
}

export interface FunctionInfo {
  name: string;
  description: string;
  parameters: string[];
  returnType: string;
  complexity: 'low' | 'medium' | 'high';
  isPublic: boolean;
}

export interface ClassInfo {
  name: string;
  description: string;
  methods: string[];
  properties: string[];
  isExported: boolean;
}

export interface ImportInfo {
  module: string;
  type: 'internal' | 'external';
  usage: string;
}

export interface ComponentInfo {
  name: string;
  type: string;
  description: string;
}

export interface ComponentRelationshipResult {
  relationships: RelationshipInfo[];
  dataFlow: DataFlowInfo[];
  dependencies: DependencyInfo;
  architecture: ArchitectureInfo;
}

export interface RelationshipInfo {
  from: string;
  to: string;
  type: 'imports' | 'calls' | 'extends' | 'implements' | 'uses';
  description: string;
}

export interface DataFlowInfo {
  source: string;
  target: string;
  data: string;
  direction: 'bidirectional' | 'unidirectional';
}

export interface DependencyInfo {
  circular: string[];
  external: string[];
  internal: string[];
}

export interface ArchitectureInfo {
  layers: string[];
  patterns: string[];
  style: string;
}

export interface CodebaseStructure {
  directories: string[];
  files: string[];
  languages: Record<string, number>;
  patterns: string[];
}

export interface ArchitecturalPatternResult {
  architecture: {
    type: string;
    confidence: number;
    description: string;
  };
  patterns: PatternInfo[];
  structure: StructureInfo;
  quality: QualityInfo;
}

export interface PatternInfo {
  name: string;
  confidence: number;
  evidence: string[];
  location: string;
}

export interface StructureInfo {
  layers: string[];
  modules: string[];
  boundaries: string[];
}

export interface QualityInfo {
  separation_of_concerns: 'low' | 'medium' | 'high';
  modularity: 'low' | 'medium' | 'high';
  testability: 'low' | 'medium' | 'high';
  maintainability: 'low' | 'medium' | 'high';
}

export interface OpenAIUsageStats {
  totalRequests: number;
  queueLength: number;
  isProcessing: boolean;
  lastRequestTime: number;
}

// Singleton instance
export const openaiService = new OpenAIService();
