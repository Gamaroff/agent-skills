# Handle Format Specification

## Overview

This document defines the authoritative specification for handle formatting across the Goji platform. Handles are unique user identifiers that form the local part of a user's **Paymail address**.

## What is Paymail?

Paymail is a BSV (Bitcoin SV) protocol that enables email-like payment addresses for cross-platform Bitcoin transactions. Instead of sharing complex cryptographic addresses, users can send and receive Bitcoin using human-readable addresses like:

```
john@gojiwallet.com
```

### Paymail Address Structure

```
{handle}@{domain}
   │         │
   │         └── Domain: gojiwallet.com (managed by Goji)
   │
   └── Handle: User-chosen identifier (this specification)
```

### Benefits of Paymail

- **Human-readable**: Easy to share and remember
- **Cross-platform**: Works across any Paymail-compatible wallet
- **Dynamic addressing**: Generates fresh addresses for each transaction
- **Identity verification**: Enables sender/receiver verification

## Core Rule

**Handles MUST NOT include the "@" symbol in data storage, transmission, or backend processing.**

The "@" symbol is part of the Paymail address format (`handle@domain`) and is added by the UI layer when displaying the full Paymail address.

## Handle Format

### Storage and Transmission Format

```
Format: [a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]
Length: 3-50 characters
Case: Lowercase (normalized during storage)
Prefix: NO "@" symbol
```

### Valid Examples

- `john_nairobi`
- `alice.kampala`
- `user-name`
- `bob123`
- `alice_99`

### Invalid Examples

- `@john_nairobi` ❌ (contains @ prefix)
- `.john` ❌ (starts with special character)
- `john.` ❌ (ends with special character)
- `j` ❌ (too short)
- `john@email.com` ❌ (contains @ in middle)

## UI Display Format

### Paymail Address Display

When displaying the full Paymail address to users, combine the handle with the domain:

```typescript
// Backend returns handle without @
const handle = 'john_nairobi';
const domain = 'gojiwallet.com';

// UI displays full Paymail address
const paymailAddress = `${handle}@${domain}`; // displays as "john_nairobi@gojiwallet.com"
```

### Handle-Only Display

When displaying just the handle (e.g., in user profiles or mentions), the "@" prefix MAY be added for visual distinction:

```typescript
const displayHandle = `@${handle}`; // displays as "@john_nairobi"
```

### Onboarding UI

During handle creation, the UI should clearly show the relationship between the handle and the full Paymail address:

```
┌─────────────────────────────────────┐
│  [john_nairobi]@gojiwallet.com   │
│       ↑ user input    ↑ fixed      │
└─────────────────────────────────────┘
```

## Implementation Guidelines

### API Endpoints

All API endpoints that accept or return handles must use the format WITHOUT "@":

```json
{
  "handle": "john_nairobi"
}
```

### Request/Response Examples

#### Registration Request

```json
{
  "email": "user@example.com",
  "handle": "john_nairobi",
  "password": "SecurePass123!"
}
```

#### User Response

```json
{
  "id": "user_uuid",
  "handle": "john_nairobi",
  "email": "user@example.com"
}
```

#### Payment Request

```json
{
  "recipientHandle": "mary_kampala",
  "amount": "25.00",
  "currency": "MNEE_USD"
}
```

### Validation Rules

#### Backend Validation (NestJS DTOs)

```typescript
@IsString()
@MinLength(3)
@MaxLength(50)
@Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/, {
  message: 'Handle must contain only alphanumeric characters, dots, underscores, and hyphens'
})
@Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
handle!: string;
```

#### Custom Validator

```typescript
@ValidatorConstraint({ name: 'handleFormat', async: false })
export class HandleFormatValidator implements ValidatorConstraintInterface {
  validate(handle: string): boolean {
    // Must NOT start with @
    if (handle.startsWith('@')) return false;

    // Check length
    if (handle.length < 3 || handle.length > 50) return false;

    // Must start and end with alphanumeric
    if (!/^[a-zA-Z0-9]/.test(handle) || !/[a-zA-Z0-9]$/.test(handle))
      return false;

    // Can contain dots, underscores, hyphens in middle
    return /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(handle);
  }

  defaultMessage(): string {
    return 'Handle must be 3-50 characters with only letters, numbers, dots, underscores, and hyphens. Do not include @ prefix.';
  }
}
```

#### Frontend Validation (React Native)

```typescript
const handleSchema = yup
  .string()
  .required('Handle is required')
  .min(3, 'Handle must be at least 3 characters')
  .max(50, 'Handle cannot exceed 50 characters')
  .matches(
    /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/,
    'Handle must contain only letters, numbers, dots, underscores, and hyphens'
  )
  .test('no-at-prefix', 'Handle should not include @ prefix', value => {
    return !value?.startsWith('@');
  });
```

## Database Storage

Handles are stored in the database WITHOUT the "@" prefix:

```sql
-- Correct
INSERT INTO users (id, handle) VALUES ('user_123', 'john_nairobi');

-- Incorrect
INSERT INTO users (id, handle) VALUES ('user_123', '@john_nairobi');
```

## JWT Token Format

JWT tokens include handles without the "@" prefix:

```typescript
interface MobileJWT {
  sub: string; // User ID
  handle: string; // e.g., 'john_nairobi' (NOT '@john_nairobi')
  role: 'mobile_user';
  kycLevel: 'tier1' | 'tier2' | 'tier3';
  iat: number;
  exp: number;
}
```

## Data Migration

When migrating existing data or fixing handles that incorrectly include "@":

1. **Identify**: Find all handles that start with "@"
2. **Strip**: Remove the "@" prefix
3. **Normalize**: Convert to lowercase
4. **Validate**: Ensure they match the format specification
5. **Test**: Verify UI still displays correctly with "@" added

Example migration:

```typescript
// Before: '@john_nairobi'
// After: 'john_nairobi'
const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
```

## Related Documentation

- **Paymail Protocol**: See [BSV Paymail Specification](https://bsvalias.org/) for protocol details
- **API Design**: See [API Design Document](./api-design.md) for endpoint specifications
- **Validation Patterns**: See [Validation Patterns](./api-reference/validation-patterns.md) for detailed validation rules
- **Type Quick Reference**: See [Type Quick Reference](./api-reference/type-quick-reference.md) for type definitions
- **Usage Examples**: See [Usage Examples](./api-reference/usage-examples.md) for practical examples

## Enforcement

This specification is enforced through:

1. **Backend Validation**: NestJS ValidationPipe with custom validators
2. **Frontend Validation**: React Native form validation with Yup/React Hook Form
3. **Database Constraints**: Unique constraints on handle field
4. **API Documentation**: Clear examples in OpenAPI/Swagger documentation
5. **Code Review**: PR reviews check for "@" prefix violations
6. **Automated Tests**: Unit and integration tests verify format compliance

## Changelog

### Version 1.1 (2025-11-28)

- Added Paymail protocol context and explanation
- Clarified handle's role as local part of Paymail address
- Updated UI display guidelines for Paymail address format
- Added onboarding UI guidance

### Version 1.0 (2025-10-29)

- Initial specification
- Clarified that "@" is UI-only
- Updated all documentation and examples
- Added validation rules and examples
