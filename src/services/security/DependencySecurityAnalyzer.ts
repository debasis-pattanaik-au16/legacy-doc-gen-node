/**
 * Dependency Security Analyzer
 * 
 * Checks dependencies for known vulnerabilities using:
 * - OSV (Open Source Vulnerabilities) API
 * - Local vulnerability database
 * - Caching for performance
 */

import { randomUUID } from 'crypto';
import {
  SecurityIssue,
  SecuritySeverity,
  SecurityCategory,
  VulnerabilityType,
  DependencyVulnerability,
  SecurityRecommendation,
  CVSSMetrics
} from '@/types/security';
import { ExternalLibrary } from '@/types/dependency';
import { logger } from '@/utils/logger';
import axios from 'axios';

const OSV_API_URL = 'https://api.osv.dev/v1';
const CACHE_TTL = 3600 * 24; // 24 hours

interface VulnerabilityCache {
  [key: string]: {
    vulnerabilities: DependencyVulnerability[];
    timestamp: number;
  };
}

/**
 * DependencySecurityAnalyzer class
 */
export class DependencySecurityAnalyzer {
  private cache: VulnerabilityCache = {};
  private requestQueue: Promise<any>[] = [];
  private maxConcurrent = 5;

  /**
   * Scan dependencies for vulnerabilities
   */
  async scanDependencies(dependencies: ExternalLibrary[]): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      logger.info(`Scanning ${dependencies.length} dependencies for vulnerabilities...`);

      // Process dependencies in batches
      const batches = this.createBatches(dependencies, 10);
      
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(dep => this.checkDependency(dep))
        );
        
        for (const result of batchResults) {
          if (result) {
            issues.push(...result);
          }
        }
      }

      logger.info(`Found ${issues.length} dependency vulnerabilities`);
    } catch (error) {
      logger.error(`Error scanning dependencies: ${error}`);
    }

    return issues;
  }

  /**
   * Check a single dependency for vulnerabilities
   */
  private async checkDependency(dependency: ExternalLibrary): Promise<SecurityIssue[]> {
    const cacheKey = `${dependency.name}@${dependency.version}`;
    
    // Check cache
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache[cacheKey].vulnerabilities;
      return this.convertToSecurityIssues(cached, dependency);
    }

    try {
      // Query OSV API
      const vulnerabilities = await this.queryOSV(dependency.name, dependency.version || 'latest');
      
      // Cache results
      this.cache[cacheKey] = {
        vulnerabilities,
        timestamp: Date.now()
      };

      return this.convertToSecurityIssues(vulnerabilities, dependency);
    } catch (error) {
      logger.warn(`Failed to check ${dependency.name}: ${error}`);
      return [];
    }
  }

  /**
   * Query OSV API for vulnerabilities
   */
  private async queryOSV(packageName: string, version: string): Promise<DependencyVulnerability[]> {
    try {
      const response = await axios.post(
        `${OSV_API_URL}/query`,
        {
          package: {
            name: packageName,
            ecosystem: this.getEcosystem(packageName)
          },
          version: version
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.vulns) {
        return response.data.vulns.map((vuln: any) => this.parseOSVVulnerability(vuln, packageName, version));
      }

      return [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return []; // No vulnerabilities found
      }
      throw error;
    }
  }

  /**
   * Parse OSV vulnerability data
   */
  private parseOSVVulnerability(vuln: any, packageName: string, version: string): DependencyVulnerability {
    const severity = this.mapSeverity(vuln.database_specific?.severity || 'MODERATE');
    
    return {
      packageName,
      packageVersion: version,
      vulnerabilityId: vuln.id,
      severity,
      title: vuln.summary || vuln.id,
      description: vuln.details || 'No description available',
      affectedVersions: this.extractAffectedVersions(vuln.affected),
      fixedInVersion: this.extractFixedVersion(vuln.affected),
      cvss: this.extractCVSS(vuln),
      cwe: this.extractCWE(vuln),
      publishedDate: vuln.published ? new Date(vuln.published) : undefined,
      lastModified: vuln.modified ? new Date(vuln.modified) : undefined,
      recommendations: this.generateRecommendations(vuln, packageName),
      patchAvailable: !!this.extractFixedVersion(vuln.affected),
      source: 'OSV',
      references: vuln.references?.map((ref: any) => ref.url) || []
    };
  }

  /**
   * Convert dependency vulnerabilities to security issues
   */
  private convertToSecurityIssues(
    vulnerabilities: DependencyVulnerability[],
    dependency: ExternalLibrary
  ): SecurityIssue[] {
    return vulnerabilities.map(vuln => ({
      id: randomUUID(),
      type: VulnerabilityType.VULNERABLE_DEPENDENCY,
      category: SecurityCategory.VULNERABLE_COMPONENTS,
      severity: vuln.severity,
      title: `Vulnerable Dependency: ${vuln.title}`,
      description: `${dependency.name}@${dependency.version} has known vulnerability: ${vuln.description}`,
      location: {
        file: 'package.json',
        line: 1,
        component: dependency.name
      },
      recommendations: [
        {
          title: `Update ${dependency.name}`,
          description: vuln.fixedInVersion 
            ? `Update to version ${vuln.fixedInVersion} or later`
            : 'No fix available yet. Consider alternative packages.',
          codeExample: vuln.fixedInVersion 
            ? `npm install ${dependency.name}@${vuln.fixedInVersion}`
            : `# Monitor ${vuln.vulnerabilityId} for updates`,
          references: vuln.references,
          effort: 'low',
          priority: vuln.severity === SecuritySeverity.CRITICAL ? 1 : 2
        }
      ],
      fixComplexity: 'low',
      cwe: vuln.cwe,
      cvss: vuln.cvss,
      owasp: [{
        category: SecurityCategory.VULNERABLE_COMPONENTS,
        year: 2021,
        rank: 6,
        url: 'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/'
      }],
      confidence: 100,
      exploitability: this.getExploitability(vuln.severity),
      impact: {
        confidentiality: 'high',
        integrity: 'high',
        availability: 'medium'
      },
      detectedBy: 'DependencySecurityAnalyzer',
      detectedAt: new Date()
    }));
  }

  /**
   * Helper methods
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache[key];
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < (CACHE_TTL * 1000);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private getEcosystem(packageName: string): string {
    // Simple heuristic - can be improved
    if (packageName.startsWith('@')) return 'npm';
    return 'npm'; // Default to npm
  }

  private mapSeverity(osvSeverity: string): SecuritySeverity {
    const severity = osvSeverity.toUpperCase();
    if (severity.includes('CRITICAL')) return SecuritySeverity.CRITICAL;
    if (severity.includes('HIGH')) return SecuritySeverity.HIGH;
    if (severity.includes('MEDIUM') || severity.includes('MODERATE')) return SecuritySeverity.MEDIUM;
    if (severity.includes('LOW')) return SecuritySeverity.LOW;
    return SecuritySeverity.MEDIUM;
  }

  private extractAffectedVersions(affected: any[]): string[] {
    if (!affected) return [];
    return affected
      .flatMap((a: any) => a.ranges || [])
      .flatMap((r: any) => r.events || [])
      .filter((e: any) => e.introduced)
      .map((e: any) => e.introduced);
  }

  private extractFixedVersion(affected: any[]): string | undefined {
    if (!affected) return undefined;
    const fixed = affected
      .flatMap((a: any) => a.ranges || [])
      .flatMap((r: any) => r.events || [])
      .find((e: any) => e.fixed);
    return fixed?.fixed;
  }

  private extractCVSS(vuln: any): CVSSMetrics | undefined {
    if (!vuln.severity) return undefined;
    
    const severity = vuln.severity.find((s: any) => s.type === 'CVSS_V3');
    if (!severity) return undefined;

    return {
      version: '3.1',
      baseScore: severity.score || 0,
      vectorString: severity.vector || ''
    };
  }

  private extractCWE(vuln: any): any[] {
    // OSV doesn't always provide CWE, return empty array
    return [];
  }

  private generateRecommendations(vuln: any, packageName: string): string[] {
    const recs = [`Update ${packageName} to a patched version`];
    if (vuln.references) {
      recs.push('Review vulnerability details in references');
    }
    return recs;
  }

  private getExploitability(severity: SecuritySeverity): 'easy' | 'medium' | 'hard' {
    if (severity === SecuritySeverity.CRITICAL) return 'easy';
    if (severity === SecuritySeverity.HIGH) return 'medium';
    return 'hard';
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = {};
  }
}
