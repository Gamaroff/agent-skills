---
name: error-handling-enforcer
description: Ensure consistent error handling across client and server. Use when adding error handling, reviewing exceptions, implementing error boundaries, creating error classes, validating error codes, ensuring proper logging, or implementing retry logic and circuit breakers.
---

# Error Handling Enforcer

## Overview

This skill enforces consistent error handling patterns across the Goji system for both client and server. Ensures proper error class hierarchy, standardized error codes, sanitized logging, user-friendly messages, retry logic, circuit breakers, and React Native error boundaries.

## When to Use This Skill

Use this skill when:
- Creating new error classes or extending AppError
- Implementing try-catch blocks in services or controllers
- Adding error handling to API endpoints
- Creating React Native error boundaries
- Implementing retry logic for network requests
- Adding circuit breakers for external services
- Reviewing error handling code for consistency
- Ensuring errors are logged without PII
- Validating error codes follow naming conventions
- Implementing error recovery strategies

## Error Class Hierarchy

### Base AppError Class

Standard error structure for the entire system:

```typescript
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  NETWORK = 'NETWORK_ERROR',
  SERVER = 'SERVER_ERROR',
  BLOCKCHAIN = 'BLOCKCHAIN_ERROR',
  PAYMENT = 'PAYMENT_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  type: ErrorType;
  statusCode: number;
  code?: string;
  details?: any;

  constructor(
    message: string,
    type: ErrorType,
    codeOrStatusCode?: string | number,
    detailsOrStatusCode?: any | number,
    finalDetails?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;

    // Handle overloaded constructor
    if (typeof codeOrStatusCode === 'string') {
      this.code = codeOrStatusCode;
      this.statusCode = typeof detailsOrStatusCode === 'number' ? detailsOrStatusCode : 400;
      this.details = typeof detailsOrStatusCode === 'number' ? finalDetails : detailsOrStatusCode;
    } else {
      this.statusCode = codeOrStatusCode || 400;
      this.details = detailsOrStatusCode;
    }
  }
}
```

### Domain-Specific Error Classes

**Wallet Errors**:

```typescript
export enum WalletErrorCode {
  // Wallet management
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_SUSPENDED = 'WALLET_SUSPENDED',
  WALLET_CREATION_FAILED = 'WALLET_CREATION_FAILED',

  // Balance and transactions
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  DUST_AMOUNT = 'DUST_AMOUNT',

  // Limits and compliance
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  MONTHLY_LIMIT_EXCEEDED = 'MONTHLY_LIMIT_EXCEEDED',
  KYC_VERIFICATION_REQUIRED = 'KYC_VERIFICATION_REQUIRED',

  // Sync and network
  SYNC_FAILED = 'SYNC_FAILED',
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
}

export class WalletError extends Error {
  public readonly code: WalletErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    code: WalletErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WalletError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

// Specific error subclasses
export class InsufficientBalanceError extends WalletError {
  constructor(available: string, required: string, walletId: string) {
    super(
      WalletErrorCode.INSUFFICIENT_BALANCE,
      `Insufficient balance: available ${available}, required ${required}`,
      { available, required, walletId }
    );
  }
}

export class DailyLimitExceededError extends WalletError {
  constructor(limit: string, attempted: string, walletId: string) {
    super(
      WalletErrorCode.DAILY_LIMIT_EXCEEDED,
      `Daily limit exceeded: limit ${limit}, attempted ${attempted}`,
      { limit, attempted, walletId }
    );
  }
}
```

**Authentication Errors**:

```typescript
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  RATE_LIMITED = 'RATE_LIMITED',
}

export class AuthenticationError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number;

  constructor(code: AuthErrorCode, message?: string, statusCode?: number) {
    super(message || AUTH_ERROR_MESSAGES[code]);
    this.name = 'AuthenticationError';
    this.code = code;
    this.statusCode = statusCode || AUTH_HTTP_STATUS[code];

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }
}

// Factory functions for common errors
export function createInvalidCredentialsError(message?: string): AuthenticationError {
  return new AuthenticationError(AuthErrorCode.INVALID_CREDENTIALS, message);
}

export function createTokenExpiredError(message?: string): AuthenticationError {
  return new AuthenticationError(AuthErrorCode.TOKEN_EXPIRED, message);
}
```

## Error Code Standards

### Naming Convention

Error codes follow the pattern: `RESOURCE_OPERATION_STATE`:

```typescript
// ✅ CORRECT - Clear, descriptive, uppercase
export enum ErrorCode {
  // Wallet errors
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  WALLET_CREATION_FAILED = 'WALLET_CREATION_FAILED',
  WALLET_SUSPENDED = 'WALLET_SUSPENDED',

  // Balance errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',

  // Limit errors
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  TRANSACTION_LIMIT_EXCEEDED = 'TRANSACTION_LIMIT_EXCEEDED',

  // Validation errors
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_HANDLE = 'INVALID_HANDLE',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ❌ WRONG - Inconsistent naming
enum BAD_ERROR_CODES {
  'wallet-not-found',     // lowercase, hyphens
  'WalletCreationErr',    // Mixed case, abbreviated
  'ERR_001',              // Generic numeric code
  'error_wallet_create',  // Wrong order
}
```

### Error Code Categories

Organize error codes by module/domain:

```typescript
// Prefix pattern: MODULE_OPERATION_STATUS
export const ErrorCodes = {
  // Wallet module (WALLET_*)
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_SUSPENDED: 'WALLET_SUSPENDED',
  WALLET_SYNC_FAILED: 'WALLET_SYNC_FAILED',

  // Transaction module (TX_*)
  TX_INSUFFICIENT_BALANCE: 'TX_INSUFFICIENT_BALANCE',
  TX_INVALID_AMOUNT: 'TX_INVALID_AMOUNT',
  TX_BROADCAST_FAILED: 'TX_BROADCAST_FAILED',

  // Auth module (AUTH_*)
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',

  // User module (USER_*)
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_KYC_REQUIRED: 'USER_KYC_REQUIRED',
};
```

## Logging Patterns

### Sanitized Logging (No PII)

**CRITICAL**: Never log sensitive information:

```typescript
import { logger } from '@goji-system/logging-lib/client';

// ✅ CORRECT - Sanitized, no PII
try {
  await walletService.transfer(fromWalletId, toWalletId, amount);
} catch (error) {
  logger.error('Wallet transfer failed', {
    errorCode: error.code,
    errorMessage: error.message,
    walletId: fromWalletId,  // ID is OK (not PII)
    amount: amount.toString(), // Amounts are OK
    // NO email, phone, name, address, etc.
  });
}

// ❌ WRONG - Logs PII
try {
  await userService.update(userId, data);
} catch (error) {
  logger.error('User update failed', {
    error: error.message,
    email: user.email,        // ❌ PII
    phone: user.phone,        // ❌ PII
    address: user.address,    // ❌ PII
    password: data.password,  // ❌ NEVER log passwords
  });
}
```

### Error Logging Best Practices

Structure error logs consistently:

```typescript
class WalletService {
  async createWallet(userId: string, currency: 'BSV' | 'MNEE_USD'): Promise<Wallet> {
    try {
      const wallet = await this.walletRepository.create({ userId, currency });

      logger.info('Wallet created successfully', {
        walletId: wallet.id,
        userId,
        currency,
      });

      return wallet;
    } catch (error) {
      // Log technical details for debugging
      logger.error('Wallet creation failed', {
        errorCode: isWalletError(error) ? error.code : 'UNKNOWN_ERROR',
        errorMessage: error.message,
        userId,
        currency,
        stack: error.stack,
      });

      // Re-throw domain error or wrap in WalletError
      if (isWalletError(error)) {
        throw error;
      }

      throw new WalletError(
        WalletErrorCode.WALLET_CREATION_FAILED,
        'Failed to create wallet',
        { userId, currency, originalError: error.message }
      );
    }
  }
}
```

## User-Friendly vs Technical Messages

### Dual Error Messages

Separate user-facing messages from technical details:

```typescript
export class WalletError extends Error {
  public readonly code: WalletErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly userMessage: string;  // For UI display
  public readonly technicalMessage: string;  // For logs

  constructor(
    code: WalletErrorCode,
    technicalMessage: string,
    userMessage: string,
    details?: Record<string, unknown>
  ) {
    super(technicalMessage);
    this.name = 'WalletError';
    this.code = code;
    this.technicalMessage = technicalMessage;
    this.userMessage = userMessage;
    this.details = details;
  }
}

// Usage
throw new WalletError(
  WalletErrorCode.INSUFFICIENT_BALANCE,
  `Insufficient balance in wallet ${walletId}: available ${available}, required ${required}`,
  'You do not have enough funds for this transaction. Please add funds and try again.',
  { walletId, available, required }
);
```

### User-Friendly Message Mapping

Map error types to user messages:

```typescript
export function getUserFriendlyErrorMessage(error: Error | AppError | unknown): string {
  if (error instanceof AppError) {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return error.message; // Validation messages are already user-friendly

      case ErrorType.AUTHENTICATION:
        return `Authentication failed: ${error.message}`;

      case ErrorType.AUTHORIZATION:
        return 'You do not have permission to perform this action';

      case ErrorType.NOT_FOUND:
        return error.message; // "Wallet not found" is clear

      case ErrorType.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again';

      case ErrorType.SERVER:
        return 'Something went wrong on our end. Please try again later.';

      case ErrorType.BLOCKCHAIN:
        return 'There was an issue with the blockchain transaction. Please try again later';

      case ErrorType.PAYMENT:
        return 'Payment processing failed. Please try again or use a different payment method';

      default:
        return 'An unexpected error occurred. Please try again later';
    }
  }

  if (error instanceof WalletError) {
    return error.userMessage || getDefaultWalletErrorMessage(error.code);
  }

  return 'An unexpected error occurred. Please try again.';
}

function getDefaultWalletErrorMessage(code: WalletErrorCode): string {
  const messages: Record<WalletErrorCode, string> = {
    [WalletErrorCode.INSUFFICIENT_BALANCE]: 'Insufficient funds for this transaction',
    [WalletErrorCode.WALLET_NOT_FOUND]: 'Wallet not found',
    [WalletErrorCode.WALLET_SUSPENDED]: 'Your wallet has been temporarily suspended. Please contact support.',
    [WalletErrorCode.DAILY_LIMIT_EXCEEDED]: 'Daily transaction limit exceeded. Try again tomorrow.',
    [WalletErrorCode.KYC_VERIFICATION_REQUIRED]: 'Please complete identity verification to continue',
    // ... more mappings
  };

  return messages[code] || 'An error occurred with your wallet';
}
```

## Retry Logic and Circuit Breakers

### Retry with Exponential Backoff

Implement retry logic for transient failures:

```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    retryableErrors = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!isRetryableError(error, retryableErrors)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelay * Math.pow(factor, attempt - 1),
        maxDelay
      );
      const jitter = delay * 0.1 * Math.random(); // 10% jitter

      logger.info(`Retry attempt ${attempt}/${maxAttempts} after ${Math.round(delay + jitter)}ms`, {
        errorCode: error.code,
        errorMessage: error.message,
      });

      await sleep(delay + jitter);
    }
  }

  throw lastError;
}

function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (error.code && retryableErrors.includes(error.code)) {
    return true;
  }

  if (error instanceof AppError) {
    return [ErrorType.NETWORK, ErrorType.SERVER].includes(error.type);
  }

  return false;
}

// Usage
const result = await retryWithBackoff(
  () => blockchainService.broadcastTransaction(tx),
  {
    maxAttempts: 3,
    initialDelay: 2000,
    retryableErrors: ['NETWORK_ERROR', 'BLOCKCHAIN_TIMEOUT'],
  }
);
```

### Circuit Breaker Pattern

Prevent cascading failures:

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = Date.now();

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private resetTimeout: number = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }

      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;

      if (this.successCount >= 2) {
        this.state = 'CLOSED';
        this.successCount = 0;
        logger.info('Circuit breaker CLOSED');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;

      logger.error('Circuit breaker OPEN', {
        failureCount: this.failureCount,
        nextAttemptAt: new Date(this.nextAttempt).toISOString(),
      });
    }
  }

  getState(): string {
    return this.state;
  }
}

// Usage
const blockchainCircuit = new CircuitBreaker(5, 60000, 30000);

async function broadcastWithCircuitBreaker(tx: Transaction): Promise<string> {
  return blockchainCircuit.execute(() =>
    blockchainService.broadcast(tx)
  );
}
```

## React Native Error Boundaries

### Error Boundary Component

Catch and display React errors gracefully:

```typescript
import React, { Component, ReactNode } from 'react';
import { View, Text, Button } from 'react-native';
import { logger } from '@goji-system/logging-lib/client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to error reporting service
    logger.error('React error boundary caught error', {
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
            We're sorry, but something unexpected happened. Please try again.
          </Text>
          <Button title="Try Again" onPress={this.handleReset} />
        </View>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ErrorBoundary>
      <MainAppContent />
    </ErrorBoundary>
  );
}
```

### Screen-Level Error Boundaries

Isolate errors to specific screens:

```typescript
export function WalletScreen() {
  return (
    <ErrorBoundary
      fallback={
        <View style={styles.errorContainer}>
          <Text>Unable to load wallet. Please try again.</Text>
          <Button title="Retry" onPress={() => navigation.replace('Wallet')} />
        </View>
      }
    >
      <WalletContent />
    </ErrorBoundary>
  );
}
```

## Error Recovery Strategies

### Graceful Degradation

Provide fallback functionality when features fail:

```typescript
class NotificationService {
  async sendNotification(userId: string, message: string): Promise<void> {
    try {
      // Try push notification first
      await this.pushNotificationService.send(userId, message);
    } catch (error) {
      logger.error('Push notification failed, falling back to in-app notification', {
        errorCode: error.code,
        userId,
      });

      try {
        // Fallback to in-app notification
        await this.inAppNotificationService.create(userId, message);
      } catch (fallbackError) {
        // Last resort: store for later delivery
        logger.error('In-app notification failed, queuing for later', {
          errorCode: fallbackError.code,
          userId,
        });

        await this.notificationQueue.add({ userId, message });
      }
    }
  }
}
```

### Compensating Transactions

Rollback on failure for critical operations:

```typescript
class TransferService {
  async transfer(
    fromWalletId: string,
    toWalletId: string,
    amount: Decimal
  ): Promise<Transaction> {
    let debitTransaction: Transaction | null = null;

    try {
      // Step 1: Debit from source wallet
      debitTransaction = await this.walletService.debit(fromWalletId, amount);

      // Step 2: Credit to destination wallet
      const creditTransaction = await this.walletService.credit(toWalletId, amount);

      // Step 3: Mark both as completed
      await this.transactionService.complete(debitTransaction.id);
      await this.transactionService.complete(creditTransaction.id);

      return debitTransaction;
    } catch (error) {
      logger.error('Transfer failed, initiating rollback', {
        errorCode: error.code,
        fromWalletId,
        toWalletId,
        amount: amount.toString(),
      });

      // Compensating transaction: reverse debit if it succeeded
      if (debitTransaction) {
        try {
          await this.walletService.credit(fromWalletId, amount);
          await this.transactionService.cancel(debitTransaction.id);

          logger.info('Transfer rollback successful', { fromWalletId, toWalletId });
        } catch (rollbackError) {
          // Critical: Manual intervention required
          logger.error('CRITICAL: Transfer rollback failed', {
            debitTransactionId: debitTransaction.id,
            fromWalletId,
            amount: amount.toString(),
            rollbackError: rollbackError.message,
          });

          // Alert operations team
          await this.alertService.criticalAlert({
            type: 'TRANSFER_ROLLBACK_FAILED',
            debitTransactionId: debitTransaction.id,
            fromWalletId,
            amount: amount.toString(),
          });
        }
      }

      throw error;
    }
  }
}
```

## Validation Checklist

**Error Classes:**
- [ ] All errors extend appropriate base class (AppError, WalletError, etc.)
- [ ] Error codes follow RESOURCE_OPERATION_STATE naming
- [ ] Error codes are UPPERCASE with underscores
- [ ] Error class includes timestamp for tracking
- [ ] Error details exclude sensitive information (PII)
- [ ] Error stack trace captured properly

**Logging:**
- [ ] No PII logged (email, phone, address, passwords)
- [ ] Error code included in all error logs
- [ ] Stack trace logged for debugging
- [ ] Log level appropriate (error, warn, info)
- [ ] Structured logging used (JSON format)
- [ ] Context included (userId, walletId, etc. - IDs only)

**User Messages:**
- [ ] User-friendly messages separate from technical messages
- [ ] No technical jargon in user messages
- [ ] No sensitive information in user messages
- [ ] Clear actionable guidance provided
- [ ] Consistent tone and voice

**Error Handling:**
- [ ] Try-catch blocks around all async operations
- [ ] Errors re-thrown or wrapped in domain errors
- [ ] Retry logic for transient failures
- [ ] Circuit breakers for external services
- [ ] Graceful degradation for non-critical features
- [ ] Compensating transactions for critical operations

**Error Boundaries:**
- [ ] Error boundaries wrap all major screens
- [ ] Fallback UI provides retry option
- [ ] Errors logged to monitoring service
- [ ] Component stack included in logs

## Anti-Patterns to Avoid

**NEVER:**
- ❌ Log PII (email, phone, address, password, etc.)
- ❌ Use generic error messages ("Something went wrong")
- ❌ Use lowercase or mixed-case error codes
- ❌ Expose stack traces to users
- ❌ Swallow errors silently (empty catch blocks)
- ❌ Return different error formats from same module
- ❌ Throw generic Error objects (use domain errors)
- ❌ Retry non-idempotent operations without safeguards
- ❌ Skip compensating transactions for critical operations
- ❌ Use numeric error codes without descriptive names

**ALWAYS:**
- ✅ Use domain-specific error classes (WalletError, AuthError)
- ✅ Include error codes in all custom errors
- ✅ Log errors with sanitized context
- ✅ Provide user-friendly error messages
- ✅ Implement retry logic with exponential backoff
- ✅ Use circuit breakers for external services
- ✅ Wrap React components in error boundaries
- ✅ Implement graceful degradation
- ✅ Use compensating transactions for rollbacks
- ✅ Monitor and alert on critical errors

## Resources

### references/

**error-hierarchy.md** - Complete error class hierarchy and domain-specific error patterns for the Goji system

**logging-standards.md** - Logging best practices, PII sanitization, and structured logging patterns

**retry-patterns.md** - Retry logic, circuit breakers, and error recovery strategies

## Success Criteria

Error handling is well-implemented when:
1. All errors use appropriate domain-specific classes
2. Error codes follow consistent naming conventions
3. No PII logged in error messages or details
4. User-friendly messages separate from technical logs
5. Retry logic implemented for transient failures
6. Circuit breakers prevent cascading failures
7. Error boundaries protect React Native UI
8. Graceful degradation for non-critical features
9. Compensating transactions for critical operations
10. Errors monitored and alerted appropriately

Refer to references for detailed patterns and examples.
