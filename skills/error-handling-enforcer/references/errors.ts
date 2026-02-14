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

import { Decimal } from '@goji-system/shared-types';

import { SHOPPING_ERROR_CODES, SHOPPING_ERROR_MESSAGES } from './constants';
// Platform-compatible logger import
let logger: any;
try {
  logger = require('@goji-system/logging-lib/client').logger;
} catch {
  logger = {
    info: (message: string, context?: any) => console.log('[LIB]', message, context),
    error: (message: string, context?: any) => console.error('[LIB]', message, context),
    warn: (message: string, context?: any) => console.warn('[LIB]', message, context),
    debug: (message: string, context?: any) => console.debug('[LIB]', message, context)
  };
}

/**
 * Custom error class for shopping-related errors
 */
export class ShoppingError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(code: string, message?: string, details?: Record<string, unknown>) {
    const errorMessage =
      message ||
      SHOPPING_ERROR_MESSAGES[code as keyof typeof SHOPPING_ERROR_MESSAGES] ||
      'Unknown shopping error';
    super(errorMessage);

    this.name = 'ShoppingError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ShoppingError.prototype);
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    const retryableCodes: string[] = [
      SHOPPING_ERROR_CODES.PROVIDER_UNAVAILABLE,
      SHOPPING_ERROR_CODES.CATALOG_SYNC_FAILED,
      SHOPPING_ERROR_CODES.INVENTORY_UPDATE_FAILED,
      SHOPPING_ERROR_CODES.PROVIDER_ERROR
    ];
    return retryableCodes.includes(this.code);
  }

  /**
   * Check if error is user-facing (vs system error)
   */
  isUserFacing(): boolean {
    const systemErrorCodes: string[] = [
      SHOPPING_ERROR_CODES.CATALOG_SYNC_FAILED,
      SHOPPING_ERROR_CODES.INVENTORY_UPDATE_FAILED,
      SHOPPING_ERROR_CODES.ANALYTICS_ERROR,
      SHOPPING_ERROR_CODES.RECOMMENDATION_ERROR
    ];
    return !systemErrorCodes.includes(this.code);
  }
}

/**
 * Product-related error creators
 */
export const createProductError = (
  code: string,
  message?: string,
  details?: Record<string, unknown>
): ShoppingError => {
  return new ShoppingError(code, message, details);
};

export const createProductNotFoundError = (productId: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.PRODUCT_NOT_FOUND,
    `Product with ID ${productId} not found`,
    { productId }
  );
};

export const createProductUnavailableError = (
  productId: string,
  reason?: string
): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.PRODUCT_UNAVAILABLE,
    reason || 'Product is currently unavailable',
    { productId, reason }
  );
};

export const createProductOutOfStockError = (productId: string): ShoppingError => {
  return new ShoppingError(SHOPPING_ERROR_CODES.PRODUCT_OUT_OF_STOCK, 'Product is out of stock', {
    productId
  });
};

/**
 * Purchase-related error creators
 */
export const createPurchaseError = (
  code: string,
  message?: string,
  details?: Record<string, unknown>
): ShoppingError => {
  return new ShoppingError(code, message, details);
};

export const createInsufficientBalanceError = (
  required: Decimal,
  available: Decimal
): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.INSUFFICIENT_BALANCE,
    `Insufficient balance. Required: ${required.toString()}, Available: ${available.toString()}`,
    { required: required.toString(), available: available.toString() }
  );
};

export const createInvalidWalletError = (walletId: string): ShoppingError => {
  return new ShoppingError(SHOPPING_ERROR_CODES.INVALID_WALLET, 'Invalid or inaccessible wallet', {
    walletId
  });
};

export const createPurchaseLimitExceededError = (
  limit: number,
  attempted: number
): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.PURCHASE_LIMIT_EXCEEDED,
    `Purchase limit exceeded. Limit: ${limit}, Attempted: ${attempted}`,
    { limit, attempted }
  );
};

export const createPaymentFailedError = (reason?: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.PAYMENT_FAILED,
    reason || 'Payment processing failed',
    { reason }
  );
};

export const createPurchaseFailedError = (purchaseId: string, reason: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.PURCHASE_FAILED,
    `Purchase ${purchaseId} failed: ${reason}`,
    { purchaseId, reason }
  );
};

/**
 * Provider-related error creators
 */
export const createProviderError = (
  code: string,
  message?: string,
  details?: Record<string, unknown>
): ShoppingError => {
  return new ShoppingError(code, message, details);
};

export const createProviderUnavailableError = (providerId: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.PROVIDER_UNAVAILABLE,
    'Product provider is currently unavailable',
    { providerId }
  );
};

export const createDeliveryFailedError = (reason?: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.DELIVERY_FAILED,
    reason || 'Product delivery failed',
    { reason }
  );
};

export const createInvalidRedemptionCodeError = (code: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.INVALID_REDEMPTION_CODE,
    'Invalid or expired redemption code',
    { code }
  );
};

/**
 * Compliance-related error creators
 */
export const createComplianceError = (
  code: string,
  message?: string,
  details?: Record<string, unknown>
): ShoppingError => {
  return new ShoppingError(code, message, details);
};

export const createAgeVerificationRequiredError = (productCategory: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.AGE_VERIFICATION_REQUIRED,
    `Age verification required for ${productCategory} products`,
    { productCategory }
  );
};

export const createJurisdictionRestrictedError = (
  country: string,
  productId: string
): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.JURISDICTION_RESTRICTED,
    `Product not available in ${country}`,
    { country, productId }
  );
};

export const createSpendingLimitExceededError = (
  limitType: string,
  limit: number
): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.SPENDING_LIMIT_EXCEEDED,
    `${limitType} spending limit of ${limit} exceeded`,
    { limitType, limit }
  );
};

export const createSanctionsCheckFailedError = (userId: string, reason: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.SANCTIONS_CHECK_FAILED,
    'Transaction blocked by compliance screening',
    { userId, reason }
  );
};

/**
 * Validation-related error creators
 */
export const createValidationError = (
  code: string,
  message?: string,
  details?: Record<string, unknown>
): ShoppingError => {
  return new ShoppingError(code, message, details);
};

export const createInvalidEmailError = (email: string): ShoppingError => {
  return new ShoppingError(SHOPPING_ERROR_CODES.INVALID_EMAIL, 'Invalid email address format', {
    email
  });
};

export const createInvalidCountryCodeError = (countryCode: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.INVALID_COUNTRY_CODE,
    'Invalid country code format',
    { countryCode }
  );
};

export const createInvalidCurrencyError = (currency: string): ShoppingError => {
  return new ShoppingError(SHOPPING_ERROR_CODES.INVALID_CURRENCY, 'Unsupported currency', {
    currency
  });
};

export const createInvalidSearchParamsError = (params: Record<string, unknown>): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.INVALID_SEARCH_PARAMS,
    'Invalid search parameters',
    { params }
  );
};

/**
 * System-related error creators
 */
export const createSystemError = (
  code: string,
  message?: string,
  details?: Record<string, unknown>
): ShoppingError => {
  return new ShoppingError(code, message, details);
};

export const createCatalogSyncFailedError = (providerId: string, reason: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.CATALOG_SYNC_FAILED,
    `Product catalog synchronization failed for provider ${providerId}`,
    { providerId, reason }
  );
};

export const createInventoryUpdateFailedError = (
  productId: string,
  reason: string
): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.INVENTORY_UPDATE_FAILED,
    `Inventory update failed for product ${productId}`,
    { productId, reason }
  );
};

export const createAnalyticsError = (operation: string, reason: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.ANALYTICS_ERROR,
    `Analytics operation '${operation}' failed`,
    { operation, reason }
  );
};

export const createRecommendationError = (userId: string, reason: string): ShoppingError => {
  return new ShoppingError(
    SHOPPING_ERROR_CODES.RECOMMENDATION_ERROR,
    `Recommendation generation failed for user ${userId}`,
    { userId, reason }
  );
};

/**
 * Error assertion utility
 */
export const assert = (condition: boolean, error: ShoppingError): void => {
  if (!condition) {
    throw error;
  }
};

/**
 * Error handler utility for async operations
 */
export const handleShoppingError = <T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | null> => {
  return operation().catch(error => {
    if (error instanceof ShoppingError) {
      logger.error('Shopping operation failed:', error.toJSON());
    } else {
      logger.error('Unexpected error in shopping operation:', error);
    }
    return fallback || null;
  });
};

/**
 * Error aggregation utility for batch operations
 */
export class ShoppingErrorAggregator {
  private errors: ShoppingError[] = [];

  add(error: ShoppingError): void {
    this.errors.push(error);
  }

  addIf(condition: boolean, error: ShoppingError): void {
    if (condition) {
      this.add(error);
    }
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): ShoppingError[] {
    return [...this.errors];
  }

  getErrorCodes(): string[] {
    return this.errors.map(error => error.code);
  }

  getFirstError(): ShoppingError | null {
    return this.errors[0] || null;
  }

  clear(): void {
    this.errors = [];
  }

  throwIfErrors(): void {
    if (this.hasErrors()) {
      const firstError = this.getFirstError();
      if (firstError) {
        throw new ShoppingError(
          firstError.code,
          `Multiple errors occurred: ${this.errors.map(e => e.message).join('; ')}`,
          { errors: this.errors.map(e => e.toJSON()) }
        );
      }
    }
  }
}

/**
 * Error recovery utility
 */
export class ShoppingErrorRecovery {
  private maxRetries: number;
  private retryDelay: number;

  constructor(maxRetries = 3, retryDelay = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry?: (error: ShoppingError) => boolean
  ): Promise<T> {
    let lastError: ShoppingError | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (error instanceof ShoppingError) {
          lastError = error;

          // Check if we should retry
          const canRetry = shouldRetry ? shouldRetry(error) : error.isRetryable();

          if (attempt < this.maxRetries && canRetry) {
            await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error logging utility
 */
export class ShoppingErrorLogger {
  private static instance: ShoppingErrorLogger;
  private logs: Array<{ error: ShoppingError; context?: Record<string, unknown> }> = [];

  static getInstance(): ShoppingErrorLogger {
    if (!ShoppingErrorLogger.instance) {
      ShoppingErrorLogger.instance = new ShoppingErrorLogger();
    }
    return ShoppingErrorLogger.instance;
  }

  log(error: ShoppingError, context?: Record<string, unknown>): void {
    this.logs.push({ error, context });

    // In production, this would send to logging service
    logger.error('Shopping Error:', {
      ...error.toJSON(),
      context
    });
  }

  getLogs(): Array<{ error: ShoppingError; context?: Record<string, unknown> }> {
    return [...this.logs];
  }

  getErrorsByCode(code: string): ShoppingError[] {
    return this.logs.filter(log => log.error.code === code).map(log => log.error);
  }

  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.logs.forEach(log => {
      stats[log.error.code] = (stats[log.error.code] || 0) + 1;
    });
    return stats;
  }

  clear(): void {
    this.logs = [];
  }
}
