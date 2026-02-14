# Application Security Framework
## Goji Mobile Wallet Platform

### Executive Summary

This document defines the comprehensive application security framework for the Goji Mobile Wallet platform, covering security requirements for React Native mobile applications, NestJS backend services, and integrated blockchain components. The framework ensures defense-in-depth security across all application layers while maintaining regulatory compliance for financial services operations.

### Framework Scope

**Applications Covered:**
- Goji Mobile Wallet (React Native + Expo 54.0.20)
- Goji API (NestJS 11.1.5 modular monolith)
- Shared libraries and utilities (NX workspace libraries)
- Third-party integrations (payment processors, blockchain networks)

**Security Domains:**
- Secure Development Lifecycle (SDLC)
- Runtime Application Security
- API Security and Protection
- Data Validation and Sanitization
- Authentication and Authorization
- Session Management
- Error Handling and Logging

## Secure Development Lifecycle (SDLC)

### Development Phase Security

#### Design Phase Security Review
```typescript
// Security requirements integration example
interface SecurityRequirements {
  authentication: 'multi-factor' | 'biometric' | 'jwt';
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  encryptionRequired: boolean;
  auditLogging: boolean;
  regulatoryCompliance: 'PCI-DSS' | 'GDPR' | 'AML' | 'KYC';
}

// Financial operation security wrapper
class SecureFinancialOperation {
  @RequiresAuthentication('multi-factor')
  @AuditLog('FINANCIAL_TRANSACTION')
  @ValidateInput(TransactionValidationSchema)
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Implementation with comprehensive security controls
  }
}
```

#### Code Security Standards

**TypeScript Security Configuration:**
```json
// tsconfig.json - Security-focused TypeScript settings
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**ESLint Security Rules:**
```json
// .eslintrc.js - Security-focused linting
{
  "extends": [
    "plugin:security/recommended",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "error",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-non-literal-require": "error",
    "security/detect-possible-timing-attacks": "error",
    "security/detect-pseudoRandomBytes": "error"
  }
}
```

#### Secure Coding Patterns

**Input Validation Pattern:**
```typescript
import { IsString, IsNumber, IsPositive, validateOrReject } from 'class-validator';
import { Transform } from 'class-transformer';

class SecureTransactionRequest {
  @IsString()
  @Length(1, 50)
  @Matches(/^[a-zA-Z0-9-_]+$/) // Alphanumeric and safe characters only
  recipientId: string;

  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  @Max(10000) // Business rule: max transaction amount
  amount: number;

  @IsString()
  @Length(10, 500)
  @IsOptional()
  description?: string;
}

// Usage with comprehensive validation
async function processSecureTransaction(rawInput: any) {
  const request = plainToClass(SecureTransactionRequest, rawInput);
  
  try {
    await validateOrReject(request);
  } catch (validationErrors) {
    logger.warn('Transaction validation failed', { 
      errors: validationErrors,
      timestamp: new Date().toISOString()
    });
    throw new ValidationException('Invalid transaction parameters');
  }
  
  return await transactionService.process(request);
}
```

**Error Handling Security Pattern:**
```typescript
// Secure error handling that prevents information disclosure
class SecurityAwareErrorHandler {
  static handleFinancialError(error: Error, context: string): never {
    // Log detailed error internally
    logger.error('Financial operation error', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userId: getCurrentUserId() // Only log user ID, never sensitive data
    });

    // Return generic error to client
    if (error instanceof ValidationException) {
      throw new HttpException('Invalid request parameters', HttpStatus.BAD_REQUEST);
    } else if (error instanceof AuthenticationException) {
      throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
    } else {
      throw new HttpException('Operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
```

### Code Review Security Checklist

#### Mandatory Security Review Points
- [ ] No hardcoded secrets or credentials
- [ ] Input validation implemented for all user inputs
- [ ] SQL injection prevention (parameterized queries only)
- [ ] XSS prevention (proper output encoding)
- [ ] Authentication and authorization checks present
- [ ] Sensitive data encrypted at rest and in transit
- [ ] Error handling doesn't leak sensitive information
- [ ] Logging excludes sensitive data (passwords, tokens, PII)
- [ ] Rate limiting implemented for financial operations
- [ ] Transaction integrity checks implemented

#### Financial Services Specific Reviews
- [ ] PCI DSS compliance for payment data handling
- [ ] AML/KYC data protection measures
- [ ] Audit trail generation for financial transactions
- [ ] Regulatory reporting data accuracy
- [ ] Cross-border data transfer compliance
- [ ] Customer consent and privacy controls

## Runtime Application Security

### React Native Mobile Security

#### Secure Storage Implementation
```typescript
// Secure storage wrapper for sensitive data
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class SecureStorageService {
  private static readonly ENCRYPTION_OPTIONS = {
    requireAuthentication: true,
    authenticationPrompt: 'Authenticate to access secure data',
    ...(Platform.OS === 'android' && {
      encrypt: true,
      accessGroup: 'com.gojiwallet.app.secure',
    }),
  };

  static async storeSecureData(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, this.ENCRYPTION_OPTIONS);
    } catch (error) {
      logger.error('Secure storage failed', { key, error: error.message });
      throw new SecureStorageException('Failed to store secure data');
    }
  }

  static async getSecureData(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key, this.ENCRYPTION_OPTIONS);
    } catch (error) {
      logger.error('Secure retrieval failed', { key, error: error.message });
      return null;
    }
  }

  // Special method for financial credentials
  static async storeFinancialCredential(key: string, credential: string): Promise<void> {
    const encryptedCredential = await this.encryptWithDeviceKey(credential);
    await this.storeSecureData(key, encryptedCredential);
  }

  private static async encryptWithDeviceKey(data: string): Promise<string> {
    // Implementation using device-specific encryption
    // This adds an additional layer beyond SecureStore
    return crypto.encrypt(data, await this.getDeviceKey());
  }
}
```

#### Biometric Authentication Integration
```typescript
import * as LocalAuthentication from 'expo-local-authentication';

class BiometricAuthService {
  static async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  static async authenticate(reason: string): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // Allow device passcode as fallback
      });

      return result.success;
    } catch (error) {
      logger.error('Biometric authentication failed', { error: error.message });
      return false;
    }
  }

  // High-security authentication for financial operations
  static async authenticateForFinancialOperation(operationType: string, amount?: number): Promise<boolean> {
    const isHighValue = amount && amount > 1000; // Business rule for high-value transactions
    
    const promptMessage = isHighValue
      ? `Authenticate for high-value ${operationType} of $${amount}`
      : `Authenticate to ${operationType}`;

    return await this.authenticate(promptMessage);
  }
}
```

#### Network Security Implementation
```typescript
// Secure HTTP client with certificate pinning and request signing
class SecureHttpClient {
  private static readonly BASE_URL = Config.API_BASE_URL;
  private static readonly CERTIFICATE_PINS = Config.CERTIFICATE_PINS;

  static async secureRequest<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = `${this.BASE_URL}${endpoint}`;
    
    // Add request signing for financial operations
    if (options.requiresSignature) {
      options.headers = {
        ...options.headers,
        'X-Request-Signature': await this.signRequest(options.body),
        'X-Timestamp': Date.now().toString(),
      };
    }

    // Implement certificate pinning
    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '1.0',
        ...options.headers,
      },
      // Certificate pinning configuration
      agent: this.createPinnedAgent(),
    };

    try {
      const response = await fetch(url, fetchOptions);
      
      // Validate response integrity
      if (options.validateResponse) {
        await this.validateResponseSignature(response);
      }

      return await this.parseSecureResponse(response);
    } catch (error) {
      logger.error('Secure request failed', {
        endpoint,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw new NetworkSecurityException('Secure request failed');
    }
  }

  private static async signRequest(body: any): Promise<string> {
    const privateKey = await SecureStorageService.getSecureData('request-signing-key');
    return crypto.sign(JSON.stringify(body), privateKey);
  }

  private static createPinnedAgent(): any {
    // Implementation of certificate pinning agent
    // Platform-specific implementation for React Native
  }
}
```

### NestJS Backend Security

#### Authentication and Authorization Framework
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

// Multi-factor authentication guard
@Injectable()
export class MFAGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requiredMFALevel = this.reflector.get<string>('mfa-level', context.getHandler());
    
    if (!requiredMFALevel) {
      return true; // No MFA required
    }

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      
      // Validate MFA completion for required level
      if (!this.validateMFALevel(payload, requiredMFALevel)) {
        throw new UnauthorizedException('Multi-factor authentication required');
      }

      request.user = payload;
      return true;
    } catch (error) {
      logger.error('MFA validation failed', {
        error: error.message,
        requiredLevel: requiredMFALevel,
        timestamp: new Date().toISOString(),
      });
      throw new UnauthorizedException('Invalid authentication');
    }
  }

  private validateMFALevel(payload: any, requiredLevel: string): boolean {
    switch (requiredLevel) {
      case 'basic':
        return payload.authLevel >= 1;
      case 'financial':
        return payload.authLevel >= 2 && payload.mfaVerified;
      case 'admin':
        return payload.authLevel >= 3 && payload.mfaVerified && payload.adminVerified;
      default:
        return false;
    }
  }
}

// Financial operation authorization decorator
export const RequiresMFA = (level: 'basic' | 'financial' | 'admin') =>
  SetMetadata('mfa-level', level);

// Usage in controllers
@Controller('transactions')
export class TransactionController {
  @Post('transfer')
  @RequiresMFA('financial')
  @UseGuards(MFAGuard)
  async processTransfer(@Body() transferRequest: TransferRequest) {
    return await this.transactionService.processTransfer(transferRequest);
  }
}
```

#### API Security Middleware
```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // CSP for API responses
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none';"
    );

    // Rate limiting headers
    const rateLimitInfo = this.getRateLimitInfo(req);
    res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimitInfo.reset);

    // Request validation
    if (!this.validateRequest(req)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    next();
  }

  private validateRequest(req: Request): boolean {
    // Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (!req.is('application/json')) {
        return false;
      }
    }

    // Validate request size
    const contentLength = parseInt(req.get('content-length') || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
      return false;
    }

    return true;
  }
}

// Rate limiting with Redis
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const key = this.generateRateLimitKey(req);
    const window = 60; // 1 minute window
    const limit = this.getEndpointLimit(req.path);

    const current = await this.redisService.incr(key);
    
    if (current === 1) {
      await this.redisService.expire(key, window);
    }

    if (current > limit) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        endpoint: req.path,
        current,
        limit,
        timestamp: new Date().toISOString(),
      });
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: window,
      });
    }

    next();
  }

  private getEndpointLimit(path: string): number {
    // Financial endpoints have stricter limits
    if (path.includes('/transactions') || path.includes('/payments')) {
      return 10; // 10 requests per minute
    }
    
    if (path.includes('/auth')) {
      return 5; // 5 auth attempts per minute
    }
    
    return 100; // Default limit
  }
}
```

### Database Security Framework

#### Query Security with Prisma
```typescript
// Secure database service with audit logging
@Injectable()
export class SecureDatabaseService {
  constructor(
    private prisma: PrismaService,
    private auditLogger: AuditLoggerService,
  ) {}

  async findUserTransactions(
    userId: string,
    filters: TransactionFilters,
  ): Promise<Transaction[]> {
    // Input validation
    if (!this.isValidUserId(userId)) {
      throw new ValidationException('Invalid user ID');
    }

    // Audit log the access
    await this.auditLogger.logDataAccess({
      operation: 'TRANSACTION_QUERY',
      userId,
      resourceType: 'TRANSACTIONS',
      timestamp: new Date(),
    });

    try {
      // Use Prisma's type-safe queries (prevents SQL injection)
      const transactions = await this.prisma.transaction.findMany({
        where: {
          userId,
          ...this.buildSecureFilters(filters),
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          // Explicitly exclude sensitive fields
          // privateKeys: false, // This field should never be selected
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(filters.limit || 50, 100), // Enforce maximum limit
      });

      return transactions;
    } catch (error) {
      logger.error('Database query failed', {
        operation: 'findUserTransactions',
        userId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw new DatabaseException('Query failed');
    }
  }

  private buildSecureFilters(filters: TransactionFilters): any {
    const secureFilters: any = {};

    // Validate and sanitize filter values
    if (filters.status && this.isValidStatus(filters.status)) {
      secureFilters.status = filters.status;
    }

    if (filters.fromDate) {
      secureFilters.createdAt = {
        gte: new Date(filters.fromDate),
      };
    }

    if (filters.toDate) {
      secureFilters.createdAt = {
        ...secureFilters.createdAt,
        lte: new Date(filters.toDate),
      };
    }

    return secureFilters;
  }

  // Financial data update with integrity checks
  async updateTransactionStatus(
    transactionId: string,
    newStatus: TransactionStatus,
    userId: string,
  ): Promise<void> {
    // Use database transaction for consistency
    await this.prisma.$transaction(async (tx) => {
      // Verify transaction ownership
      const transaction = await tx.transaction.findFirst({
        where: { id: transactionId, userId },
      });

      if (!transaction) {
        throw new UnauthorizedException('Transaction not found or access denied');
      }

      // Validate status transition
      if (!this.isValidStatusTransition(transaction.status, newStatus)) {
        throw new ValidationException('Invalid status transition');
      }

      // Update with audit trail
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
          // Add audit fields
          lastModifiedBy: userId,
          statusHistory: {
            push: {
              previousStatus: transaction.status,
              newStatus,
              timestamp: new Date(),
              modifiedBy: userId,
            },
          },
        },
      });

      // Log the change
      await this.auditLogger.logDataModification({
        operation: 'TRANSACTION_STATUS_UPDATE',
        resourceId: transactionId,
        userId,
        previousValue: transaction.status,
        newValue: newStatus,
        timestamp: new Date(),
      });
    });
  }
}
```

## Security Testing Framework

### Automated Security Testing

#### Jest Security Tests
```typescript
// Security-focused test suite
describe('PaymentController Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should reject malicious input patterns', async () => {
      const maliciousInputs = [
        { amount: '<script>alert("xss")</script>' },
        { recipient: '../../../etc/passwd' },
        { description: 'DROP TABLE users;--' },
        { amount: 'NaN' },
        { amount: -1000 }, // Negative amount
      ];

      for (const input of maliciousInputs) {
        await expect(
          paymentController.processPayment(input as any)
        ).rejects.toThrow(ValidationException);
      }
    });

    it('should enforce transaction amount limits', async () => {
      const highValueTransaction = {
        amount: 100000, // Above limit
        recipient: 'valid-user-id',
        description: 'Test transaction',
      };

      await expect(
        paymentController.processPayment(highValueTransaction)
      ).rejects.toThrow('Transaction amount exceeds limit');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require valid authentication token', async () => {
      const request = mockRequest({ headers: {} });
      
      await expect(
        paymentController.processPayment(validTransaction)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should require MFA for high-value transactions', async () => {
      const highValueTransaction = {
        amount: 5000,
        recipient: 'valid-user-id',
      };

      const requestWithoutMFA = mockRequest({
        headers: { authorization: 'Bearer valid-token' },
        user: { mfaVerified: false },
      });

      await expect(
        paymentController.processPayment(highValueTransaction)
      ).rejects.toThrow('Multi-factor authentication required');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits for payment endpoints', async () => {
      const requests = Array(11).fill(validTransaction);
      
      // First 10 should succeed
      for (let i = 0; i < 10; i++) {
        await expect(
          paymentController.processPayment(requests[i])
        ).resolves.toBeDefined();
      }

      // 11th should be rate limited
      await expect(
        paymentController.processPayment(requests[10])
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize output data', async () => {
      const result = await paymentController.getTransactionHistory('user-id');
      
      // Ensure sensitive fields are not exposed
      expect(result.transactions).toBeDefined();
      result.transactions.forEach(transaction => {
        expect(transaction).not.toHaveProperty('privateKey');
        expect(transaction).not.toHaveProperty('internalNotes');
        expect(transaction).not.toHaveProperty('adminFlags');
      });
    });
  });
});
```

### Security Integration Tests
```typescript
// End-to-end security test suite
describe('Payment Flow Security Integration', () => {
  describe('Complete Payment Process', () => {
    it('should securely process authenticated payment with audit trail', async () => {
      // Step 1: Authenticate user
      const authResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'secure-password',
          mfaCode: '123456',
        })
        .expect(200);

      const token = authResponse.body.accessToken;

      // Step 2: Initiate payment with proper authentication
      const paymentResponse = await request(app)
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: 'recipient-user-id',
          amount: 100.50,
          description: 'Test payment',
        })
        .expect(201);

      // Step 3: Verify audit trail creation
      const auditLogs = await auditService.getLogsForTransaction(
        paymentResponse.body.transactionId
      );
      
      expect(auditLogs).toHaveLength(3); // Auth, validation, processing
      expect(auditLogs[0].operation).toBe('PAYMENT_INITIATED');
      expect(auditLogs[2].operation).toBe('PAYMENT_COMPLETED');

      // Step 4: Verify data integrity
      const transaction = await transactionService.findById(
        paymentResponse.body.transactionId
      );
      
      expect(transaction.amount).toBe(100.50);
      expect(transaction.status).toBe('COMPLETED');
      expect(transaction.auditTrail).toBeDefined();
    });

    it('should prevent payment processing with insufficient funds', async () => {
      const token = await getValidAuthToken();
      
      await request(app)
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: 'recipient-user-id',
          amount: 999999, // Exceeds balance
          description: 'Insufficient funds test',
        })
        .expect(400);

      // Verify no partial transaction created
      const userTransactions = await transactionService.getUserTransactions(
        'sender-user-id'
      );
      
      const failedTransaction = userTransactions.find(
        t => t.description === 'Insufficient funds test'
      );
      
      expect(failedTransaction?.status).toBe('FAILED');
    });
  });
});
```

## Compliance and Audit Framework

### Audit Logging Implementation
```typescript
// Comprehensive audit logging service
@Injectable()
export class AuditLoggerService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async logFinancialOperation(event: FinancialAuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          eventType: event.eventType,
          userId: event.userId,
          resourceId: event.resourceId,
          resourceType: event.resourceType,
          operation: event.operation,
          previousValue: event.previousValue ? 
            await this.encryptionService.encrypt(JSON.stringify(event.previousValue)) : null,
          newValue: event.newValue ? 
            await this.encryptionService.encrypt(JSON.stringify(event.newValue)) : null,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          timestamp: event.timestamp || new Date(),
          sessionId: event.sessionId,
          regulatoryFlags: event.regulatoryFlags || [],
          complianceLevel: event.complianceLevel || 'STANDARD',
        },
      });
    } catch (error) {
      // Audit logging failure is critical
      logger.critical('Audit logging failed', {
        eventType: event.eventType,
        userId: event.userId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      // Send immediate alert to security team
      await this.alertService.sendCriticalAlert(
        'AUDIT_LOGGING_FAILURE',
        'Audit logging system failure detected'
      );
    }
  }

  // Regulatory compliance reporting
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    reportType: 'AML' | 'KYC' | 'TRANSACTION_MONITORING'
  ): Promise<ComplianceReport> {
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate },
        regulatoryFlags: { hasSome: [reportType] },
      },
      orderBy: { timestamp: 'asc' },
    });

    return {
      reportType,
      generatedAt: new Date(),
      periodStart: startDate,
      periodEnd: endDate,
      totalEvents: auditLogs.length,
      events: auditLogs.map(log => ({
        ...log,
        // Decrypt values for reporting (with proper authorization)
        previousValue: log.previousValue ? 
          await this.decryptForReporting(log.previousValue) : null,
        newValue: log.newValue ? 
          await this.decryptForReporting(log.newValue) : null,
      })),
      signature: await this.signReport(auditLogs),
    };
  }
}
```

### Regulatory Compliance Validation
```typescript
// PCI DSS compliance validation
class PCIDSSValidator {
  static validatePaymentDataHandling(context: PaymentContext): ValidationResult {
    const violations: string[] = [];

    // Requirement 3: Protect stored cardholder data
    if (context.includesCardData) {
      if (!context.isEncrypted) {
        violations.push('Card data must be encrypted at rest');
      }
      
      if (context.storageLocation !== 'PCI_COMPLIANT_VAULT') {
        violations.push('Card data must be stored in PCI-compliant vault');
      }
    }

    // Requirement 4: Encrypt transmission of cardholder data
    if (context.transmitsCardData && !context.usesTLS) {
      violations.push('Card data transmission must use TLS encryption');
    }

    // Requirement 8: Identify and authenticate access
    if (!context.hasAuthentication) {
      violations.push('Access must be authenticated');
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      timestamp: new Date(),
    };
  }
}

// AML compliance monitoring
class AMLComplianceMonitor {
  async evaluateTransaction(transaction: Transaction): Promise<AMLAssessment> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;

    // High-value transaction flag
    if (transaction.amount > 10000) {
      riskFactors.push({
        type: 'HIGH_VALUE_TRANSACTION',
        score: 30,
        description: 'Transaction exceeds high-value threshold',
      });
      riskScore += 30;
    }

    // Cross-border transaction
    if (transaction.senderCountry !== transaction.recipientCountry) {
      riskFactors.push({
        type: 'CROSS_BORDER',
        score: 20,
        description: 'Cross-border transaction detected',
      });
      riskScore += 20;
    }

    // Velocity check
    const recentTransactions = await this.getRecentTransactions(
      transaction.senderId,
      24 // Last 24 hours
    );
    
    const totalDaily = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
    if (totalDaily > 50000) {
      riskFactors.push({
        type: 'HIGH_VELOCITY',
        score: 25,
        description: 'High transaction velocity detected',
      });
      riskScore += 25;
    }

    // Sanctions screening
    const sanctionsMatch = await this.checkSanctionsList(
      transaction.recipientId
    );
    
    if (sanctionsMatch.isMatch) {
      riskFactors.push({
        type: 'SANCTIONS_MATCH',
        score: 100,
        description: `Sanctions match: ${sanctionsMatch.listName}`,
      });
      riskScore = 100; // Auto-maximum risk
    }

    return {
      transactionId: transaction.id,
      riskScore,
      riskLevel: this.calculateRiskLevel(riskScore),
      riskFactors,
      requiresManualReview: riskScore >= 70,
      blockedTransaction: riskScore >= 100,
      assessmentTimestamp: new Date(),
    };
  }

  private calculateRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 100) return 'CRITICAL';
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }
}
```

## OAuth and Social Login Security

### Social Authentication Security Model

**Trust Framework**: OAuth 2.0 providers (Google, Facebook, Apple) serve as trusted identity providers while maintaining platform security boundaries.

```typescript
interface SocialAuthSecurity {
  tokenEncryption: 'AES-256-GCM';
  providerTrust: 'VERIFIED_PROVIDERS_ONLY';
  dataMinimization: 'PROFILE_EMAIL_ONLY';
  accountLinking: 'AUTHENTICATED_USERS_ONLY';
  auditTrail: 'COMPLETE_OAUTH_FLOW_LOGGING';
}
```

### OAuth Token Security

#### Token Storage and Encryption
```typescript
// OAuth tokens encrypted before database storage
class SocialTokenManager {
  private readonly algorithm = 'aes-256-gcm';
  
  encryptToken(token: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  // Automatic token cleanup for expired credentials
  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.socialAccount.updateMany({
      where: { tokenExpiresAt: { lt: new Date() }},
      data: { accessToken: null, tokenExpiresAt: null }
    });
  }
}
```

#### OAuth Flow Security Controls
- **CSRF Protection**: State parameters for OAuth flow integrity
- **Secure Callbacks**: HTTPS-only callback URLs with domain validation
- **Scope Limitation**: Minimal permissions (email, profile only)
- **Token Rotation**: Regular refresh of OAuth access tokens
- **Provider Validation**: Whitelist of trusted OAuth providers only

### Social Account Management Security

#### Account Linking Security
```typescript
// Secure social account linking for authenticated users
@UseGuards(JwtAuthGuard, RateLimitGuard)
@Post('social/link')
async linkSocialAccount(
  @Request() req: AuthenticatedRequest,
  @Body() dto: LinkSocialAccountDto
) {
  // Verify user is authenticated before allowing account linking
  // Validate OAuth authorization code
  // Check for existing provider links to prevent conflicts
  // Audit log account linking activity
}
```

#### Security Benefits of Social Login
- **Enhanced Identity Verification**: Provider-verified emails boost KYC tiers
- **Risk Score Improvement**: Established social accounts reduce fraud risk
- **Multi-Provider Trust**: Multiple linked accounts increase identity confidence
- **Account Recovery**: Social accounts provide additional recovery options

### Security Monitoring for OAuth

#### OAuth Security Events
```typescript
interface OAuthSecurityEvent {
  eventType: 'OAUTH_LOGIN' | 'ACCOUNT_LINK' | 'TOKEN_REFRESH' | 'PROVIDER_ERROR';
  userId: string;
  provider: SocialProvider;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  riskScore?: number;
  timestamp: Date;
}
```

#### Monitoring and Alerting
- **Failed OAuth Attempts**: Track and alert on repeated OAuth failures
- **Unusual Provider Activity**: Monitor for suspicious social login patterns  
- **Token Anomalies**: Alert on unexpected token refresh patterns
- **Account Linking Abuse**: Detect rapid account linking attempts

### Compliance Integration

#### GDPR Compliance for Social Data
- **Data Minimization**: Store only essential profile information from providers
- **User Consent**: Clear disclosure of social provider data usage
- **Data Portability**: Users can export social account connection data
- **Right to be Forgotten**: Social account data included in deletion processes

#### Financial Compliance Benefits
- **Enhanced Due Diligence**: Social verification augments traditional KYC
- **Identity Confidence**: Multiple providers strengthen identity verification
- **Fraud Prevention**: Social account history contributes to risk assessment

## Conclusion

This comprehensive application security framework provides the foundation for secure development and operation of the Goji Mobile Wallet platform. The framework addresses:

- **Secure Development Practices**: From code review to deployment security
- **Runtime Protection**: Authentication, authorization, and input validation
- **Financial Services Compliance**: PCI DSS, AML, and regulatory requirements  
- **Audit and Monitoring**: Comprehensive logging and compliance reporting
- **OAuth Security**: Secure social login integration with financial compliance

All development teams must adhere to these security standards to ensure the platform maintains the highest level of security required for financial services operations.