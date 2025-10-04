/**
 * Authentication & Authorization Vulnerability Detector
 * 
 * Detects authentication and authorization vulnerabilities:
 * - Weak authentication mechanisms
 * - Broken access control
 * - Insecure session management
 * - Insecure cookie settings
 * - Missing authentication/authorization
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
  CWEReference
} from '@/types/security';
import { UnifiedAST, ComponentNode } from '@/types/ast';
import { logger } from '@/utils/logger';

/**
 * Patterns for detecting weak authentication
 */
const AUTH_PATTERNS = {
  // Weak password hashing
  weakPasswordHashing: [
    'md5(password',
    'sha1(password',
    'createHash("md5")',
    'createHash(\'md5\')'
  ],
  
  // Password in plain text
  plainTextPassword: [
    'password === ',
    'password == ',
    'password.equals'
  ],
  
  // Missing password requirements
  weakPasswordPolicy: [
    '.length < 6',
    '.length < 8',
    'minLength: 6',
    'minLength: 7'
  ],
  
  // Insecure JWT
  weakJWT: [
    'algorithm: "none"',
    'algorithm: \'none\'',
    'jwt.sign(',
    'jsonwebtoken.sign('
  ]
};

/**
 * Patterns for detecting session issues
 */
const SESSION_PATTERNS = {
  // Insecure cookie settings
  insecureCookies: [
    'httpOnly: false',
    'secure: false',
    'sameSite: "none"',
    'sameSite: \'none\''
  ],
  
  // Session fixation
  sessionFixation: [
    'session.id =',
    'sessionId ='
  ],
  
  // Missing session expiration
  noExpiration: [
    'maxAge: Infinity',
    'expires: never'
  ]
};

/**
 * Patterns for access control issues
 */
const ACCESS_CONTROL_PATTERNS = {
  // Missing authorization checks
  missingAuth: [
    'router.get(',
    'router.post(',
    'router.put(',
    'router.delete(',
    'app.get(',
    'app.post('
  ],
  
  // Direct object references
  insecureDirectObjectRef: [
    'req.params.id',
    'req.query.id',
    'params.userId'
  ]
};

/**
 * AuthenticationDetector class
 */
export class AuthenticationDetector implements SecurityDetector {
  name = 'AuthenticationDetector';
  version = '1.0.0';
  supportedLanguages = ['javascript', 'typescript', 'python'];
  detectedTypes = [
    VulnerabilityType.MISSING_AUTHENTICATION,
    VulnerabilityType.WEAK_PASSWORD_POLICY,
    VulnerabilityType.INSECURE_SESSION,
    VulnerabilityType.MISSING_AUTHORIZATION,
    VulnerabilityType.INSECURE_COOKIE
  ];

  /**
   * Main detection method
   */
  async detect(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Run all detectors
      issues.push(...await this.detectWeakAuthentication(ast, context));
      issues.push(...await this.detectSessionIssues(ast, context));
      issues.push(...await this.detectAccessControlIssues(ast, context));
      issues.push(...await this.detectInsecureCookies(ast, context));

      logger.info(`AuthenticationDetector found ${issues.length} issues in ${context.fileName}`);
    } catch (error) {
      logger.error(`Error in AuthenticationDetector: ${error}`);
    }

    return issues;
  }

  /**
   * Detect weak authentication mechanisms
   */
  private async detectWeakAuthentication(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      // Check for weak password hashing
      for (const pattern of AUTH_PATTERNS.weakPasswordHashing) {
        if (code.includes(pattern)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.WEAK_PASSWORD_POLICY,
            severity: SecuritySeverity.CRITICAL,
            title: 'Weak Password Hashing',
            description: `Detected weak password hashing in ${component.name}. Use bcrypt, argon2, or scrypt for password hashing.`,
            location: this.createLocation(component, context),
            fixComplexity: 'medium',
            recommendations: this.getWeakPasswordHashingRecommendations(),
            confidence: 95,
            cwe: [{
              id: 'CWE-916',
              name: 'Use of Password Hash With Insufficient Computational Effort',
              url: 'https://cwe.mitre.org/data/definitions/916.html'
            }]
          }));
          break;
        }
      }

      // Check for plain text password comparison
      for (const pattern of AUTH_PATTERNS.plainTextPassword) {
        if (code.includes(pattern) && code.includes('password')) {
          issues.push(this.createIssue({
            type: VulnerabilityType.WEAK_PASSWORD_POLICY,
            severity: SecuritySeverity.CRITICAL,
            title: 'Plain Text Password Comparison',
            description: `Detected plain text password comparison in ${component.name}. Passwords should be hashed before comparison.`,
            location: this.createLocation(component, context),
            fixComplexity: 'high',
            recommendations: this.getPlainTextPasswordRecommendations(),
            confidence: 80,
            cwe: [{
              id: 'CWE-259',
              name: 'Use of Hard-coded Password',
              url: 'https://cwe.mitre.org/data/definitions/259.html'
            }]
          }));
          break;
        }
      }

      // Check for weak password policy
      for (const pattern of AUTH_PATTERNS.weakPasswordPolicy) {
        if (code.includes(pattern)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.WEAK_PASSWORD_POLICY,
            severity: SecuritySeverity.MEDIUM,
            title: 'Weak Password Policy',
            description: `Detected weak password length requirement in ${component.name}. Passwords should be at least 8 characters, preferably 12+.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getWeakPasswordPolicyRecommendations(),
            confidence: 85,
            cwe: [{
              id: 'CWE-521',
              name: 'Weak Password Requirements',
              url: 'https://cwe.mitre.org/data/definitions/521.html'
            }]
          }));
          break;
        }
      }

      // Check for insecure JWT usage
      if (code.includes('jwt.sign') || code.includes('jsonwebtoken.sign')) {
        if (code.includes('algorithm: "none"') || code.includes('algorithm: \'none\'')) {
          issues.push(this.createIssue({
            type: VulnerabilityType.MISSING_AUTHENTICATION,
            severity: SecuritySeverity.CRITICAL,
            title: 'JWT with No Algorithm',
            description: `Detected JWT signed with "none" algorithm in ${component.name}. This allows token forgery.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getInsecureJWTRecommendations(),
            confidence: 100,
            cwe: [{
              id: 'CWE-347',
              name: 'Improper Verification of Cryptographic Signature',
              url: 'https://cwe.mitre.org/data/definitions/347.html'
            }]
          }));
        }
      }
    }

    return issues;
  }

  /**
   * Detect session management issues
   */
  private async detectSessionIssues(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      // Check for session fixation
      for (const pattern of SESSION_PATTERNS.sessionFixation) {
        if (code.includes(pattern)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.INSECURE_SESSION,
            severity: SecuritySeverity.HIGH,
            title: 'Potential Session Fixation',
            description: `Detected manual session ID assignment in ${component.name}. This may lead to session fixation attacks.`,
            location: this.createLocation(component, context),
            fixComplexity: 'medium',
            recommendations: this.getSessionFixationRecommendations(),
            confidence: 70,
            cwe: [{
              id: 'CWE-384',
              name: 'Session Fixation',
              url: 'https://cwe.mitre.org/data/definitions/384.html'
            }]
          }));
          break;
        }
      }

      // Check for missing session expiration
      for (const pattern of SESSION_PATTERNS.noExpiration) {
        if (code.includes(pattern)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.INSECURE_SESSION,
            severity: SecuritySeverity.MEDIUM,
            title: 'Session Without Expiration',
            description: `Detected session without expiration in ${component.name}. Sessions should have a reasonable timeout.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getSessionExpirationRecommendations(),
            confidence: 90,
            cwe: [{
              id: 'CWE-613',
              name: 'Insufficient Session Expiration',
              url: 'https://cwe.mitre.org/data/definitions/613.html'
            }]
          }));
          break;
        }
      }
    }

    return issues;
  }

  /**
   * Detect access control issues
   */
  private async detectAccessControlIssues(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      // Check for routes without authentication middleware
      if (this.isRouteHandler(code)) {
        const hasAuth = this.hasAuthenticationCheck(code);
        if (!hasAuth) {
          issues.push(this.createIssue({
            type: VulnerabilityType.MISSING_AUTHENTICATION,
            severity: SecuritySeverity.HIGH,
            title: 'Route Without Authentication',
            description: `Detected route handler in ${component.name} without apparent authentication check. Ensure proper authentication middleware is applied.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getMissingAuthenticationRecommendations(),
            confidence: 60,
            cwe: [{
              id: 'CWE-306',
              name: 'Missing Authentication for Critical Function',
              url: 'https://cwe.mitre.org/data/definitions/306.html'
            }]
          }));
        }
      }

      // Check for insecure direct object references
      for (const pattern of ACCESS_CONTROL_PATTERNS.insecureDirectObjectRef) {
        if (code.includes(pattern)) {
          const hasAuthorizationCheck = this.hasAuthorizationCheck(code);
          if (!hasAuthorizationCheck) {
            issues.push(this.createIssue({
              type: VulnerabilityType.MISSING_AUTHORIZATION,
              severity: SecuritySeverity.HIGH,
              title: 'Insecure Direct Object Reference',
              description: `Detected direct use of user-supplied ID in ${component.name} without authorization check. Verify user has permission to access the resource.`,
              location: this.createLocation(component, context),
              fixComplexity: 'medium',
              recommendations: this.getIDORRecommendations(),
              confidence: 65,
              cwe: [{
                id: 'CWE-639',
                name: 'Authorization Bypass Through User-Controlled Key',
                url: 'https://cwe.mitre.org/data/definitions/639.html'
              }]
            }));
            break;
          }
        }
      }
    }

    return issues;
  }

  /**
   * Detect insecure cookie settings
   */
  private async detectInsecureCookies(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      // Check for insecure cookie flags
      if (code.includes('cookie') || code.includes('Cookie')) {
        if (code.includes('httpOnly: false')) {
          issues.push(this.createIssue({
            type: VulnerabilityType.INSECURE_COOKIE,
            severity: SecuritySeverity.MEDIUM,
            title: 'Cookie Without HttpOnly Flag',
            description: `Detected cookie without HttpOnly flag in ${component.name}. This makes the cookie vulnerable to XSS attacks.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getHttpOnlyCookieRecommendations(),
            confidence: 95,
            cwe: [{
              id: 'CWE-1004',
              name: 'Sensitive Cookie Without HttpOnly Flag',
              url: 'https://cwe.mitre.org/data/definitions/1004.html'
            }]
          }));
        }

        if (code.includes('secure: false')) {
          issues.push(this.createIssue({
            type: VulnerabilityType.INSECURE_COOKIE,
            severity: SecuritySeverity.MEDIUM,
            title: 'Cookie Without Secure Flag',
            description: `Detected cookie without Secure flag in ${component.name}. Cookies should be sent only over HTTPS.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getSecureCookieRecommendations(),
            confidence: 95,
            cwe: [{
              id: 'CWE-614',
              name: 'Sensitive Cookie in HTTPS Session Without Secure Attribute',
              url: 'https://cwe.mitre.org/data/definitions/614.html'
            }]
          }));
        }

        if (code.includes('sameSite: "none"') || code.includes('sameSite: \'none\'')) {
          issues.push(this.createIssue({
            type: VulnerabilityType.INSECURE_COOKIE,
            severity: SecuritySeverity.MEDIUM,
            title: 'Cookie with SameSite=None',
            description: `Detected cookie with SameSite=None in ${component.name}. This makes the cookie vulnerable to CSRF attacks.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getSameSiteCookieRecommendations(),
            confidence: 90,
            cwe: [{
              id: 'CWE-352',
              name: 'Cross-Site Request Forgery (CSRF)',
              url: 'https://cwe.mitre.org/data/definitions/352.html'
            }]
          }));
        }
      }
    }

    return issues;
  }

  /**
   * Helper: Check if code is a route handler
   */
  private isRouteHandler(code: string): boolean {
    return ACCESS_CONTROL_PATTERNS.missingAuth.some(pattern => code.includes(pattern));
  }

  /**
   * Helper: Check if code has authentication check
   */
  private hasAuthenticationCheck(code: string): boolean {
    const authPatterns = [
      'isAuthenticated',
      'requireAuth',
      'authenticate',
      'verifyToken',
      'checkAuth',
      'ensureAuth',
      'req.user',
      'req.isAuthenticated',
      'middleware.auth',
      'authMiddleware'
    ];
    return authPatterns.some(pattern => code.includes(pattern));
  }

  /**
   * Helper: Check if code has authorization check
   */
  private hasAuthorizationCheck(code: string): boolean {
    const authzPatterns = [
      'isAuthorized',
      'checkPermission',
      'hasPermission',
      'canAccess',
      'verifyOwnership',
      'checkOwner',
      'req.user.id',
      'userId ===',
      'user.id ==='
    ];
    return authzPatterns.some(pattern => code.includes(pattern));
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
  }): SecurityIssue {
    return {
      id: randomUUID(),
      type: params.type,
      category: SecurityCategory.AUTHENTICATION_FAILURES,
      severity: params.severity,
      title: params.title,
      description: params.description,
      location: params.location,
      recommendations: params.recommendations,
      fixComplexity: params.fixComplexity,
      cwe: params.cwe,
      owasp: [{
        category: SecurityCategory.AUTHENTICATION_FAILURES,
        year: 2021,
        rank: 7,
        url: 'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/'
      }],
      confidence: params.confidence,
      exploitability: params.severity === SecuritySeverity.CRITICAL ? 'easy' : 'medium',
      impact: {
        confidentiality: 'high',
        integrity: 'high',
        availability: 'low'
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
      snippet: `${component.type} ${component.name} (lines ${component.startLine}-${component.endLine})`
    };
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
   * Recommendations for weak password hashing
   */
  private getWeakPasswordHashingRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Use Strong Password Hashing',
        description: 'Use bcrypt, argon2, or scrypt for password hashing with appropriate work factors.',
        codeExample: `// ❌ Weak
const hash = crypto.createHash('md5').update(password).digest('hex');

// ✅ Strong with bcrypt
const bcrypt = require('bcrypt');
const saltRounds = 12;
const hash = await bcrypt.hash(password, saltRounds);

// ✅ Or with argon2
const argon2 = require('argon2');
const hash = await argon2.hash(password);`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
          'https://github.com/kelektiv/node.bcrypt.js'
        ],
        effort: 'medium',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for plain text password
   */
  private getPlainTextPasswordRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Hash and Compare Passwords Securely',
        description: 'Never compare plain text passwords. Use bcrypt.compare() or similar.',
        codeExample: `// ❌ Plain text comparison
if (password === storedPassword) { }

// ✅ Secure comparison
const isValid = await bcrypt.compare(password, storedHash);
if (isValid) { }`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html'
        ],
        effort: 'high',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for weak password policy
   */
  private getWeakPasswordPolicyRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Enforce Strong Password Policy',
        description: 'Require passwords to be at least 12 characters with complexity requirements.',
        codeExample: `// ✅ Strong password validation
const isStrongPassword = (password) => {
  return password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password);
};`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
          'https://pages.nist.gov/800-63-3/sp800-63b.html'
        ],
        effort: 'low',
        priority: 2
      }
    ];
  }

  /**
   * Recommendations for insecure JWT
   */
  private getInsecureJWTRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Use Secure JWT Algorithms',
        description: 'Always use HS256, RS256, or ES256 for JWT signing. Never use "none".',
        codeExample: `// ❌ Insecure
jwt.sign(payload, secret, { algorithm: 'none' });

// ✅ Secure
jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1h' });`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html',
          'https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for session fixation
   */
  private getSessionFixationRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Regenerate Session ID',
        description: 'Always regenerate session ID after authentication.',
        codeExample: `// ✅ Regenerate session after login
app.post('/login', (req, res) => {
  // Authenticate user
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Error');
    req.session.userId = user.id;
    res.send('Login successful');
  });
});`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html'
        ],
        effort: 'medium',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for session expiration
   */
  private getSessionExpirationRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Set Session Expiration',
        description: 'Configure appropriate session timeouts based on sensitivity.',
        codeExample: `// ✅ Session with expiration
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
    secure: true,
    httpOnly: true,
    sameSite: 'strict'
  }
}));`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html'
        ],
        effort: 'low',
        priority: 2
      }
    ];
  }

  /**
   * Recommendations for missing authentication
   */
  private getMissingAuthenticationRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Add Authentication Middleware',
        description: 'Protect routes with authentication middleware.',
        codeExample: `// ✅ Protected route
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send('Unauthorized');
  }
  next();
};

app.get('/api/profile', requireAuth, (req, res) => {
  res.json(req.user);
});`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for IDOR
   */
  private getIDORRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Implement Authorization Checks',
        description: 'Verify user has permission to access the requested resource.',
        codeExample: `// ✅ With authorization check
app.get('/api/documents/:id', requireAuth, async (req, res) => {
  const document = await Document.findById(req.params.id);
  
  if (!document) {
    return res.status(404).send('Not found');
  }
  
  // Check ownership
  if (document.userId !== req.user.id) {
    return res.status(403).send('Forbidden');
  }
  
  res.json(document);
});`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html',
          'https://owasp.org/www-project-top-ten/2017/A5_2017-Broken_Access_Control'
        ],
        effort: 'medium',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for HttpOnly cookies
   */
  private getHttpOnlyCookieRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Enable HttpOnly Flag',
        description: 'Set HttpOnly flag to prevent JavaScript access to cookies.',
        codeExample: `// ✅ Secure cookie
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 1000 * 60 * 60 * 24 // 1 day
});`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for Secure cookies
   */
  private getSecureCookieRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Enable Secure Flag',
        description: 'Set Secure flag to ensure cookies are only sent over HTTPS.',
        codeExample: `// ✅ Secure cookie
res.cookie('session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
});`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for SameSite cookies
   */
  private getSameSiteCookieRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Set SameSite Attribute',
        description: 'Use SameSite=Strict or SameSite=Lax to prevent CSRF attacks.',
        codeExample: `// ✅ CSRF-protected cookie
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' // or 'lax'
});`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html',
          'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite'
        ],
        effort: 'low',
        priority: 2
      }
    ];
  }
}
