# Transaction Status Standards

## Overview

This document defines the standardized approach for transaction status values across the Goji platform. **All transaction status values MUST use UPPERCASE format** to ensure type safety and consistency across the codebase.

## Standard Status Values

### Transaction Status Enum
All transaction status values must use the following UPPERCASE format:

```typescript
export type TransactionStatus =
  | 'PENDING'
  | 'BROADCASTING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
```

### Core Status Values

| Status | Description | Use Case |
|--------|-------------|----------|
| `PENDING` | Transaction initiated but not yet processed | Initial state for all transactions |
| `BROADCASTING` | Transaction being broadcast to blockchain network | Blockchain transactions only |
| `CONFIRMED` | Transaction confirmed on blockchain | Blockchain transactions that have been processed |
| `COMPLETED` | Transaction successfully processed and finalized | Final success state |
| `FAILED` | Transaction failed due to insufficient funds, validation, or network issues | Error state |
| `CANCELLED` | Transaction cancelled by user or system | User-initiated or timeout cancellation |
| `EXPIRED` | Transaction expired due to timeout | Time-based cancellation |

### Transaction Type Enum
All transaction type values must also use UPPERCASE format:

```typescript
export type TransactionType =
  | 'SEND'
  | 'RECEIVE'
  | 'TOPUP'
  | 'BANK_TRANSFER'
  | 'MOBILE_MONEY_TRANSFER'
  | 'FEE'
  | 'REFUND'
  | 'REWARD'
  | 'SHOPPING'
  | 'REQUEST_FULFILLMENT'
  | 'DEPOSIT'
```

## Implementation Guidelines

### 1. Type Definitions

**✅ Correct - Use UPPERCASE:**
```typescript
interface Transaction {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  type: 'SEND' | 'RECEIVE' | 'TOPUP' | 'BANK_TRANSFER';
}
```

**❌ Incorrect - Do NOT use lowercase:**
```typescript
interface Transaction {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';  // ❌ Wrong
  type: 'send' | 'receive' | 'topup' | 'bank_transfer';      // ❌ Wrong
}
```

### 2. Mock Data and Test Fixtures

**✅ Correct:**
```typescript
export const MOCK_TRANSACTION = {
  id: 'tx-1',
  status: 'COMPLETED',  // ✅ Uppercase
  type: 'SEND',         // ✅ Uppercase
  amount: 100.00
}
```

**❌ Incorrect:**
```typescript
export const MOCK_TRANSACTION = {
  id: 'tx-1',
  status: 'completed',  // ❌ Lowercase
  type: 'send',         // ❌ Lowercase  
  amount: 100.00
}
```

### 3. Status Comparisons in Components

**✅ Correct:**
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':  // ✅ Uppercase
      return theme.colors.success;
    case 'PENDING':    // ✅ Uppercase
      return theme.colors.warning;
    case 'FAILED':     // ✅ Uppercase
      return theme.colors.error;
    default:
      return theme.colors.subtext;
  }
};
```

**❌ Incorrect:**
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':  // ❌ Lowercase
      return theme.colors.success;
    case 'pending':    // ❌ Lowercase
      return theme.colors.warning;
    case 'failed':     // ❌ Lowercase
      return theme.colors.error;
    default:
      return theme.colors.subtext;
  }
};
```

## Database Storage

### Schema Considerations
While databases typically store status values as strings, the application layer must always use UPPERCASE values:

```sql
-- Database schema
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  status VARCHAR(20) NOT NULL,  -- Will store 'PENDING', 'COMPLETED', etc.
  type VARCHAR(30) NOT NULL     -- Will store 'SEND', 'RECEIVE', etc.
);
```

```typescript
// Application layer - always uppercase
const transaction: Transaction = {
  id: '123',
  status: 'PENDING',  // ✅ Always uppercase
  type: 'SEND'        // ✅ Always uppercase
};
```

## Migration Strategy

### Existing Code Migration
When updating existing code from lowercase to uppercase status values:

1. **Update Type Definitions First:**
   - Update all `Transaction` interfaces
   - Update enum definitions
   - Update mock data types

2. **Update Mock Data:**
   - Update all mock transaction data
   - Update test fixtures
   - Update seed data

3. **Update Components:**
   - Update status comparisons in components
   - Update switch statements
   - Update conditional rendering logic

4. **Update Tests:**
   - Update test assertions
   - Update mock expectations
   - Update fixture data

## Validation and Enforcement

### TypeScript Configuration
Ensure strict type checking is enabled in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Linting Rules
Consider adding custom ESLint rules to enforce uppercase status values:

```javascript
// Custom ESLint rule (example)
"rules": {
  "goji/uppercase-transaction-status": "error"
}
```

### Runtime Validation
For additional safety, consider runtime validation:

```typescript
const VALID_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'] as const;

function validateTransactionStatus(status: string): status is TransactionStatus {
  return VALID_STATUSES.includes(status as TransactionStatus);
}
```

## Benefits of This Standard

### 1. Type Safety
- Prevents runtime errors from case mismatches
- Enables better TypeScript inference
- Reduces bugs from inconsistent status handling

### 2. Code Consistency
- Uniform approach across all modules
- Easier code reviews and maintenance
- Clear visual distinction from other string values

### 3. API Consistency
- Consistent status values in API responses
- Predictable data formats for frontend consumption
- Easier integration with external systems

### 4. Developer Experience
- Better autocomplete and IDE support
- Clearer intent in code
- Reduced cognitive load when working with status values

## Common Pitfalls to Avoid

### 1. Mixed Case Usage
```typescript
// ❌ Don't mix uppercase and lowercase
if (status === 'PENDING' || status === 'completed') {
  // Inconsistent casing
}

// ✅ Use consistent uppercase
if (status === 'PENDING' || status === 'COMPLETED') {
  // Consistent casing
}
```

### 2. String Literal Confusion
```typescript
// ❌ Easy to make typos with lowercase
const status = 'compelted';  // Typo not caught by TypeScript

// ✅ Uppercase makes typos more obvious
const status = 'COMPELTED';  // Typo is more obvious
```

### 3. Database vs Application Layer
```typescript
// ❌ Don't assume database values match application values
const dbStatus = 'completed';  // From database
if (transaction.status === dbStatus) {  // Type mismatch
  // This comparison will fail
}

// ✅ Convert to application format
const dbStatus = 'completed';  // From database
const appStatus = dbStatus.toUpperCase() as TransactionStatus;
if (transaction.status === appStatus) {
  // Correct comparison
}
```

## Implementation Checklist

- [ ] All Transaction interfaces use UPPERCASE status values
- [ ] All mock data uses UPPERCASE status values
- [ ] All test fixtures use UPPERCASE status values
- [ ] All component status comparisons use UPPERCASE values
- [ ] All database interaction layers handle case conversion
- [ ] All API endpoints return UPPERCASE status values
- [ ] All WebSocket events use UPPERCASE status values
- [ ] Documentation reflects UPPERCASE standard
- [ ] Team training completed on new standard

## Conclusion

The UPPERCASE transaction status standard ensures type safety, code consistency, and better developer experience across the Goji platform. All new code MUST follow this standard, and existing code should be migrated during regular maintenance cycles.

**Remember: When in doubt, always use UPPERCASE for transaction status and type values.**