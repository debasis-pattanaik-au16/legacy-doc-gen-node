/**
 * Injection Vulnerability Detector
 * 
 * Detects various injection vulnerabilities:
 * - SQL Injection
 * - Cross-Site Scripting (XSS)
 * - Command Injection
 * - LDAP Injection
 * - XPath Injection
 * - Template Injection
 */

import { randomUUID } from 'crypto';
import {
  SecurityIssue,
  SecuritySeverity,
  SecurityCategory,
  VulnerabilityType,
  SecurityLocation,
  SecurityRecommendation,
  SecurityDetector,
  DetectionContext,
  CWEReference,
  OWASPReference
} from '@/types/security';
import { UnifiedAST, ComponentNode } from '@/types/ast';
import { logger } from '@/utils/logger';

/**
 * Patterns for detecting SQL injection vulnerabilities
 */
const SQL_PATTERNS = {
  // Direct string concatenation in SQL queries
  stringConcat: [
    /(['"`]).*?\+.*?SELECT/i,
    /(['"`]).*?\+.*?INSERT/i,
    /(['"`]).*?\+.*?UPDATE/i,
    /(['"`]).*?\+.*?DELETE/i,
    /(['"`]).*?\+.*?DROP/i,
    /SELECT.*?\+.*?FROM/i,
    /INSERT.*?\+.*?INTO/i
  ],
  
  // Template literals without sanitization
  templateLiteral: [
    /`.*?SELECT.*?\$\{/i,
    /`.*?INSERT.*?\$\{/i,
    /`.*?UPDATE.*?\$\{/i,
    /`.*?DELETE.*?\$\{/i,
    /`.*?WHERE.*?\$\{/i
  ],
  
  // SQL keywords that should trigger checks
  sqlKeywords: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'EXEC', 'EXECUTE'],
  
  // Database method patterns
  unsafeMethods: [
    'query', 'raw', 'execute', 'run', 'exec',
    'findRaw', 'executeRaw', 'queryRaw'
  ]
};

/**
 * Patterns for detecting XSS vulnerabilities
 */
const XSS_PATTERNS = {
  // DOM manipulation methods
  dangerousMethods: [
    'innerHTML', 'outerHTML', 'insertAdjacentHTML',
    'document.write', 'document.writeln',
    'dangerouslySetInnerHTML'
  ],
  
  // Unsafe React patterns
  reactUnsafe: [
    'dangerouslySetInnerHTML',
    '__html'
  ],
  
  // jQuery unsafe methods
  jqueryUnsafe: [
    '.html(', '.append(', '.prepend(',
    '.after(', '.before('
  ],
  
  // URL manipulation
  urlManipulation: [
    'location.href', 'location.assign',
    'window.open', 'location.replace'
  ]
};

/**
 * Patterns for detecting command injection
 */
const COMMAND_PATTERNS = {
  // Node.js command execution
  nodeExec: [
    'child_process.exec',
    'child_process.execSync',
    'child_process.spawn',
    'child_process.spawnSync',
    'child_process.execFile',
    'child_process.fork'
  ],
  
  // Python command execution
  pythonExec: [
    'os.system',
    'os.popen',
    'subprocess.call',
    'subprocess.run',
    'subprocess.Popen',
    'subprocess.check_output',
    'eval(',
    'exec('
  ],
  
  // Shell meta-characters
  shellMetaChars: ['|', '&', ';', '$', '`', '\n', '(', ')', '<', '>', '\\']
};

/**
 * InjectionDetector class
 */
export class InjectionDetector implements SecurityDetector {
  name = 'InjectionDetector';
  version = '1.0.0';
  supportedLanguages = ['javascript', 'typescript', 'python'];
  detectedTypes = [
    VulnerabilityType.SQL_INJECTION,
    VulnerabilityType.XSS,
    VulnerabilityType.COMMAND_INJECTION,
    VulnerabilityType.LDAP_INJECTION,
    VulnerabilityType.XPATH_INJECTION,
    VulnerabilityType.TEMPLATE_INJECTION
  ];

  /**
   * Main detection method
   */
  async detect(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Run all detectors
      issues.push(...await this.detectSQLInjection(ast, context));
      issues.push(...await this.detectXSS(ast, context));
      issues.push(...await this.detectCommandInjection(ast, context));
      issues.push(...await this.detectLDAPInjection(ast, context));
      issues.push(...await this.detectXPathInjection(ast, context));
      issues.push(...await this.detectTemplateInjection(ast, context));

      logger.info(`InjectionDetector found ${issues.length} issues in ${context.fileName}`);
    } catch (error) {
      logger.error(`Error in InjectionDetector: ${error}`);
    }

    return issues;
  }

  /**
   * Detect SQL Injection vulnerabilities
   */
  private async detectSQLInjection(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const component of ast.components) {
      // Check for string concatenation with SQL keywords
      const concatenationIssues = this.checkSQLConcatenation(component, context);
      issues.push(...concatenationIssues);

      // Check for template literals with SQL
      const templateIssues = this.checkSQLTemplateLiterals(component, context);
      issues.push(...templateIssues);

      // Check for unsafe database methods
      const methodIssues = this.checkUnsafeDatabaseMethods(component, context);
      issues.push(...methodIssues);
    }

    return issues;
  }

  /**
   * Check for SQL concatenation patterns
   */
  private checkSQLConcatenation(component: ComponentNode, context: DetectionContext): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const code = this.getComponentCode(component, context);

    // Check for string concatenation with SQL keywords
    for (const pattern of SQL_PATTERNS.stringConcat) {
      if (pattern.test(code)) {
        issues.push(this.createIssue({
          type: VulnerabilityType.SQL_INJECTION,
          severity: SecuritySeverity.CRITICAL,
          title: 'SQL Injection via String Concatenation',
          description: `Detected SQL query constructed using string concatenation in ${component.name}. This is vulnerable to SQL injection attacks.`,
          location: this.createLocation(component, context),
          fixComplexity: 'medium',
          recommendations: this.getSQLInjectionRecommendations(),
          confidence: 85,
          cwe: [{
            id: 'CWE-89',
            name: 'SQL Injection',
            url: 'https://cwe.mitre.org/data/definitions/89.html'
          }],
          owasp: [{
            category: SecurityCategory.INJECTION,
            year: 2021,
            rank: 3,
            url: 'https://owasp.org/Top10/A03_2021-Injection/'
          }]
        }));
      }
    }

    return issues;
  }

  /**
   * Check for SQL template literal patterns
   */
  private checkSQLTemplateLiterals(component: ComponentNode, context: DetectionContext): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const code = this.getComponentCode(component, context);

    for (const pattern of SQL_PATTERNS.templateLiteral) {
      if (pattern.test(code)) {
        issues.push(this.createIssue({
          type: VulnerabilityType.SQL_INJECTION,
          severity: SecuritySeverity.CRITICAL,
          title: 'SQL Injection via Template Literals',
          description: `Detected SQL query using template literals with user input in ${component.name}. Use parameterized queries instead.`,
          location: this.createLocation(component, context),
          fixComplexity: 'low',
          recommendations: this.getSQLInjectionRecommendations(),
          confidence: 80,
          cwe: [{
            id: 'CWE-89',
            name: 'SQL Injection',
            url: 'https://cwe.mitre.org/data/definitions/89.html'
          }]
        }));
      }
    }

    return issues;
  }

  /**
   * Check for unsafe database method calls
   */
  private checkUnsafeDatabaseMethods(component: ComponentNode, context: DetectionContext): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const code = this.getComponentCode(component, context);

    for (const method of SQL_PATTERNS.unsafeMethods) {
      const regex = new RegExp(`\\.${method}\\s*\\([^)]*\\+`, 'g');
      if (regex.test(code)) {
        issues.push(this.createIssue({
          type: VulnerabilityType.SQL_INJECTION,
          severity: SecuritySeverity.HIGH,
          title: `Unsafe Database Method: ${method}`,
          description: `Method '${method}' called with concatenated parameters in ${component.name}. This may be vulnerable to SQL injection.`,
          location: this.createLocation(component, context),
          fixComplexity: 'medium',
          recommendations: this.getSQLInjectionRecommendations(),
          confidence: 75,
          cwe: [{
            id: 'CWE-89',
            name: 'SQL Injection',
            url: 'https://cwe.mitre.org/data/definitions/89.html'
          }]
        }));
      }
    }

    return issues;
  }

  /**
   * Detect XSS (Cross-Site Scripting) vulnerabilities
   */
  private async detectXSS(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      // Check for dangerous DOM methods
      for (const method of XSS_PATTERNS.dangerousMethods) {
        if (code.includes(method)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.XSS,
            severity: SecuritySeverity.HIGH,
            title: `XSS via ${method}`,
            description: `Detected use of dangerous method '${method}' in ${component.name}. This can lead to XSS if user input is not properly sanitized.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getXSSRecommendations(),
            confidence: 70,
            cwe: [{
              id: 'CWE-79',
              name: 'Cross-site Scripting (XSS)',
              url: 'https://cwe.mitre.org/data/definitions/79.html'
            }],
            owasp: [{
              category: SecurityCategory.INJECTION,
              year: 2021,
              rank: 3,
              url: 'https://owasp.org/Top10/A03_2021-Injection/'
            }]
          }));
        }
      }

      // Check for React unsafe patterns
      for (const pattern of XSS_PATTERNS.reactUnsafe) {
        if (code.includes(pattern)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.XSS,
            severity: SecuritySeverity.HIGH,
            title: 'React XSS via dangerouslySetInnerHTML',
            description: `Detected use of '${pattern}' in ${component.name}. Ensure all HTML is properly sanitized before rendering.`,
            location: this.createLocation(component, context),
            fixComplexity: 'medium',
            recommendations: this.getReactXSSRecommendations(),
            confidence: 85,
            cwe: [{
              id: 'CWE-79',
              name: 'Cross-site Scripting (XSS)',
              url: 'https://cwe.mitre.org/data/definitions/79.html'
            }]
          }));
        }
      }

      // Check for URL manipulation
      for (const pattern of XSS_PATTERNS.urlManipulation) {
        const regex = new RegExp(`${pattern}\\s*=`, 'g');
        if (regex.test(code)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.XSS,
            severity: SecuritySeverity.MEDIUM,
            title: `Potential XSS via ${pattern}`,
            description: `Detected URL manipulation using '${pattern}' in ${component.name}. Validate and sanitize URLs to prevent XSS.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getURLXSSRecommendations(),
            confidence: 65,
            cwe: [{
              id: 'CWE-79',
              name: 'Cross-site Scripting (XSS)',
              url: 'https://cwe.mitre.org/data/definitions/79.html'
            }]
          }));
        }
      }
    }

    return issues;
  }

  /**
   * Detect Command Injection vulnerabilities
   */
  private async detectCommandInjection(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const isJavaScript = context.language === 'javascript' || context.language === 'typescript';
    const isPython = context.language === 'python';

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      if (isJavaScript) {
        // Check Node.js command execution
        for (const method of COMMAND_PATTERNS.nodeExec) {
          if (code.includes(method)) {
            issues.push(this.createIssue({
              type: VulnerabilityType.COMMAND_INJECTION,
              severity: SecuritySeverity.CRITICAL,
              title: `Command Injection via ${method}`,
              description: `Detected command execution using '${method}' in ${component.name}. Validate and sanitize all inputs to prevent command injection.`,
              location: this.createLocation(component, context),
              fixComplexity: 'high',
              recommendations: this.getCommandInjectionRecommendations('node'),
              confidence: 80,
              cwe: [{
                id: 'CWE-78',
                name: 'OS Command Injection',
                url: 'https://cwe.mitre.org/data/definitions/78.html'
              }],
              owasp: [{
                category: SecurityCategory.INJECTION,
                year: 2021,
                rank: 3,
                url: 'https://owasp.org/Top10/A03_2021-Injection/'
              }]
            }));
          }
        }
      }

      if (isPython) {
        // Check Python command execution
        for (const method of COMMAND_PATTERNS.pythonExec) {
          if (code.includes(method)) {
            issues.push(this.createIssue({
              type: VulnerabilityType.COMMAND_INJECTION,
              severity: SecuritySeverity.CRITICAL,
              title: `Command Injection via ${method}`,
              description: `Detected command execution using '${method}' in ${component.name}. Use subprocess with shell=False and validate inputs.`,
              location: this.createLocation(component, context),
              fixComplexity: 'high',
              recommendations: this.getCommandInjectionRecommendations('python'),
              confidence: 85,
              cwe: [{
                id: 'CWE-78',
                name: 'OS Command Injection',
                url: 'https://cwe.mitre.org/data/definitions/78.html'
              }]
            }));
          }
        }
      }
    }

    return issues;
  }

  /**
   * Detect LDAP Injection vulnerabilities
   */
  private async detectLDAPInjection(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      // Check for LDAP search with string concatenation
      const ldapPatterns = [
        /ldap.*?search.*?\+/i,
        /ldap.*?filter.*?\+/i,
        /new\s+LdapFilter.*?\+/i
      ];

      for (const pattern of ldapPatterns) {
        if (pattern.test(code)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.LDAP_INJECTION,
            severity: SecuritySeverity.HIGH,
            title: 'LDAP Injection via String Concatenation',
            description: `Detected LDAP filter constructed using string concatenation in ${component.name}. Use parameterized LDAP queries.`,
            location: this.createLocation(component, context),
            fixComplexity: 'medium',
            recommendations: this.getLDAPInjectionRecommendations(),
            confidence: 75,
            cwe: [{
              id: 'CWE-90',
              name: 'LDAP Injection',
              url: 'https://cwe.mitre.org/data/definitions/90.html'
            }]
          }));
        }
      }
    }

    return issues;
  }

  /**
   * Detect XPath Injection vulnerabilities
   */
  private async detectXPathInjection(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      // Check for XPath with string concatenation
      const xpathPatterns = [
        /xpath.*?\+/i,
        /selectNodes.*?\+/i,
        /evaluate.*?\+/i
      ];

      for (const pattern of xpathPatterns) {
        if (pattern.test(code)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.XPATH_INJECTION,
            severity: SecuritySeverity.HIGH,
            title: 'XPath Injection via String Concatenation',
            description: `Detected XPath query constructed using string concatenation in ${component.name}. Use parameterized XPath queries.`,
            location: this.createLocation(component, context),
            fixComplexity: 'medium',
            recommendations: this.getXPathInjectionRecommendations(),
            confidence: 70,
            cwe: [{
              id: 'CWE-643',
              name: 'XPath Injection',
              url: 'https://cwe.mitre.org/data/definitions/643.html'
            }]
          }));
        }
      }
    }

    return issues;
  }

  /**
   * Detect Template Injection vulnerabilities
   */
  private async detectTemplateInjection(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      // Check for template rendering with user input
      const templatePatterns = [
        /\.render\([^)]*req\./i,
        /\.compile\([^)]*\+/i,
        /Handlebars\.compile\([^)]*\+/i,
        /Mustache\.render\([^)]*\+/i,
        /ejs\.render\([^)]*\+/i
      ];

      for (const pattern of templatePatterns) {
        if (pattern.test(code)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.TEMPLATE_INJECTION,
            severity: SecuritySeverity.HIGH,
            title: 'Template Injection Risk',
            description: `Detected template rendering with potentially untrusted data in ${component.name}. Sanitize all inputs before rendering.`,
            location: this.createLocation(component, context),
            fixComplexity: 'medium',
            recommendations: this.getTemplateInjectionRecommendations(),
            confidence: 70,
            cwe: [{
              id: 'CWE-1336',
              name: 'Improper Neutralization of Special Elements Used in a Template Engine',
              url: 'https://cwe.mitre.org/data/definitions/1336.html'
            }]
          }));
        }
      }
    }

    return issues;
  }

  /**
   * Helper: Create security issue
   */
  private createIssue(params: {
    type: VulnerabilityType;
    severity: SecuritySeverity;
    title: string;
    description: string;
    location: SecurityLocation;
    fixComplexity: 'low' | 'medium' | 'high';
    recommendations: SecurityRecommendation[];
    confidence: number;
    cwe: CWEReference[];
    owasp?: OWASPReference[];
  }): SecurityIssue {
    return {
      id: randomUUID(),
      type: params.type,
      category: SecurityCategory.INJECTION,
      severity: params.severity,
      title: params.title,
      description: params.description,
      location: params.location,
      recommendations: params.recommendations,
      fixComplexity: params.fixComplexity,
      cwe: params.cwe,
      owasp: params.owasp,
      confidence: params.confidence,
      exploitability: params.severity === SecuritySeverity.CRITICAL ? 'easy' : 'medium',
      impact: {
        confidentiality: 'high',
        integrity: 'high',
        availability: 'medium'
      },
      detectedBy: this.name,
      detectedAt: new Date()
    };
  }

  /**
   * Helper: Create location object
   */
  private createLocation(component: ComponentNode, context: DetectionContext): SecurityLocation {
    return {
      file: context.fileName,
      line: component.startLine,
      endLine: component.endLine,
      component: component.name,
      snippet: this.getCodeSnippet(component)
    };
  }

  /**
   * Helper: Get code snippet
   */
  private getCodeSnippet(component: ComponentNode): string {
    // Return a placeholder snippet with component info
    return `${component.type} ${component.name} (lines ${component.startLine}-${component.endLine})`;
  }

  /**
   * Helper: Get component code from source
   */
  private getComponentCode(component: ComponentNode, context: DetectionContext): string {
    const lines = context.fileContent.split('\n');
    const startIndex = Math.max(0, component.startLine - 1);
    const endIndex = Math.min(lines.length, component.endLine);
    return lines.slice(startIndex, endIndex).join('\n');
  }

  /**
   * Get SQL Injection recommendations
   */
  private getSQLInjectionRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Use Parameterized Queries',
        description: 'Always use parameterized queries or prepared statements instead of string concatenation.',
        codeExample: `// ❌ Vulnerable
const query = "SELECT * FROM users WHERE id = " + userId;

// ✅ Secure
const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId]);`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
          'https://owasp.org/www-community/attacks/SQL_Injection'
        ],
        effort: 'low',
        priority: 1
      },
      {
        title: 'Use ORM with Parameterization',
        description: 'Use an ORM that handles parameterization automatically (e.g., TypeORM, Sequelize, Prisma).',
        codeExample: `// Using TypeORM
const user = await userRepository.findOne({ where: { id: userId } });

// Using Prisma
const user = await prisma.user.findUnique({ where: { id: userId } });`,
        references: [
          'https://typeorm.io/select-query-builder',
          'https://www.prisma.io/docs/concepts/components/prisma-client'
        ],
        effort: 'medium',
        priority: 2
      }
    ];
  }

  /**
   * Get XSS recommendations
   */
  private getXSSRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Sanitize User Input',
        description: 'Always sanitize and encode user input before rendering in HTML.',
        codeExample: `// Use DOMPurify or similar library
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(userInput);
element.innerHTML = clean;`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
          'https://github.com/cure53/DOMPurify'
        ],
        effort: 'low',
        priority: 1
      },
      {
        title: 'Use textContent Instead',
        description: 'Use textContent or innerText instead of innerHTML when possible.',
        codeExample: `// ❌ Vulnerable
element.innerHTML = userInput;

// ✅ Secure
element.textContent = userInput;`,
        references: [
          'https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent'
        ],
        effort: 'low',
        priority: 2
      }
    ];
  }

  /**
   * Get React XSS recommendations
   */
  private getReactXSSRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Avoid dangerouslySetInnerHTML',
        description: 'Avoid using dangerouslySetInnerHTML. If necessary, sanitize the HTML first.',
        codeExample: `import DOMPurify from 'isomorphic-dompurify';

const Component = ({ html }) => {
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};`,
        references: [
          'https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml',
          'https://github.com/kkomelin/isomorphic-dompurify'
        ],
        effort: 'medium',
        priority: 1
      }
    ];
  }

  /**
   * Get URL XSS recommendations
   */
  private getURLXSSRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Validate URLs',
        description: 'Validate and sanitize URLs before using them for navigation.',
        codeExample: `// Validate URL
const isValid = url => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

if (isValid(userUrl)) {
  window.location.href = userUrl;
}`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Get Command Injection recommendations
   */
  private getCommandInjectionRecommendations(platform: 'node' | 'python'): SecurityRecommendation[] {
    if (platform === 'node') {
      return [
        {
          title: 'Use Parameterized Commands',
          description: 'Use spawn with array arguments instead of exec with string commands.',
          codeExample: `// ❌ Vulnerable
exec(\`ls -la \${userInput}\`);

// ✅ Secure
spawn('ls', ['-la', userInput]);`,
          references: [
            'https://nodejs.org/api/child_process.html#child_processspawncommand-args-options'
          ],
          effort: 'medium',
          priority: 1
        },
        {
          title: 'Validate and Sanitize Input',
          description: 'Strictly validate all user inputs and use allowlists.',
          codeExample: `const allowedCommands = ['ls', 'cat', 'grep'];
if (!allowedCommands.includes(userCommand)) {
  throw new Error('Invalid command');
}`,
          references: [
            'https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html'
          ],
          effort: 'low',
          priority: 2
        }
      ];
    } else {
      return [
        {
          title: 'Use subprocess Safely',
          description: 'Use subprocess with shell=False and pass arguments as list.',
          codeExample: `# ❌ Vulnerable
os.system(f"ls -la {user_input}")

# ✅ Secure
subprocess.run(['ls', '-la', user_input], shell=False)`,
          references: [
            'https://docs.python.org/3/library/subprocess.html#security-considerations'
          ],
          effort: 'medium',
          priority: 1
        }
      ];
    }
  }

  /**
   * Get LDAP Injection recommendations
   */
  private getLDAPInjectionRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Escape LDAP Special Characters',
        description: 'Escape all special LDAP characters before building filters.',
        codeExample: `function escapeLDAP(input) {
  return input.replace(/[\\\\*()\\x00]/g, '\\\\$&');
}

const safeFilter = \`(uid=\${escapeLDAP(userInput)})\`;`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/LDAP_Injection_Prevention_Cheat_Sheet.html'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Get XPath Injection recommendations
   */
  private getXPathInjectionRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Use Parameterized XPath Queries',
        description: 'Use XPath with parameters instead of string concatenation.',
        codeExample: `// Use XPath variables
const xpath = "/users/user[@id=$id]";
const result = doc.evaluate(xpath, doc, null, { id: userId });`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/XPath_Injection_Prevention_Cheat_Sheet.html'
        ],
        effort: 'medium',
        priority: 1
      }
    ];
  }

  /**
   * Get Template Injection recommendations
   */
  private getTemplateInjectionRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Use Auto-Escaping Templates',
        description: 'Use template engines with auto-escaping enabled by default.',
        codeExample: `// Use safe template engines
const template = handlebars.compile(templateString, { 
  noEscape: false  // Enable escaping
});`,
        references: [
          'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/18-Testing_for_Server-side_Template_Injection'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }
}
