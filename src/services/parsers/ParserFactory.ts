/**
 * Parser Factory - Convenient API for parser management
 * Provides simplified parser access and auto-registration
 */

import path from 'path';
import fs from 'fs/promises';
import { ParserRegistry } from './ParserRegistry';
import { LanguageParser } from '@/types/parser';
import { UnifiedAST } from '@/types/ast';
import { javascriptParser } from './javascriptParser';
import { pythonParser } from './pythonParser';
import { logger } from '@/utils/logger';

/**
 * Factory for creating and managing parsers
 */
export class ParserFactory {
  private static registry = ParserRegistry.getInstance();
  private static initialized = false;
  
  /**
   * Initialize factory and register all available parsers
   */
  public static initialize(): void {
    if (this.initialized) {
      logger.warn('ParserFactory already initialized');
      return;
    }
    
    try {
      // Register JavaScript/TypeScript parser
      this.registry.registerParser(javascriptParser);
      logger.info('Registered JavaScript/TypeScript parser');
      
      // Register Python parser
      this.registry.registerParser(pythonParser);
      logger.info('Registered Python parser');
      
      this.initialized = true;
      logger.info('ParserFactory initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize ParserFactory:', error);
      throw new Error(`ParserFactory initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Get parser for a specific file based on extension
   * @param filePath - Path to the file
   * @returns Parser instance or null if not supported
   */
  public static getParserForFile(filePath: string): LanguageParser | null {
    this.ensureInitialized();
    
    const extension = path.extname(filePath);
    const parser = this.registry.getParser(extension);
    
    if (!parser) {
      logger.debug(`No parser found for file: ${filePath} (extension: ${extension})`);
    }
    
    return parser;
  }
  
  /**
   * Get parser by language name
   * @param language - Language name (e.g., 'javascript', 'python')
   * @returns Parser instance or null if not found
   */
  public static getParserByLanguage(language: string): LanguageParser | null {
    this.ensureInitialized();
    return this.registry.getParserByLanguage(language);
  }
  
  /**
   * Parse a file directly
   * @param filePath - Path to the file
   * @param options - Optional parse options
   * @returns Promise resolving to UnifiedAST or null if not supported
   */
  public static async parseFile(
    filePath: string,
    options?: any
  ): Promise<UnifiedAST | null> {
    this.ensureInitialized();
    
    const parser = this.getParserForFile(filePath);
    if (!parser) {
      logger.warn(`Cannot parse file ${filePath}: No parser available`);
      return null;
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return await parser.parse(content, filePath, options);
    } catch (error: any) {
      logger.error(`Failed to parse file ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Parse source code with specified language
   * @param sourceCode - Source code to parse
   * @param language - Language name
   * @param fileName - Optional file name for context
   * @param options - Optional parse options
   * @returns Promise resolving to UnifiedAST or null if language not supported
   */
  public static async parseSource(
    sourceCode: string,
    language: string,
    fileName: string = 'source',
    options?: any
  ): Promise<UnifiedAST | null> {
    this.ensureInitialized();
    
    const parser = this.getParserByLanguage(language);
    if (!parser) {
      logger.warn(`Cannot parse source: No parser for language '${language}'`);
      return null;
    }
    
    return await parser.parse(sourceCode, fileName, options);
  }
  
  /**
   * Check if a file extension is supported
   * @param fileExtension - File extension (e.g., '.js', 'py')
   * @returns true if supported
   */
  public static isExtensionSupported(fileExtension: string): boolean {
    this.ensureInitialized();
    return this.registry.isExtensionSupported(fileExtension);
  }
  
  /**
   * Check if a file is supported
   * @param filePath - Path to the file
   * @returns true if supported
   */
  public static isFileSupported(filePath: string): boolean {
    this.ensureInitialized();
    const extension = path.extname(filePath);
    return this.registry.isExtensionSupported(extension);
  }
  
  /**
   * Get list of all supported languages
   * @returns Array of language names
   */
  public static getSupportedLanguages(): string[] {
    this.ensureInitialized();
    return this.registry.getSupportedLanguages();
  }
  
  /**
   * Get list of all supported file extensions
   * @returns Array of file extensions
   */
  public static getSupportedExtensions(): string[] {
    this.ensureInitialized();
    return this.registry.getSupportedExtensions();
  }
  
  /**
   * Get detailed information about registered parsers
   * @returns Registry information
   */
  public static getRegistryInfo() {
    this.ensureInitialized();
    return this.registry.getRegistryInfo();
  }
  
  /**
   * Reset factory (useful for testing)
   */
  public static reset(): void {
    this.registry.clear();
    this.initialized = false;
    logger.info('ParserFactory reset');
  }
  
  /**
   * Ensure factory is initialized
   * @private
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }
}

// Auto-initialize on module load
ParserFactory.initialize();

// Export as default
export default ParserFactory;
