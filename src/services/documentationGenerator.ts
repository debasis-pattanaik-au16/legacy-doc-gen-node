import { IAnalysisResult, Component, Dependency, ApiEndpoint, ComplexityMetrics } from '@/types';
import { IProject } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Generated Documentation Interface
 */
export interface GeneratedDocumentation {
  readme?: string;
  apiDocs?: string;
  architecture?: string;
  components?: string;
  dependencies?: string;
}

/**
 * Documentation Generator Service
 * Generates comprehensive documentation from code analysis results
 */
export class DocumentationGenerator {
  
  /**
   * Generate README.md content from analysis results
   */
  public generateReadme(analysisResult: IAnalysisResult, project: IProject): string {
    try {
      logger.info(`Generating README for project: ${project.name}`);
      
      const sections = [
        this.generateReadmeHeader(project),
        this.generateProjectOverview(analysisResult, project),
        this.generateQuickStart(project, analysisResult),
        this.generateArchitectureOverview(analysisResult),
        this.generateProjectStructure(analysisResult, project),
        this.generateFeatures(analysisResult),
        this.generateTechnicalDetails(analysisResult),
        this.generateContributing(),
        this.generateLicense()
      ];

      return sections.filter(section => section.trim()).join('\n\n---\n\n');
      
    } catch (error: any) {
      logger.error('README generation failed:', error);
      return this.generateFallbackReadme(project);
    }
  }

  /**
   * Generate API documentation from analysis results
   */
  public generateApiDocs(analysisResult: IAnalysisResult, project: IProject): string {
    try {
      logger.info(`Generating API documentation for project: ${project.name}`);
      
      // Phase 2: Use api.endpoints instead of apiEndpoints array
      const apiEndpoints = (analysisResult as any).api?.endpoints || [];
      
      if (apiEndpoints.length === 0) {
        return this.generateNoApiDocsMessage(project);
      }
      
      const sections = [
        this.generateApiHeader(project, apiEndpoints),
        this.generateApiOverview(apiEndpoints),
        this.generateAuthenticationSection(apiEndpoints),
        this.generateEndpointsByMethod(apiEndpoints),
        this.generateApiExamples(apiEndpoints),
        this.generateErrorHandling(),
        this.generateRateLimiting()
      ];

      return sections.filter(section => section.trim()).join('\n\n---\n\n');
      
    } catch (error: any) {
      logger.error('API documentation generation failed:', error);
      return this.generateFallbackApiDocs(project);
    }
  }

  /**
   * Generate architecture documentation from analysis results
   */
  public generateArchitecture(analysisResult: IAnalysisResult, project: IProject): string {
    try {
      logger.info(`Generating architecture documentation for project: ${project.name}`);
      
      const sections = [
        this.generateArchitectureHeader(project),
        this.generateSystemOverview(analysisResult, project),
        this.generateComponentArchitecture(analysisResult),
        this.generateDependencyAnalysis(analysisResult),
        this.generateArchitecturalPatterns(analysisResult),
        this.generateDataFlow(analysisResult),
        this.generateQualityMetrics(analysisResult),
        this.generateArchitectureRecommendations(analysisResult)
      ];

      return sections.filter(section => section.trim()).join('\n\n---\n\n');
      
    } catch (error: any) {
      logger.error('Architecture documentation generation failed:', error);
      return this.generateFallbackArchitectureDocs(project);
    }
  }

  /**
   * Generate README header with project title and badges
   */
  private generateReadmeHeader(project: IProject): string {
    const title = project.name || 'Project Documentation';
    const description = project.description || 'Auto-generated documentation for this project';
    
    // Generate relevant badges based on project metadata
    const badges = this.generateBadges(project);
    
    return `# ${title}

${description}

${badges}`;
  }

  /**
   * Generate project overview section
   */
  private generateProjectOverview(analysisResult: IAnalysisResult, project: IProject): string {
    const componentCount = analysisResult.components?.length || 0;
    const dependencyCount = analysisResult.dependencies?.length || 0;
    // Phase 2: Use api.statistics or api.endpoints
    const apiEndpointCount = (analysisResult as any).api?.statistics?.totalEndpoints || (analysisResult as any).api?.endpoints?.length || 0;
    const languages = project.codebaseMetadata?.languages || [];
    const fileCount = project.codebaseMetadata?.fileCount || 0;
    const linesOfCode = project.codebaseMetadata?.totalLines || 0;
    
    let overview = `## 📋 Project Overview

This project is a **${project.type || 'web'}** application`;

    if (languages.length > 0) {
      overview += ` built primarily with **${languages.join(', ')}**`;
    }

    overview += `.

### 📊 Project Statistics

| Metric | Value |
|--------|-------|
| **Total Files** | ${fileCount.toLocaleString()} |
| **Lines of Code** | ${linesOfCode.toLocaleString()} |
| **Components** | ${componentCount.toLocaleString()} |
| **Dependencies** | ${dependencyCount.toLocaleString()} |`;

    if (apiEndpointCount > 0) {
      overview += `
| **API Endpoints** | ${apiEndpointCount.toLocaleString()} |`;
    }

    if (analysisResult.complexityMetrics) {
      const metrics = analysisResult.complexityMetrics;
      overview += `
| **Complexity Score** | ${metrics.cyclomaticComplexity} |
| **Maintainability Index** | ${metrics.maintainabilityIndex}/100 |`;
    }

    return overview;
  }

  /**
   * Generate quick start guide
   */
  private generateQuickStart(project: IProject, analysisResult: IAnalysisResult): string {
    const languages = project.codebaseMetadata?.languages || [];
    const hasPackageJson = analysisResult.dependencies?.some(dep => dep.from.includes('package.json'));
    const hasPython = languages.includes('Python') || languages.includes('python');
    const hasJavaScript = languages.includes('JavaScript') || languages.includes('TypeScript');
    const hasReact = analysisResult.dependencies?.some(dep => dep.to.includes('react'));
    
    let quickStart = `## 🚀 Quick Start

### Prerequisites
`;

    if (hasJavaScript) {
      quickStart += `- Node.js (v14 or higher)
- npm or yarn package manager
`;
    }

    if (hasPython) {
      quickStart += `- Python (v3.8 or higher)
- pip package manager
`;
    }

    quickStart += `
### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd ${project.name?.toLowerCase().replace(/\s+/g, '-') || 'project'}
   \`\`\`

2. **Install dependencies**`;

    if (hasPackageJson || hasJavaScript) {
      quickStart += `
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\``;
    }

    if (hasPython) {
      quickStart += `
   \`\`\`bash
   pip install -r requirements.txt
   # or
   pip install -e .
   \`\`\``;
    }

    quickStart += `

3. **Run the application**`;

    if (hasReact) {
      quickStart += `
   \`\`\`bash
   npm start
   # or
   yarn start
   \`\`\``;
    } else if (hasJavaScript) {
      quickStart += `
   \`\`\`bash
   npm run dev
   # or
   node index.js
   \`\`\``;
    } else if (hasPython) {
      quickStart += `
   \`\`\`bash
   python main.py
   # or
   python -m ${project.name?.toLowerCase().replace(/\s+/g, '_') || 'app'}
   \`\`\``;
    }

    return quickStart;
  }

  /**
   * Generate architecture overview
   */
  private generateArchitectureOverview(analysisResult: IAnalysisResult): string {
    const patterns = analysisResult.architecturePatterns || [];
    const componentsByType = this.groupComponentsByType(analysisResult.components || []);
    
    let architecture = `## 🏗️ Architecture Overview

This application follows modern architectural principles`;

    if (patterns.length > 0) {
      architecture += ` and implements the following patterns:

### Architectural Patterns
${patterns.map(pattern => `- **${pattern}**`).join('\n')}`;
    }

    architecture += `

### Component Distribution
`;

    Object.entries(componentsByType).forEach(([type, count]) => {
      architecture += `- **${this.capitalizeFirst(type)}s**: ${count} components\n`;
    });

    if (analysisResult.complexityMetrics) {
      const metrics = analysisResult.complexityMetrics;
      const maintainabilityLevel = this.getMaintainabilityLevel(metrics.maintainabilityIndex);
      const complexityLevel = this.getComplexityLevel(metrics.cyclomaticComplexity);
      
      architecture += `
### Code Quality Metrics
- **Maintainability**: ${maintainabilityLevel} (${metrics.maintainabilityIndex}/100)
- **Complexity**: ${complexityLevel} (${metrics.cyclomaticComplexity})
- **Technical Debt**: ${metrics.technicalDebt}%`;
    }

    return architecture;
  }

  /**
   * Generate project structure
   */
  private generateProjectStructure(analysisResult: IAnalysisResult, project?: IProject): string {
    const components = analysisResult.components || [];
    const filesByDirectory = this.groupFilesByDirectory(components);
    
    let structure = `## 📁 Project Structure

\`\`\`
${project?.name || 'project'}/
`;

    Object.entries(filesByDirectory).forEach(([dir, files]) => {
      if (dir === '.') {
        // Root files
        files.forEach(file => {
          structure += `├── ${file}\n`;
        });
      } else {
        structure += `├── ${dir}/\n`;
        files.forEach((file, index) => {
          const isLast = index === files.length - 1;
          structure += `│   ${isLast ? '└──' : '├──'} ${file}\n`;
        });
      }
    });

    structure += `\`\`\``;

    return structure;
  }

  /**
   * Generate features section
   */
  private generateFeatures(analysisResult: IAnalysisResult): string {
    const components = analysisResult.components || [];
    // Phase 2: Use api.endpoints instead of apiEndpoints array
    const apiEndpoints = (analysisResult as any).api?.endpoints || [];
    // Phase 2: Use database.entities instead of databaseSchemas array
    const hasDatabase = ((analysisResult as any).database?.entities?.length || 0) > 0;
    
    let features = `## ✨ Features

### Core Functionality
`;

    // Detect features based on components and API endpoints
    const detectedFeatures = this.detectFeatures(components, apiEndpoints);
    
    detectedFeatures.forEach(feature => {
      features += `- **${feature.name}**: ${feature.description}\n`;
    });

    if (apiEndpoints.length > 0) {
      features += `
### API Capabilities
- **REST API**: ${apiEndpoints.length} endpoints available
- **HTTP Methods**: ${this.getUniqueHttpMethods(apiEndpoints).join(', ')}`;
    }

    if (hasDatabase) {
      features += `
- **Database Integration**: Persistent data storage and retrieval`;
    }

    return features;
  }

  /**
   * Generate technical details
   */
  private generateTechnicalDetails(analysisResult: IAnalysisResult): string {
    const dependencies = analysisResult.dependencies || [];
    const externalDeps = dependencies.filter(dep => this.isExternalDependency(dep.to));
    const internalDeps = dependencies.filter(dep => !this.isExternalDependency(dep.to));
    
    let technical = `## 🔧 Technical Details

### Dependencies
- **External Dependencies**: ${externalDeps.length}
- **Internal Modules**: ${internalDeps.length}
- **Total Dependencies**: ${dependencies.length}`;

    // Key external libraries
    const keyLibraries = this.extractKeyLibraries(externalDeps);
    if (keyLibraries.length > 0) {
      technical += `

### Key Libraries
${keyLibraries.map(lib => `- **${lib}**`).join('\n')}`;
    }

    // Phase 2: Use api.endpoints or api.statistics
    const apiEndpointCount = (analysisResult as any).api?.statistics?.totalEndpoints || (analysisResult as any).api?.endpoints?.length || 0;
    if (apiEndpointCount > 0) {
      technical += `

### API Documentation
This project exposes a RESTful API with ${apiEndpointCount} endpoints.
For detailed API documentation, see the API Documentation section.`;
    }

    return technical;
  }

  /**
   * Generate contributing section
   */
  private generateContributing(): string {
    return `## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting`;
  }

  /**
   * Generate license section
   */
  private generateLicense(): string {
    return `## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*This documentation was auto-generated based on code analysis. For more details, please refer to the source code and inline comments.*`;
  }

  /**
   * Generate fallback README when analysis fails
   */
  private generateFallbackReadme(project: IProject): string {
    const title = project.name || 'Project Documentation';
    const description = project.description || 'Project documentation';
    
    return `# ${title}

${description}

## Getting Started

This project documentation was automatically generated. Please refer to the source code for detailed information about setup and usage.

## Project Information
- **Type**: ${project.type || 'Unknown'}
- **Created**: ${project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
- **Status**: ${project.status || 'Unknown'}

## Contributing

Please refer to the project maintainers for contribution guidelines.

---

*Auto-generated documentation*`;
  }

  // Architecture Documentation Helper Methods
  
  /**
   * Generate architecture documentation header
   */
  private generateArchitectureHeader(project: IProject): string {
    const title = `${project.name || 'Project'} Architecture Documentation`;
    
    return `# ${title}

Comprehensive architectural overview and system design documentation.

## Document Overview
This document provides detailed insights into the system architecture, component relationships, design patterns, and technical decisions that shape this project.

## Last Updated
${new Date().toLocaleDateString()} (Auto-generated)`;
  }

  /**
   * Generate system overview section
   */
  private generateSystemOverview(analysisResult: IAnalysisResult, project: IProject): string {
    const componentCount = analysisResult.components?.length || 0;
    const dependencyCount = analysisResult.dependencies?.length || 0;
    const languages = project.codebaseMetadata?.languages || [];
    const fileCount = project.codebaseMetadata?.fileCount || 0;
    
    let overview = `## 🏢 System Overview

### Project Classification
- **Type**: ${this.capitalizeFirst(project.type || 'application')}
- **Scale**: ${this.determineProjectScale(componentCount, fileCount)}
- **Architecture Style**: ${this.determineArchitectureStyle(analysisResult)}

### System Statistics

| Metric | Value | Analysis |
|--------|-------|----------|
| **Components** | ${componentCount} | ${this.analyzeComponentCount(componentCount)} |
| **Dependencies** | ${dependencyCount} | ${this.analyzeDependencyCount(dependencyCount)} |
| **Files** | ${fileCount.toLocaleString()} | ${this.analyzeFileCount(fileCount)} |
| **Languages** | ${languages.length} | ${this.analyzeLanguageCount(languages.length)} |

### Technology Stack
${this.generateTechnologyStack(analysisResult, languages)}`;

    return overview;
  }

  /**
   * Generate component architecture section
   */
  private generateComponentArchitecture(analysisResult: IAnalysisResult): string {
    const components = analysisResult.components || [];
    const componentsByType = this.groupComponentsByType(components);
    const componentsByLocation = this.groupComponentsByLocation(components);
    
    let architecture = `## 🏗️ Component Architecture

### Component Distribution

`;
    
    // Component type breakdown
    Object.entries(componentsByType).forEach(([type, count]) => {
      const percentage = ((count / components.length) * 100).toFixed(1);
      architecture += `- **${this.capitalizeFirst(type)}s**: ${count} (${percentage}%)\n`;
    });
    
    // Component layers/modules
    architecture += `
### Architectural Layers

`;
    
    const layers = this.identifyArchitecturalLayers(componentsByLocation);
    layers.forEach(layer => {
      architecture += `#### ${layer.name}\n`;
      architecture += `- **Purpose**: ${layer.purpose}\n`;
      architecture += `- **Components**: ${layer.components.length}\n`;
      architecture += `- **Key Files**: ${layer.components.slice(0, 3).map(c => `\`${c}\``).join(', ')}\n\n`;
    });
    
    // Component relationships
    architecture += `### Component Interactions

`;
    architecture += this.generateComponentInteractionDiagram(components);
    
    return architecture;
  }

  /**
   * Generate dependency analysis section
   */
  private generateDependencyAnalysis(analysisResult: IAnalysisResult): string {
    const dependencies = analysisResult.dependencies || [];
    const externalDeps = dependencies.filter(dep => this.isExternalDependency(dep.to));
    const internalDeps = dependencies.filter(dep => !this.isExternalDependency(dep.to));
    
    let analysis = `## 🔗 Dependency Analysis

### Dependency Overview

| Type | Count | Percentage |
|------|-------|-----------|
| **Internal** | ${internalDeps.length} | ${((internalDeps.length / dependencies.length) * 100).toFixed(1)}% |
| **External** | ${externalDeps.length} | ${((externalDeps.length / dependencies.length) * 100).toFixed(1)}% |
| **Total** | ${dependencies.length} | 100% |

### External Dependencies

`;
    
    // Group and analyze external dependencies
    const externalLibraries = this.analyzeExternalLibraries(externalDeps);
    externalLibraries.slice(0, 10).forEach(lib => {
      analysis += `- **${lib.name}** (${lib.usage} references) - ${lib.category}\n`;
    });
    
    // Dependency graph insights
    analysis += `
### Dependency Insights

`;
    const insights = this.generateDependencyInsights(dependencies);
    insights.forEach(insight => {
      analysis += `- **${insight.type}**: ${insight.description}\n`;
    });
    
    // Circular dependencies warning
    const circularWarning = this.checkCircularDependencies(internalDeps);
    if (circularWarning) {
      analysis += `
### ⚠️ Potential Issues

${circularWarning}`;
    }
    
    return analysis;
  }

  /**
   * Generate architectural patterns section
   */
  private generateArchitecturalPatterns(analysisResult: IAnalysisResult): string {
    const patterns = analysisResult.architecturePatterns || [];
    const components = analysisResult.components || [];
    
    let patternDoc = `## 🎨 Architectural Patterns

`;
    
    if (patterns.length > 0) {
      patternDoc += `### Identified Patterns

`;
      patterns.forEach(pattern => {
        patternDoc += `#### ${pattern}\n`;
        patternDoc += `${this.getPatternDescription(pattern)}\n\n`;
        
        const evidence = this.findPatternEvidence(pattern, components);
        if (evidence.length > 0) {
          patternDoc += `**Evidence in Codebase:**\n`;
          evidence.forEach(ev => {
            patternDoc += `- ${ev}\n`;
          });
          patternDoc += `\n`;
        }
      });
    } else {
      patternDoc += `### Pattern Analysis

No specific architectural patterns were automatically identified. This could indicate:

- **Organic Growth**: The architecture evolved naturally without explicit pattern implementation
- **Custom Architecture**: Unique architectural decisions specific to project requirements
- **Micropatterns**: Small-scale patterns that require manual identification

`;
    }
    
    // Suggest potential patterns
    const suggestedPatterns = this.suggestArchitecturalPatterns(components);
    if (suggestedPatterns.length > 0) {
      patternDoc += `### Potential Pattern Opportunities

`;
      suggestedPatterns.forEach(suggestion => {
        patternDoc += `- **${suggestion.pattern}**: ${suggestion.rationale}\n`;
      });
    }
    
    return patternDoc;
  }

  /**
   * Generate data flow documentation
   */
  private generateDataFlow(analysisResult: IAnalysisResult): string {
    const components = analysisResult.components || [];
    const dependencies = analysisResult.dependencies || [];
    // Phase 2: Use api.endpoints instead of apiEndpoints array
    const apiEndpoints = (analysisResult as any).api?.endpoints || [];
    
    let dataFlow = `## 🌊 Data Flow Architecture

### Data Flow Overview

`;
    
    // Identify data sources and sinks
    const dataSources = this.identifyDataSources(components, apiEndpoints);
    const dataProcessors = this.identifyDataProcessors(components);
    const dataStorages = this.identifyDataStorages(components);
    
    if (dataSources.length > 0) {
      dataFlow += `#### Data Sources
`;
      dataSources.forEach(source => {
        dataFlow += `- **${source.name}**: ${source.type} - ${source.description}\n`;
      });
      dataFlow += `\n`;
    }
    
    if (dataProcessors.length > 0) {
      dataFlow += `#### Data Processing
`;
      dataProcessors.forEach(processor => {
        dataFlow += `- **${processor.name}**: ${processor.description}\n`;
      });
      dataFlow += `\n`;
    }
    
    if (dataStorages.length > 0) {
      dataFlow += `#### Data Storage
`;
      dataStorages.forEach(storage => {
        dataFlow += `- **${storage.name}**: ${storage.description}\n`;
      });
      dataFlow += `\n`;
    }
    
    // Generate flow diagram
    dataFlow += `### Data Flow Diagram\n\n`;
    dataFlow += this.generateDataFlowDiagram(dataSources, dataProcessors, dataStorages);
    
    return dataFlow;
  }

  /**
   * Generate quality metrics section
   */
  private generateQualityMetrics(analysisResult: IAnalysisResult): string {
    const metrics = analysisResult.complexityMetrics;
    const components = analysisResult.components || [];
    const dependencies = analysisResult.dependencies || [];
    
    let quality = `## 📊 Quality Metrics & Analysis

`;
    
    if (metrics) {
      quality += `### Code Quality Scores

| Metric | Value | Rating | Analysis |
|--------|-------|--------|---------|
`;
      
      const maintainabilityRating = this.rateMetric(metrics.maintainabilityIndex, 100);
      const complexityRating = this.rateComplexity(metrics.cyclomaticComplexity);
      const debtRating = this.rateDebt(metrics.technicalDebt);
      
      quality += `| **Maintainability** | ${metrics.maintainabilityIndex}/100 | ${maintainabilityRating.emoji} ${maintainabilityRating.label} | ${maintainabilityRating.analysis} |\n`;
      quality += `| **Complexity** | ${metrics.cyclomaticComplexity} | ${complexityRating.emoji} ${complexityRating.label} | ${complexityRating.analysis} |\n`;
      quality += `| **Technical Debt** | ${metrics.technicalDebt}% | ${debtRating.emoji} ${debtRating.label} | ${debtRating.analysis} |\n`;
      quality += `| **Lines of Code** | ${metrics.linesOfCode.toLocaleString()} | - | ${this.analyzeLinesOfCode(metrics.linesOfCode)} |\n\n`;
      
      // Quality insights
      quality += `### Quality Insights\n\n`;
      const qualityInsights = this.generateQualityInsights(metrics, components, dependencies);
      qualityInsights.forEach(insight => {
        quality += `- **${insight.category}**: ${insight.description}\n`;
      });
    } else {
      quality += `### Quality Analysis Unavailable

Detailed quality metrics are not available for this project. Consider running static analysis tools to gather comprehensive quality data.\n`;
    }
    
    return quality;
  }

  /**
   * Generate architecture recommendations
   */
  private generateArchitectureRecommendations(analysisResult: IAnalysisResult): string {
    const components = analysisResult.components || [];
    const dependencies = analysisResult.dependencies || [];
    const metrics = analysisResult.complexityMetrics;
    
    let recommendations = `## 🎯 Architecture Recommendations

### Immediate Actions

`;
    
    const immediateActions = this.generateImmediateActions(metrics, components, dependencies);
    immediateActions.forEach(action => {
      recommendations += `#### ${action.title}\n`;
      recommendations += `**Priority**: ${action.priority}\n`;
      recommendations += `**Impact**: ${action.impact}\n`;
      recommendations += `**Description**: ${action.description}\n\n`;
      
      if (action.steps && action.steps.length > 0) {
        recommendations += `**Implementation Steps**:\n`;
        action.steps.forEach((step, index) => {
          recommendations += `${index + 1}. ${step}\n`;
        });
        recommendations += `\n`;
      }
    });
    
    // Long-term improvements
    recommendations += `### Long-term Improvements\n\n`;
    const longTermImprovements = this.generateLongTermImprovements(analysisResult);
    longTermImprovements.forEach(improvement => {
      recommendations += `- **${improvement.area}**: ${improvement.description}\n`;
    });
    
    // Best practices
    recommendations += `\n### Architectural Best Practices\n\n`;
    const bestPractices = this.getArchitecturalBestPractices();
    bestPractices.forEach(practice => {
      recommendations += `- **${practice.principle}**: ${practice.description}\n`;
    });
    
    return recommendations;
  }

  /**
   * Generate fallback architecture documentation
   */
  private generateFallbackArchitectureDocs(project: IProject): string {
    return `# ${project.name || 'Project'} Architecture Documentation

## Documentation Generation Failed

There was an error generating comprehensive architecture documentation for this project.

## Manual Analysis Recommended

For detailed architectural insights:
1. Review the codebase structure manually
2. Identify key components and their relationships  
3. Document design patterns and architectural decisions
4. Analyze data flow and system boundaries

## Getting Help

For assistance with architectural analysis:
- Consult with the development team
- Review existing design documents
- Use specialized architecture analysis tools

---

*Auto-generated documentation - Manual review required*`;
  }

  // Architecture helper methods implementation
  private determineProjectScale(componentCount: number, fileCount: number): string {
    if (componentCount > 200 || fileCount > 500) return 'Large Scale';
    if (componentCount > 50 || fileCount > 100) return 'Medium Scale';
    return 'Small Scale';
  }

  private determineArchitectureStyle(analysisResult: IAnalysisResult): string {
    const patterns = analysisResult.architecturePatterns || [];
    if (patterns.includes('Microservices')) return 'Microservices';
    if (patterns.includes('Layered')) return 'Layered Architecture';
    if (patterns.includes('MVC')) return 'Model-View-Controller';
    return 'Custom/Organic';
  }

  private analyzeComponentCount(count: number): string {
    if (count > 200) return 'High component count - consider modularization';
    if (count > 50) return 'Moderate component count - good modularity';
    return 'Low component count - simple architecture';
  }

  private analyzeDependencyCount(count: number): string {
    if (count > 500) return 'High dependency complexity';
    if (count > 100) return 'Moderate dependency network';
    return 'Simple dependency structure';
  }

  private analyzeFileCount(count: number): string {
    if (count > 1000) return 'Large codebase';
    if (count > 100) return 'Medium-sized codebase';
    return 'Small codebase';
  }

  private analyzeLanguageCount(count: number): string {
    if (count > 5) return 'Polyglot architecture - high complexity';
    if (count > 2) return 'Multi-language project';
    return 'Single/dual language project';
  }

  private generateTechnologyStack(analysisResult: IAnalysisResult, languages: string[]): string {
    let stack = 'Primary Technologies:\n';
    languages.forEach(lang => {
      stack += `- **${lang}**\n`;
    });
    
    const keyLibraries = this.extractKeyLibraries(analysisResult.dependencies?.filter(dep => this.isExternalDependency(dep.to)) || []);
    if (keyLibraries.length > 0) {
      stack += '\nKey Libraries:\n';
      keyLibraries.slice(0, 5).forEach(lib => {
        stack += `- ${lib}\n`;
      });
    }
    
    return stack;
  }

  private groupComponentsByLocation(components: Component[]): Record<string, Component[]> {
    return components.reduce((acc, comp) => {
      const location = this.extractLocationCategory(comp.filePath);
      if (!acc[location]) acc[location] = [];
      acc[location].push(comp);
      return acc;
    }, {} as Record<string, Component[]>);
  }

  private extractLocationCategory(filePath: string): string {
    const path = filePath.toLowerCase();
    if (path.includes('controller')) return 'Controllers';
    if (path.includes('service')) return 'Services';
    if (path.includes('model')) return 'Models';
    if (path.includes('component')) return 'Components';
    if (path.includes('util')) return 'Utilities';
    if (path.includes('config')) return 'Configuration';
    if (path.includes('middleware')) return 'Middleware';
    if (path.includes('route')) return 'Routes';
    return 'Core';
  }

  private identifyArchitecturalLayers(componentsByLocation: Record<string, Component[]>): Array<{name: string; purpose: string; components: string[]}> {
    return Object.entries(componentsByLocation).map(([location, components]) => ({
      name: location,
      purpose: this.getLayerPurpose(location),
      components: components.map(c => c.filePath)
    }));
  }

  private getLayerPurpose(layer: string): string {
    const purposes: Record<string, string> = {
      'Controllers': 'Handle HTTP requests and responses',
      'Services': 'Implement business logic and operations',
      'Models': 'Define data structures and database interactions',
      'Components': 'Reusable UI and functional components',
      'Utilities': 'Helper functions and shared utilities',
      'Configuration': 'Application settings and configuration',
      'Middleware': 'Request/response processing pipeline',
      'Routes': 'Define API endpoints and routing logic',
      'Core': 'Core application functionality'
    };
    return purposes[layer] || 'Application component';
  }

  private generateComponentInteractionDiagram(components: Component[]): string {
    // Simple text-based interaction description
    const interactions = this.analyzeComponentInteractions(components);
    let diagram = '```\nComponent Interaction Overview:\n';
    
    interactions.forEach(interaction => {
      diagram += `${interaction.from} --> ${interaction.to} (${interaction.relationship})\n`;
    });
    
    diagram += '```\n\n*Note: This is a simplified interaction overview. For detailed diagrams, consider using specialized tools like Mermaid or PlantUML.*';
    
    return diagram;
  }

  private analyzeComponentInteractions(components: Component[]): Array<{from: string; to: string; relationship: string}> {
    // Simplified interaction analysis based on component dependencies
    const interactions: Array<{from: string; to: string; relationship: string}> = [];
    
    components.forEach(comp => {
      comp.dependencies?.forEach(dep => {
        if (!this.isExternalDependency(dep)) {
          interactions.push({
            from: comp.name,
            to: dep,
            relationship: 'depends on'
          });
        }
      });
    });
    
    return interactions.slice(0, 10); // Limit for readability
  }

  private analyzeExternalLibraries(externalDeps: Dependency[]): Array<{name: string; usage: number; category: string}> {
    const libraryMap = new Map<string, number>();
    
    externalDeps.forEach(dep => {
      const libName = this.extractLibraryName(dep.to);
      libraryMap.set(libName, (libraryMap.get(libName) || 0) + 1);
    });
    
    return Array.from(libraryMap.entries())
      .map(([name, usage]) => ({
        name,
        usage,
        category: this.categorizeLibrary(name)
      }))
      .sort((a, b) => b.usage - a.usage);
  }

  private categorizeLibrary(libName: string): string {
    const categories: Record<string, string> = {
      'react': 'UI Framework',
      'express': 'Web Framework',
      'mongoose': 'Database ORM',
      'axios': 'HTTP Client',
      'lodash': 'Utility Library',
      'moment': 'Date/Time Library',
      'uuid': 'ID Generation',
      'bcrypt': 'Security/Crypto',
      'jwt': 'Authentication'
    };
    
    for (const [key, category] of Object.entries(categories)) {
      if (libName.toLowerCase().includes(key)) return category;
    }
    
    return 'General Library';
  }

  private generateDependencyInsights(dependencies: Dependency[]): Array<{type: string; description: string}> {
    const insights = [];
    
    const depthAnalysis = this.analyzeDependencyDepth(dependencies);
    if (depthAnalysis.maxDepth > 5) {
      insights.push({
        type: 'Deep Dependencies',
        description: `Maximum dependency depth of ${depthAnalysis.maxDepth} detected - consider flattening`
      });
    }
    
    const fanOutAnalysis = this.analyzeFanOut(dependencies);
    if (fanOutAnalysis.maxFanOut > 10) {
      insights.push({
        type: 'High Fan-out',
        description: `Component with ${fanOutAnalysis.maxFanOut} dependencies detected - consider refactoring`
      });
    }
    
    return insights;
  }

  private analyzeDependencyDepth(dependencies: Dependency[]): {maxDepth: number} {
    // Simplified depth analysis - in real implementation, would need graph traversal
    return { maxDepth: Math.min(dependencies.length / 10, 8) };
  }

  private analyzeFanOut(dependencies: Dependency[]): {maxFanOut: number} {
    const fanOutMap = new Map<string, number>();
    
    dependencies.forEach(dep => {
      fanOutMap.set(dep.from, (fanOutMap.get(dep.from) || 0) + 1);
    });
    
    return { maxFanOut: Math.max(...Array.from(fanOutMap.values()), 0) };
  }

  private checkCircularDependencies(internalDeps: Dependency[]): string | null {
    // Simplified circular dependency check
    const dependencyPairs = internalDeps.map(dep => `${dep.from} -> ${dep.to}`);
    const reversePairs = internalDeps.map(dep => `${dep.to} -> ${dep.from}`);
    
    const potentialCircular = dependencyPairs.filter(pair => {
      const [from, to] = pair.split(' -> ');
      return reversePairs.includes(`${to} -> ${from}`);
    });
    
    if (potentialCircular.length > 0) {
      return `Potential circular dependencies detected:\n${potentialCircular.slice(0, 3).map(p => `- ${p}`).join('\n')}`;
    }
    
    return null;
  }

  private getPatternDescription(pattern: string): string {
    const descriptions: Record<string, string> = {
      'MVC': 'Model-View-Controller pattern separates application logic into three interconnected components.',
      'Layered': 'Layered architecture organizes code into horizontal layers with defined responsibilities.',
      'Microservices': 'Microservices architecture structures application as collection of loosely coupled services.',
      'Repository': 'Repository pattern encapsulates data access logic and centralizes common data access functionality.',
      'Factory': 'Factory pattern creates objects without specifying exact classes to create.',
      'Observer': 'Observer pattern defines one-to-many dependency between objects.',
      'Singleton': 'Singleton pattern ensures class has only one instance and provides global access point.'
    };
    
    return descriptions[pattern] || `${pattern} architectural pattern is implemented in this codebase.`;
  }

  private findPatternEvidence(pattern: string, components: Component[]): string[] {
    const evidence = [];
    
    switch (pattern.toLowerCase()) {
      case 'mvc':
        if (components.some(c => c.filePath.toLowerCase().includes('controller'))) evidence.push('Controllers detected');
        if (components.some(c => c.filePath.toLowerCase().includes('model'))) evidence.push('Models detected');
        if (components.some(c => c.filePath.toLowerCase().includes('view'))) evidence.push('Views detected');
        break;
      case 'repository':
        if (components.some(c => c.name.toLowerCase().includes('repository'))) evidence.push('Repository classes found');
        break;
      case 'factory':
        if (components.some(c => c.name.toLowerCase().includes('factory'))) evidence.push('Factory classes found');
        break;
    }
    
    return evidence;
  }

  private suggestArchitecturalPatterns(components: Component[]): Array<{pattern: string; rationale: string}> {
    const suggestions = [];
    
    const hasControllers = components.some(c => c.filePath.toLowerCase().includes('controller'));
    const hasServices = components.some(c => c.filePath.toLowerCase().includes('service'));
    
    if (hasControllers && hasServices) {
      suggestions.push({
        pattern: 'Service Layer',
        rationale: 'Controllers and services detected - implement service layer pattern for better separation'
      });
    }
    
    if (components.length > 50) {
      suggestions.push({
        pattern: 'Module Pattern',
        rationale: 'Large codebase - consider organizing into modules for better maintainability'
      });
    }
    
    return suggestions;
  }

  private identifyDataSources(components: Component[], apiEndpoints: ApiEndpoint[]): Array<{name: string; type: string; description: string}> {
    const sources = [];
    
    if (apiEndpoints.length > 0) {
      sources.push({
        name: 'REST API',
        type: 'External Input',
        description: `${apiEndpoints.length} endpoints accepting external data`
      });
    }
    
    const dbComponents = components.filter(c => 
      c.filePath.toLowerCase().includes('model') || 
      c.filePath.toLowerCase().includes('schema')
    );
    
    if (dbComponents.length > 0) {
      sources.push({
        name: 'Database',
        type: 'Persistent Storage',
        description: `${dbComponents.length} data models for database interaction`
      });
    }
    
    return sources;
  }

  private identifyDataProcessors(components: Component[]): Array<{name: string; description: string}> {
    return components
      .filter(c => 
        c.filePath.toLowerCase().includes('service') ||
        c.filePath.toLowerCase().includes('processor') ||
        c.filePath.toLowerCase().includes('handler')
      )
      .map(c => ({
        name: c.name,
        description: `Business logic processing in ${c.filePath}`
      }))
      .slice(0, 5);
  }

  private identifyDataStorages(components: Component[]): Array<{name: string; description: string}> {
    return components
      .filter(c => 
        c.filePath.toLowerCase().includes('model') ||
        c.filePath.toLowerCase().includes('repository') ||
        c.filePath.toLowerCase().includes('dao')
      )
      .map(c => ({
        name: c.name,
        description: `Data persistence layer in ${c.filePath}`
      }))
      .slice(0, 5);
  }

  private generateDataFlowDiagram(dataSources: any[], dataProcessors: any[], dataStorages: any[]): string {
    return `\`\`\`
Data Flow Overview:

[Data Sources] --> [Processing] --> [Storage]
     |               |             |
${dataSources.map(s => `  ${s.name}`).join('\n')}
                   |
${dataProcessors.map(p => `               ${p.name}`).join('\n')}
                                     |
${dataStorages.map(s => `                               ${s.name}`).join('\n')}
\`\`\`

*This is a simplified data flow representation. Actual data flow may be more complex.*`;
  }

  private rateMetric(value: number, max: number): {emoji: string; label: string; analysis: string} {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return { emoji: '🟢', label: 'Excellent', analysis: 'High quality code' };
    if (percentage >= 60) return { emoji: '🟡', label: 'Good', analysis: 'Acceptable quality' };
    if (percentage >= 40) return { emoji: '🟠', label: 'Fair', analysis: 'Needs improvement' };
    return { emoji: '🔴', label: 'Poor', analysis: 'Requires attention' };
  }

  private rateComplexity(complexity: number): {emoji: string; label: string; analysis: string} {
    if (complexity <= 10) return { emoji: '🟢', label: 'Low', analysis: 'Simple and maintainable' };
    if (complexity <= 20) return { emoji: '🟡', label: 'Moderate', analysis: 'Acceptable complexity' };
    if (complexity <= 50) return { emoji: '🟠', label: 'High', analysis: 'Consider refactoring' };
    return { emoji: '🔴', label: 'Very High', analysis: 'Urgent refactoring needed' };
  }

  private rateDebt(debt: number): {emoji: string; label: string; analysis: string} {
    if (debt <= 20) return { emoji: '🟢', label: 'Low', analysis: 'Minimal technical debt' };
    if (debt <= 40) return { emoji: '🟡', label: 'Moderate', analysis: 'Manageable debt level' };
    if (debt <= 60) return { emoji: '🟠', label: 'High', analysis: 'Address technical debt' };
    return { emoji: '🔴', label: 'Critical', analysis: 'Immediate debt reduction needed' };
  }

  private analyzeLinesOfCode(loc: number): string {
    if (loc > 100000) return 'Very large codebase - consider architectural review';
    if (loc > 50000) return 'Large codebase - good modularization important';
    if (loc > 10000) return 'Medium-sized codebase - well-structured';
    return 'Small codebase - easy to understand';
  }

  private generateQualityInsights(metrics: ComplexityMetrics, components: Component[], dependencies: Dependency[]): Array<{category: string; description: string}> {
    const insights = [];
    
    if (metrics.maintainabilityIndex < 50) {
      insights.push({
        category: 'Maintainability',
        description: 'Low maintainability index suggests need for refactoring and code cleanup'
      });
    }
    
    if (metrics.cyclomaticComplexity > components.length * 2) {
      insights.push({
        category: 'Complexity',
        description: 'High cyclomatic complexity relative to component count - simplify logic'
      });
    }
    
    if (dependencies.length > components.length * 3) {
      insights.push({
        category: 'Dependencies',
        description: 'High dependency-to-component ratio - review coupling between components'
      });
    }
    
    return insights;
  }

  private generateImmediateActions(metrics: ComplexityMetrics | undefined, components: Component[], dependencies: Dependency[]): Array<{title: string; priority: string; impact: string; description: string; steps?: string[]}> {
    const actions = [];
    
    if (metrics && metrics.maintainabilityIndex < 40) {
      actions.push({
        title: 'Address Technical Debt',
        priority: 'High',
        impact: 'Maintainability',
        description: 'Critical maintainability issues detected requiring immediate attention',
        steps: [
          'Identify most problematic components',
          'Refactor complex functions',
          'Add comprehensive documentation',
          'Implement automated testing'
        ]
      });
    }
    
    if (components.length > 100 && !this.hasModularStructure(components)) {
      actions.push({
        title: 'Implement Modular Architecture',
        priority: 'Medium',
        impact: 'Organization',
        description: 'Large codebase lacks clear modular organization',
        steps: [
          'Group related components into modules',
          'Define clear module boundaries',
          'Implement dependency injection',
          'Create module-level documentation'
        ]
      });
    }
    
    return actions;
  }

  private hasModularStructure(components: Component[]): boolean {
    const directories = new Set(
      components.map(c => c.filePath.split('/').slice(0, -1).join('/'))
    );
    return directories.size > components.length / 10; // Rough heuristic
  }

  private generateLongTermImprovements(analysisResult: IAnalysisResult): Array<{area: string; description: string}> {
    const improvements = [
      {
        area: 'Testing Strategy',
        description: 'Implement comprehensive testing strategy with unit, integration, and end-to-end tests'
      },
      {
        area: 'Performance Optimization',
        description: 'Conduct performance analysis and optimize critical paths'
      },
      {
        area: 'Security Hardening',
        description: 'Review and enhance security measures across all system components'
      }
    ];
    
    if ((analysisResult.components?.length || 0) > 50) {
      improvements.push({
        area: 'Microservices Transition',
        description: 'Consider breaking down monolithic components into microservices for better scalability'
      });
    }
    
    return improvements;
  }

  private getArchitecturalBestPractices(): Array<{principle: string; description: string}> {
    return [
      {
        principle: 'Single Responsibility',
        description: 'Each component should have one reason to change'
      },
      {
        principle: 'Loose Coupling',
        description: 'Minimize dependencies between components'
      },
      {
        principle: 'High Cohesion',
        description: 'Group related functionality together'
      },
      {
        principle: 'Separation of Concerns',
        description: 'Separate different aspects of functionality'
      },
      {
        principle: 'Dependency Inversion',
        description: 'Depend on abstractions, not concretions'
      }
    ];
  }

  // API Documentation Helper Methods
  
  /**
   * Generate API documentation header
   */
  private generateApiHeader(project: IProject, apiEndpoints: ApiEndpoint[]): string {
    const title = `${project.name || 'Project'} API Documentation`;
    const baseUrl = this.detectBaseUrl(project);
    
    return `# ${title}

Comprehensive API documentation for ${project.name || 'this project'}.

## Base URL
\`\`\`
${baseUrl}
\`\`\`

## API Version
Version: \`v1\` (Current)

## Total Endpoints
**${apiEndpoints.length}** endpoints available across **${this.getUniqueHttpMethods(apiEndpoints).length}** HTTP methods.`;
  }

  /**
   * Generate API overview section
   */
  private generateApiOverview(apiEndpoints: ApiEndpoint[]): string {
    const methodCounts = this.getMethodCounts(apiEndpoints);
    const endpointsByPath = this.groupEndpointsByPath(apiEndpoints);
    
    let overview = `## 📋 API Overview

### HTTP Methods Distribution

| Method | Count | Description |
|--------|-------|-------------|
`;

    Object.entries(methodCounts).forEach(([method, count]) => {
      const description = this.getMethodDescription(method);
      overview += `| **${method}** | ${count} | ${description} |\n`;
    });

    overview += `
### Endpoint Categories

`;
    
    Object.entries(endpointsByPath).forEach(([basePath, endpoints]) => {
      overview += `- **${basePath}**: ${endpoints.length} endpoint${endpoints.length > 1 ? 's' : ''}\n`;
    });

    return overview;
  }

  /**
   * Generate authentication section
   */
  private generateAuthenticationSection(apiEndpoints: ApiEndpoint[]): string {
    const hasAuthEndpoints = apiEndpoints.some(ep => 
      ep.path.includes('/auth') || 
      ep.path.includes('/login') ||
      ep.handler.toLowerCase().includes('auth')
    );

    let auth = `## 🔐 Authentication`;

    if (hasAuthEndpoints) {
      auth += `

This API uses authentication for secure access to protected endpoints.

### Authentication Methods
- **Bearer Token**: Include \`Authorization: Bearer <token>\` header
- **Session-based**: Cookie-based authentication for web clients

### Getting Started
1. Register or login to obtain access credentials
2. Include authentication headers in your requests
3. Handle 401/403 responses appropriately

### Protected Endpoints
Endpoints marked with 🔒 require authentication.`;
    } else {
      auth += `

This API appears to be publicly accessible. No authentication detected in the analyzed endpoints.

**Note**: This analysis is based on endpoint patterns. Please verify authentication requirements with the API maintainers.`;
    }

    return auth;
  }

  /**
   * Generate endpoints organized by HTTP method
   */
  private generateEndpointsByMethod(apiEndpoints: ApiEndpoint[]): string {
    const endpointsByMethod = this.groupEndpointsByMethod(apiEndpoints);
    let documentation = `## 📚 API Endpoints`;

    Object.entries(endpointsByMethod).forEach(([method, endpoints]) => {
      documentation += `

### ${method} Endpoints

`;
      
      endpoints.forEach(endpoint => {
        const isProtected = this.isProtectedEndpoint(endpoint);
        const protectionBadge = isProtected ? ' 🔒' : '';
        
        documentation += `#### ${method} \`${endpoint.path}\`${protectionBadge}

`;
        
        if (endpoint.responses && endpoint.responses.length > 0) {
          documentation += `**Description**: API endpoint handling ${method} requests\n\n`;
        }
        
        // Parameters
        if (endpoint.parameters && endpoint.parameters.length > 0) {
          documentation += `**Parameters**:\n\n| Name | Type | Required | Description |\n|------|------|----------|-------------|\n`;
          endpoint.parameters.forEach(param => {
            const required = param.required ? '✅' : '❌';
            documentation += `| \`${param.name}\` | ${param.type || 'string'} | ${required} | ${param.description || 'Parameter description'} |\n`;
          });
          documentation += `\n`;
        }
        
        // Response examples
        if (endpoint.responses && endpoint.responses.length > 0) {
          documentation += `**Responses**:\n\n`;
          endpoint.responses.forEach(response => {
            documentation += `**${response.statusCode}** - ${response.description}\n`;
            if (response.schema) {
              documentation += `\`\`\`json\n${JSON.stringify(response.schema, null, 2)}\n\`\`\`\n`;
            }
          });
        }
        
        documentation += `\n**Handler**: \`${endpoint.handler}\`\n`;
        documentation += `**File**: \`${endpoint.filePath}\`\n\n`;
      });
    });

    return documentation;
  }

  /**
   * Generate API usage examples
   */
  private generateApiExamples(apiEndpoints: ApiEndpoint[]): string {
    const exampleEndpoints = this.selectExampleEndpoints(apiEndpoints);
    
    let examples = `## 💡 Usage Examples

### cURL Examples

`;

    exampleEndpoints.forEach(endpoint => {
      examples += `#### ${endpoint.method} ${endpoint.path}\n\n`;
      
      let curlExample = `\`\`\`bash\ncurl -X ${endpoint.method}`;
      
      if (this.isProtectedEndpoint(endpoint)) {
        curlExample += ` \\\n  -H "Authorization: Bearer <your-token>"`;
      }
      
      curlExample += ` \\\n  -H "Content-Type: application/json"`;
      
      if (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') {
        curlExample += ` \\\n  -d '{\n    "key": "value"\n  }'`;
      }
      
      curlExample += ` \\\n  ${this.detectBaseUrl()}${endpoint.path}\n\`\`\``;
      
      examples += `${curlExample}\n\n`;
    });

    // JavaScript/Node.js examples
    examples += `### JavaScript/Node.js Examples\n\n`;
    
    const firstExample = exampleEndpoints[0];
    if (firstExample) {
      examples += `\`\`\`javascript\nconst response = await fetch('${this.detectBaseUrl()}${firstExample.path}', {\n  method: '${firstExample.method}',\n  headers: {\n    'Content-Type': 'application/json'`;
      
      if (this.isProtectedEndpoint(firstExample)) {
        examples += `,\n    'Authorization': 'Bearer ' + yourToken`;
      }
      
      examples += `\n  }`;
      
      if (firstExample.method !== 'GET') {
        examples += `,\n  body: JSON.stringify({\n    // your data here\n  })`;
      }
      
      examples += `\n});\n\nconst data = await response.json();\nconsole.log(data);\n\`\`\``;
    }

    return examples;
  }

  /**
   * Generate error handling section
   */
  private generateErrorHandling(): string {
    return `## ❌ Error Handling

### Standard HTTP Status Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| **200** | OK | Request successful |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid request data |
| **401** | Unauthorized | Authentication required |
| **403** | Forbidden | Access denied |
| **404** | Not Found | Resource not found |
| **422** | Unprocessable Entity | Validation errors |
| **500** | Internal Server Error | Server error |

### Error Response Format

\`\`\`json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
\`\`\`

### Common Error Scenarios
- **Validation Errors**: Check request data format
- **Authentication Issues**: Verify token validity
- **Rate Limiting**: Reduce request frequency
- **Server Errors**: Contact API maintainers`;
  }

  /**
   * Generate rate limiting section
   */
  private generateRateLimiting(): string {
    return `## 🚦 Rate Limiting

### Request Limits
- **Default**: 1000 requests per hour per IP
- **Authenticated**: 5000 requests per hour per user
- **Burst**: 100 requests per minute

### Rate Limit Headers
API responses include rate limiting information:

\`\`\`
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
\`\`\`

### Handling Rate Limits
- Monitor response headers
- Implement exponential backoff
- Cache responses when possible
- Use webhooks for real-time updates

**Note**: Rate limiting details are estimated based on common API practices. Please verify actual limits with the API documentation.`;
  }

  /**
   * Generate message when no API endpoints are found
   */
  private generateNoApiDocsMessage(project: IProject): string {
    return `# ${project.name || 'Project'} API Documentation

## No API Endpoints Detected

No REST API endpoints were detected during the code analysis.

### Possible Reasons:
- This project may not expose a REST API
- API endpoints might use patterns not recognized by the analyzer
- The project might use GraphQL, gRPC, or other API architectures

### Manual Documentation
If this project does have an API, please refer to:
- Source code in controllers/routes directories
- OpenAPI/Swagger specifications
- Developer documentation

---

*This analysis was performed automatically. For accurate API documentation, please consult the project maintainers.*`;
  }

  /**
   * Generate fallback API documentation when analysis fails
   */
  private generateFallbackApiDocs(project: IProject): string {
    return `# ${project.name || 'Project'} API Documentation

## Documentation Generation Failed

There was an error generating comprehensive API documentation for this project.

## Manual Review Required
Please check:
- API endpoint definitions in your codebase
- Route configuration files
- Controller implementations

## Getting Help
For assistance with API documentation:
1. Review the source code structure
2. Check for existing API documentation
3. Contact the project maintainers

---

*Auto-generated documentation - Manual review recommended*`;
  }

  // API Documentation Helper Methods
  private detectBaseUrl(project?: IProject): string {
    // Try to detect from project metadata or use default
    return process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
  }

  private getMethodCounts(apiEndpoints: ApiEndpoint[]): Record<string, number> {
    return apiEndpoints.reduce((acc, endpoint) => {
      acc[endpoint.method] = (acc[endpoint.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private getMethodDescription(method: string): string {
    const descriptions = {
      'GET': 'Retrieve data',
      'POST': 'Create new resources',
      'PUT': 'Update resources',
      'PATCH': 'Partial updates',
      'DELETE': 'Remove resources'
    };
    return descriptions[method as keyof typeof descriptions] || 'API operation';
  }

  private groupEndpointsByPath(apiEndpoints: ApiEndpoint[]): Record<string, ApiEndpoint[]> {
    return apiEndpoints.reduce((acc, endpoint) => {
      const basePath = this.extractBasePath(endpoint.path);
      if (!acc[basePath]) acc[basePath] = [];
      acc[basePath].push(endpoint);
      return acc;
    }, {} as Record<string, ApiEndpoint[]>);
  }

  private groupEndpointsByMethod(apiEndpoints: ApiEndpoint[]): Record<string, ApiEndpoint[]> {
    return apiEndpoints.reduce((acc, endpoint) => {
      if (!acc[endpoint.method]) acc[endpoint.method] = [];
      acc[endpoint.method].push(endpoint);
      return acc;
    }, {} as Record<string, ApiEndpoint[]>);
  }

  private extractBasePath(path: string): string {
    const segments = path.split('/').filter(segment => segment && !segment.startsWith(':'));
    return segments.length > 0 ? `/${segments[0]}` : '/api';
  }

  private isProtectedEndpoint(endpoint: ApiEndpoint): boolean {
    return endpoint.path.includes('/auth') || 
           endpoint.handler.toLowerCase().includes('auth') ||
           endpoint.path.includes('/admin') ||
           endpoint.method === 'DELETE' ||
           (endpoint.method === 'POST' && !endpoint.path.includes('/login'));
  }

  private selectExampleEndpoints(apiEndpoints: ApiEndpoint[]): ApiEndpoint[] {
    // Select diverse examples for documentation
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const examples: ApiEndpoint[] = [];
    
    methods.forEach(method => {
      const endpoint = apiEndpoints.find(ep => ep.method === method);
      if (endpoint && examples.length < 3) {
        examples.push(endpoint);
      }
    });
    
    return examples.length > 0 ? examples : apiEndpoints.slice(0, 3);
  }

  // Helper methods
  private generateBadges(project: IProject): string {
    const badges = [];
    
    if (project.status) {
      const statusColor = project.status === 'completed' ? 'green' : 
                         project.status === 'failed' ? 'red' : 'blue';
      badges.push(`![Status](https://img.shields.io/badge/status-${project.status}-${statusColor})`);
    }
    
    if (project.type) {
      badges.push(`![Type](https://img.shields.io/badge/type-${project.type}-lightgrey)`);
    }
    
    const languages = project.codebaseMetadata?.languages || [];
    if (languages.length > 0) {
      badges.push(`![Language](https://img.shields.io/badge/language-${languages[0]}-blue)`);
    }
    
    return badges.join(' ');
  }

  private groupComponentsByType(components: Component[]): Record<string, number> {
    return components.reduce((acc, comp) => {
      acc[comp.type] = (acc[comp.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupFilesByDirectory(components: Component[]): Record<string, string[]> {
    return components.reduce((acc, comp) => {
      const dir = comp.filePath.includes('/') ? 
                  comp.filePath.split('/').slice(0, -1).join('/') : '.';
      const fileName = comp.filePath.split('/').pop() || comp.filePath;
      
      if (!acc[dir]) acc[dir] = [];
      if (!acc[dir].includes(fileName)) {
        acc[dir].push(fileName);
      }
      return acc;
    }, {} as Record<string, string[]>);
  }

  private detectFeatures(components: Component[], apiEndpoints: ApiEndpoint[]): Array<{name: string, description: string}> {
    const features = [];
    
    // Authentication detection
    const hasAuth = components.some(c => 
      c.name.toLowerCase().includes('auth') || 
      c.name.toLowerCase().includes('login') ||
      c.filePath.toLowerCase().includes('auth')
    );
    if (hasAuth) {
      features.push({
        name: 'Authentication',
        description: 'User authentication and authorization system'
      });
    }
    
    // API detection
    if (apiEndpoints.length > 0) {
      features.push({
        name: 'REST API',
        description: `RESTful API with ${apiEndpoints.length} endpoints for data operations`
      });
    }
    
    // Database detection
    const hasDatabase = components.some(c =>
      c.name.toLowerCase().includes('model') ||
      c.name.toLowerCase().includes('schema') ||
      c.filePath.toLowerCase().includes('model')
    );
    if (hasDatabase) {
      features.push({
        name: 'Data Persistence',
        description: 'Database integration for data storage and retrieval'
      });
    }
    
    // File upload detection
    const hasFileUpload = components.some(c =>
      c.name.toLowerCase().includes('upload') ||
      c.name.toLowerCase().includes('file')
    );
    if (hasFileUpload) {
      features.push({
        name: 'File Management',
        description: 'File upload and management capabilities'
      });
    }
    
    return features;
  }

  private getUniqueHttpMethods(apiEndpoints: ApiEndpoint[]): string[] {
    return [...new Set(apiEndpoints.map(ep => ep.method))];
  }

  private extractKeyLibraries(externalDeps: Dependency[]): string[] {
    const libraryNames = externalDeps.map(dep => this.extractLibraryName(dep.to));
    const counts = libraryNames.reduce((acc, lib) => {
      acc[lib] = (acc[lib] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([lib]) => lib);
  }

  private extractLibraryName(dependency: string): string {
    // Extract library name from import path
    if (dependency.startsWith('./') || dependency.startsWith('../')) {
      return dependency; // Local import
    }
    
    // For npm packages, get the main package name
    const parts = dependency.split('/');
    if (dependency.startsWith('@')) {
      return parts.slice(0, 2).join('/'); // Scoped package
    }
    return parts[0]; // Regular package
  }

  private isExternalDependency(dependency: string): boolean {
    return !dependency.startsWith('./') && !dependency.startsWith('../') && !dependency.startsWith('/');
  }

  private getMaintainabilityLevel(index: number): string {
    if (index >= 85) return 'Excellent';
    if (index >= 70) return 'Good';
    if (index >= 50) return 'Moderate';
    return 'Needs Improvement';
  }

  private getComplexityLevel(complexity: number): string {
    if (complexity <= 10) return 'Low';
    if (complexity <= 20) return 'Moderate';
    if (complexity <= 50) return 'High';
    return 'Very High';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Singleton instance
export const documentationGenerator = new DocumentationGenerator();