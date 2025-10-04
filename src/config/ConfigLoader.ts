/**
 * Configuration Loader
 * 
 * Loads and merges configuration from multiple sources:
 * 1. Default configuration
 * 2. Configuration files (JSON/YAML)
 * 3. Environment variables
 * 
 * @module config/ConfigLoader
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  AnalysisConfiguration,
  DEFAULT_CONFIG,
  ENV_VAR_MAPPING,
  ConfigurationError,
} from '@/types/config';
import { logger } from '@/utils/logger';

/**
 * Configuration Loader singleton
 */
export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: AnalysisConfiguration;
  private loaded: boolean = false;

  private constructor() {
    this.config = this.deepClone(DEFAULT_CONFIG);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load configuration from file or default locations
   * @param configPath Optional path to configuration file
   * @returns Loaded and validated configuration
   */
  async load(configPath?: string): Promise<AnalysisConfiguration> {
    try {
      let fileConfig: Partial<AnalysisConfiguration> = {};

      // Load from file
      if (configPath) {
        logger.info(`Loading configuration from: ${configPath}`);
        fileConfig = await this.loadFromFile(configPath);
      } else {
        logger.info('Looking for configuration in default locations');
        fileConfig = await this.loadFromDefaultLocations();
      }

      // Start with default config
      let mergedConfig = this.deepClone(DEFAULT_CONFIG);

      // Merge with file config
      if (Object.keys(fileConfig).length > 0) {
        logger.info('Merging file configuration with defaults');
        mergedConfig = this.deepMerge(mergedConfig, fileConfig);
      }

      // Apply environment variable overrides
      mergedConfig = this.applyEnvironmentOverrides(mergedConfig);

      // Validate the final configuration
      this.validate(mergedConfig);

      this.config = mergedConfig;
      this.loaded = true;

      logger.info('Configuration loaded successfully');
      return this.config;
    } catch (error: any) {
      logger.error('Failed to load configuration:', error);
      throw new ConfigurationError(
        `Configuration loading failed: ${error.message}`,
        undefined,
        'Check your configuration file syntax and required fields'
      );
    }
  }

  /**
   * Get current configuration
   * @returns Current configuration or default if not loaded
   */
  get(silent: boolean = false): AnalysisConfiguration {
    if (!this.loaded && !silent) {
      logger.warn('Configuration not loaded, using defaults');
    }
    return this.config;
  }

  /**
   * Check if configuration has been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Reload configuration
   */
  async reload(configPath?: string): Promise<AnalysisConfiguration> {
    this.loaded = false;
    return this.load(configPath);
  }

  /**
   * Load configuration from a specific file
   * @private
   */
  private async loadFromFile(
    filePath: string
  ): Promise<Partial<AnalysisConfiguration>> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.json') {
        return JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        return yaml.load(content) as Partial<AnalysisConfiguration>;
      } else if (ext === '' || ext === '.analysisrc') {
        // Try JSON first, then YAML
        try {
          return JSON.parse(content);
        } catch {
          return yaml.load(content) as Partial<AnalysisConfiguration>;
        }
      }

      throw new Error(`Unsupported configuration file format: ${ext}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new ConfigurationError(
          `Configuration file not found: ${filePath}`,
          filePath,
          'Create a configuration file or check the path'
        );
      }
      throw error;
    }
  }

  /**
   * Try to load from default locations
   * @private
   */
  private async loadFromDefaultLocations(): Promise<
    Partial<AnalysisConfiguration>
  > {
    const locations = [
      'analysis.config.json',
      'analysis.config.yaml',
      'analysis.config.yml',
      '.analysisrc',
      '.analysisrc.json',
      '.analysisrc.yaml',
    ];

    for (const location of locations) {
      try {
        const config = await this.loadFromFile(location);
        logger.info(`Configuration loaded from: ${location}`);
        return config;
      } catch (error: any) {
        // Continue to next location
        continue;
      }
    }

    logger.info('No configuration file found, using defaults');
    return {};
  }

  /**
   * Deep merge two configuration objects
   * @private
   */
  private deepMerge<T extends Record<string, any>>(
    target: T,
    source: Partial<T>
  ): T {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (
          sourceValue &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          targetValue &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
        ) {
          // Recursively merge objects
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          // Direct assignment for primitives and arrays
          result[key] = sourceValue as any;
        }
      }
    }

    return result;
  }

  /**
   * Deep clone an object
   * @private
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Apply environment variable overrides
   * @private
   */
  private applyEnvironmentOverrides(
    config: AnalysisConfiguration
  ): AnalysisConfiguration {
    const result = this.deepClone(config);

    for (const [envVar, configPath] of Object.entries(ENV_VAR_MAPPING)) {
      const envValue = process.env[envVar];
      if (envValue !== undefined) {
        this.setNestedValue(result, configPath, this.parseEnvValue(envValue));
        logger.debug(`Applied environment override: ${envVar} -> ${configPath}`);
      }
    }

    return result;
  }

  /**
   * Set a nested value in an object using dot notation
   * @private
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Parse environment variable value to appropriate type
   * @private
   */
  private parseEnvValue(value: string): any {
    // Boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Number
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    // JSON array or object
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // String
    return value;
  }

  /**
   * Validate configuration
   * @private
   */
  private validate(config: AnalysisConfiguration): void {
    const errors: string[] = [];

    // Validate languages
    if (!config.languages.enabled || config.languages.enabled.length === 0) {
      errors.push('At least one language must be enabled');
    }

    // Validate performance settings
    if (config.performance.maxWorkers < 1) {
      errors.push('performance.maxWorkers must be at least 1');
    }

    if (config.performance.maxWorkers > 32) {
      errors.push(
        'performance.maxWorkers should not exceed 32 (suggestion: use 4-8 for optimal performance)'
      );
    }

    if (config.performance.batchSize < 1) {
      errors.push('performance.batchSize must be at least 1');
    }

    if (config.performance.caching.ttl < 0) {
      errors.push('performance.caching.ttl must be non-negative');
    }

    if (
      config.performance.timeout !== undefined &&
      config.performance.timeout < 1000
    ) {
      errors.push('performance.timeout must be at least 1000ms');
    }

    // Validate output format
    const validFormats = ['json', 'yaml', 'html', 'markdown'];
    if (!validFormats.includes(config.output.format)) {
      errors.push(
        `output.format must be one of: ${validFormats.join(', ')}`
      );
    }

    // Validate verbosity
    const validVerbosity = ['quiet', 'normal', 'verbose', 'debug'];
    if (!validVerbosity.includes(config.output.verbosity)) {
      errors.push(
        `output.verbosity must be one of: ${validVerbosity.join(', ')}`
      );
    }

    // Validate security threshold
    const validThresholds = ['low', 'medium', 'high', 'critical'];
    if (
      !validThresholds.includes(config.features.security.severityThreshold)
    ) {
      errors.push(
        `features.security.severityThreshold must be one of: ${validThresholds.join(', ')}`
      );
    }

    // Validate code smell thresholds
    if (
      config.features.codeSmells.thresholds.cyclomaticComplexity !==
        undefined &&
      config.features.codeSmells.thresholds.cyclomaticComplexity < 1
    ) {
      errors.push('cyclomaticComplexity threshold must be at least 1');
    }

    // Validate cache provider
    const validProviders = ['memory', 'file', 'redis'];
    if (!validProviders.includes(config.performance.caching.provider)) {
      errors.push(
        `performance.caching.provider must be one of: ${validProviders.join(', ')}`
      );
    }

    // Cross-validation: if features require specific languages
    if (config.features.api.enabled) {
      const apiLanguages = ['javascript', 'typescript', 'python'];
      const hasApiLanguage = config.languages.enabled.some((lang) =>
        apiLanguages.includes(lang)
      );
      if (!hasApiLanguage) {
        errors.push(
          'API detection requires at least one of: javascript, typescript, python'
        );
      }
    }

    if (errors.length > 0) {
      throw new ConfigurationError(
        `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
        undefined,
        'Fix the configuration errors listed above'
      );
    }
  }

  /**
   * Get configuration as JSON string
   */
  toJSON(pretty: boolean = true): string {
    return JSON.stringify(this.config, null, pretty ? 2 : 0);
  }

  /**
   * Get configuration as YAML string
   */
  toYAML(): string {
    return yaml.dump(this.config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
  }
}

/**
 * Convenience function to get configuration instance
 */
export function getConfig(): AnalysisConfiguration {
  return ConfigLoader.getInstance().get();
}

/**
 * Convenience function to load configuration
 */
export async function loadConfig(
  configPath?: string
): Promise<AnalysisConfiguration> {
  return ConfigLoader.getInstance().load(configPath);
}
