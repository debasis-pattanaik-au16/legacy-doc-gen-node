import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import {
  CodeAnalysisResult,
  ComponentRelationshipResult,
  ArchitecturalPatternResult,
  ComponentInfo,
  CodebaseStructure
} from './openaiService';

/**
 * Gemini AI Service with rate limiting and error handling
 * Provides similar functionality to OpenAI service using Google's Gemini models
 */
export class GeminiService {
  private client: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor() {
    if (!config.GEMINI_API_KEY) {
      logger.warn('Gemini API key not provided - service will be disabled');
      return;
    }

    this.client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    this.model = this.client.getGenerativeModel({ 
      model: config.GEMINI_MODEL || 'gemini-1.5-flash'
    });
  }

  /**
   * Check if Gemini service is available
   */
  public isAvailable(): boolean {
    return !!config.GEMINI_API_KEY && !!this.client && !!this.model;
  }

  /**
   * Analyze dependency graph and generate architectural insights
   */
  public async analyzeDependencyGraph(
    graph: any,
    projectContext?: string
  ): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Gemini service is not available - API key not configured');
    }

    const prompt = this.buildDependencyAnalysisPrompt(graph, projectContext);
    
    try {
      const response = await this.makeRequest(async () => {
        const result = await this.model!.generateContent({
          contents: [{
            role: 'user',
            parts: [{
              text: `You are an expert software architect. Analyze the dependency graph and provide architectural insights, identify potential issues, and suggest improvements. Return structured JSON only.

${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          }
        });

        return result.response;
      });

      const responseText = response.text();
      return this.parseDependencyAnalysisResponse(responseText);
    } catch (error: any) {
      logger.error('Gemini dependency analysis failed:', error);
      throw new Error(`Gemini dependency analysis failed: ${error.message}`);
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
    if (!this.isAvailable()) {
      throw new Error('Gemini service is not available - API key not configured');
    }

    const prompt = this.buildCodeAnalysisPrompt(code, language, fileName, context);
    
    try {
      const response = await this.makeRequest(async () => {
        const result = await this.model!.generateContent({
          contents: [{
            role: 'user',
            parts: [{
              text: `You are an expert code analyst. Analyze the provided code and return structured JSON with high accuracy.

${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
          }
        });

        return result.response;
      });

      const responseText = response.text();
      return this.parseCodeAnalysisResponse(responseText);
    } catch (error) {
      logger.error(`Gemini code analysis failed for ${fileName}:`, error);
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
    if (!this.isAvailable()) {
      throw new Error('Gemini service is not available - API key not configured');
    }

    const prompt = this.buildRelationshipAnalysisPrompt(components, projectContext);
    
    try {
      const response = await this.makeRequest(async () => {
        const result = await this.model!.generateContent({
          contents: [{
            role: 'user',
            parts: [{
              text: `You are an expert software architect. Analyze component relationships and return structured JSON.

${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 3000,
          }
        });

        return result.response;
      });

      const responseText = response.text();
      return this.parseRelationshipAnalysisResponse(responseText);
    } catch (error) {
      logger.error('Gemini relationship analysis failed:', error);
      throw error;
    }
  }

  /**
   * Detect architectural patterns in codebase
   */
  public async detectArchitecturalPatterns(
    codebaseStructure: CodebaseStructure
  ): Promise<ArchitecturalPatternResult> {
    if (!this.isAvailable()) {
      throw new Error('Gemini service is not available - API key not configured');
    }

    const prompt = this.buildArchitecturalAnalysisPrompt(codebaseStructure);
    
    try {
      const response = await this.makeRequest(async () => {
        const result = await this.model!.generateContent({
          contents: [{
            role: 'user',
            parts: [{
              text: `You are an expert software architect. Identify architectural patterns and return structured JSON.

${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2500,
          }
        });

        return result.response;
      });

      const responseText = response.text();
      return this.parseArchitecturalAnalysisResponse(responseText);
    } catch (error) {
      logger.error('Gemini architectural analysis failed:', error);
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
            logger.info(`Gemini request successful. Total requests: ${this.requestCount}`);
            resolve(result);
            return;
          } catch (error: any) {
            retries++;
            
            if (error?.status === 429 || error?.message?.includes('quota')) {
              // Rate limit hit, wait longer
              const waitTime = Math.min(this.RETRY_DELAY * Math.pow(2, retries), 30000);
              logger.warn(`Gemini rate limit hit, waiting ${waitTime}ms before retry ${retries}/${this.MAX_RETRIES}`);
              await this.delay(waitTime);
            } else if (retries >= this.MAX_RETRIES) {
              logger.error(`Gemini request failed after ${this.MAX_RETRIES} retries:`, error);
              reject(error);
              return;
            } else {
              logger.warn(`Gemini request failed, retry ${retries}/${this.MAX_RETRIES}:`, error.message);
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
          logger.error('Gemini queue request failed:', error);
        }
      }
    }

    this.isProcessing = false;
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
   * Parse responses with error handling
   */
  private parseDependencyAnalysisResponse(response: string): any {
    try {
      // Extract JSON from response if it contains markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.warn('Failed to parse Gemini dependency analysis response:', error);
      return {
        quality: 'unknown',
        issues: [],
        suggestions: [],
        metrics: { coupling: 0, cohesion: 0, complexity: 0 }
      };
    }
  }

  private parseCodeAnalysisResponse(response: string): CodeAnalysisResult {
    try {
      // Extract JSON from response if it contains markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      return JSON.parse(jsonStr) as CodeAnalysisResult;
    } catch (error) {
      logger.warn('Failed to parse Gemini code analysis response:', error);
      return {
        summary: 'Analysis failed',
        purpose: 'Unknown',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        patterns: [],
        complexity: 'medium',
        maintainability: 'medium',
        testability: 'medium'
      };
    }
  }

  private parseRelationshipAnalysisResponse(response: string): ComponentRelationshipResult {
    try {
      // Extract JSON from response if it contains markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      return JSON.parse(jsonStr) as ComponentRelationshipResult;
    } catch (error) {
      logger.warn('Failed to parse Gemini relationship analysis response:', error);
      return {
        relationships: [],
        dataFlow: [],
        dependencies: { circular: [], external: [], internal: [] },
        architecture: { layers: [], patterns: [], style: 'unknown' }
      };
    }
  }

  private parseArchitecturalAnalysisResponse(response: string): ArchitecturalPatternResult {
    try {
      // Extract JSON from response if it contains markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      return JSON.parse(jsonStr) as ArchitecturalPatternResult;
    } catch (error) {
      logger.warn('Failed to parse Gemini architectural analysis response:', error);
      return {
        architecture: { type: 'Unknown', confidence: 0, description: 'Analysis failed' },
        patterns: [],
        structure: { layers: [], modules: [], boundaries: [] },
        quality: {
          separation_of_concerns: 'medium',
          modularity: 'medium',
          testability: 'medium',
          maintainability: 'medium'
        }
      };
    }
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
  public getUsageStats(): GeminiUsageStats {
    return {
      totalRequests: this.requestCount,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      lastRequestTime: this.lastRequestTime,
      isAvailable: this.isAvailable()
    };
  }
}

export interface GeminiUsageStats {
  totalRequests: number;
  queueLength: number;
  isProcessing: boolean;
  lastRequestTime: number;
  isAvailable: boolean;
}

// Singleton instance
export const geminiService = new GeminiService();
