/**
 * Cryptography Vulnerability Detector
 * 
 * Detects cryptographic vulnerabilities:
 * - Weak cryptographic algorithms (MD5, SHA1, DES, etc.)
 * - Hardcoded secrets (passwords, API keys, tokens)
 * - Weak random number generation
 * - Insecure key sizes
 * - Missing encryption
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
 * Weak cryptographic algorithms
 */
const WEAK_CRYPTO = {
  // Hash algorithms
  weakHashes: ['md5', 'sha1', 'md4', 'md2'],
  
  // Encryption algorithms
  weakCiphers: ['des', '3des', 'rc4', 'rc2', 'blowfish'],
  
  // Modes
  weakModes: ['ecb'],
  
  // Node.js crypto methods
  nodeCryptoWeak: [
    'createHash("md5")',
    'createHash("sha1")',
    'createHash(\'md5\')',
    'createHash(\'sha1\')',
    'createCipher',
    'createDecipher'
  ],
  
  // Python crypto methods
  pythonCryptoWeak: [
    'hashlib.md5',
    'hashlib.sha1',
    'Crypto.Hash.MD5',
    'Crypto.Hash.SHA1',
    'DES.new',
    'ARC4.new'
  ]
};

/**
 * Patterns for detecting hardcoded secrets
 */
const SECRET_PATTERNS = {
  // API keys and tokens
  apiKey: /(?:api[_-]?key|apikey|access[_-]?key)['":\s]*=\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
  token: /(?:token|auth[_-]?token|bearer)['":\s]*=\s*['"][a-zA-Z0-9_\-\.]{20,}['"]/gi,
  
  // AWS credentials
  awsAccessKey: /AKIA[0-9A-Z]{16}/g,
  awsSecretKey: /(?:aws[_-]?secret[_-]?access[_-]?key)['":\s]*=\s*['"][a-zA-Z0-9\/+]{40}['"]/gi,
  
  // Database passwords
  password: /(?:password|passwd|pwd)['":\s]*=\s*['"][^'"]{8,}['"]/gi,
  
  // Private keys
  privateKey: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
  
  // JWT secrets
  jwtSecret: /(?:jwt[_-]?secret|secret[_-]?key)['":\s]*=\s*['"][^'"]{16,}['"]/gi,
  
  // Generic secrets
  secret: /(?:secret|api[_-]?secret)['":\s]*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/gi,
  
  // Connection strings with passwords
  connectionString: /(?:mongodb|mysql|postgres|postgresql):\/\/[^:]+:[^@]+@/gi
};

/**
 * Weak random number generation patterns
 */
const WEAK_RANDOM = {
  javascript: [
    'Math.random()',
    'Math.floor(Math.random()',
    'Math.ceil(Math.random(',
    'Math.round(Math.random('
  ],
  
  python: [
    'random.random()',
    'random.randint(',
    'random.choice(',
    'random.randrange('
  ]
};

/**
 * CryptographyDetector class
 */
export class CryptographyDetector implements SecurityDetector {
  name = 'CryptographyDetector';
  version = '1.0.0';
  supportedLanguages = ['javascript', 'typescript', 'python'];
  detectedTypes = [
    VulnerabilityType.WEAK_CRYPTO_ALGORITHM,
    VulnerabilityType.HARDCODED_SECRET,
    VulnerabilityType.WEAK_RANDOM,
    VulnerabilityType.INSECURE_KEY_SIZE,
    VulnerabilityType.WEAK_HASH
  ];

  /**
   * Main detection method
   */
  async detect(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Run all detectors
      issues.push(...await this.detectWeakCrypto(ast, context));
      issues.push(...await this.detectHardcodedSecrets(ast, context));
      issues.push(...await this.detectWeakRandom(ast, context));
      issues.push(...await this.detectInsecureKeySizes(ast, context));

      logger.info(`CryptographyDetector found ${issues.length} issues in ${context.fileName}`);
    } catch (error) {
      logger.error(`Error in CryptographyDetector: ${error}`);
    }

    return issues;
  }

  /**
   * Detect weak cryptographic algorithms
   */
  private async detectWeakCrypto(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const isJavaScript = context.language === 'javascript' || context.language === 'typescript';
    const isPython = context.language === 'python';

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      // Check for weak hashes
      for (const hash of WEAK_CRYPTO.weakHashes) {
        const hashRegex = new RegExp(`\\b${hash}\\b`, 'gi');
        if (hashRegex.test(code)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.WEAK_HASH,
            severity: SecuritySeverity.HIGH,
            title: `Weak Hash Algorithm: ${hash.toUpperCase()}`,
            description: `Detected use of weak hash algorithm ${hash.toUpperCase()} in ${component.name}. This algorithm is cryptographically broken and should not be used.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getWeakHashRecommendations(hash),
            confidence: 90,
            cwe: [{
              id: 'CWE-327',
              name: 'Use of a Broken or Risky Cryptographic Algorithm',
              url: 'https://cwe.mitre.org/data/definitions/327.html'
            }]
          }));
        }
      }

      // Check for weak ciphers with more specific patterns to avoid false positives
      // Don't flag 'des' if it's part of 'aes', 'des' -> 'DES', etc.
      const weakCipherPatterns = {
        'des': /\b(?:DES|des)\b(?!ktop|cription|cribe|igner|ign|ktop)/,  // Not desktop, description, etc.
        '3des': /\b3?-?des\b/i,
        'rc4': /\brc4\b/i,
        'rc2': /\brc2\b/i,
        'blowfish': /\bblowfish\b/i
      };

      for (const [cipher, pattern] of Object.entries(weakCipherPatterns)) {
        if (pattern.test(code)) {
          // Additional check: make sure it's not part of a strong cipher like 'aes-256-gcm'
          const contextMatch = code.match(new RegExp(`.{0,10}${pattern.source}.{0,10}`, 'i'));
          if (contextMatch && !/aes|strong|secure/i.test(contextMatch[0])) {
            issues.push(this.createIssue({
              type: VulnerabilityType.WEAK_CRYPTO_ALGORITHM,
              severity: SecuritySeverity.CRITICAL,
              title: `Weak Encryption Algorithm: ${cipher.toUpperCase()}`,
              description: `Detected use of weak encryption algorithm ${cipher.toUpperCase()} in ${component.name}. Use modern algorithms like AES-256-GCM instead.`,
              location: this.createLocation(component, context),
              fixComplexity: 'medium',
              recommendations: this.getWeakCipherRecommendations(cipher),
              confidence: 90,
              cwe: [{
                id: 'CWE-327',
                name: 'Use of a Broken or Risky Cryptographic Algorithm',
                url: 'https://cwe.mitre.org/data/definitions/327.html'
              }]
            }));
            break; // Only report once per component
          }
        }
      }

      // Check for ECB mode - but not as part of other words
      if (/\b(?:ECB|ecb)\b(?!ook|ase)/i.test(code)) {
        // Make sure it's actually ECB mode (with cipher context)
        if (/(?:ecb|ECB|cipher|crypto|encrypt)/i.test(code)) {
          issues.push(this.createIssue({
            type: VulnerabilityType.WEAK_CRYPTO_ALGORITHM,
            severity: SecuritySeverity.HIGH,
            title: 'Insecure Cipher Mode: ECB',
            description: `Detected use of ECB mode in ${component.name}. ECB mode is insecure because it does not provide semantic security. Use CBC, GCM, or CTR mode instead.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getECBModeRecommendations(),
            confidence: 95,
            cwe: [{
              id: 'CWE-327',
              name: 'Use of a Broken or Risky Cryptographic Algorithm',
              url: 'https://cwe.mitre.org/data/definitions/327.html'
            }]
          }));
        }
      }

      // Language-specific checks
      if (isJavaScript) {
        // Check deprecated Node.js crypto methods
        if (code.includes('createCipher') || code.includes('createDecipher')) {
          issues.push(this.createIssue({
            type: VulnerabilityType.WEAK_CRYPTO_ALGORITHM,
            severity: SecuritySeverity.HIGH,
            title: 'Deprecated Crypto Method',
            description: `Detected use of deprecated createCipher/createDecipher in ${component.name}. These methods are insecure and deprecated. Use createCipheriv/createDecipheriv instead.`,
            location: this.createLocation(component, context),
            fixComplexity: 'medium',
            recommendations: this.getDeprecatedCryptoRecommendations(),
            confidence: 95,
            cwe: [{
              id: 'CWE-327',
              name: 'Use of a Broken or Risky Cryptographic Algorithm',
              url: 'https://cwe.mitre.org/data/definitions/327.html'
            }]
          }));
        }
      }
    }

    return issues;
  }

  /**
   * Detect hardcoded secrets
   */
  private async detectHardcodedSecrets(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Scan entire file content for secrets
    const content = context.fileContent;

    // Check for API keys
    const apiKeyMatches = content.match(SECRET_PATTERNS.apiKey);
    if (apiKeyMatches && apiKeyMatches.length > 0) {
      issues.push(this.createIssue({
        type: VulnerabilityType.HARDCODED_SECRET,
        severity: SecuritySeverity.CRITICAL,
        title: 'Hardcoded API Key',
        description: `Detected hardcoded API key in ${context.fileName}. API keys should be stored in environment variables or secure vaults.`,
        location: {
          file: context.fileName,
          line: this.getLineNumber(content, apiKeyMatches[0]),
          component: 'File-level'
        },
        fixComplexity: 'low',
        recommendations: this.getHardcodedSecretRecommendations('API Key'),
        confidence: 85,
        cwe: [{
          id: 'CWE-798',
          name: 'Use of Hard-coded Credentials',
          url: 'https://cwe.mitre.org/data/definitions/798.html'
        }]
      }));
    }

    // Check for AWS credentials
    const awsKeyMatches = content.match(SECRET_PATTERNS.awsAccessKey);
    if (awsKeyMatches && awsKeyMatches.length > 0) {
      issues.push(this.createIssue({
        type: VulnerabilityType.HARDCODED_SECRET,
        severity: SecuritySeverity.CRITICAL,
        title: 'Hardcoded AWS Access Key',
        description: `Detected hardcoded AWS access key in ${context.fileName}. AWS credentials should never be hardcoded.`,
        location: {
          file: context.fileName,
          line: this.getLineNumber(content, awsKeyMatches[0]),
          component: 'File-level'
        },
        fixComplexity: 'low',
        recommendations: this.getAWSCredentialsRecommendations(),
        confidence: 95,
        cwe: [{
          id: 'CWE-798',
          name: 'Use of Hard-coded Credentials',
          url: 'https://cwe.mitre.org/data/definitions/798.html'
        }]
      }));
    }

    // Check for passwords
    const passwordMatches = content.match(SECRET_PATTERNS.password);
    if (passwordMatches && passwordMatches.length > 0) {
      // Filter out common false positives
      const filtered = passwordMatches.filter(match => 
        !match.includes('password: ""') && 
        !match.includes('password: \'\'') &&
        !match.includes('password: null') &&
        !match.includes('password: undefined')
      );
      
      if (filtered.length > 0) {
        issues.push(this.createIssue({
          type: VulnerabilityType.HARDCODED_SECRET,
          severity: SecuritySeverity.CRITICAL,
          title: 'Hardcoded Password',
          description: `Detected hardcoded password in ${context.fileName}. Passwords should never be hardcoded in source code.`,
          location: {
            file: context.fileName,
            line: this.getLineNumber(content, filtered[0]),
            component: 'File-level'
          },
          fixComplexity: 'low',
          recommendations: this.getHardcodedSecretRecommendations('Password'),
          confidence: 80,
          cwe: [{
            id: 'CWE-798',
            name: 'Use of Hard-coded Credentials',
            url: 'https://cwe.mitre.org/data/definitions/798.html'
          }]
        }));
      }
    }

    // Check for private keys
    if (SECRET_PATTERNS.privateKey.test(content)) {
      issues.push(this.createIssue({
        type: VulnerabilityType.HARDCODED_SECRET,
        severity: SecuritySeverity.CRITICAL,
        title: 'Hardcoded Private Key',
        description: `Detected hardcoded private key in ${context.fileName}. Private keys should never be committed to source code.`,
        location: {
          file: context.fileName,
          line: this.getLineNumber(content, '-----BEGIN'),
          component: 'File-level'
        },
        fixComplexity: 'medium',
        recommendations: this.getPrivateKeyRecommendations(),
        confidence: 100,
        cwe: [{
          id: 'CWE-321',
          name: 'Use of Hard-coded Cryptographic Key',
          url: 'https://cwe.mitre.org/data/definitions/321.html'
        }]
      }));
    }

    // Check for JWT secrets
    const jwtSecretMatches = content.match(SECRET_PATTERNS.jwtSecret);
    if (jwtSecretMatches && jwtSecretMatches.length > 0) {
      issues.push(this.createIssue({
        type: VulnerabilityType.HARDCODED_SECRET,
        severity: SecuritySeverity.CRITICAL,
        title: 'Hardcoded JWT Secret',
        description: `Detected hardcoded JWT secret in ${context.fileName}. JWT secrets should be stored securely.`,
        location: {
          file: context.fileName,
          line: this.getLineNumber(content, jwtSecretMatches[0]),
          component: 'File-level'
        },
        fixComplexity: 'low',
        recommendations: this.getHardcodedSecretRecommendations('JWT Secret'),
        confidence: 90,
        cwe: [{
          id: 'CWE-798',
          name: 'Use of Hard-coded Credentials',
          url: 'https://cwe.mitre.org/data/definitions/798.html'
        }]
      }));
    }

    return issues;
  }

  /**
   * Detect weak random number generation
   */
  private async detectWeakRandom(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const isJavaScript = context.language === 'javascript' || context.language === 'typescript';
    const isPython = context.language === 'python';

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      if (isJavaScript) {
        // Check for Math.random() usage
        for (const pattern of WEAK_RANDOM.javascript) {
          if (code.includes(pattern)) {
            issues.push(this.createIssue({
              type: VulnerabilityType.WEAK_RANDOM,
              severity: SecuritySeverity.HIGH,
              title: 'Weak Random Number Generation',
              description: `Detected use of Math.random() in ${component.name}. Math.random() is not cryptographically secure. Use crypto.randomBytes() or crypto.getRandomValues() instead.`,
              location: this.createLocation(component, context),
              fixComplexity: 'low',
              recommendations: this.getWeakRandomRecommendations('javascript'),
              confidence: 85,
              cwe: [{
                id: 'CWE-338',
                name: 'Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)',
                url: 'https://cwe.mitre.org/data/definitions/338.html'
              }]
            }));
            break; // Only report once per component
          }
        }
      }

      if (isPython) {
        // Check for random module usage
        for (const pattern of WEAK_RANDOM.python) {
          if (code.includes(pattern)) {
            issues.push(this.createIssue({
              type: VulnerabilityType.WEAK_RANDOM,
              severity: SecuritySeverity.HIGH,
              title: 'Weak Random Number Generation',
              description: `Detected use of random module in ${component.name}. The random module is not suitable for security purposes. Use secrets module instead.`,
              location: this.createLocation(component, context),
              fixComplexity: 'low',
              recommendations: this.getWeakRandomRecommendations('python'),
              confidence: 85,
              cwe: [{
                id: 'CWE-338',
                name: 'Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)',
                url: 'https://cwe.mitre.org/data/definitions/338.html'
              }]
            }));
            break; // Only report once per component
          }
        }
      }
    }

    return issues;
  }

  /**
   * Detect insecure key sizes
   */
  private async detectInsecureKeySizes(ast: UnifiedAST, context: DetectionContext): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const component of ast.components) {
      const code = this.getComponentCode(component, context);

      // Check for RSA key sizes < 2048
      const rsaKeyMatch = code.match(/(?:modulusLength|keySize)[\s:=]+(\d+)/);
      if (rsaKeyMatch) {
        const keySize = parseInt(rsaKeyMatch[1], 10);
        if (keySize < 2048) {
          issues.push(this.createIssue({
            type: VulnerabilityType.INSECURE_KEY_SIZE,
            severity: SecuritySeverity.HIGH,
            title: `Insecure RSA Key Size: ${keySize} bits`,
            description: `Detected RSA key size of ${keySize} bits in ${component.name}. RSA keys should be at least 2048 bits, preferably 4096 bits.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getInsecureKeySizeRecommendations(),
            confidence: 95,
            cwe: [{
              id: 'CWE-326',
              name: 'Inadequate Encryption Strength',
              url: 'https://cwe.mitre.org/data/definitions/326.html'
            }]
          }));
        }
      }

      // Check for AES key sizes
      const aesKeyMatch = code.match(/(?:aes-)(\d+)/i);
      if (aesKeyMatch) {
        const keySize = parseInt(aesKeyMatch[1], 10);
        if (keySize < 256) {
          issues.push(this.createIssue({
            type: VulnerabilityType.INSECURE_KEY_SIZE,
            severity: SecuritySeverity.MEDIUM,
            title: `Weak AES Key Size: ${keySize} bits`,
            description: `Detected AES key size of ${keySize} bits in ${component.name}. Consider using AES-256 for better security.`,
            location: this.createLocation(component, context),
            fixComplexity: 'low',
            recommendations: this.getWeakAESRecommendations(),
            confidence: 90,
            cwe: [{
              id: 'CWE-326',
              name: 'Inadequate Encryption Strength',
              url: 'https://cwe.mitre.org/data/definitions/326.html'
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
  }): SecurityIssue {
    return {
      id: randomUUID(),
      type: params.type,
      category: SecurityCategory.CRYPTOGRAPHIC_FAILURES,
      severity: params.severity,
      title: params.title,
      description: params.description,
      location: params.location,
      recommendations: params.recommendations,
      fixComplexity: params.fixComplexity,
      cwe: params.cwe,
      owasp: [{
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURES,
        year: 2021,
        rank: 2,
        url: 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/'
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
      snippet: this.getCodeSnippet(component)
    };
  }

  /**
   * Helper: Get code snippet
   */
  private getCodeSnippet(component: ComponentNode): string {
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
   * Helper: Get line number of match in content
   */
  private getLineNumber(content: string, searchString: string): number {
    const index = content.indexOf(searchString);
    if (index === -1) return 1;
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Recommendations for weak hash algorithms
   */
  private getWeakHashRecommendations(algorithm: string): SecurityRecommendation[] {
    return [
      {
        title: 'Use Strong Hash Algorithms',
        description: `Replace ${algorithm.toUpperCase()} with SHA-256, SHA-384, or SHA-512.`,
        codeExample: `// ❌ Weak
const hash = crypto.createHash('${algorithm}');

// ✅ Strong
const hash = crypto.createHash('sha256');
// Or for password hashing
const hash = await bcrypt.hash(password, 10);`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html',
          'https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for weak ciphers
   */
  private getWeakCipherRecommendations(cipher: string): SecurityRecommendation[] {
    return [
      {
        title: 'Use Modern Encryption Algorithms',
        description: `Replace ${cipher.toUpperCase()} with AES-256-GCM or ChaCha20-Poly1305.`,
        codeExample: `// ❌ Weak
const cipher = crypto.createCipheriv('${cipher}', key, iv);

// ✅ Strong
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html',
          'https://csrc.nist.gov/projects/block-cipher-techniques/bcm/current-modes'
        ],
        effort: 'medium',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for ECB mode
   */
  private getECBModeRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Use Secure Cipher Modes',
        description: 'Replace ECB mode with GCM, CBC, or CTR mode with authentication.',
        codeExample: `// ❌ Insecure (ECB mode)
const cipher = crypto.createCipheriv('aes-256-ecb', key, null);

// ✅ Secure (GCM mode with authentication)
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);`,
        references: [
          'https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Electronic_codebook_(ECB)',
          'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for deprecated crypto methods
   */
  private getDeprecatedCryptoRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Use Modern Crypto Methods',
        description: 'Replace deprecated createCipher/createDecipher with createCipheriv/createDecipheriv.',
        codeExample: `// ❌ Deprecated and insecure
const cipher = crypto.createCipher('aes-256-cbc', password);

// ✅ Secure with IV
const iv = crypto.randomBytes(16);
const key = crypto.scryptSync(password, 'salt', 32);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);`,
        references: [
          'https://nodejs.org/api/crypto.html#cryptocreatecipherivalgorithm-key-iv-options',
          'https://nodejs.org/api/deprecations.html#DEP0106'
        ],
        effort: 'medium',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for hardcoded secrets
   */
  private getHardcodedSecretRecommendations(secretType: string): SecurityRecommendation[] {
    return [
      {
        title: 'Use Environment Variables',
        description: `Move ${secretType} to environment variables or a secure vault.`,
        codeExample: `// ❌ Hardcoded
const apiKey = "sk_live_abc123...";

// ✅ Environment variable
const apiKey = process.env.API_KEY;

// ✅ Or use a secrets manager
const apiKey = await secretsManager.getSecret('API_KEY');`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html',
          'https://12factor.net/config'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for AWS credentials
   */
  private getAWSCredentialsRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Use AWS IAM Roles',
        description: 'Use IAM roles instead of hardcoded credentials. Use AWS SDK credential chain.',
        codeExample: `// ❌ Hardcoded
const s3 = new AWS.S3({
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
});

// ✅ Use IAM roles or credential chain
const s3 = new AWS.S3(); // Credentials loaded from environment`,
        references: [
          'https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-node-credentials-shared.html',
          'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for private keys
   */
  private getPrivateKeyRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Store Private Keys Securely',
        description: 'Never commit private keys to source control. Use key management services.',
        codeExample: `// ❌ Hardcoded private key
const privateKey = "-----BEGIN PRIVATE KEY-----\\n...";

// ✅ Load from secure location
const fs = require('fs');
const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');

// ✅ Or use key management service
const privateKey = await kms.getPrivateKey('key-id');`,
        references: [
          'https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html',
          'https://docs.aws.amazon.com/kms/latest/developerguide/overview.html'
        ],
        effort: 'medium',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for weak random
   */
  private getWeakRandomRecommendations(platform: string): SecurityRecommendation[] {
    if (platform === 'javascript') {
      return [
        {
          title: 'Use Cryptographically Secure Random',
          description: 'Use crypto.randomBytes() or crypto.getRandomValues() for security-sensitive operations.',
          codeExample: `// ❌ Weak
const token = Math.random().toString(36);

// ✅ Cryptographically secure
const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('hex');

// ✅ Or in browser
const array = new Uint8Array(32);
crypto.getRandomValues(array);`,
          references: [
            'https://nodejs.org/api/crypto.html#cryptorandombytessize-callback',
            'https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues'
          ],
          effort: 'low',
          priority: 1
        }
      ];
    } else {
      return [
        {
          title: 'Use Secrets Module',
          description: 'Use the secrets module for cryptographically strong random numbers in Python.',
          codeExample: `# ❌ Weak
import random
token = random.randint(1000, 9999)

# ✅ Cryptographically secure
import secrets
token = secrets.randbelow(10000)
# Or for tokens
token = secrets.token_hex(32)`,
          references: [
            'https://docs.python.org/3/library/secrets.html',
            'https://peps.python.org/pep-0506/'
          ],
          effort: 'low',
          priority: 1
        }
      ];
    }
  }

  /**
   * Recommendations for insecure key sizes
   */
  private getInsecureKeySizeRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Use Adequate Key Sizes',
        description: 'Use RSA keys of at least 2048 bits, preferably 4096 bits.',
        codeExample: `// ❌ Weak
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 1024
});

// ✅ Strong
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096
});`,
        references: [
          'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf',
          'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html'
        ],
        effort: 'low',
        priority: 1
      }
    ];
  }

  /**
   * Recommendations for weak AES
   */
  private getWeakAESRecommendations(): SecurityRecommendation[] {
    return [
      {
        title: 'Use AES-256',
        description: 'Use AES-256 for maximum security, especially for long-term data protection.',
        codeExample: `// ❌ Weaker
const cipher = crypto.createCipheriv('aes-128-gcm', key, iv);

// ✅ Stronger
const key = crypto.randomBytes(32); // 256 bits
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);`,
        references: [
          'https://csrc.nist.gov/publications/detail/fips/197/final',
          'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html'
        ],
        effort: 'low',
        priority: 2
      }
    ];
  }
}
