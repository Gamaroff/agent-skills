/*
 * PROPRIETARY SOURCE CODE - NOT OPEN SOURCE
 * Copyright (c) 2025 Lorien Gamaroff. All Rights Reserved.
 *
 * 1. OWNERSHIP
 * This software is the confidential and proprietary information of Lorien Gamaroff.
 * It is NOT "Open Source" and it is NOT "Work for Hire."
 *
 * 2. RESTRICTIONS
 * Possession of this source code does not imply a license to use it.
 * Any usage by a third party (including corporate employers) requires a
 * written license agreement.
 */

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-non-null-assertion,@typescript-eslint/no-unused-vars */
// Comprehensive error handling with retry mechanisms for contact operations

import { ContactError, ContactValidationError, ContactNotFoundError, ContactDuplicateError } from './types';
// Platform-compatible logger import
let logger: any;
try {
  logger = require('@goji-system/logging-lib/client').logger;
} catch {
  logger = {
    info: (message: string, context?: any) => console.log('[LIB]', message, context),
    error: (message: string, context?: any) => console.error('[LIB]', message, context),
    warn: (message: string, context?: any) => console.warn('[LIB]', message, context),
    debug: (message: string, context?: any) => console.debug('[LIB]', message, context),
  };
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  retryCondition?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface ErrorRecoveryContext {
  operation: string;
  userId?: string;
  contactId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorHandlingResult<T> {
  success: boolean;
  data?: T;
  error?: ContactError;
  attempts: number;
  recoveryAction?: string;
}

export class ContactErrorHandler {
  private static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBackoff: true,
    retryCondition: (error: unknown) => ContactErrorHandler.isRetryableError(error),
  };

  private static readonly OPERATION_SPECIFIC_RETRY_OPTIONS: Record<string, Partial<RetryOptions>> = {
    'external_validation': {
      maxAttempts: 5,
      baseDelayMs: 2000,
      maxDelayMs: 30000,
      retryCondition: (error: unknown) => 
        ContactErrorHandler.isNetworkError(error) || ContactErrorHandler.isTemporaryServiceError(error),
    },
    'database_operation': {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      retryCondition: (error: unknown) => 
        ContactErrorHandler.isTemporaryDatabaseError(error),
    },
    'api_call': {
      maxAttempts: 4,
      baseDelayMs: 1500,
      maxDelayMs: 20000,
      retryCondition: (error: unknown) => 
        ContactErrorHandler.isRetryableApiError(error),
    },
    'blockchain_operation': {
      maxAttempts: 5,
      baseDelayMs: 3000,
      maxDelayMs: 60000,
      retryCondition: (error: unknown) => 
        ContactErrorHandler.isBlockchainRetryableError(error),
    },
  };

  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorRecoveryContext,
    customOptions?: Partial<RetryOptions>,
  ): Promise<ErrorHandlingResult<T>> {
    const options = {
      ...ContactErrorHandler.DEFAULT_RETRY_OPTIONS,
      ...ContactErrorHandler.OPERATION_SPECIFIC_RETRY_OPTIONS[context.operation],
      ...customOptions,
    };

    let lastError: unknown;
    let attempts = 0;

    while (attempts < options.maxAttempts) {
      attempts++;
      
      try {
        const result = await operation();
        return {
          success: true,
          data: result,
          attempts,
          recoveryAction: attempts > 1 ? `Succeeded after ${attempts} attempts` : undefined,
        };
      } catch (error) {
        lastError = error;
        
        // Call retry callback if provided
        if (options.onRetry) {
          options.onRetry(attempts, error);
        }

        // Check if we should retry
        if (attempts >= options.maxAttempts || !options.retryCondition!(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = ContactErrorHandler.calculateDelay(attempts, options);
        await ContactErrorHandler.sleep(delay);
      }
    }

    // Convert error to ContactError if needed
    const contactError = ContactErrorHandler.normalizeError(lastError, context);
    
    return {
      success: false,
      error: contactError,
      attempts,
      recoveryAction: ContactErrorHandler.suggestRecoveryAction(contactError, context),
    };
  }

  public static async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    context: ErrorRecoveryContext,
    circuitBreakerOptions?: {
      failureThreshold: number;
      recoveryTimeoutMs: number;
      monitoringPeriodMs: number;
    },
  ): Promise<ErrorHandlingResult<T>> {
    const options = {
      failureThreshold: 5,
      recoveryTimeoutMs: 60000, // 1 minute
      monitoringPeriodMs: 300000, // 5 minutes
      ...circuitBreakerOptions,
    };

    const circuitKey = `${context.operation}_${context.userId || 'global'}`;
    
    if (ContactErrorHandler.isCircuitOpen(circuitKey, options)) {
      return {
        success: false,
        error: new ContactError(
          'Service temporarily unavailable due to repeated failures', 
          'CIRCUIT_BREAKER_OPEN',
        ),
        attempts: 0,
        recoveryAction: 'Wait for circuit breaker recovery or contact support',
      };
    }

    const result = await ContactErrorHandler.executeWithRetry(operation, context);
    
    // Update circuit breaker state
    if (result.success) {
      ContactErrorHandler.recordSuccess(circuitKey);
    } else {
      ContactErrorHandler.recordFailure(circuitKey, options);
    }

    return result;
  }

  private static calculateDelay(attempt: number, options: RetryOptions): number {
    if (!options.exponentialBackoff) {
      return Math.min(options.baseDelayMs, options.maxDelayMs);
    }

    // Exponential backoff with jitter
    const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const totalDelay = exponentialDelay + jitter;

    return Math.min(totalDelay, options.maxDelayMs);
  }

  private static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static isRetryableError(error: unknown): boolean {
    return (
      ContactErrorHandler.isNetworkError(error) ||
      ContactErrorHandler.isTemporaryServiceError(error) ||
      ContactErrorHandler.isTemporaryDatabaseError(error) ||
      ContactErrorHandler.isRateLimitError(error)
    );
  }

  private static isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      const networkErrorCodes = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
      return networkErrorCodes.some(code => error.message.includes(code));
    }
    return false;
  }

  private static isTemporaryServiceError(error: unknown): boolean {
    if (error instanceof Error) {
      const temporaryMessages = [
        'service unavailable',
        'temporary failure',
        'server busy',
        'maintenance mode',
        '503',
        '502',
        '504',
      ];
      return temporaryMessages.some(msg => 
        error.message.toLowerCase().includes(msg),
      );
    }
    return false;
  }

  private static isTemporaryDatabaseError(error: unknown): boolean {
    if (error instanceof Error) {
      const dbErrorMessages = [
        'connection timeout',
        'connection reset',
        'deadlock',
        'lock timeout',
        'connection pool',
        'database busy',
      ];
      return dbErrorMessages.some(msg => 
        error.message.toLowerCase().includes(msg),
      );
    }
    return false;
  }

  private static isRateLimitError(error: unknown): boolean {
    if (error instanceof ContactError) {
      return error.code === 'RATE_LIMITED';
    }
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('rate limit') ||
             error.message.includes('429') ||
             error.message.toLowerCase().includes('too many requests');
    }
    return false;
  }

  private static isRetryableApiError(error: unknown): boolean {
    if (error instanceof Error) {
      const statusCodes = ['429', '500', '502', '503', '504'];
      return statusCodes.some(code => error.message.includes(code));
    }
    return false;
  }

  private static isBlockchainRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const blockchainErrors = [
        'mempool full',
        'fee too low',
        'network congestion',
        'node unavailable',
        'consensus failure',
        'temporary fork',
      ];
      return blockchainErrors.some(msg => 
        error.message.toLowerCase().includes(msg),
      );
    }
    return false;
  }

  private static normalizeError(error: unknown, context: ErrorRecoveryContext): ContactError {
    if (error instanceof ContactError) {
      return error;
    }

    if (error instanceof Error) {
      // Map common error types to ContactError
      if (error.message.includes('not found')) {
        return new ContactNotFoundError(context.contactId || 'unknown');
      }
      
      if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        return new ContactDuplicateError(error.message, context.contactId || 'unknown');
      }
      
      if (error.message.includes('validation') || error.message.includes('invalid')) {
        return new ContactValidationError(error.message, context.contactId);
      }

      return new ContactError(
        `${context.operation} failed: ${error.message}`,
        'OPERATION_FAILED',
      );
    }

    return new ContactError(
      `${context.operation} failed with unknown error`,
      'UNKNOWN_ERROR',
    );
  }

  private static suggestRecoveryAction(error: ContactError, context: ErrorRecoveryContext): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Check network connectivity and try again';
      
      case 'RATE_LIMITED':
        return 'Wait a few minutes before attempting this operation again';
      
      case 'VALIDATION_ERROR':
        return 'Please review and correct the input data';
      
      case 'ACCESS_DENIED':
        return 'Verify user permissions and authentication status';
      
      case 'DUPLICATE_CONTACT':
        return 'A contact with these details already exists - consider updating the existing contact';
      
      case 'CONTACT_NOT_FOUND':
        return 'The contact may have been deleted or access permissions changed';
      
      case 'CIRCUIT_BREAKER_OPEN':
        return 'Service is temporarily unavailable - please try again later';
      
      case 'DATABASE_ERROR':
        return 'Database operation failed - please try again or contact support';
      
      case 'EXTERNAL_SERVICE_ERROR':
        return 'External service is temporarily unavailable - please try again';
      
      default:
        return 'Please try again or contact support if the problem persists';
    }
  }

  // Circuit breaker implementation
  private static circuitState: Map<string, {
    failures: number;
    lastFailureTime: number;
    isOpen: boolean;
    successCount: number;
  }> = new Map();

  private static isCircuitOpen(circuitKey: string, options: {
    failureThreshold: number;
    recoveryTimeoutMs: number;
    monitoringPeriodMs: number;
  }): boolean {
    const state = ContactErrorHandler.circuitState.get(circuitKey);
    
    if (!state) {
      return false; // Circuit is closed by default
    }

    const now = Date.now();
    
    // Check if circuit should be reset due to monitoring period expiry
    if (now - state.lastFailureTime > options.monitoringPeriodMs) {
      ContactErrorHandler.circuitState.delete(circuitKey);
      return false;
    }

    // Check if circuit is open and if recovery timeout has passed
    if (state.isOpen) {
      if (now - state.lastFailureTime > options.recoveryTimeoutMs) {
        // Move to half-open state
        state.isOpen = false;
        state.failures = 0;
        state.successCount = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private static recordFailure(circuitKey: string, options: {
    failureThreshold: number;
    recoveryTimeoutMs: number;
    monitoringPeriodMs: number;
  }): void {
    const state = ContactErrorHandler.circuitState.get(circuitKey) || {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
      successCount: 0,
    };

    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.failures >= options.failureThreshold) {
      state.isOpen = true;
    }

    ContactErrorHandler.circuitState.set(circuitKey, state);
  }

  private static recordSuccess(circuitKey: string): void {
    const state = ContactErrorHandler.circuitState.get(circuitKey);
    
    if (state) {
      state.successCount++;
      
      // Reset circuit if we have enough consecutive successes
      if (state.successCount >= 3) {
        ContactErrorHandler.circuitState.delete(circuitKey);
      } else {
        ContactErrorHandler.circuitState.set(circuitKey, state);
      }
    }
  }

  // Error classification helpers
  public static classifyError(error: unknown): {
    type: 'network' | 'validation' | 'authorization' | 'business_logic' | 'external_service' | 'database' | 'unknown';
    severity: 'low' | 'medium' | 'high' | 'critical';
    isRetryable: boolean;
    requiresUserAction: boolean;
  } {
    if (error instanceof ContactValidationError) {
      return {
        type: 'validation',
        severity: 'medium',
        isRetryable: false,
        requiresUserAction: true,
      };
    }

    if (error instanceof ContactNotFoundError) {
      return {
        type: 'business_logic',
        severity: 'medium',
        isRetryable: false,
        requiresUserAction: true,
      };
    }

    if (error instanceof ContactDuplicateError) {
      return {
        type: 'business_logic',
        severity: 'low',
        isRetryable: false,
        requiresUserAction: true,
      };
    }

    if (error instanceof ContactError) {
      switch (error.code) {
        case 'ACCESS_DENIED':
          return {
            type: 'authorization',
            severity: 'high',
            isRetryable: false,
            requiresUserAction: true,
          };
        
        case 'RATE_LIMITED':
          return {
            type: 'external_service',
            severity: 'medium',
            isRetryable: true,
            requiresUserAction: false,
          };
        
        case 'NETWORK_ERROR':
          return {
            type: 'network',
            severity: 'medium',
            isRetryable: true,
            requiresUserAction: false,
          };
        
        case 'DATABASE_ERROR':
          return {
            type: 'database',
            severity: 'high',
            isRetryable: true,
            requiresUserAction: false,
          };
        
        default:
          return {
            type: 'unknown',
            severity: 'medium',
            isRetryable: true,
            requiresUserAction: false,
          };
      }
    }

    if (error instanceof Error) {
      if (ContactErrorHandler.isNetworkError(error)) {
        return {
          type: 'network',
          severity: 'medium',
          isRetryable: true,
          requiresUserAction: false,
        };
      }

      if (ContactErrorHandler.isTemporaryDatabaseError(error)) {
        return {
          type: 'database',
          severity: 'high',
          isRetryable: true,
          requiresUserAction: false,
        };
      }
    }

    return {
      type: 'unknown',
      severity: 'high',
      isRetryable: false,
      requiresUserAction: true,
    };
  }

  // Enhanced error logging with structured metadata
  public static logError(
    error: unknown, 
    context: ErrorRecoveryContext, 
    classification?: ReturnType<typeof ContactErrorHandler.classifyError>,
  ): void {
    const errorClassification = classification || ContactErrorHandler.classifyError(error);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation: context.operation,
      userId: context.userId,
      contactId: context.contactId,
      errorType: errorClassification.type,
      severity: errorClassification.severity,
      isRetryable: errorClassification.isRetryable,
      requiresUserAction: errorClassification.requiresUserAction,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error instanceof ContactError ? error.code : undefined,
      metadata: context.metadata,
      stackTrace: error instanceof Error ? error.stack : undefined,
    };

    // In production, this would send to logging service
    logger.error('[ContactErrorHandler] Operation failed:', logEntry);
    
    // For critical errors, could trigger alerts
    if (errorClassification.severity === 'critical') {
      ContactErrorHandler.triggerCriticalErrorAlert(logEntry);
    }
  }

  private static triggerCriticalErrorAlert(logEntry: Record<string, unknown>): void {
    // In production, this would send alerts to monitoring system
    logger.error('[CRITICAL] Contact system critical error:', {
      operation: logEntry['operation'] as string | undefined,
      userId: logEntry['userId'] as string | undefined,
      timestamp: logEntry['timestamp'] as string | undefined,
      errorMessage: logEntry['errorMessage'],
    });
  }

  // Error recovery suggestions based on context
  public static getErrorRecoveryPlan(
    error: ContactError,
    context: ErrorRecoveryContext,
  ): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    preventive: string[];
  } {
    const classification = ContactErrorHandler.classifyError(error);
    
    const basePlan = {
      immediate: ['Log error details', 'Notify user of failure'],
      shortTerm: ['Review error patterns', 'Check system status'],
      longTerm: ['Analyze root cause', 'Implement preventive measures'],
      preventive: ['Monitor error rates', 'Regular system health checks'],
    };

    switch (classification.type) {
      case 'network':
        return {
          immediate: [...basePlan.immediate, 'Check network connectivity', 'Retry with exponential backoff'],
          shortTerm: [...basePlan.shortTerm, 'Monitor network stability', 'Consider caching strategy'],
          longTerm: [...basePlan.longTerm, 'Implement offline mode', 'Optimize network usage'],
          preventive: [...basePlan.preventive, 'Network monitoring alerts', 'Connection pooling'],
        };

      case 'validation':
        return {
          immediate: [...basePlan.immediate, 'Return detailed validation errors', 'Suggest corrections'],
          shortTerm: [...basePlan.shortTerm, 'Review validation rules', 'Update user guidance'],
          longTerm: [...basePlan.longTerm, 'Enhance input validation', 'Improve UX feedback'],
          preventive: [...basePlan.preventive, 'Input sanitization', 'Real-time validation'],
        };

      case 'authorization':
        return {
          immediate: [...basePlan.immediate, 'Verify user session', 'Check permissions'],
          shortTerm: [...basePlan.shortTerm, 'Review access control rules', 'Audit user roles'],
          longTerm: [...basePlan.longTerm, 'Enhance security policies', 'Implement fine-grained permissions'],
          preventive: [...basePlan.preventive, 'Regular permission audits', 'Session monitoring'],
        };

      case 'external_service':
        return {
          immediate: [...basePlan.immediate, 'Check service status', 'Use fallback if available'],
          shortTerm: [...basePlan.shortTerm, 'Monitor service health', 'Review SLA compliance'],
          longTerm: [...basePlan.longTerm, 'Implement service redundancy', 'Negotiate better SLAs'],
          preventive: [...basePlan.preventive, 'Service health monitoring', 'Fallback mechanisms'],
        };

      default:
        return basePlan;
    }
  }

  // Batch operation error handling
  public static async handleBatchOperationErrors<T>(
    operations: Array<() => Promise<T>>,
    context: ErrorRecoveryContext,
    options?: {
      failFast?: boolean;
      maxConcurrent?: number;
      collectErrors?: boolean;
    },
  ): Promise<{
    successes: T[];
    failures: Array<{ index: number; error: ContactError; attempts: number }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      retryable: number;
    };
  }> {
    const opts = {
      failFast: false,
      maxConcurrent: 5,
      collectErrors: true,
      ...options,
    };

    const successes: T[] = [];
    const failures: Array<{ index: number; error: ContactError; attempts: number }> = [];
    
    // Process operations in batches to control concurrency
    for (let i = 0; i < operations.length; i += opts.maxConcurrent) {
      const batch = operations.slice(i, i + opts.maxConcurrent);
      const batchPromises = batch.map(async (operation, batchIndex) => {
        const operationIndex = i + batchIndex;
        const operationContext = {
          ...context,
          metadata: { ...context.metadata, operationIndex },
        };

        return ContactErrorHandler.executeWithRetry(operation, operationContext);
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const operationIndex = i + j;
        
        if (result.success && result.data !== undefined) {
          successes.push(result.data);
        } else if (result.error) {
          failures.push({
            index: operationIndex,
            error: result.error,
            attempts: result.attempts,
          });
          
          if (opts.failFast) {
            // Stop processing remaining operations
            return ContactErrorHandler.buildBatchResult(successes, failures, operations.length);
          }
        }
      }
    }

    return ContactErrorHandler.buildBatchResult(successes, failures, operations.length);
  }

  private static buildBatchResult<T>(
    successes: T[],
    failures: Array<{ index: number; error: ContactError; attempts: number }>,
    total: number,
  ) {
    const retryableCount = failures.filter(f => 
      ContactErrorHandler.classifyError(f.error).isRetryable,
    ).length;

    return {
      successes,
      failures,
      summary: {
        total,
        successful: successes.length,
        failed: failures.length,
        retryable: retryableCount,
      },
    };
  }
}

// Decorator for automatic error handling
export function withErrorHandling(
  context: ErrorRecoveryContext,
  retryOptions?: Partial<RetryOptions>,
) {
  return function <T>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]): Promise<T> {
      const fullContext = {
        ...context,
        metadata: { 
          ...context.metadata, 
          methodName: propertyKey,
          className: target.constructor.name, 
        },
      };

      const result = await ContactErrorHandler.executeWithRetry(
        () => originalMethod.apply(this, args),
        fullContext,
        retryOptions,
      );

      // Log errors
      if (!result.success && result.error) {
        ContactErrorHandler.logError(result.error, fullContext);
      }

      // Return result or throw error based on method expectation
      if (result.success && result.data !== undefined) {
        return result.data as T;
      } else {
        throw result.error || new ContactError('Operation failed', 'OPERATION_FAILED');
      }
    };

    return descriptor;
  };
}

// Utility for graceful degradation
export class GracefulDegradationHandler {
  public static async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: ErrorRecoveryContext,
    options?: {
      fallbackThreshold?: number; // Number of failures before using fallback
      fallbackCacheDurationMs?: number;
    },
  ): Promise<T> {
    const opts = {
      fallbackThreshold: 3,
      fallbackCacheDurationMs: 300000, // 5 minutes
      ...options,
    };

    const fallbackKey = `${context.operation}_fallback`;
    
    // Check if we should use fallback based on recent failures
    if (GracefulDegradationHandler.shouldUseFallback(fallbackKey, opts.fallbackThreshold)) {
      try {
        const result = await fallbackOperation();
        GracefulDegradationHandler.recordFallbackSuccess(fallbackKey);
        return result;
      } catch (fallbackError) {
        // If fallback also fails, try primary operation
        ContactErrorHandler.logError(fallbackError, {
          ...context,
          operation: `${context.operation}_fallback`,
        });
      }
    }

    // Try primary operation
    try {
      const result = await primaryOperation();
      GracefulDegradationHandler.recordPrimarySuccess(fallbackKey);
      return result;
    } catch (primaryError) {
      GracefulDegradationHandler.recordPrimaryFailure(fallbackKey);
      
      // Use fallback as last resort
      try {
        const result = await fallbackOperation();
        ContactErrorHandler.logError(primaryError, {
          ...context,
          metadata: { ...context.metadata, usedFallback: true },
        });
        return result;
      } catch (fallbackError) {
        // Both failed - throw the primary error
        ContactErrorHandler.logError(fallbackError, {
          ...context,
          operation: `${context.operation}_fallback_final`,
        });
        throw primaryError;
      }
    }
  }

  private static fallbackState: Map<string, {
    primaryFailures: number;
    lastPrimaryFailure: number;
    useFallback: boolean;
  }> = new Map();

  private static shouldUseFallback(fallbackKey: string, threshold: number): boolean {
    const state = GracefulDegradationHandler.fallbackState.get(fallbackKey);
    return state ? state.useFallback : false;
  }

  private static recordPrimaryFailure(fallbackKey: string): void {
    const state = GracefulDegradationHandler.fallbackState.get(fallbackKey) || {
      primaryFailures: 0,
      lastPrimaryFailure: 0,
      useFallback: false,
    };

    state.primaryFailures++;
    state.lastPrimaryFailure = Date.now();
    
    if (state.primaryFailures >= 3) {
      state.useFallback = true;
    }

    GracefulDegradationHandler.fallbackState.set(fallbackKey, state);
  }

  private static recordPrimarySuccess(fallbackKey: string): void {
    const state = GracefulDegradationHandler.fallbackState.get(fallbackKey);
    if (state) {
      state.primaryFailures = Math.max(0, state.primaryFailures - 1);
      
      if (state.primaryFailures === 0) {
        state.useFallback = false;
      }
      
      GracefulDegradationHandler.fallbackState.set(fallbackKey, state);
    }
  }

  private static recordFallbackSuccess(fallbackKey: string): void {
    // Don't reset primary failure count on fallback success
    // This prevents rapid switching between primary and fallback
  }
}
