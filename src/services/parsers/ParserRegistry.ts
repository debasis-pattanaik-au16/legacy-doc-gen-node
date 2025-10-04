/**
 * Parser Registry - Singleton for managing language parsers
 * Provides centralized parser registration and retrieval
 */

import { LanguageParser, ParserRegistryEntry } from '@/types/parser';
import { logger } from '@/utils/logger';

/**
 * Singleton registry for language parsers
 * Thread-safe parser management with extension mapping
 */
export class ParserRegistry {
  private static instance: ParserRegistry;
  
  /** Map of language name to parser entry */
  private parsers: Map<string, ParserRegistryEntry>;
  
  /** Map of file extension to language name */
  private extensionMap: Map<string, string>;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.parsers = new Map();
    this.extensionMap = new Map();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ParserRegistry {
    if (!ParserRegistry.instance) {
      ParserRegistry.instance = new ParserRegistry();
    }
    return ParserRegistry.instance;
  }
  
  /**
   * Register a language parser
   * @param parser - The parser to register
   * @throws Error if language already registered
   */
  public registerParser(parser: LanguageParser): void {
    const language = parser.language.toLowerCase();
    
    // Check for duplicate registration
    if (this.parsers.has(language)) {
      throw new Error(
        `Parser for language '${language}' is already registered. ` +
        `Unregister existing parser first.`
      );
    }
    
    // Validate parser has required properties
    if (!parser.supportedExtensions || parser.supportedExtensions.length === 0) {
      throw new Error(
        `Parser for language '${language}' must specify at least one supported extension`
      );
    }
    
    // Register parser
    const entry: ParserRegistryEntry = {
      parser,
      registeredAt: new Date(),
      active: true,
    };
    
    this.parsers.set(language, entry);
    
    // Map extensions to language
    for (const ext of parser.supportedExtensions) {
      const normalizedExt = this.normalizeExtension(ext);
      
      // Check for extension conflicts
      if (this.extensionMap.has(normalizedExt)) {
        const existingLanguage = this.extensionMap.get(normalizedExt);
        logger.warn(
          `Extension '${ext}' is already mapped to '${existingLanguage}'. ` +
          `Overwriting with '${language}'.`
        );
      }
      
      this.extensionMap.set(normalizedExt, language);
    }
    
    logger.info(
      `Registered parser for '${language}' ` +
      `(v${parser.version}) with extensions: ${parser.supportedExtensions.join(', ')}`
    );
  }
  
  /**
   * Unregister a language parser
   * @param language - The language name to unregister
   * @returns true if parser was unregistered, false if not found
   */
  public unregisterParser(language: string): boolean {
    const normalizedLanguage = language.toLowerCase();
    const entry = this.parsers.get(normalizedLanguage);
    
    if (!entry) {
      return false;
    }
    
    // Remove extension mappings
    for (const ext of entry.parser.supportedExtensions) {
      const normalizedExt = this.normalizeExtension(ext);
      this.extensionMap.delete(normalizedExt);
    }
    
    // Remove parser
    this.parsers.delete(normalizedLanguage);
    
    logger.info(`Unregistered parser for '${normalizedLanguage}'`);
    return true;
  }
  
  /**
   * Get parser by file extension
   * @param fileExtension - File extension (e.g., '.js', 'ts')
   * @returns Parser instance or null if not found
   */
  public getParser(fileExtension: string): LanguageParser | null {
    const normalizedExt = this.normalizeExtension(fileExtension);
    const language = this.extensionMap.get(normalizedExt);
    
    if (!language) {
      return null;
    }
    
    return this.getParserByLanguage(language);
  }
  
  /**
   * Get parser by language name
   * @param language - Language name
   * @returns Parser instance or null if not found
   */
  public getParserByLanguage(language: string): LanguageParser | null {
    const normalizedLanguage = language.toLowerCase();
    const entry = this.parsers.get(normalizedLanguage);
    
    if (!entry || !entry.active) {
      return null;
    }
    
    return entry.parser;
  }
  
  /**
   * Check if a parser exists for a language
   * @param language - Language name
   * @returns true if parser exists
   */
  public hasParser(language: string): boolean {
    const normalizedLanguage = language.toLowerCase();
    return this.parsers.has(normalizedLanguage);
  }
  
  /**
   * Check if a file extension is supported
   * @param fileExtension - File extension
   * @returns true if extension is supported
   */
  public isExtensionSupported(fileExtension: string): boolean {
    const normalizedExt = this.normalizeExtension(fileExtension);
    return this.extensionMap.has(normalizedExt);
  }
  
  /**
   * Get all supported languages
   * @returns Array of language names
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this.parsers.keys());
  }
  
  /**
   * Get all supported file extensions
   * @returns Array of file extensions
   */
  public getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }
  
  /**
   * Get detailed registry information
   * @returns Registry statistics
   */
  public getRegistryInfo(): RegistryInfo {
    const parsers: ParserInfo[] = [];
    
    for (const [language, entry] of this.parsers.entries()) {
      parsers.push({
        language,
        version: entry.parser.version,
        extensions: entry.parser.supportedExtensions,
        registeredAt: entry.registeredAt,
        active: entry.active,
      });
    }
    
    return {
      totalParsers: this.parsers.size,
      totalExtensions: this.extensionMap.size,
      parsers,
    };
  }
  
  /**
   * Deactivate a parser without unregistering
   * @param language - Language name
   * @returns true if parser was deactivated
   */
  public deactivateParser(language: string): boolean {
    const normalizedLanguage = language.toLowerCase();
    const entry = this.parsers.get(normalizedLanguage);
    
    if (!entry) {
      return false;
    }
    
    entry.active = false;
    logger.info(`Deactivated parser for '${normalizedLanguage}'`);
    return true;
  }
  
  /**
   * Activate a previously deactivated parser
   * @param language - Language name
   * @returns true if parser was activated
   */
  public activateParser(language: string): boolean {
    const normalizedLanguage = language.toLowerCase();
    const entry = this.parsers.get(normalizedLanguage);
    
    if (!entry) {
      return false;
    }
    
    entry.active = true;
    logger.info(`Activated parser for '${normalizedLanguage}'`);
    return true;
  }
  
  /**
   * Clear all registered parsers (useful for testing)
   */
  public clear(): void {
    this.parsers.clear();
    this.extensionMap.clear();
    logger.info('Cleared all registered parsers');
  }
  
  /**
   * Normalize file extension to lowercase with leading dot
   * @param extension - File extension
   * @returns Normalized extension
   */
  private normalizeExtension(extension: string): string {
    const ext = extension.trim().toLowerCase();
    return ext.startsWith('.') ? ext : `.${ext}`;
  }
}

/**
 * Parser information for registry reporting
 */
export interface ParserInfo {
  language: string;
  version: string;
  extensions: string[];
  registeredAt: Date;
  active: boolean;
}

/**
 * Registry information
 */
export interface RegistryInfo {
  totalParsers: number;
  totalExtensions: number;
  parsers: ParserInfo[];
}

// Export singleton instance getter as default
export default ParserRegistry.getInstance;
