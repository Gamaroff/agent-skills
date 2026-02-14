---
name: transaction-schema-validator
description: Ensure transaction code follows documented patterns with uppercase enum values, schema normalization, and Decimal.js for amounts. Use when creating transaction types, validating transaction states, implementing transaction processing, or reviewing transaction-related code. Enforces PENDING not pending, valid TransactionStatus values, and proper transaction schemas.
---

# Transaction Schema Validator

Validate transaction code follows documented standards including uppercase enums, Decimal.js usage, and proper status values.

## When to Use This Skill

Activate this skill when:

1. **Creating transaction types** - Define new transaction schemas
2. **Validating transaction states** - Check status enum values
3. **Implementing transaction processing** - Ensure proper patterns
4. **Reviewing transaction code** - Validate against standards
5. **Migrating transaction data** - Normalize existing data
6. **Auditing transaction schemas** - Check for violations

## Transaction Status Standards

### Uppercase Enum Values (CRITICAL)

**Rule**: ALL transaction status values MUST be UPPERCASE.

\`\`\`typescript
// ✅ CORRECT
enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

const tx = {
  status: 'PENDING'  // ✅ UPPERCASE
};

// ❌ INCORRECT
enum TransactionStatus {
  Pending = 'pending',    // ❌ Lowercase value
  Completed = 'completed', // ❌ Lowercase value
  Failed = 'failed'       // ❌ Lowercase value
}

const tx = {
  status: 'pending'  // ❌ NEVER lowercase
};
\`\`\`

### Valid Transaction Statuses

\`\`\`typescript
type TransactionStatus = 
  | 'PENDING'      // Transaction created, not broadcast
  | 'BROADCAST'    // Sent to blockchain network
  | 'CONFIRMED'    // Included in block
  | 'COMPLETED'    // Fully confirmed
  | 'FAILED'       // Transaction failed
  | 'CANCELLED';   // User cancelled before broadcast
\`\`\`

## Decimal.js for Monetary Amounts

### Required Pattern

\`\`\`typescript
import Decimal from 'decimal.js';

interface Transaction {
  amount: Decimal;      // ✅ CORRECT
  fee: Decimal;         // ✅ CORRECT
  total: Decimal;       // ✅ CORRECT
  status: TransactionStatus;
}

// ❌ INCORRECT
interface Transaction {
  amount: number;       // ❌ Precision errors
  fee: number;          // ❌ Precision errors
  total: number;        // ❌ Precision errors
}
\`\`\`

## Transaction Schema Normalization

### Standard Transaction Schema

\`\`\`typescript
interface Transaction {
  id: string;
  from: string;           // Wallet ID or address
  to: string;             // Recipient wallet ID or address
  amount: Decimal;        // Transaction amount
  fee: Decimal;           // Network fee
  currency: 'BSV' | 'MNEE_USD';
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
  broadcastAt?: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}
\`\`\`

## Validation Checklist

### Enum Values
- [ ] All status values UPPERCASE
- [ ] Only valid TransactionStatus values used
- [ ] No lowercase 'pending', 'completed', etc.
- [ ] Enum definition uses uppercase values

### Monetary Fields
- [ ] All amounts use Decimal type
- [ ] All fees use Decimal type
- [ ] All calculations use Decimal methods
- [ ] No JavaScript number for money

### Schema Structure
- [ ] Required fields present (id, from, to, amount, status)
- [ ] Currency field validates against allowed values
- [ ] Timestamps use Date type
- [ ] Optional fields marked with ?

## Common Violations

### Violation 1: Lowercase Status Values

\`\`\`typescript
// ❌ WRONG
const transaction = await createTransaction({
  status: 'pending'  // VIOLATION
});

// ✅ CORRECT
const transaction = await createTransaction({
  status: 'PENDING'
});
\`\`\`

### Violation 2: Number for Amounts

\`\`\`typescript
// ❌ WRONG
const transaction = {
  amount: 100.50,  // VIOLATION - precision errors
  fee: 0.0001
};

// ✅ CORRECT
const transaction = {
  amount: new Decimal('100.50'),
  fee: new Decimal('0.0001')
};
\`\`\`

### Violation 3: Invalid Status

\`\`\`typescript
// ❌ WRONG
const tx = {
  status: 'processing'  // VIOLATION - not a valid status
};

// ✅ CORRECT
const tx = {
  status: 'PENDING'  // Valid TransactionStatus
};
\`\`\`

## Resources

### Reference Documentation

- **transaction-status-standards.md** - Complete transaction status definitions and state transitions

---

**Skill Version**: 1.0.0
**Last Updated**: 2025-12-31
