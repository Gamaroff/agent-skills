# Validation Patterns

This document outlines common validation patterns, rules, and error handling strategies used throughout the Goji platform's DTOs and types.

## Validation Framework

The Goji platform uses a **4-layer validation approach**:

1. **Type-level validation** (compile time) - TypeScript strict mode
2. **Decorator validation** (runtime) - class-validator 
3. **Business logic validation** (application layer) - Domain rules
4. **Security validation** (cross-cutting) - CSRF, rate limiting, authorization

## Common Validation Decorators

### String Validation
```typescript
// Basic string validation
@IsString()
@IsNotEmpty()
@MinLength(3)
@MaxLength(50)
@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
field!: string;

// Pattern validation (handle WITHOUT @ prefix)
@Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/, {
  message: 'Handle must contain only alphanumeric characters, dots, underscores, and hyphens, and start/end with alphanumeric'
})
handle!: string;

// Email validation
@IsEmail({}, { message: 'Please provide a valid email address' })
email!: string;

// Phone number validation (international format)
@Matches(/^\+[1-9]\d{1,14}$/, {
  message: 'Phone number must be in international format (+country code + number)'
})
phoneNumber!: string;
```

### Numeric Validation
```typescript
// Positive numbers (financial amounts)
@IsNumber({ maxDecimalPlaces: 8 }, { message: 'Amount must be a valid number with max 8 decimal places' })
@Min(0.01, { message: 'Amount must be greater than 0.01' })
@Max(1000000, { message: 'Amount cannot exceed 1,000,000' })
amount!: number;

// Integer validation
@IsInt({ message: 'Value must be an integer' })
@Min(1)
@Max(100)
quantity!: number;

// Percentage validation
@IsNumber()
@Min(0, { message: 'Percentage cannot be negative' })
@Max(100, { message: 'Percentage cannot exceed 100%' })
percentage!: number;
```

### Enum Validation
```typescript
// Single enum validation
@IsEnum(ContactType, { 
  message: 'Contact type must be one of: goji, bank, mobile_money, paymail, mnee_usd, chat_group' 
})
type!: ContactType;

// Array of enum values
@IsEnum(PaymentStatus, { each: true })
@IsArray()
@ArrayMinSize(1)
statuses!: PaymentStatus[];
```

### Date Validation
```typescript
// ISO date string validation
@IsISO8601({}, { message: 'Date must be in ISO 8601 format' })
@Transform(({ value }) => typeof value === 'string' ? new Date(value).toISOString() : value)
dueDate!: string;

// Future date validation
@IsDateString()
@Validate(IsFutureDate, { message: 'Date must be in the future' })
scheduledAt!: string;

// Date range validation
@IsOptional()
@IsDateString()
@Validate(IsAfterStartDate, ['startDate'], { message: 'End date must be after start date' })
endDate?: string;
```

### Object and Array Validation
```typescript
// Nested object validation
@IsObject()
@ValidateNested()
@Type(() => ContactDetailsDto)
details!: ContactDetailsDto;

// Array validation with nested objects
@IsArray()
@ArrayMinSize(1)
@ArrayMaxSize(10)
@ValidateNested({ each: true })
@Type(() => ParticipantDto)
participants!: ParticipantDto[];

// Optional object with default
@IsOptional()
@IsObject()
@ValidateNested()
@Type(() => MetadataDto)
metadata?: MetadataDto = {};
```

## Domain-Specific Validation Patterns

### Financial Validation
```typescript
// Currency code validation (ISO 4217)
@IsString()
@Length(3, 3)
@Matches(/^[A-Z]{3}$/, { message: 'Currency must be ISO 4217 format (e.g., USD, EUR, BSV)' })
@Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
currency!: string;

// Wallet address validation  
@IsString()
@MinLength(26)
@MaxLength(62)
@Matches(/^[13][a-km-zA-HJ-NP-Z1-9]{25,61}$/, {
  message: 'Invalid wallet address format'
})
@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
walletAddress!: string;

// Account number validation (banking)
@IsString()
@MinLength(4)
@MaxLength(34) // IBAN can be up to 34 characters
@Matches(/^[0-9A-Z]+$/, {
  message: 'Account number must contain only alphanumeric characters'
})
@Transform(({ value }) => typeof value === 'string' ? value.replace(/\s/g, '').toUpperCase() : value)
accountNumber!: string;

// SWIFT/BIC code validation
@IsString()
@MinLength(8)
@MaxLength(11)
@Matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, {
  message: 'Invalid SWIFT/BIC code format'
})
@Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
bankCode!: string;
```

### Identity Validation
```typescript
// Handle validation (Goji identity - WITHOUT @ prefix)
// Note: Handles are stored without @ prefix. UI adds @ for display purposes only.
@IsString()
@MinLength(3)
@MaxLength(50)
@Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/, {
  message: 'Handle must contain only alphanumeric characters, dots, underscores, and hyphens, and start/end with alphanumeric'
})
@Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
handle!: string;

// Country code validation (ISO 3166-1 alpha-2)
@IsString()
@Length(2, 2)
@Matches(/^[A-Z]{2}$/, { message: 'Country code must be ISO 3166-1 alpha-2 format' })
@Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
country!: string;

// Password validation
@IsString()
@MinLength(8, { message: 'Password must be at least 8 characters long' })
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
  message: 'Password must contain uppercase, lowercase, number, and special character'
})
password!: string;
```

### Enhanced Communication Validation

```typescript
// Chat message content (enhanced)
@IsString()
@IsNotEmpty()
@MaxLength(2000, { message: 'Message cannot exceed 2000 characters' })
@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
content!: string;

// Enhanced message type validation
@IsEnum([
  'text', 'image', 'video', 'audio', 'file', 
  'payment', 'payment_request', 'group_payment',
  'monetized_content', 'product_share', 'gift_code_share',
  'betting_pool', 'system', 'savings_update'
], { 
  message: 'Invalid message type. Must be one of the supported message types.' 
})
messageType!: string;

// Media file validation
@IsString()
@IsNotEmpty()
@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
fileName!: string;

@IsEnum(['image', 'video', 'audio', 'document'], {
  message: 'Media type must be image, video, audio, or document'
})
mediaType!: string;

@IsString()
@Matches(/^[a-zA-Z0-9]+\/[a-zA-Z0-9\-\.]+$/, {
  message: 'Invalid MIME type format'
})
mimeType!: string;

@IsNumber()
@Min(1, { message: 'File size must be greater than 0' })
@Max(104857600, { message: 'File size cannot exceed 100MB' })
fileSize!: number;

// URL validation for media
@IsString()
@IsUrl({}, { message: 'Invalid URL format' })
url!: string;

// Betting validation
@IsString()
@MinLength(5)
@MaxLength(200)
@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
bettingTitle!: string;

@IsEnum(['sports', 'markets', 'politics', 'entertainment', 'local'], {
  message: 'Invalid betting category'
})
bettingCategory!: string;

@IsNumber({ maxDecimalPlaces: 8 })
@Min(0.01, { message: 'Minimum bet must be at least 0.01' })
@Max(10000, { message: 'Maximum bet cannot exceed 10,000' })
betAmount!: number;

// Content monetization validation
@IsEnum(['fixed', 'goal'], {
  message: 'Pricing model must be either fixed or goal-based'
})
pricingModel!: string;

@ValidateIf(o => o.pricingModel === 'fixed')
@IsNumber({ maxDecimalPlaces: 8 })
@Min(0.01, { message: 'Content price must be at least 0.01' })
contentPrice?: number;

@ValidateIf(o => o.pricingModel === 'goal')
@IsNumber({ maxDecimalPlaces: 8 })
@Min(0.01)
targetAmount?: number;

// Group capability validation
@IsArray()
@IsEnum(['chat', 'payments', 'savings', 'betting', 'bill_splitting', 'content_monetization'], {
  each: true,
  message: 'Invalid capability. Must be one of the supported group capabilities.'
})
capabilities!: string[];

// Member permission validation
@IsArray()
@IsEnum(['chat', 'payments', 'admin', 'betting', 'savings', 'monetization'], {
  each: true,
  message: 'Invalid permission. Must be one of the supported member permissions.'
})
permissions!: string[];

// Role hierarchy validation
@IsEnum(['owner', 'admin', 'moderator', 'member'], {
  message: 'Invalid role. Must be owner, admin, moderator, or member.'
})
role!: string;

// Emoji reaction validation
@IsString()
@Matches(/^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/, {
  message: 'Invalid emoji format'
})
emoji!: string;

// Paymail validation (BSV payments)
@IsString()
@Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
  message: 'Invalid paymail format'
})
@Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
paymail!: string;

// Group title validation
@IsString()
@MinLength(1)
@MaxLength(100)
@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
title!: string;
```

## Advanced Validation Patterns

### Discriminated Union Validation
```typescript
export class CreateContactDto {
  @IsEnum(ContactType)
  type!: ContactType;

  @IsObject()
  @ValidateNested()
  @Type((options) => {
    const type = (options?.object as any)?.type;
    switch (type) {
      case ContactType.GOJI: return GojiContactDetailsDto;
      case ContactType.BANK: return BankContactDetailsDto;
      case ContactType.MOBILE_MONEY: return MobileMoneyContactDetailsDto;
      case ContactType.PAYMAIL: return PaymailContactDetailsDto;
      case ContactType.MNEE_USD: return MNEEUSDContactDetailsDto;
      case ContactType.CHAT_GROUP: return ChatGroupContactDetailsDto;
      default: return BaseContactDetailsDto;
    }
  })
  details!: ContactDetailsUnion;
}
```

### Conditional Validation
```typescript
// Validate field only if another field has specific value
@ValidateIf(o => o.type === 'payment')
@IsNumber()
@Min(0.01)
amount?: number;

// Cross-field validation
@Validate(PasswordMatchesConfirmation, ['passwordConfirmation'])
password!: string;

// Custom validation with context
@Validate(IsValidCurrencyForCountry, ['country'], {
  message: 'Selected currency is not supported in the specified country'
})
currency!: string;
```

### Array Validation Patterns
```typescript
// Participants array with size limits
@IsArray()
@ArrayMinSize(2, { message: 'Group must have at least 2 participants' })
@ArrayMaxSize(50, { message: 'Group cannot have more than 50 participants' })
@IsString({ each: true })
@ArrayUnique({ message: 'Participant IDs must be unique' })
participantIds!: string[];

// Permission arrays with enum validation
@IsOptional()
@IsArray()
@IsEnum(Permission, { each: true })
permissions?: Permission[];
```

## Custom Validator Examples

### Business Logic Validators
```typescript
// Custom validator for handle availability
@ValidatorConstraint({ name: 'handleAvailable', async: true })
export class IsHandleAvailable implements ValidatorConstraintInterface {
  async validate(handle: string, args: ValidationArguments) {
    const userService = container.get(UserService);
    const exists = await userService.handleExists(handle);
    return !exists;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Handle $value is already taken';
  }
}

// Usage in DTO
@Validate(IsHandleAvailable)
handle!: string;
```

### Financial Validators
```typescript
// Sufficient balance validator
@ValidatorConstraint({ name: 'sufficientBalance', async: true })
export class HasSufficientBalance implements ValidatorConstraintInterface {
  async validate(amount: number, args: ValidationArguments) {
    const { walletId, currency } = args.object as any;
    const walletService = container.get(WalletService);
    const balance = await walletService.getBalance(walletId, currency);
    return balance >= amount;
  }

  defaultMessage() {
    return 'Insufficient wallet balance for this transaction';
  }
}
```

## Error Handling Patterns

### Field-Specific Errors
```typescript
// Map validation errors to specific fields
{
  "success": false,
  "error": {
    "code": "VAL_003",
    "message": "Validation failed",
    "field": "handle",
    "details": {
      "constraints": {
        "matches": "Handle must start with @ and contain only alphanumeric characters, dots, underscores, and hyphens",
        "isHandleAvailable": "Handle @john.doe is already taken"
      },
      "value": "john.doe"
    }
  }
}
```

### Nested Validation Errors
```typescript
// Errors in nested objects (e.g., contact details)
{
  "success": false,
  "error": {
    "code": "VAL_002",
    "message": "Validation failed in nested object",
    "field": "details.bankCode",
    "details": {
      "property": "details",
      "constraints": {
        "matches": "Invalid SWIFT/BIC code format"
      },
      "children": [
        {
          "property": "bankCode", 
          "value": "invalid123",
          "constraints": {
            "matches": "Invalid SWIFT/BIC code format"
          }
        }
      ]
    }
  }
}
```

## Security Validation

### Input Sanitization
```typescript
// Automatic string sanitization
@Transform(({ value }) => {
  if (typeof value !== 'string') return value;
  return value
    .trim()                    // Remove whitespace
    .replace(/\s+/g, ' ')     // Normalize multiple spaces
    .slice(0, 1000);          // Prevent extremely long strings
})
userInput!: string;

// Case normalization for identifiers  
@Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
handle!: string;

@Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
currencyCode!: string;
```

### PII Protection
```typescript
// Remove spaces from sensitive data
@Transform(({ value }) => typeof value === 'string' ? value.replace(/\s/g, '').toUpperCase() : value)
accountNumber!: string;

// Normalize phone numbers
@Transform(({ value }) => typeof value === 'string' ? value.replace(/\s/g, '') : value)
phoneNumber!: string;

// Sanitize file names
@Transform(({ value }) => {
  if (typeof value !== 'string') return value;
  return value.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 255);
})
filename!: string;
```

## Financial Validation Patterns

### Amount Validation
```typescript
// Standard monetary amount
@IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must have maximum 2 decimal places' })
@Min(0.01, { message: 'Amount must be at least 0.01' })
@Max(1000000, { message: 'Amount cannot exceed 1,000,000' })
amount!: number;

// Cryptocurrency amount (up to 8 decimal places)
@IsNumber({ maxDecimalPlaces: 8 })
@Min(0.00000001)
@Max(21000000) // Bitcoin supply limit
cryptoAmount!: number;

// Percentage-based amounts
@IsNumber({ maxDecimalPlaces: 4 })
@Min(0)
@Max(100)
feePercentage!: number;
```

### Currency Validation
```typescript
// Supported currencies validation
@IsEnum(['USD', 'BSV', 'MNEE_USD'], {
  message: 'Currency must be one of: USD, BSV, MNEE_USD'
})
currency!: string;

// Dynamic currency validation (business rule)
@Validate(IsSupportedCurrencyForCountry, ['country'])
currency!: string;
```

## Business Rule Validation

### KYC-Based Validation
```typescript
// Amount limits based on KYC tier
@Validate(IsWithinKycLimits, ['userKycTier'], {
  message: 'Transaction amount exceeds limits for your verification level'
})
amount!: number;

// Feature access based on verification
@ValidateIf(o => o.requiresVerification)
@Validate(IsKycVerified, {
  message: 'KYC verification required for this operation'
})
@IsOptional()
verificationConfirmation?: boolean;
```

### Contact Relationship Validation
```typescript
// Prevent self-contact creation
@Validate(IsNotSelfContact, {
  message: 'Cannot create contact for your own handle'
})
handle!: string;

// Trust level progression validation
@Validate(IsValidTrustLevelProgression, ['currentTrustLevel'], {
  message: 'Trust level can only be upgraded, not downgraded'
})
newTrustLevel!: TrustLevel;
```

### Transaction Validation
```typescript
// Payment direction validation
@ValidateIf(o => o.direction === PaymentDirection.OUTBOUND)
@Validate(HasSufficientBalance, ['walletId', 'amount', 'currency'])
direction!: PaymentDirection;

// Transaction fee validation
@IsOptional()
@IsNumber({ maxDecimalPlaces: 8 })
@Min(0)
@Validate(IsReasonableFee, ['amount'], {
  message: 'Fee seems unreasonably high for this transaction amount'
})
networkFee?: number;
```

## Custom Validation Classes

### Handle Validation
```typescript
@ValidatorConstraint({ name: 'handleFormat', async: false })
export class HandleFormatValidator implements ValidatorConstraintInterface {
  validate(handle: string): boolean {
    // Handle should NOT start with @ (@ is added by UI only)
    if (handle.startsWith('@')) return false;
    
    // Check length
    if (handle.length < 3 || handle.length > 50) return false;
    
    // Must start and end with alphanumeric
    if (!/^[a-zA-Z0-9]/.test(handle) || !/[a-zA-Z0-9]$/.test(handle)) return false;
    
    // Can contain dots, underscores, hyphens in middle
    return /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(handle);
  }

  defaultMessage(): string {
    return 'Handle must be 3-50 characters with only letters, numbers, dots, underscores, and hyphens. Do not include @ prefix.';
  }
}
```

### Payment Method Validation
```typescript
@ValidatorConstraint({ name: 'paymentMethodSupported', async: true })
export class IsPaymentMethodSupported implements ValidatorConstraintInterface {
  async validate(paymentMethod: string, args: ValidationArguments): Promise<boolean> {
    const { country, currency } = args.object as any;
    const localizationService = container.get(LocalizationService);
    const supportedMethods = await localizationService.getPaymentMethods(country);
    return supportedMethods.includes(paymentMethod);
  }

  defaultMessage(args: ValidationArguments): string {
    const { country } = args.object as any;
    return `Payment method not supported in ${country}`;
  }
}
```

## Validation Pipe Configuration

### Global Validation Settings
```typescript
// Applied globally in main.ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,           // Enable automatic transformation
  whitelist: true,          // Strip unknown properties  
  forbidNonWhitelisted: true, // Throw error on unknown properties
  validateCustomDecorators: true, // Enable custom validators
  dismissDefaultMessages: false, // Keep default error messages
  stopAtFirstError: false,   // Collect all validation errors
  errorHttpStatusCode: 422,  // Use 422 for validation errors
  exceptionFactory: (errors: ValidationError[]) => {
    // Custom error format for consistent API responses
    return new ValidationException(errors);
  }
}));
```

### Controller-Specific Validation
```typescript
// Override validation pipe for specific endpoints
@Post('upload')
@UsePipes(new ValidationPipe({
  fileIsRequired: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
}))
async uploadFile(@Body() uploadDto: FileUploadDto) {
  // Implementation
}
```

## Error Message Patterns

### User-Friendly Messages
```typescript
// Clear, actionable error messages
const ERROR_MESSAGES = {
  HANDLE_TAKEN: 'This handle is already taken. Please choose a different one.',
  INVALID_AMOUNT: 'Please enter a valid amount between 0.01 and 1,000,000.',
  INSUFFICIENT_BALANCE: 'You don\'t have enough balance for this transaction.',
  KYC_REQUIRED: 'Please complete identity verification to access this feature.',
  INVALID_RECIPIENT: 'The recipient you specified could not be found.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment before trying again.'
};
```

### Internationalized Messages
```typescript
// Support for multiple languages
const getErrorMessage = (code: string, locale: string = 'en'): string => {
  const messages = {
    en: { HANDLE_TAKEN: 'This handle is already taken.' },
    es: { HANDLE_TAKEN: 'Este identificador ya está en uso.' },
    fr: { HANDLE_TAKEN: 'Ce nom d\'utilisateur est déjà pris.' }
  };
  return messages[locale]?.[code] || messages.en[code];
};
```

## Testing Validation

### Unit Tests for Validators
```typescript
describe('HandleFormatValidator', () => {
  let validator: HandleFormatValidator;

  beforeEach(() => {
    validator = new HandleFormatValidator();
  });

  it('should accept valid handles', () => {
    expect(validator.validate('john.doe')).toBe(true);
    expect(validator.validate('alice_99')).toBe(true);
    expect(validator.validate('user-name')).toBe(true);
  });

  it('should reject invalid handles', () => {
    expect(validator.validate('@john.doe')).toBe(false);    // Should NOT have @
    expect(validator.validate('.')).toBe(false);             // Too short
    expect(validator.validate('-invalid')).toBe(false);     // Starts with hyphen
    expect(validator.validate('invalid-')).toBe(false);     // Ends with hyphen
  });
});
```

### Integration Tests for DTOs
```typescript
describe('CreateContactDto Validation', () => {
  it('should validate Goji contact creation', async () => {
    const dto = plainToClass(CreateContactDto, {
      name: 'John Doe',
      type: ContactType.GOJI,
      details: { handle: '@john.doe', publicKey: 'pub_123' }
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject handles with @ prefix', async () => {
    const dto = plainToClass(CreateContactDto, {
      name: 'John Doe',
      type: ContactType.GOJI,
      details: { handle: '@john.doe', publicKey: 'pub_123' } // Invalid: should not have @
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid bank contact', async () => {
    const dto = plainToClass(CreateContactDto, {
      name: 'John Doe',
      type: ContactType.BANK,
      details: { bankName: '', accountNumber: '123' } // Invalid: missing required fields
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toContain('bankCode');
  });
});
```

## Cross-References

- **DTO Definitions**: See [DTO Catalog](./dto-catalog.md) for all DTOs using these patterns
- **Type Definitions**: See [Type Quick Reference](./type-quick-reference.md) for underlying types
- **API Contracts**: See [Endpoint-DTO Mapping](./endpoint-dto-mapping.md) for endpoint validation requirements
- **Implementation Examples**: See [Usage Examples](./usage-examples.md) for practical validation usage
- **Type Safety Best Practices**: See [`libs/shared-types/docs/TYPE-SAFETY-BEST-PRACTICES.md`](../../../libs/shared-types/docs/TYPE-SAFETY-BEST-PRACTICES.md)

## Maintenance Guidelines

When updating validation patterns:
1. **Maintain backward compatibility** where possible
2. **Update error messages** to be user-friendly and actionable  
3. **Add tests** for new validation rules
4. **Document breaking changes** in migration guides
5. **Consider internationalization** for error messages
6. **Review security implications** of validation changes