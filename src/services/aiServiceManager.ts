import { config } from '@/config/env';
import { logger } from '@/utils/logger';
import { openaiService } from './openaiService';
import { geminiService } from './geminiService';
import {
  CodeAnalysisResult,
  ComponentRelationshipResult,
  ArchitecturalPatternResult,
  ComponentInfo,
  CodebaseStructure,
  OpenAIUsageStats
} from './openaiService';
import { GeminiUsageStats } from './geminiService';

export type AIServiceProvider = 'openai' | 'gemini' | 'both';

export interface AIServiceStats {
  openai: OpenAIUsageStats;
  gemini: GeminiUsageStats;
  currentProvider: AIServiceProvider;
  fallbackEnabled: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

/**
 * AI Service Manager
 * Manages multiple AI services (OpenAI and Gemini) with intelligent routing,
 * fallback mechanisms, and load balancing capabilities
 */
export class AIServiceManager {
  private currentProvider: AIServiceProvider;
  private fallbackEnabled: boolean;
  private requestCount = 0;
  private successCount = 0;
  private failureCount = 0;
  private providerFailures = new Map<string, number>();
  private readonly MAX_PROVIDER_FAILURES = 3;
  private readonly FAILURE_RESET_TIME = 300000; // 5 minutes

  constructor() {
    this.currentProvider = (config.AI_SERVICE_PROVIDER as AIServiceProvider) || 'openai';
    this.fallbackEnabled = config.AI_SERVICE_FALLBACK || false;
    
    logger.info(`AI Service Manager initialized with provider: ${this.currentProvider}, fallback: ${this.fallbackEnabled}`);
  }

  /**
   * Analyze dependency graph using the configured AI service
   */
  public async analyzeDependencyGraph(
    graph: any,
    projectContext?: string
  ): Promise<any> {
    return this.executeWithFallback(
      'analyzeDependencyGraph',
      async (service) => service.analyzeDependencyGraph(graph, projectContext)
    );
  }

  /**
   * Analyze code using the configured AI service
   */
  public async analyzeCode(
    code: string,
    language: string,
    fileName: string,
    context?: string
  ): Promise<CodeAnalysisResult> {
    return this.executeWithFallback(
      'analyzeCode',
      async (service) => service.analyzeCode(code, language, fileName, context)
    );
  }

  /**
   * Analyze component relationships using the configured AI service
   */
  public async analyzeComponentRelationships(
    components: ComponentInfo[],
    projectContext: string
  ): Promise<ComponentRelationshipResult> {
    return this.executeWithFallback(
      'analyzeComponentRelationships',
      async (service) => service.analyzeComponentRelationships(components, projectContext)
    );
  }

  /**
   * Detect architectural patterns using the configured AI service
   */
  public async detectArchitecturalPatterns(
    codebaseStructure: CodebaseStructure
  ): Promise<ArchitecturalPatternResult> {
    return this.executeWithFallback(
      'detectArchitecturalPatterns',
      async (service) => service.detectArchitecturalPatterns(codebaseStructure)
    );
  }

  /**
   * Execute AI service method with intelligent fallback
   */
  private async executeWithFallback<T>(
    methodName: string,
    operation: (service: any) => Promise<T>
  ): Promise<T> {
    this.requestCount++;
    
    const providers = this.getAvailableProviders();
    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        const service = this.getService(provider);
        if (!service || !this.isServiceAvailable(service, provider)) {
          continue;
        }

        logger.info(`Executing ${methodName} with ${provider} service`);
        const result = await operation(service);
        
        this.successCount++;
        this.resetProviderFailures(provider);
        
        logger.info(`${methodName} completed successfully with ${provider}`);
        return result;

      } catch (error: any) {
        lastError = error;
        this.failureCount++;
        this.recordProviderFailure(provider);
        
        logger.warn(`${methodName} failed with ${provider}:`, error.message);
        
        if (!this.fallbackEnabled || providers.length === 1) {
          throw error;
        }
        
        // Continue to next provider if fallback is enabled
        continue;
      }
    }

    // All providers failed
    const errorMessage = `All AI services failed for ${methodName}. Last error: ${lastError?.message}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Get available providers in order of preference
   */
  private getAvailableProviders(): string[] {
    const providers: string[] = [];
    
    if (this.currentProvider === 'both') {
      // When using 'both', prefer the service with fewer recent failures
      const openaiFailures = this.providerFailures.get('openai') || 0;
      const geminiFailures = this.providerFailures.get('gemini') || 0;
      
      if (openaiFailures <= geminiFailures) {
        providers.push('openai', 'gemini');
      } else {
        providers.push('gemini', 'openai');
      }
    } else {
      providers.push(this.currentProvider);
      
      if (this.fallbackEnabled) {
        // Add the other provider as fallback
        const fallbackProvider = this.currentProvider === 'openai' ? 'gemini' : 'openai';
        providers.push(fallbackProvider);
      }
    }

    // Filter out providers that have exceeded failure threshold
    return providers.filter(provider => {
      const failures = this.providerFailures.get(provider) || 0;
      return failures < this.MAX_PROVIDER_FAILURES;
    });
  }

  /**
   * Get service instance by provider name
   */
  private getService(provider: string): any {
    switch (provider) {
      case 'openai':
        return openaiService;
      case 'gemini':
        return geminiService;
      default:
        return null;
    }
  }

  /**
   * Check if service is available and properly configured
   */
  private isServiceAvailable(service: any, provider: string): boolean {
    if (provider === 'openai') {
      return !!config.OPENAI_API_KEY;
    } else if (provider === 'gemini') {
      return service.isAvailable();
    }
    return false;
  }

  /**
   * Record provider failure for circuit breaker pattern
   */
  private recordProviderFailure(provider: string): void {
    const currentFailures = this.providerFailures.get(provider) || 0;
    this.providerFailures.set(provider, currentFailures + 1);
    
    // Reset failures after timeout
    setTimeout(() => {
      this.resetProviderFailures(provider);
    }, this.FAILURE_RESET_TIME);
  }

  /**
   * Reset provider failure count
   */
  private resetProviderFailures(provider: string): void {
    this.providerFailures.set(provider, 0);
  }

  /**
   * Switch to a different provider
   */
  public switchProvider(provider: AIServiceProvider): void {
    logger.info(`Switching AI service provider from ${this.currentProvider} to ${provider}`);
    this.currentProvider = provider;
  }

  /**
   * Enable or disable fallback mechanism
   */
  public setFallbackEnabled(enabled: boolean): void {
    logger.info(`AI service fallback ${enabled ? 'enabled' : 'disabled'}`);
    this.fallbackEnabled = enabled;
  }

  /**
   * Get current service statistics
   */
  public getStats(): AIServiceStats {
    return {
      openai: openaiService.getUsageStats(),
      gemini: geminiService.getUsageStats(),
      currentProvider: this.currentProvider,
      fallbackEnabled: this.fallbackEnabled,
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      failedRequests: this.failureCount
    };
  }

  /**
   * Get service health status
   */
  public getHealthStatus(): Record<string, any> {
    return {
      openai: {
        available: !!config.OPENAI_API_KEY,
        failures: this.providerFailures.get('openai') || 0,
        stats: openaiService.getUsageStats()
      },
      gemini: {
        available: geminiService.isAvailable(),
        failures: this.providerFailures.get('gemini') || 0,
        stats: geminiService.getUsageStats()
      },
      manager: {
        currentProvider: this.currentProvider,
        fallbackEnabled: this.fallbackEnabled,
        totalRequests: this.requestCount,
        successRate: this.requestCount > 0 ? (this.successCount / this.requestCount) * 100 : 0
      }
    };
  }

  /**
   * Test connectivity to all available services
   */
  public async testConnectivity(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Test OpenAI
    try {
      if (config.OPENAI_API_KEY) {
        await openaiService.analyzeCode('console.log("test");', 'javascript', 'test.js');
        results.openai = true;
      } else {
        results.openai = false;
      }
    } catch (error) {
      results.openai = false;
    }
    
    // Test Gemini
    try {
      if (geminiService.isAvailable()) {
        await geminiService.analyzeCode('console.log("test");', 'javascript', 'test.js');
        results.gemini = true;
      } else {
        results.gemini = false;
      }
    } catch (error) {
      results.gemini = false;
    }
    
    return results;
  }
}

// Singleton instance
export const aiServiceManager = new AIServiceManager();
