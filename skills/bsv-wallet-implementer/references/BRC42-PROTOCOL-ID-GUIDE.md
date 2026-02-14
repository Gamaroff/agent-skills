# BRC-42 Protocol ID Developer Guide

**For Coding Agents: Wallet Creation Implementation Reference**

---

## Table of Contents

1. [Overview & Background](#1-overview--background)
   - 1.5 [Multi-Wallet Architecture](#15-multi-wallet-architecture)
   - 1.6 [Payment Type Support](#16-payment-type-support)
2. [Implementation Architecture](#2-implementation-architecture)
3. [SDK Validation Constraint](#3-sdk-validation-constraint)
4. [File Locations & References](#4-file-locations--references)
5. [How to Use in Wallet Creation](#5-how-to-use-in-wallet-creation)
6. [KeyID Pattern Guidelines](#6-keyid-pattern-guidelines)
7. [Security Level](#7-security-level)
8. [Complete Working Example](#8-complete-working-example)
9. [Common Patterns](#9-common-patterns-for-coding-agent)
10. [Critical Don'ts](#10-critical-donts-for-coding-agent)
11. [Testing References](#11-testing-references)
12. [Documentation References](#12-documentation-references)
13. [Quick Reference Card](#13-quick-reference-card)

---

## 1. Overview & Background

### What is BRC-42?

**BRC-42** is the BSV Key Derivation Scheme - a standardized protocol for deriving cryptographic keys from a master seed in a deterministic and secure manner.

**Key Characteristics:**
- **Deterministic**: Same seed + same protocol + same keyID = same key (always)
- **Hierarchical**: Derive unlimited keys from single seed
- **Secure**: Uses HMAC-SHA256 with multiple security levels
- **Recoverable**: Wallet restoration from mnemonic phrase

### What is a Protocol ID?

A **Protocol ID** is a cryptographic identifier that determines the derivation path for keys. It consists of two components:

```typescript
type ProtocolID = [SecurityLevel, ProtocolName];
// Example: [2, 'com gojiwallet app']
```

**Components:**
1. **Security Level** (number): 0 (PUBLIC), 1 (LOW), 2 (STANDARD), 3 (HIGH)
2. **Protocol Name** (string): Unique identifier for the application/purpose

**Critical Property: IMMUTABILITY**

⚠️ **WARNING**: Once a Protocol ID is used in production, it is **PERMANENTLY FIXED**.

- The Protocol ID is a cryptographic input to HMAC-SHA256
- Changing even one character generates completely different keys
- Different keys = wallet shows zero balance (funds become inaccessible)
- Breaks wallet recovery from mnemonic

**Example of Impact:**
```typescript
// Original (production)
const key1 = deriver.deriveKey([2, 'com gojiwallet app'], 'bsv_receive/0', 'self');
// Address: 1ABC...

// Changed protocol (BREAKS WALLET!)
const key2 = deriver.deriveKey([2, 'com gojiwallet app2'], 'bsv_receive/0', 'self');
// Address: 1XYZ... (completely different - original funds inaccessible)
```

### Why Single Unified Protocol?

This implementation uses **ONE** protocol for all wallet operations instead of multiple protocols.

**Before (Multiple Protocols - Deprecated):**
```typescript
GOJI_PROTOCOLS.WALLET_RECEIVE  // Protocol for receiving addresses
GOJI_PROTOCOLS.WALLET_CHANGE   // Protocol for change addresses
```

**After (Single Protocol - Current):**
```typescript
GOJI_PROTOCOLS.WALLET_APP  // Single protocol for ALL wallet keys
```

**Benefits:**
- **Simpler**: 1 protocol to manage vs 2+
- **Flexible**: New key types don't require new protocols
- **Consistent**: All wallet keys use same derivation path
- **Extensible**: Easy to add savings, trading, escrow, etc.

**Key Differentiation:**
Instead of different protocols, we use different **keyID** values with currency prefixes:
- `'bsv_receive/0'` - BSV receiving address #0
- `'bsv_change/0'` - BSV change address #0
- `'mnee_receive/0'` - MNEE receiving address #0
- `'mnee_change/0'` - MNEE change address #0
- `'bsv_savings/0'` - Future: BSV savings address #0

---

## 1.5. Multi-Wallet Architecture

### Single-Currency Wallets with Multi-Wallet Support

Goji uses a **multi-wallet system with single-currency wallets**. Each wallet holds **ONE** currency type only.

**Key Principle:**
> **One Mnemonic → Multiple Wallets → Each Wallet = One Currency**

### Supported Currencies

- **BSV** - Bitcoin SV
- **MNEE** - MNEE USD stablecoin

### How It Works

**1. Single Mnemonic Phrase:**
```
"witch collapse practice feed shame open despair creek road again ice least"
```

**2. Currency-Specific KeyID Patterns:**
```typescript
// BSV wallet uses 'bsv_' prefix
const bsvKey = deriver.deriveKey(PROTOCOL.id, 'bsv_receive/0', 'self');
// Result: BSV address '1ABC...'

// MNEE wallet uses 'mnee_' prefix (same mnemonic!)
const mneeKey = deriver.deriveKey(PROTOCOL.id, 'mnee_receive/0', 'self');
// Result: MNEE address '1XYZ...' (different address)
```

**3. Different Addresses from Same Mnemonic:**
- Same mnemonic phrase
- Different keyID patterns (currency prefix)
- Result: Completely different addresses for each currency
- Example: `bsv_receive/0` generates a different address than `mnee_receive/0`

### Why Currency Prefixes in KeyID?

**1. Clarity:**
- Immediately identifies which currency a key belongs to
- No confusion between BSV and MNEE addresses

**2. Safety:**
- Prevents accidentally mixing BSV and MNEE addresses
- Clear separation of currency-specific operations

**3. Scalability:**
- Easy to add new currencies in the future (e.g., `'btc_receive/0'`, `'eth_receive/0'`)
- No protocol changes needed - just new keyID patterns

**4. Determinism:**
- Same mnemonic + same keyID = same address (always)
- Predictable and reproducible wallet generation

**5. One Backup:**
- User backs up one mnemonic phrase
- Recovers all wallets (BSV + MNEE + future currencies)

### Example: Multi-Currency Wallet Creation

```typescript
import { BRC42KeyDeriver, GOJI_PROTOCOLS } from '@goji-system/blockchain-lib/client';

// Single mnemonic for all wallets
const mnemonic = 'witch collapse practice feed shame open despair creek road again ice least';
const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic });

// Create BSV wallet
const bsvWallet = {
  currency: 'bsv',
  keyID: 'bsv_receive/0',
  address: deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, 'bsv_receive/0', 'self').address
  // Result: '1ABC...' (BSV address)
};

// Create MNEE wallet (same mnemonic, different address)
const mneeWallet = {
  currency: 'mnee',
  keyID: 'mnee_receive/0',
  address: deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, 'mnee_receive/0', 'self').address
  // Result: '1XYZ...' (MNEE address - completely different!)
};

// Verify different addresses
console.log(bsvWallet.address !== mneeWallet.address);  // true
```

### Benefits of This Architecture

**For Users:**
- ✅ One mnemonic to backup and remember
- ✅ Automatic wallet creation for each currency
- ✅ Simple recovery process (enter mnemonic once, recover all wallets)

**For Developers:**
- ✅ Clear separation of currency logic
- ✅ Easy to add new currencies (no protocol changes)
- ✅ Type-safe currency handling
- ✅ Predictable derivation patterns

**For Security:**
- ✅ No mixing of BSV and MNEE addresses
- ✅ Currency-specific validation
- ✅ Clear audit trail (keyID shows currency)

### KeyID Pattern Summary

**Pattern:** `'{currency}_{type}/{index}'`

**Components:**
- `currency` - Currency code (lowercase): `'bsv'`, `'mnee'`
- `type` - Key purpose: `'receive'`, `'change'`, `'savings'`, etc.
- `index` - Sequential number: `0`, `1`, `2`, ...

**Examples:**
```
BSV:  'bsv_receive/0', 'bsv_change/0', 'bsv_savings/0'
MNEE: 'mnee_receive/0', 'mnee_change/0', 'mnee_trading/0'
```

---

## 1.6. Payment Type Support

### Overview

Goji supports **four payment contexts** using the unified BRC-42 key derivation system with the single `WALLET_APP` protocol:

1. **Wallet Operations** - Standard send/receive/change addresses
2. **Group Payments** - Savings circles, betting pools, poker games
3. **Shopping/Marketplace** - E-commerce purchases
4. **Payment Requests** - P2P payment requests

**Critical Principle: One-Time Address Usage**

⚠️ **Bitcoin Privacy Best Practice**: Addresses are **NEVER reused**. Each transaction requires a fresh address.

- Every incoming payment → new receiving address
- Every change output → new change address
- Every group contribution → unique address
- Every shopping purchase → unique address

**Implementation**: Sequential index tracking with database persistence in the `used_addresses` table.

### Supported Payment Types

#### 1. Wallet Operations (Receive/Change)

**Pattern**: `'{currency}_{type}/{index}'`

**Examples**:
```typescript
'bsv_receive/0'   // First BSV receiving address
'bsv_receive/1'   // Second BSV receiving address (one-time use!)
'bsv_change/0'    // First BSV change address
'bsv_change/1'    // Second BSV change address
'mnee_receive/0'  // First MNEE receiving address
'mnee_change/0'   // First MNEE change address
```

**Usage**:
```typescript
import { KeyIDPatterns } from '@goji-system/blockchain-lib/client';

// Generate wallet keyIDs
const receiveKeyID = KeyIDPatterns.wallet('bsv', 'receive', 0);  // 'bsv_receive/0'
const changeKeyID = KeyIDPatterns.wallet('bsv', 'change', 0);    // 'bsv_change/0'

// Or use InvoiceGenerator convenience methods
import { InvoiceGenerator } from '@goji-system/blockchain-lib/client';

const firstAddr = InvoiceGenerator.firstReceivingAddress('bsv');  // 'bsv_receive/0'
const walletAddr = InvoiceGenerator.walletAddress('mnee', 5, false); // 'mnee_receive/5'
```

**Status**: ✅ Already implemented - no changes needed

---

#### 2. Group Payments (Savings/Betting/Poker)

**Pattern**: `'{currency}_group/{groupId}/{memberId}/{index}'`

**Rationale**:
- Single pattern works for **ALL** group types (savings circles, betting pools, poker games)
- Group type stored in database metadata, not in keyID
- Each group instance has unique address space
- Each member has unique addresses within their group
- Sequential index allows multiple transactions per member

**Examples**:
```typescript
// Savings circle contributions
'bsv_group/550e8400-e29b-41d4-a716-446655440000/member-123/0'  // First contribution
'bsv_group/550e8400-e29b-41d4-a716-446655440000/member-123/1'  // Second contribution

// Betting pool wager (same pattern, different group)
'bsv_group/betting-pool-456/member-789/0'

// Poker game buy-in (same pattern, different group)
'mnee_group/poker-game-abc/player-xyz/0'
```

**Usage**:
```typescript
import { KeyIDPatterns, InvoiceGenerator } from '@goji-system/blockchain-lib/client';

// Method 1: Using KeyIDPatterns
const groupKeyID = KeyIDPatterns.group('bsv', 'group-123', 'member-456', 0);
// Result: 'bsv_group/group-123/member-456/0'

// Method 2: Using InvoiceGenerator (same result)
const groupKeyID2 = InvoiceGenerator.groupPayment('bsv', 'group-123', 'member-456', 0);
// Result: 'bsv_group/group-123/member-456/0'
```

**Benefits**:
- ✅ One implementation for all group types
- ✅ Clear per-group isolation (each group has own address space)
- ✅ Per-member isolation (each member has unique addresses)
- ✅ Simple to test and maintain
- ✅ Automatic one-time address usage via index increment

**Use Cases**:
- **Savings Circles**: Weekly/monthly contributions, payout rotations
- **Betting Pools**: Initial wagers, additional stakes, winnings payouts
- **Poker Games**: Initial buy-in, rebuys, cash-outs, side pot distributions

**Full Example - Savings Circle**:
```typescript
const groupId = 'savings-circle-550e8400';
const member1Id = 'member-123e4567';
const member2Id = 'member-987f6543';

// Member 1 makes first contribution
const member1Contrib1 = InvoiceGenerator.groupPayment('bsv', groupId, member1Id, 0);
// 'bsv_group/savings-circle-550e8400/member-123e4567/0'

// Member 1 makes second contribution (new address!)
const member1Contrib2 = InvoiceGenerator.groupPayment('bsv', groupId, member1Id, 1);
// 'bsv_group/savings-circle-550e8400/member-123e4567/1'

// Member 2 makes first contribution (different member = different address)
const member2Contrib1 = InvoiceGenerator.groupPayment('bsv', groupId, member2Id, 0);
// 'bsv_group/savings-circle-550e8400/member-987f6543/0'

// All three are unique addresses - no reuse!
```

---

#### 3. Shopping/Marketplace Payments

**Pattern**: `'{currency}_shopping/{index}'`

**Rationale**:
- Simple sequential pool for all shopping transactions
- Order details tracked in transaction metadata (not in keyID)
- High-volume, low-value transactions benefit from simplicity

**Examples**:
```typescript
'bsv_shopping/0'    // First shopping purchase (any product)
'bsv_shopping/1'    // Second shopping purchase
'bsv_shopping/2'    // Third shopping purchase
'mnee_shopping/0'   // First MNEE shopping purchase
'mnee_shopping/10'  // Eleventh MNEE shopping purchase
```

**Usage**:
```typescript
import { KeyIDPatterns, InvoiceGenerator } from '@goji-system/blockchain-lib/client';

// Method 1: Using KeyIDPatterns
const shopKeyID = KeyIDPatterns.shopping('mnee', 5);
// Result: 'mnee_shopping/5'

// Method 2: Using InvoiceGenerator (same result)
const shopKeyID2 = InvoiceGenerator.shoppingPayment('mnee', 5);
// Result: 'mnee_shopping/5'
```

**Use Cases**:
- Gift card purchases
- Mobile top-ups
- Streaming subscriptions
- Gaming credits
- Digital product purchases
- Marketplace orders

**Full Example - Shopping Flow**:
```typescript
// User makes first purchase (gift card)
const purchase1 = InvoiceGenerator.shoppingPayment('mnee', 0);
// 'mnee_shopping/0'

// User makes second purchase (mobile top-up)
const purchase2 = InvoiceGenerator.shoppingPayment('mnee', 1);
// 'mnee_shopping/1'

// User makes third purchase (streaming subscription)
const purchase3 = InvoiceGenerator.shoppingPayment('mnee', 2);
// 'mnee_shopping/2'

// All three are unique addresses - privacy preserved!
```

---

#### 4. Payment Request Payments

**Pattern**: `'{currency}_request/{requestId}'`

**Rationale**:
- Each payment request gets unique address via its UUID
- Request ID is already unique (from database)
- No index needed since each request = one payment

**Examples**:
```typescript
'bsv_request/550e8400-e29b-41d4-a716-446655440000'
'mnee_request/123e4567-e89b-12d3-a456-426614174000'
```

**Usage**:
```typescript
import { KeyIDPatterns, InvoiceGenerator } from '@goji-system/blockchain-lib/client';

const requestId = '550e8400-e29b-41d4-a716-446655440000';

// Method 1: Using KeyIDPatterns
const reqKeyID = KeyIDPatterns.request('bsv', requestId);
// Result: 'bsv_request/550e8400-e29b-41d4-a716-446655440000'

// Method 2: Using InvoiceGenerator (same result)
const reqKeyID2 = InvoiceGenerator.requestPayment('bsv', requestId);
// Result: 'bsv_request/550e8400-e29b-41d4-a716-446655440000'
```

**Use Cases**:
- P2P payment requests (@handle to @handle)
- Invoice payments
- Split bill payments
- Request money from contacts

**Full Example - Payment Request Flow**:
```typescript
// User creates payment request
const request = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  amount: 100,
  currency: 'BSV',
  recipientHandle: '@alice'
};

// Generate unique address for this request
const paymentKeyID = InvoiceGenerator.requestPayment('bsv', request.id);
// 'bsv_request/550e8400-e29b-41d4-a716-446655440000'

// Derive actual address for payment
const derivedKey = deriver.deriveKey(
  GOJI_PROTOCOLS.WALLET_APP.id,
  paymentKeyID,
  'self'
);

// Share address with payer
console.log(derivedKey.address);  // '1ABC...' (unique to this request)
```

---

### Payment Type Comparison

| Payment Type | Pattern | Example KeyID | Use Case |
|--------------|---------|---------------|----------|
| **Wallet Receive** | `{currency}_receive/{index}` | `bsv_receive/0` | Standard receiving addresses |
| **Wallet Change** | `{currency}_change/{index}` | `bsv_change/0` | Transaction change outputs |
| **Group Payment** | `{currency}_group/{groupId}/{memberId}/{index}` | `bsv_group/group-123/member-456/0` | Savings, betting, poker |
| **Shopping** | `{currency}_shopping/{index}` | `mnee_shopping/5` | Marketplace purchases |
| **Request** | `{currency}_request/{requestId}` | `bsv_request/550e8400-...` | P2P payment requests |

### Security Level Assignment

All payment contexts use the **same protocol and security level**:

- **Protocol ID**: `[SecurityLevel.STANDARD, 'com gojiwallet app']`
- **Security Level**: 2 (STANDARD) for all payment types
- **Counterparty**: `'self'` for all addresses

**Why STANDARD (2) for all?**
- Shopping could use LOW (1), but consistency > micro-optimization
- All payment types have similar privacy requirements
- Single security level simplifies implementation and testing

### One-Time Address Usage Implementation

**Database Table**: `used_addresses`

Tracks all generated addresses to prevent reuse:

```sql
CREATE TABLE used_addresses (
  id UUID PRIMARY KEY,
  wallet_id UUID NOT NULL,
  key_id VARCHAR(500) NOT NULL,  -- Full keyID pattern
  address VARCHAR(100) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  context VARCHAR(50) NOT NULL,  -- 'receive', 'change', 'group', 'shopping', 'request'
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (wallet_id, key_id)  -- Prevents duplicate keyID generation
);
```

**Index Management**:
```typescript
// Service automatically finds next available index
const nextIndex = await addressGenService.getNextIndex(
  walletId,
  'bsv',
  'receive'
);
// Returns: 0 (if no addresses), or highest_index + 1

// Generate fresh address
const freshAddress = await addressGenService.generateFreshAddress({
  userId: 'user-123',
  walletId: 'wallet-456',
  currency: 'bsv',
  context: 'receive'
});
// Automatically increments index, ensures one-time use
```

### KeyIDPatterns vs InvoiceGenerator

**Two ways to generate keyIDs** - choose based on preference:

**Option 1: KeyIDPatterns (Direct)**
```typescript
import { KeyIDPatterns } from '@goji-system/blockchain-lib/client';

const walletKeyID = KeyIDPatterns.wallet('bsv', 'receive', 0);
const groupKeyID = KeyIDPatterns.group('bsv', 'group-123', 'member-456', 0);
const shopKeyID = KeyIDPatterns.shopping('mnee', 5);
const reqKeyID = KeyIDPatterns.request('bsv', 'request-uuid');
```

**Option 2: InvoiceGenerator (Convenience)**
```typescript
import { InvoiceGenerator } from '@goji-system/blockchain-lib/client';

const walletKeyID = InvoiceGenerator.walletAddress('bsv', 0, false);
const groupKeyID = InvoiceGenerator.groupPayment('bsv', 'group-123', 'member-456', 0);
const shopKeyID = InvoiceGenerator.shoppingPayment('mnee', 5);
const reqKeyID = InvoiceGenerator.requestPayment('bsv', 'request-uuid');
```

**Both produce identical results** - InvoiceGenerator is a thin wrapper around KeyIDPatterns.

**Recommendation**: Use **InvoiceGenerator** for clearer intent, **KeyIDPatterns** for direct control.

---

## 2. Implementation Architecture

### Single Protocol Design

**Protocol ID:** `[SecurityLevel.STANDARD, 'com gojiwallet app']`

**Formatted String:** `'2-com gojiwallet app'`

### Architecture Diagram

```
Master Seed (Mnemonic)
        │
        ├─[BRC42 Derivation]
        │
        ├─ Protocol: [2, 'com gojiwallet app']
        │     │
        │     ├─ KeyID: 'bsv_receive/0'  → Address 1ABC...  (BSV: First receiving)
        │     ├─ KeyID: 'bsv_receive/1'  → Address 1DEF...  (BSV: Second receiving)
        │     ├─ KeyID: 'bsv_change/0'   → Address 1GHI...  (BSV: First change)
        │     ├─ KeyID: 'bsv_change/1'   → Address 1JKL...  (BSV: Second change)
        │     ├─ KeyID: 'mnee_receive/0' → Address 1MNO...  (MNEE: First receiving)
        │     ├─ KeyID: 'mnee_receive/1' → Address 1PQR...  (MNEE: Second receiving)
        │     ├─ KeyID: 'mnee_change/0'  → Address 1STU...  (MNEE: First change)
        │     ├─ KeyID: 'bsv_savings/0'  → Address 1VWX...  (Future: BSV Savings)
        │     └─ KeyID: 'mnee_trading/0' → Address 1YZA...  (Future: MNEE Trading)
```

### Code Example

```typescript
import { BRC42KeyDeriver, GOJI_PROTOCOLS } from '@goji-system/blockchain-lib/client';

const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic });

// Single protocol for all wallet keys
const PROTOCOL = GOJI_PROTOCOLS.WALLET_APP;
// = { id: [2, 'com gojiwallet app'], name: 'Goji Wallet', ... }

// BSV wallet keys (currency prefix: 'bsv_')
const bsvReceiveKey = deriver.deriveKey(PROTOCOL.id, 'bsv_receive/0', 'self');  // BSV receiving
const bsvChangeKey = deriver.deriveKey(PROTOCOL.id, 'bsv_change/0', 'self');    // BSV change

// MNEE wallet keys (currency prefix: 'mnee_')
const mneeReceiveKey = deriver.deriveKey(PROTOCOL.id, 'mnee_receive/0', 'self');  // MNEE receiving
const mneeChangeKey = deriver.deriveKey(PROTOCOL.id, 'mnee_change/0', 'self');    // MNEE change

// Future: Other wallet types
const bsvSavingsKey = deriver.deriveKey(PROTOCOL.id, 'bsv_savings/0', 'self');  // BSV savings
const mneeTradingKey = deriver.deriveKey(PROTOCOL.id, 'mnee_trading/0', 'self');  // MNEE trading
```

### Rationale for Coding Agent

**Why this architecture?**
1. **Simplicity**: One protocol constant to import and use
2. **Maintainability**: Single source of truth for protocol definition
3. **Extensibility**: New key types = new keyID patterns (no code changes)
4. **Consistency**: All wallet keys follow same derivation pattern
5. **Future-proof**: Can add unlimited key types without protocol changes

---

## 3. SDK Validation Constraint

### The @bsv/sdk Restriction

The @bsv/sdk library enforces strict validation on protocol names:

**Source:** `node_modules/@bsv/sdk/src/wallet/KeyDeriver.ts` (line 330)

```typescript
if (!/^[a-z0-9 ]+$/g.test(protocolName)) {
  throw new Error('Protocol names can only contain letters, numbers and spaces')
}
```

**Validation Rule:**
- **Allowed**: Lowercase letters (a-z), numbers (0-9), spaces
- **Forbidden**: Uppercase letters, dots (.), hyphens (-), underscores (_), special characters

### Why We Can't Use Dots

**Desired format (reverse domain notation):**
```typescript
'com.gojiwallet.app'  // ❌ FAILS SDK validation
```

**SDK-compliant format:**
```typescript
'com gojiwallet app'  // ✅ PASSES SDK validation
```

### Trade-off Analysis

#### Option 1: Align with SDK Validation (Chosen)
```typescript
✅ Protocol ID: 'com gojiwallet app'
```

**Pros:**
- ✅ Uses battle-tested SDK cryptography (no custom implementation)
- ✅ Maintainable (SDK updates apply automatically)
- ✅ Low risk (no cryptographic bugs that could lose funds)
- ✅ Works today (no additional code needed)

**Cons:**
- ❌ Cannot use reverse domain notation with dots (aesthetic only)
- ❌ Less visually clean than `'com.gojiwallet.app'`

#### Option 2: Bypass SDK and Use Raw Cryptography (Rejected)
```typescript
❌ Protocol ID: 'com.gojiwallet.app'
```

**Pros:**
- ✅ Proper reverse domain notation
- ✅ Industry standard formatting

**Cons:**
- ❌ **DANGEROUS**: Must implement BRC-42 HMAC-SHA256 derivation ourselves
- ❌ **HIGH RISK**: Cryptographic bugs can permanently lose funds
- ❌ Maintenance burden (custom crypto code forever)
- ❌ Miss SDK benefits (optimizations, caching, bug fixes)

### Decision: Prioritize Safety Over Aesthetics

**Final Choice:** Use SDK-compliant naming (`'com gojiwallet app'`)

**Rationale:**
- The difference between `'com gojiwallet app'` and `'com.gojiwallet.app'` is purely cosmetic
- The protocol ID is internal (users never see it)
- Functional behavior is identical
- Cryptographic safety is non-negotiable
- **Cardinal rule:** Never implement your own cryptography unless absolutely necessary

---

## 4. File Locations & References

### Critical Files

#### 1. Protocol Registry

**File:** `/libs/blockchain-lib/src/brc42/protocol-registry.ts`

**Contains:**
- `GOJI_PROTOCOLS` constant (single source of truth for protocol definitions)
- `SecurityLevel` enum (0 = PUBLIC, 1 = LOW, 2 = STANDARD, 3 = HIGH)
- `ProtocolID` type definition
- `ProtocolDefinition` interface
- Helper functions: `parseProtocolID()`, `formatProtocolID()`

**Protocol Definition:**
```typescript
export const GOJI_PROTOCOLS = {
  /**
   * Wallet App Protocol
   *
   * Primary key derivation protocol for all Goji Wallet keys.
   * Use keyID parameter to differentiate currency and key types:
   * - 'bsv_receive/0', 'bsv_receive/1', ... for BSV receiving addresses
   * - 'bsv_change/0', 'bsv_change/1', ... for BSV change addresses
   * - 'mnee_receive/0', 'mnee_receive/1', ... for MNEE receiving addresses
   * - 'mnee_change/0', 'mnee_change/1', ... for MNEE change addresses
   * - 'bsv_savings/0', 'mnee_trading/0', ... for future key types
   */
  WALLET_APP: {
    id: [SecurityLevel.STANDARD, 'com gojiwallet app'] as ProtocolID,
    name: 'Goji Wallet',
    description: 'Primary key derivation protocol for Goji Wallet application. Use keyID pattern: {currency}_{type}/{index}',
    securityLevel: SecurityLevel.STANDARD,
    protocolName: 'com gojiwallet app'
  }
} as const;
```

**Exports:**
- `GOJI_PROTOCOLS` (use this constant everywhere)
- `SecurityLevel` enum
- `ProtocolID` type
- `parseProtocolID()` function
- `formatProtocolID()` function

#### 2. Key Derivation Module

**File:** `/libs/blockchain-lib/src/brc42/key-deriver.ts`

**Contains:**
- `BRC42KeyDeriver` class (wrapper around @bsv/sdk CachedKeyDeriver)
- `DerivedBRC42Key` interface (result of key derivation)
- `BRC42KeyDeriverOptions` interface

**Key Methods:**
```typescript
class BRC42KeyDeriver {
  // Factory method: Create from mnemonic
  static fromMnemonic(options: BRC42KeyDeriverOptions): BRC42KeyDeriver

  // Derive full key (private + public)
  deriveKey(protocolID: ProtocolID, keyID: string, counterparty?: string): DerivedBRC42Key

  // Derive public key only (watch-only wallet)
  derivePublicKey(protocolID: ProtocolID, keyID: string, counterparty?: string): PublicKey

  // Derive symmetric encryption key
  deriveSymmetricKey(protocolID: ProtocolID, keyID: string, counterparty?: string): SymmetricKey

  // Get root public key (for watch-only wallet)
  getRootPublicKey(): string
}
```

**DerivedBRC42Key Interface:**
```typescript
interface DerivedBRC42Key {
  privateKey: PrivateKey;      // BSV SDK PrivateKey object
  publicKey: PublicKey;         // BSV SDK PublicKey object
  address: string;              // P2PKH address (e.g., '1ABC...')
  protocolID: string;           // Formatted protocol ID (e.g., '2-com gojiwallet app')
  keyID: string;                // KeyID used for derivation (e.g., 'bsv_receive/0', 'mnee_receive/0')
  counterparty: 'self' | 'anyone' | string;  // Counterparty parameter
}
```

**Usage Example:**
```typescript
import { BRC42KeyDeriver, GOJI_PROTOCOLS } from '@goji-system/blockchain-lib/client';

const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic: '...' });

// Derive BSV wallet key
const bsvKey = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, 'bsv_receive/0', 'self');
console.log(bsvKey.address);      // '1ABC...'
console.log(bsvKey.protocolID);   // '2-com gojiwallet app'
console.log(bsvKey.keyID);        // 'bsv_receive/0'

// Derive MNEE wallet key (different address from same mnemonic)
const mneeKey = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, 'mnee_receive/0', 'self');
console.log(mneeKey.address);     // '1XYZ...' (different address)
console.log(mneeKey.keyID);       // 'mnee_receive/0'
```

#### 3. Wallet Creation Service

**File:** `/libs/blockchain-lib/src/bsv/wallet-creation-service.ts`

**Contains:**
- `WalletCreationService` class
- `createBSVWallet()` static method (reference implementation)

**Implementation:**
```typescript
export class WalletCreationService {
  static createBSVWallet(): BSVWallet {
    // 1. Generate mnemonic
    const mnemonic = MnemonicGenerator.generate();

    // 2. Create key deriver
    const keyDeriver = BRC42KeyDeriver.fromMnemonic({ mnemonic });

    // 3. Use WALLET_APP protocol with 'bsv_receive/0' keyID (BSV currency)
    const protocol = GOJI_PROTOCOLS.WALLET_APP;
    const keyID = 'bsv_receive/0';  // Currency-specific: BSV

    // 4. Derive first BSV receiving address
    const derivedKey = keyDeriver.deriveKey(protocol.id, keyID, 'self');

    // 5. Return BSV wallet object
    return {
      mnemonic,
      currency: 'bsv',
      address: derivedKey.address,
      publicKey: derivedKey.publicKey.toDER('hex'),
      protocolID: derivedKey.protocolID,
      keyID: derivedKey.keyID,  // 'bsv_receive/0'
      rootPublicKey: keyDeriver.getRootPublicKey()
    };
  }

  static createMNEEWallet(mnemonic?: string): MNEEWallet {
    // 1. Generate or use existing mnemonic
    const walletMnemonic = mnemonic || MnemonicGenerator.generate();

    // 2. Create key deriver
    const keyDeriver = BRC42KeyDeriver.fromMnemonic({ mnemonic: walletMnemonic });

    // 3. Use WALLET_APP protocol with 'mnee_receive/0' keyID (MNEE currency)
    const protocol = GOJI_PROTOCOLS.WALLET_APP;
    const keyID = 'mnee_receive/0';  // Currency-specific: MNEE

    // 4. Derive first MNEE receiving address
    const derivedKey = keyDeriver.deriveKey(protocol.id, keyID, 'self');

    // 5. Return MNEE wallet object (different address from BSV, even with same mnemonic)
    return {
      mnemonic: walletMnemonic,
      currency: 'mnee',
      address: derivedKey.address,
      publicKey: derivedKey.publicKey.toDER('hex'),
      protocolID: derivedKey.protocolID,
      keyID: derivedKey.keyID,  // 'mnee_receive/0'
      rootPublicKey: keyDeriver.getRootPublicKey()
    };
  }
}
```

**Usage:**
```typescript
import { WalletCreationService } from '@goji-system/blockchain-lib';

// Create BSV wallet
const bsvWallet = WalletCreationService.createBSVWallet();
// Returns: { mnemonic, currency: 'bsv', address, publicKey, protocolID, keyID: 'bsv_receive/0', rootPublicKey }

// Create MNEE wallet (same mnemonic optional)
const mneeWallet = WalletCreationService.createMNEEWallet(bsvWallet.mnemonic);
// Returns: { mnemonic, currency: 'mnee', address, publicKey, protocolID, keyID: 'mnee_receive/0', rootPublicKey }

// Note: Different keyIDs = different addresses, even with same mnemonic
console.log(bsvWallet.address !== mneeWallet.address);  // true
```

#### 4. Platform-Specific Exports

**Client Entry (React Native):**
**File:** `/libs/blockchain-lib/src/client/index.ts`

```typescript
// Exports for React Native applications
export {
  BRC42KeyDeriver,
  GOJI_PROTOCOLS,
  SecurityLevel,
  type ProtocolID,
  type DerivedBRC42Key,
  // ... other exports
} from '../brc42';
```

**Server Entry (NestJS):**
**File:** `/libs/blockchain-lib/src/server/index.ts`

```typescript
// Exports for NestJS backend
export {
  BRC42KeyDeriver,
  GOJI_PROTOCOLS,
  SecurityLevel,
  type ProtocolID,
  type DerivedBRC42Key,
  // ... other exports
} from '../brc42';
```

**Usage Pattern:**
```typescript
// Client-side (React Native)
import { GOJI_PROTOCOLS, BRC42KeyDeriver } from '@goji-system/blockchain-lib/client';

// Server-side (NestJS)
import { GOJI_PROTOCOLS, BRC42KeyDeriver } from '@goji-system/blockchain-lib/server';
```

---

## 5. How to Use in Wallet Creation

### Step-by-Step Guide for Coding Agent

#### Step 1: Import Required Modules

**Client-side (React Native):**
```typescript
import {
  BRC42KeyDeriver,
  GOJI_PROTOCOLS,
  SecurityLevel,
  type DerivedBRC42Key,
  type ProtocolID
} from '@goji-system/blockchain-lib/client';
```

**Server-side (NestJS):**
```typescript
import {
  BRC42KeyDeriver,
  GOJI_PROTOCOLS,
  SecurityLevel,
  type DerivedBRC42Key,
  type ProtocolID
} from '@goji-system/blockchain-lib/server';
```

#### Step 2: Create Key Deriver from Mnemonic

**Basic Usage:**
```typescript
const mnemonic = 'witch collapse practice feed shame open despair creek road again ice least';

const deriver = BRC42KeyDeriver.fromMnemonic({
  mnemonic: mnemonic
});
```

**With Optional Passphrase:**
```typescript
const deriver = BRC42KeyDeriver.fromMnemonic({
  mnemonic: mnemonic,
  passphrase: 'my-secret-passphrase'  // Optional BIP39 passphrase
});
```

#### Step 3: Derive Keys Using Protocol ID

**For BSV Receiving Addresses:**
```typescript
const bsvReceiveKey = deriver.deriveKey(
  GOJI_PROTOCOLS.WALLET_APP.id,  // [2, 'com gojiwallet app']
  'bsv_receive/0',                   // KeyID: currency_type/index
  'self'                             // Counterparty (usually 'self')
);

// Result: DerivedBRC42Key
// {
//   privateKey: PrivateKey {...},
//   publicKey: PublicKey {...},
//   address: '1ABC...',
//   protocolID: '2-com gojiwallet app',
//   keyID: 'bsv_receive/0',
//   counterparty: 'self'
// }
```

**For MNEE Receiving Addresses:**
```typescript
const mneeReceiveKey = deriver.deriveKey(
  GOJI_PROTOCOLS.WALLET_APP.id,
  'mnee_receive/0',                  // MNEE currency
  'self'
);

// Different address from BSV, even with same mnemonic!
console.log(bsvReceiveKey.address !== mneeReceiveKey.address);  // true
```

**For Change Addresses (Currency-Specific):**
```typescript
// BSV change address
const bsvChangeKey = deriver.deriveKey(
  GOJI_PROTOCOLS.WALLET_APP.id,
  'bsv_change/0',
  'self'
);

// MNEE change address
const mneeChangeKey = deriver.deriveKey(
  GOJI_PROTOCOLS.WALLET_APP.id,
  'mnee_change/0',
  'self'
);
```

**For Future Key Types (Extensibility):**
```typescript
// BSV savings wallet
const bsvSavingsKey = deriver.deriveKey(
  GOJI_PROTOCOLS.WALLET_APP.id,
  'bsv_savings/0',
  'self'
);

// MNEE trading wallet
const mneeTradingKey = deriver.deriveKey(
  GOJI_PROTOCOLS.WALLET_APP.id,
  'mnee_trading/0',
  'self'
);

// BSV escrow wallet
const bsvEscrowKey = deriver.deriveKey(
  GOJI_PROTOCOLS.WALLET_APP.id,
  'bsv_escrow/0',
  'self'
);
```

#### Step 4: Extract Wallet Information

**Create BSV Wallet Object:**
```typescript
const bsvWallet = {
  // Mnemonic (store securely!)
  mnemonic: mnemonic,

  // Currency
  currency: 'bsv',

  // BSV P2PKH address
  address: bsvReceiveKey.address,                    // '1ABC...'

  // Public key (hex-encoded)
  publicKey: bsvReceiveKey.publicKey.toDER('hex'),  // '04678afdb0fe...'

  // Protocol ID (for reference)
  protocolID: bsvReceiveKey.protocolID,             // '2-com gojiwallet app'

  // Key ID (for reference)
  keyID: bsvReceiveKey.keyID,                       // 'bsv_receive/0'

  // Root public key (for watch-only wallet)
  rootPublicKey: deriver.getRootPublicKey(),        // '04bfcab8722991ae...'

  // Counterparty (usually 'self')
  counterparty: bsvReceiveKey.counterparty          // 'self'
};
```

**Create MNEE Wallet Object (Same Mnemonic):**
```typescript
const mneeWallet = {
  mnemonic: mnemonic,                               // Same mnemonic as BSV wallet
  currency: 'mnee',
  address: mneeReceiveKey.address,                  // Different address!
  publicKey: mneeReceiveKey.publicKey.toDER('hex'),
  protocolID: mneeReceiveKey.protocolID,            // Same protocol ID
  keyID: mneeReceiveKey.keyID,                      // 'mnee_receive/0' (different keyID)
  rootPublicKey: deriver.getRootPublicKey(),        // Same root public key
  counterparty: mneeReceiveKey.counterparty
};

// Important: Same mnemonic + different keyID = different address
console.log(bsvWallet.address !== mneeWallet.address);  // true
```

**For Signing Transactions (Advanced):**
```typescript
// Keep private key in memory (never store!)
const privateKey = receiveKey.privateKey;

// Sign transaction
const signature = privateKey.sign(transactionHash);
```

---

## 6. KeyID Pattern Guidelines

### Format Specification

**Pattern:** `'{currency}_{type}/{index}'`

**Components:**
1. **Currency** = Currency code (lowercase): `'bsv'`, `'mnee'`
2. **Separator 1** = Underscore `_` (between currency and type)
3. **Type** = Key purpose (lowercase, no spaces): `'receive'`, `'change'`, `'savings'`, etc.
4. **Separator 2** = Forward slash `/` (between type and index)
5. **Index** = Sequential number starting from 0

**Visual Breakdown:**
```
'bsv_receive/0'
 │   │       │
 │   │       └─ Index: 0, 1, 2, 3, ...
 │   └───────── Type: receive, change, savings, ...
 └───────────── Currency: bsv, mnee, ...
```

### Rules for Coding Agent

#### 1. Currency Component

**Standard Currencies:**
- `'bsv'` - Bitcoin SV
- `'mnee'` - MNEE USD stablecoin

**Future Currencies (Extensible):**
- `'btc'` - Bitcoin
- `'eth'` - Ethereum
- `'usdc'` - USD Coin

**Currency Rules:**
- ✅ Lowercase letters only
- ✅ Standard currency codes (3-4 characters typical)
- ✅ No spaces, no special characters
- ❌ Uppercase letters (`'BSV'` is wrong, use `'bsv'`)
- ❌ Mixed case (`'Bsv'` is wrong)
- ❌ Hyphens or dots (`'bsv-usd'` is wrong)

**Examples:**
```typescript
'bsv'   // ✅ Correct
'mnee'  // ✅ Correct
'BSV'   // ❌ Wrong (uppercase)
'Mnee'  // ❌ Wrong (mixed case)
'bsv-usd'  // ❌ Wrong (hyphen)
```

#### 2. Type Component

**Standard Types:**
- `'receive'` - Receiving addresses (customer sends money to you)
- `'change'` - Change addresses (leftover from transactions)

**Future Types (Extensible):**
- `'savings'` - Long-term savings wallet
- `'trading'` - Trading/exchange wallet
- `'escrow'` - Escrow/multi-party wallet
- `'donation'` - Donation receiving addresses
- `'invoice'` - Invoice-specific addresses

**Type Rules:**
- ✅ Lowercase letters only
- ✅ No spaces
- ✅ No special characters
- ✅ Descriptive but concise
- ❌ Uppercase letters (`'Receive'` is wrong, use `'receive'`)
- ❌ Numbers (type should be semantic)

**Examples:**
```typescript
'receive'   // ✅ Correct
'change'    // ✅ Correct
'savings'   // ✅ Correct
'Receive'   // ❌ Wrong (uppercase)
'CHANGE'    // ❌ Wrong (all caps)
```

#### 3. Index Component

**Index Rules:**
- ✅ Non-negative integers: 0, 1, 2, 3, ...
- ✅ Sequential (usually)
- ✅ Start from 0
- ❌ Negative numbers (`-1` is invalid)
- ❌ Non-integers (`1.5` is invalid)
- ❌ Gaps (usually avoid, but not technically invalid)

**Examples:**
```typescript
0       // ✅ First address
1       // ✅ Second address
99      // ✅ 100th address
-1      // ❌ Wrong (negative)
1.5     // ❌ Wrong (non-integer)
'a'     // ❌ Wrong (not a number)
```

#### 4. Separators

**CRITICAL:** Must use correct separators

**Currency-Type Separator:** Underscore `_`
**Type-Index Separator:** Forward slash `/`

```typescript
// ✅ CORRECT (current pattern)
'bsv_receive/0'       // Underscore between currency and type, slash before index
'mnee_change/5'       // Correct format

// ❌ WRONG (incorrect separators)
'bsv/receive/0'       // Wrong: slash between currency and type
'bsv-receive/0'       // Wrong: hyphen between currency and type
'bsvreceive/0'        // Wrong: no separator between currency and type
'bsv_receive-0'       // Wrong: hyphen before index
'bsv_receive_0'       // Wrong: underscore before index
```

### Complete Examples

**Valid KeyIDs (Current Pattern):**
```typescript
// BSV wallet keys
'bsv_receive/0'    // ✅ First BSV receiving address
'bsv_receive/1'    // ✅ Second BSV receiving address
'bsv_receive/99'   // ✅ 100th BSV receiving address
'bsv_change/0'     // ✅ First BSV change address
'bsv_savings/5'    // ✅ Sixth BSV savings address

// MNEE wallet keys
'mnee_receive/0'   // ✅ First MNEE receiving address
'mnee_receive/1'   // ✅ Second MNEE receiving address
'mnee_change/0'    // ✅ First MNEE change address
'mnee_trading/3'   // ✅ Fourth MNEE trading address

// Future currency examples
'btc_receive/0'    // ✅ Future: Bitcoin receiving address
'usdc_savings/10'  // ✅ Future: USDC savings address
```

**Invalid KeyIDs (DO NOT USE):**
```typescript
// ❌ Old pattern (missing currency prefix)
'receive/0'        // Missing currency prefix
'change/0'         // Missing currency prefix

// ❌ Wrong separators
'bsv/receive/0'    // Slash instead of underscore
'bsv-receive/0'    // Hyphen instead of underscore
'bsv_receive-0'    // Hyphen instead of slash

// ❌ Wrong casing
'BSV_receive/0'    // Uppercase currency
'bsv_Receive/0'    // Uppercase type
'Bsv_RECEIVE/0'    // Mixed/uppercase

// ❌ Old deprecated pattern
'address-0'        // Old hyphen pattern
'receive-0'        // Old hyphen pattern
```

### Code Examples

#### Parsing KeyID

```typescript
function parseKeyID(keyID: string): {
  currency: string;
  type: string;
  index: number;
} {
  const [currencyType, indexStr] = keyID.split('/');
  const [currency, type] = currencyType.split('_');
  const index = parseInt(indexStr, 10);

  return { currency, type, index };
}

// Usage
const parsed = parseKeyID('bsv_receive/5');
console.log(parsed);
// { currency: 'bsv', type: 'receive', index: 5 }

const parsed2 = parseKeyID('mnee_change/10');
console.log(parsed2);
// { currency: 'mnee', type: 'change', index: 10 }
```

#### Generating KeyID

```typescript
type Currency = 'bsv' | 'mnee';
type KeyType = 'receive' | 'change' | 'savings' | 'trading';

function generateKeyID(
  currency: Currency,
  type: KeyType,
  index: number
): string {
  if (index < 0 || !Number.isInteger(index)) {
    throw new Error('Index must be non-negative integer');
  }
  return `${currency}_${type}/${index}`;
}

// Usage
generateKeyID('bsv', 'receive', 0);    // 'bsv_receive/0'
generateKeyID('mnee', 'change', 3);    // 'mnee_change/3'
generateKeyID('bsv', 'savings', 10);   // 'bsv_savings/10'
```

#### Incrementing KeyID

```typescript
function nextKeyID(currentKeyID: string): string {
  const { currency, type, index } = parseKeyID(currentKeyID);
  return generateKeyID(currency as Currency, type as KeyType, index + 1);
}

// Usage
nextKeyID('bsv_receive/0');   // 'bsv_receive/1'
nextKeyID('mnee_change/5');   // 'mnee_change/6'
```

#### Validating KeyID Format

```typescript
function isValidKeyID(keyID: string): boolean {
  const keyIDRegex = /^[a-z]+_[a-z]+\/\d+$/;
  return keyIDRegex.test(keyID);
}

// Usage
isValidKeyID('bsv_receive/0');     // true
isValidKeyID('mnee_change/99');    // true
isValidKeyID('receive/0');         // false (missing currency)
isValidKeyID('BSV_receive/0');     // false (uppercase)
isValidKeyID('bsv-receive/0');     // false (wrong separator)
```

---

## 7. Security Level

### Current Setting

**Security Level:** `SecurityLevel.STANDARD` (value: 2)

**Protocol ID:** `[SecurityLevel.STANDARD, 'com gojiwallet app']`

**Formatted:** `'2-com gojiwallet app'`

### Why SecurityLevel.STANDARD?

**From BSV SDK Documentation:**
> "RECOMMENDED for wallets - Daily transactions, spending wallets"

**Characteristics:**
- Uses **private derivation** (secure, not public)
- Suitable for everyday wallet operations
- Recommended by SDK for this exact use case
- Compatible with BSV SDK (see constraints below)

### SecurityLevel Enum Values

```typescript
enum SecurityLevel {
  PUBLIC = 0,    // Public derivation (anyone can derive child keys)
  LOW = 1,       // Low security (basic privacy)
  STANDARD = 2,  // RECOMMENDED for wallets ✅
  HIGH = 3       // Highest security (NOT SUPPORTED by BSV SDK CachedKeyDeriver)
}
```

### Important Constraint: BSV SDK Limitation

⚠️ **CRITICAL**: The BSV SDK's `CachedKeyDeriver` **only supports levels 0, 1, and 2**.

**Level 3 (HIGH) is defined in the enum but CANNOT be used with `deriveKey()` operations.**

**Source:** `/libs/blockchain-lib/src/brc42/key-deriver.ts` (line 141)

```typescript
// From BSV SDK source code:
// CachedKeyDeriver only supports security levels 0, 1, 2
// Level 3 (HIGH) will throw an error
```

### Guidelines for Coding Agent

#### ✅ DO:

```typescript
// Use STANDARD for wallet keys
const protocol = GOJI_PROTOCOLS.WALLET_APP;
// protocol.id = [SecurityLevel.STANDARD, 'com gojiwallet app']
// protocol.securityLevel = SecurityLevel.STANDARD (2)

const key = deriver.deriveKey(protocol.id, 'receive/0', 'self');
```

#### ❌ DO NOT:

```typescript
// ❌ DO NOT use HIGH - will throw error
const protocol = [SecurityLevel.HIGH, 'com gojiwallet app'];
const key = deriver.deriveKey(protocol, 'receive/0', 'self');
// Error: Security level 3 not supported

// ❌ DO NOT use PUBLIC - less secure (public derivation)
const protocol = [SecurityLevel.PUBLIC, 'com gojiwallet app'];

// ❌ DO NOT use LOW - less secure than STANDARD
const protocol = [SecurityLevel.LOW, 'com gojiwallet app'];
```

### Summary for Coding Agent

**Always use `SecurityLevel.STANDARD` for wallet keys.**
- ✅ Secure (private derivation)
- ✅ Recommended by SDK
- ✅ Compatible with CachedKeyDeriver
- ✅ Appropriate for daily wallet operations

---

## 8. Complete Working Example

### Scenario: Create Multi-Currency Wallet (BSV + MNEE)

```typescript
import {
  BRC42KeyDeriver,
  GOJI_PROTOCOLS,
  type DerivedBRC42Key
} from '@goji-system/blockchain-lib/client';

// ============================================
// Step 1: Generate or Import Mnemonic
// ============================================

const mnemonic = 'witch collapse practice feed shame open despair creek road again ice least';

// Note: In production, generate with MnemonicGenerator.generate()
// or import from user input

// ============================================
// Step 2: Create Key Deriver
// ============================================

const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic });

// ============================================
// Step 3: Derive BSV Wallet Keys
// ============================================

// Use WALLET_APP protocol constant (single source of truth)
const protocol = GOJI_PROTOCOLS.WALLET_APP;

// Derive first BSV receiving address
const bsvKeyID = 'bsv_receive/0';
const bsvKey: DerivedBRC42Key = deriver.deriveKey(protocol.id, bsvKeyID, 'self');

// ============================================
// Step 4: Derive MNEE Wallet Keys
// ============================================

// Derive first MNEE receiving address (same mnemonic, different keyID)
const mneeKeyID = 'mnee_receive/0';
const mneeKey: DerivedBRC42Key = deriver.deriveKey(protocol.id, mneeKeyID, 'self');

// ============================================
// Step 5: Create Wallet Objects
// ============================================

interface Wallet {
  mnemonic: string;
  currency: string;
  address: string;
  publicKey: string;
  protocolID: string;
  keyID: string;
  rootPublicKey: string;
  counterparty: string;
}

// BSV Wallet
const bsvWallet: Wallet = {
  mnemonic: mnemonic,                        // BIP39 mnemonic (12 words)
  currency: 'bsv',                           // Currency identifier
  address: bsvKey.address,                   // BSV P2PKH address
  publicKey: bsvKey.publicKey.toDER('hex'),  // Hex-encoded public key
  protocolID: bsvKey.protocolID,             // '2-com gojiwallet app'
  keyID: bsvKey.keyID,                       // 'bsv_receive/0'
  rootPublicKey: deriver.getRootPublicKey(), // Root public key
  counterparty: bsvKey.counterparty          // 'self'
};

// MNEE Wallet (same mnemonic, different address!)
const mneeWallet: Wallet = {
  mnemonic: mnemonic,                         // Same mnemonic
  currency: 'mnee',                           // Different currency
  address: mneeKey.address,                   // Different address!
  publicKey: mneeKey.publicKey.toDER('hex'),  // Different public key!
  protocolID: mneeKey.protocolID,             // Same protocol ID
  keyID: mneeKey.keyID,                       // 'mnee_receive/0'
  rootPublicKey: deriver.getRootPublicKey(),  // Same root public key
  counterparty: mneeKey.counterparty          // 'self'
};

// ============================================
// Step 6: Verify Multi-Wallet Behavior
// ============================================

// Different keyIDs produce different addresses (even with same mnemonic)
console.log('BSV and MNEE have different addresses:', bsvWallet.address !== mneeWallet.address);
// true

// Both wallets share the same mnemonic and root public key
console.log('Same mnemonic:', bsvWallet.mnemonic === mneeWallet.mnemonic);
// true

console.log('Same root public key:', bsvWallet.rootPublicKey === mneeWallet.rootPublicKey);
// true

// ============================================
// Step 7: Output (Example Values)
// ============================================

console.log('BSV Wallet:', bsvWallet);
console.log('MNEE Wallet:', mneeWallet);

// Output (example):
// BSV Wallet: {
//   mnemonic: 'witch collapse practice feed shame open despair creek road again ice least',
//   currency: 'bsv',
//   address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
//   publicKey: '04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f',
//   protocolID: '2-com gojiwallet app',
//   keyID: 'bsv_receive/0',
//   rootPublicKey: '04bfcab8722991ae3a6671d4b54f56ab4e06b42b19b0415f30f4733bb06ad49c9c...',
//   counterparty: 'self'
// }
//
// MNEE Wallet: {
//   mnemonic: 'witch collapse practice feed shame open despair creek road again ice least',
//   currency: 'mnee',
//   address: '1XYZ9876aBcDeFgHiJkLmNoPqRsTuVwXy',  // Different address!
//   publicKey: '0456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345...',  // Different!
//   protocolID: '2-com gojiwallet app',  // Same protocol ID
//   keyID: 'mnee_receive/0',  // Different keyID
//   rootPublicKey: '04bfcab8722991ae3a6671d4b54f56ab4e06b42b19b0415f30f4733bb06ad49c9c...',  // Same
//   counterparty: 'self'
// }
```

### Key Insight: Multi-Wallet Architecture

**One Mnemonic → Multiple Wallets:**
- Same mnemonic phrase
- Different keyID patterns (currency prefix)
- Result: Different addresses for BSV and MNEE
- User backs up one mnemonic, recovers all wallets

### Security Notes

**Mnemonic Storage:**
- ⚠️ **NEVER** store mnemonic in plain text
- ✅ Encrypt before storage (use secure encryption)
- ✅ Consider hardware security modules (HSM) for production
- ✅ User should write down mnemonic on paper (backup)

**Private Key Handling:**
- ⚠️ **NEVER** store private key
- ✅ Keep in memory only during transaction signing
- ✅ Clear from memory immediately after use
- ✅ Derive from mnemonic when needed

**Public Key / Address Storage:**
- ✅ Safe to store (public information)
- ✅ Use for receiving payments
- ✅ Display to users

---

## 9. Common Patterns for Coding Agent

### Pattern 1: Sequential Address Generation (Currency-Specific)

**Use Case:** Generate multiple receiving addresses for address rotation

```typescript
import {
  BRC42KeyDeriver,
  GOJI_PROTOCOLS,
  type DerivedBRC42Key
} from '@goji-system/blockchain-lib/client';

type Currency = 'bsv' | 'mnee';

function generateReceivingAddresses(
  deriver: BRC42KeyDeriver,
  currency: Currency,
  count: number
): string[] {
  const addresses: string[] = [];

  for (let i = 0; i < count; i++) {
    const key = deriver.deriveKey(
      GOJI_PROTOCOLS.WALLET_APP.id,
      `${currency}_receive/${i}`,  // Currency-specific keyID
      'self'
    );
    addresses.push(key.address);
  }

  return addresses;
}

// Usage
const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic: '...' });

// Generate 10 BSV receiving addresses
const bsvAddresses = generateReceivingAddresses(deriver, 'bsv', 10);
console.log(bsvAddresses);
// ['1ABC...', '1DEF...', '1GHI...', '1JKL...', '1MNO...', ...]

// Generate 10 MNEE receiving addresses
const mneeAddresses = generateReceivingAddresses(deriver, 'mnee', 10);
console.log(mneeAddresses);
// ['1XYZ...', '1PQR...', '1STU...', '1VWX...', '1YZA...', ...]

// Different currencies = different addresses (even with same index)
console.log(bsvAddresses[0] !== mneeAddresses[0]);  // true
```

### Pattern 2: Type-Based Key Derivation (Currency-Aware)

**Use Case:** Derive keys for different purposes and currencies

```typescript
type Currency = 'bsv' | 'mnee';
type KeyType = 'receive' | 'change' | 'savings' | 'trading';

function deriveKeyByCurrencyAndType(
  deriver: BRC42KeyDeriver,
  currency: Currency,
  type: KeyType,
  index: number
): DerivedBRC42Key {
  const keyID = `${currency}_${type}/${index}`;

  return deriver.deriveKey(
    GOJI_PROTOCOLS.WALLET_APP.id,
    keyID,
    'self'
  );
}

// Usage
const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic: '...' });

// BSV keys
const bsvReceive = deriveKeyByCurrencyAndType(deriver, 'bsv', 'receive', 0);
console.log(bsvReceive.address);  // BSV: First receiving address

const bsvChange = deriveKeyByCurrencyAndType(deriver, 'bsv', 'change', 0);
console.log(bsvChange.address);   // BSV: First change address

// MNEE keys
const mneeReceive = deriveKeyByCurrencyAndType(deriver, 'mnee', 'receive', 0);
console.log(mneeReceive.address);  // MNEE: First receiving address

const mneeSavings = deriveKeyByCurrencyAndType(deriver, 'mnee', 'savings', 0);
console.log(mneeSavings.address);  // MNEE: First savings address

// Different currencies = different addresses
console.log(bsvReceive.address !== mneeReceive.address);  // true
```

### Pattern 3: Watch-Only Wallet (Public Keys Only, Currency-Specific)

**Use Case:** Create wallet without private keys (for monitoring balances)

```typescript
type Currency = 'bsv' | 'mnee';

function createWatchOnlyWallet(
  deriver: BRC42KeyDeriver,
  currency: Currency
): {
  currency: string;
  rootPublicKey: string;
  publicKey: string;
  address: string;
} {
  // Derive public key without private key
  const publicKey = deriver.derivePublicKey(
    GOJI_PROTOCOLS.WALLET_APP.id,
    `${currency}_receive/0`,  // Currency-specific keyID
    'self'
  );

  // Generate address from public key
  const address = publicKey.toAddress();

  return {
    currency,
    rootPublicKey: deriver.getRootPublicKey(),
    publicKey: publicKey.toDER('hex'),
    address: address
    // No privateKey - cannot sign transactions
  };
}

// Usage
const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic: '...' });

// BSV watch-only wallet
const bsvWatchWallet = createWatchOnlyWallet(deriver, 'bsv');
console.log(bsvWatchWallet);
// {
//   currency: 'bsv',
//   rootPublicKey: '04bfcab...',
//   publicKey: '04678af...',
//   address: '1ABC...'
// }

// MNEE watch-only wallet (different address)
const mneeWatchWallet = createWatchOnlyWallet(deriver, 'mnee');
console.log(mneeWatchWallet);
// {
//   currency: 'mnee',
//   rootPublicKey: '04bfcab...',  // Same root
//   publicKey: '0456789...',       // Different public key
//   address: '1XYZ...'             // Different address
// }
```

### Pattern 4: Address Gap Limit (BIP44-style, Currency-Specific)

**Use Case:** Find next unused address with gap limit

```typescript
type Currency = 'bsv' | 'mnee';

async function findNextUnusedAddress(
  deriver: BRC42KeyDeriver,
  currency: Currency,
  checkUsed: (address: string) => Promise<boolean>,
  gapLimit: number = 20
): Promise<{ address: string; keyID: string; index: number }> {
  let consecutiveUnused = 0;
  let index = 0;

  while (consecutiveUnused < gapLimit) {
    const keyID = `${currency}_receive/${index}`;
    const key = deriver.deriveKey(
      GOJI_PROTOCOLS.WALLET_APP.id,
      keyID,
      'self'
    );

    const isUsed = await checkUsed(key.address);

    if (isUsed) {
      consecutiveUnused = 0;  // Reset counter
    } else {
      consecutiveUnused++;

      if (consecutiveUnused === 1) {
        // First unused address
        return { address: key.address, keyID, index };
      }
    }

    index++;
  }

  // Should never reach here
  throw new Error('Gap limit exceeded');
}

// Usage
const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic: '...' });

// Find next unused BSV address
const nextBsvAddress = await findNextUnusedAddress(
  deriver,
  'bsv',
  async (address) => {
    // Check blockchain API if address has transactions
    const response = await fetch(`https://api.example.com/bsv/address/${address}`);
    const data = await response.json();
    return data.txCount > 0;
  },
  20  // Gap limit
);

console.log(nextBsvAddress);
// { address: '1ABC...', keyID: 'bsv_receive/5', index: 5 }

// Find next unused MNEE address
const nextMneeAddress = await findNextUnusedAddress(
  deriver,
  'mnee',
  async (address) => {
    const response = await fetch(`https://api.example.com/mnee/address/${address}`);
    const data = await response.json();
    return data.txCount > 0;
  },
  20
);

console.log(nextMneeAddress);
// { address: '1XYZ...', keyID: 'mnee_receive/3', index: 3 }
```

### Pattern 5: Bulk Key Derivation (Performance, Currency-Specific)

**Use Case:** Derive many keys efficiently

```typescript
type Currency = 'bsv' | 'mnee';
type KeyType = 'receive' | 'change' | 'savings' | 'trading';

function deriveKeysBulk(
  deriver: BRC42KeyDeriver,
  currency: Currency,
  type: KeyType,
  startIndex: number,
  count: number
): DerivedBRC42Key[] {
  const keys: DerivedBRC42Key[] = [];

  for (let i = 0; i < count; i++) {
    const index = startIndex + i;
    const keyID = `${currency}_${type}/${index}`;

    const key = deriver.deriveKey(
      GOJI_PROTOCOLS.WALLET_APP.id,
      keyID,
      'self'
    );

    keys.push(key);
  }

  return keys;
}

// Usage
const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic: '...' });

// Derive 100 BSV receiving addresses starting from index 0
const bsvReceiveKeys = deriveKeysBulk(deriver, 'bsv', 'receive', 0, 100);
console.log(bsvReceiveKeys.length);    // 100
console.log(bsvReceiveKeys[0].keyID);  // 'bsv_receive/0'
console.log(bsvReceiveKeys[99].keyID); // 'bsv_receive/99'

// Derive 50 MNEE change addresses starting from index 10
const mneeChangeKeys = deriveKeysBulk(deriver, 'mnee', 'change', 10, 50);
console.log(mneeChangeKeys.length);    // 50
console.log(mneeChangeKeys[0].keyID);  // 'mnee_change/10'
console.log(mneeChangeKeys[49].keyID); // 'mnee_change/59'
```

---

## 10. Critical Don'ts for Coding Agent

### ❌ DO NOT: Change the Protocol ID

```typescript
// ❌ NEVER DO THIS - breaks wallet recovery
const protocol = [2, 'different protocol name'];
const key = deriver.deriveKey(protocol, 'receive/0', 'self');

// Result: Completely different address
// Original funds become PERMANENTLY INACCESSIBLE
```

**Why:**
- Protocol ID is cryptographic input to HMAC-SHA256
- Changing even one character generates different keys
- Original wallet shows zero balance
- Funds are NOT lost (still on blockchain) but INACCESSIBLE

**Rule:**
✅ ALWAYS use `GOJI_PROTOCOLS.WALLET_APP.id`
❌ NEVER create custom protocol IDs

---

### ❌ DO NOT: Use Dots in Protocol Name

```typescript
// ❌ Will throw SDK validation error
const protocol = [2, 'com.gojiwallet.app'];
const key = deriver.deriveKey(protocol, 'receive/0', 'self');

// Error: Protocol names can only contain letters, numbers and spaces
```

**Why:**
- @bsv/sdk enforces regex: `/^[a-z0-9 ]+$/g`
- Only lowercase letters, numbers, spaces allowed
- Dots, hyphens, underscores = validation error

**Rule:**
✅ Use spaces: `'com gojiwallet app'`
❌ Use dots: `'com.gojiwallet.app'`

---

### ❌ DO NOT: Use Old Pattern Without Currency Prefix

```typescript
// ❌ Old pattern - missing currency prefix
const keyID = 'receive/0';
const key = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, keyID, 'self');

// ❌ Old change pattern - missing currency prefix
const keyID = 'change/0';

// ✅ New pattern - includes currency prefix
const keyID = 'bsv_receive/0';  // BSV wallet
const key = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, keyID, 'self');

// ✅ Or for MNEE wallet
const keyID = 'mnee_receive/0';  // MNEE wallet
const key = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, keyID, 'self');
```

**Why:**
- Old pattern (deprecated): `'receive/0'`, `'change/0'` (no currency identifier)
- New pattern (current): `'bsv_receive/0'`, `'mnee_receive/0'` (currency-specific)
- Currency prefix enables multi-wallet architecture
- Different currencies = different addresses from same mnemonic

**Rule:**
✅ Use currency prefix: `'bsv_receive/0'`, `'mnee_change/0'`
❌ Missing currency: `'receive/0'`, `'change/0'`

---

### ❌ DO NOT: Use Old Hyphen Pattern for KeyID

```typescript
// ❌ Old pattern - deprecated hyphen format
const keyID = 'address-0';
const key = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, keyID, 'self');

// ❌ Old receive pattern - deprecated
const keyID = 'receive-0';

// ✅ New pattern - forward slash with currency prefix
const keyID = 'bsv_receive/0';
const key = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, keyID, 'self');
```

**Why:**
- Old pattern: `'address-0'`, `'receive-0'`, `'change-0'` (hyphen)
- New pattern: `'bsv_receive/0'`, `'mnee_change/0'` (forward slash + currency)
- Hyphen was replaced with forward slash
- Currency prefix added for multi-wallet support

**Rule:**
✅ Use forward slash + currency: `'bsv_receive/0'`
❌ Use hyphen: `'receive-0'`, `'address-0'`

---

### ❌ DO NOT: Use WALLET_RECEIVE or WALLET_CHANGE

```typescript
// ❌ These protocols no longer exist
GOJI_PROTOCOLS.WALLET_RECEIVE  // undefined
GOJI_PROTOCOLS.WALLET_CHANGE   // undefined

// ✅ Use single protocol
GOJI_PROTOCOLS.WALLET_APP      // ✅ correct
```

**Why:**
- Multiple protocols were consolidated into single protocol
- `WALLET_RECEIVE` and `WALLET_CHANGE` removed from registry
- Only `WALLET_APP` exists now

**Rule:**
✅ Use `GOJI_PROTOCOLS.WALLET_APP`
❌ Use `GOJI_PROTOCOLS.WALLET_RECEIVE`
❌ Use `GOJI_PROTOCOLS.WALLET_CHANGE`

---

### ❌ DO NOT: Use SecurityLevel.HIGH

```typescript
// ❌ Not supported by BSV SDK CachedKeyDeriver
const protocol = [SecurityLevel.HIGH, 'com gojiwallet app'];
const key = deriver.deriveKey(protocol, 'receive/0', 'self');

// Error: Security level 3 not supported

// ✅ Use STANDARD for wallets
const protocol = GOJI_PROTOCOLS.WALLET_APP.id;  // Uses SecurityLevel.STANDARD
const key = deriver.deriveKey(protocol, 'receive/0', 'self');
```

**Why:**
- BSV SDK's CachedKeyDeriver only supports levels 0, 1, 2
- Level 3 (HIGH) is defined but NOT usable
- Will throw error if attempted

**Rule:**
✅ Use `SecurityLevel.STANDARD` (level 2)
❌ Use `SecurityLevel.HIGH` (level 3)

---

### ❌ DO NOT: Hardcode Protocol ID Strings

```typescript
// ❌ Hardcoded - fragile, error-prone
const protocol = [2, 'com gojiwallet app'];
const key = deriver.deriveKey(protocol, 'receive/0', 'self');

// ✅ Use constant - maintainable, type-safe
const protocol = GOJI_PROTOCOLS.WALLET_APP.id;
const key = deriver.deriveKey(protocol, 'receive/0', 'self');
```

**Why:**
- Hardcoding = typo risk
- Hardcoding = no type safety
- Hardcoding = difficult to refactor
- Using constant = single source of truth

**Rule:**
✅ Use `GOJI_PROTOCOLS.WALLET_APP.id`
❌ Hardcode `[2, 'com gojiwallet app']`

---

### ❌ DO NOT: Store Private Keys

```typescript
// ❌ NEVER store private key
const key = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, 'receive/0', 'self');
localStorage.setItem('privateKey', key.privateKey.toHex());  // ❌ SECURITY RISK

// ✅ Store mnemonic (encrypted)
const encryptedMnemonic = encrypt(mnemonic, userPassword);
secureStorage.store('mnemonic', encryptedMnemonic);

// ✅ Derive private key when needed
const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic });
const key = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, 'receive/0', 'self');
// Use key.privateKey for transaction signing
// Clear from memory immediately after
```

**Why:**
- Private keys = complete control over funds
- If leaked = funds can be stolen
- Mnemonic can be encrypted
- Derive keys on-demand from mnemonic

**Rule:**
✅ Store mnemonic (encrypted)
✅ Derive keys when needed
❌ Store private keys

---

## 11. Testing References

### Test Files (Reference Patterns)

#### 1. Protocol Registry Tests

**File:** `/libs/blockchain-lib/src/brc42/protocol-registry.spec.ts`

**What to learn:**
- How to test protocol definitions
- How to verify protocol ID format
- How to test parseProtocolID() and formatProtocolID()

**Example Test:**
```typescript
describe('GOJI_PROTOCOLS', () => {
  describe('WALLET_APP', () => {
    const protocol = GOJI_PROTOCOLS.WALLET_APP;

    it('should have correct protocol ID', () => {
      expect(protocol.id).toEqual([SecurityLevel.STANDARD, 'com gojiwallet app']);
    });

    it('should have correct metadata with currency-aware keyID pattern', () => {
      expect(protocol.name).toBe('Goji Wallet');
      expect(protocol.description).toBe('Primary key derivation protocol for Goji Wallet application. Use keyID pattern: {currency}_{type}/{index}');
      expect(protocol.securityLevel).toBe(SecurityLevel.STANDARD);
      expect(protocol.protocolName).toBe('com gojiwallet app');
    });

    it('should have security level 2', () => {
      expect(protocol.id[0]).toBe(2);
    });

    it('should be the only protocol in registry', () => {
      const protocolKeys = Object.keys(GOJI_PROTOCOLS);
      expect(protocolKeys).toEqual(['WALLET_APP']);
    });
  });
});
```

#### 2. Key Derivation Tests

**File:** `/libs/blockchain-lib/src/brc42/key-deriver.spec.ts`

**What to learn:**
- How to test key derivation
- How to verify determinism (same input = same output)
- How to test different key types (receive, change)

**Example Test:**
```typescript
describe('BRC42KeyDeriver', () => {
  const TEST_MNEMONIC = 'witch collapse practice feed shame open despair creek road again ice least';
  let deriver: BRC42KeyDeriver;

  beforeEach(() => {
    deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic: TEST_MNEMONIC });
  });

  it('should derive key with WALLET_APP protocol (BSV receive address)', () => {
    const protocol = GOJI_PROTOCOLS.WALLET_APP;
    const keyID = 'bsv_receive/0';  // Currency-specific keyID

    const derivedKey = deriver.deriveKey(protocol.id, keyID, 'self');

    expect(derivedKey.privateKey).toBeTruthy();
    expect(derivedKey.publicKey).toBeTruthy();
    expect(derivedKey.address).toBeTruthy();
    expect(derivedKey.protocolID).toBe('2-com gojiwallet app');
    expect(derivedKey.keyID).toBe('bsv_receive/0');  // BSV currency
    expect(derivedKey.counterparty).toBe('self');
  });

  it('should derive deterministic addresses', () => {
    const protocol = GOJI_PROTOCOLS.WALLET_APP;
    const keyID = 'bsv_receive/0';

    const key1 = deriver.deriveKey(protocol.id, keyID, 'self');
    const key2 = deriver.deriveKey(protocol.id, keyID, 'self');

    expect(key1.address).toBe(key2.address);  // Deterministic
    expect(key1.publicKey.toDER('hex')).toBe(key2.publicKey.toDER('hex'));
  });

  it('should derive different keys for different currencies (BSV vs MNEE)', () => {
    const protocol = GOJI_PROTOCOLS.WALLET_APP;

    const bsvKey = deriver.deriveKey(protocol.id, 'bsv_receive/0', 'self');
    const mneeKey = deriver.deriveKey(protocol.id, 'mnee_receive/0', 'self');

    // Different currencies = different addresses
    expect(bsvKey.address).not.toBe(mneeKey.address);
    expect(bsvKey.publicKey.toDER('hex')).not.toBe(mneeKey.publicKey.toDER('hex'));
    expect(bsvKey.privateKey.toHex()).not.toBe(mneeKey.privateKey.toHex());
  });

  it('should derive different keys for different key types (receive vs change)', () => {
    const protocol = GOJI_PROTOCOLS.WALLET_APP;

    const receiveKey = deriver.deriveKey(protocol.id, 'bsv_receive/0', 'self');
    const changeKey = deriver.deriveKey(protocol.id, 'bsv_change/0', 'self');

    expect(receiveKey.address).not.toBe(changeKey.address);
    expect(receiveKey.publicKey.toDER('hex')).not.toBe(changeKey.publicKey.toDER('hex'));
    expect(receiveKey.privateKey.toHex()).not.toBe(changeKey.privateKey.toHex());
  });
});
```

#### 3. Wallet Creation Tests

**File:** `/libs/blockchain-lib/src/bsv/wallet-creation-service.spec.ts`

**What to learn:**
- How to test wallet creation
- How to verify correct protocol usage
- How to test keyID format

**Example Test:**
```typescript
describe('WalletCreationService', () => {
  describe('createBSVWallet', () => {
    it('should use WALLET_APP protocol with BSV currency prefix', () => {
      const wallet = WalletCreationService.createBSVWallet();

      expect(wallet.protocolID).toBe('2-com gojiwallet app');
      expect(wallet.keyID).toBe('bsv_receive/0');  // BSV currency prefix
      expect(wallet.currency).toBe('bsv');
    });

    it('should use first BSV receiving address key ID', () => {
      const wallet = WalletCreationService.createBSVWallet();

      expect(wallet.keyID).toBe('bsv_receive/0');
    });

    it('should produce deterministic results from same mnemonic', () => {
      const mnemonic = 'witch collapse practice feed shame open despair creek road again ice least';

      // Create wallet
      const wallet = WalletCreationService.createBSVWallet();

      // Manually derive the same address from the mnemonic
      const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic: wallet.mnemonic });
      const protocol = GOJI_PROTOCOLS.WALLET_APP;
      const derivedKey = deriver.deriveKey(protocol.id, 'bsv_receive/0', 'self');

      expect(derivedKey.address).toBe(wallet.address);
      expect(derivedKey.publicKey.toDER('hex')).toBe(wallet.publicKey);
      expect(derivedKey.protocolID).toBe(wallet.protocolID);
      expect(derivedKey.keyID).toBe(wallet.keyID);
      expect(deriver.getRootPublicKey()).toBe(wallet.rootPublicKey);
    });
  });

  describe('createMNEEWallet', () => {
    it('should use WALLET_APP protocol with MNEE currency prefix', () => {
      const wallet = WalletCreationService.createMNEEWallet();

      expect(wallet.protocolID).toBe('2-com gojiwallet app');
      expect(wallet.keyID).toBe('mnee_receive/0');  // MNEE currency prefix
      expect(wallet.currency).toBe('mnee');
    });

    it('should generate different address from BSV wallet with same mnemonic', () => {
      const mnemonic = 'witch collapse practice feed shame open despair creek road again ice least';

      const bsvWallet = WalletCreationService.createBSVWallet();
      const mneeWallet = WalletCreationService.createMNEEWallet(bsvWallet.mnemonic);

      // Same mnemonic
      expect(bsvWallet.mnemonic).toBe(mneeWallet.mnemonic);

      // Different currencies
      expect(bsvWallet.currency).toBe('bsv');
      expect(mneeWallet.currency).toBe('mnee');

      // Different keyIDs
      expect(bsvWallet.keyID).toBe('bsv_receive/0');
      expect(mneeWallet.keyID).toBe('mnee_receive/0');

      // Different addresses
      expect(bsvWallet.address).not.toBe(mneeWallet.address);
    });
  });
});
```

---

## 12. Documentation References

### Internal Documentation

#### 1. README

**File:** `/libs/blockchain-lib/README-REACT-NATIVE.md`

**Contains:**
- Basic usage examples
- Client-side key derivation patterns
- React Native specific notes

**Key Section:**
```markdown
### BRC-42 Key Derivation

// Derive BSV change key for specific protocol
const key = deriver.deriveKey(
  [SecurityLevel.STANDARD, 'com gojiwallet app'],  // Protocol ID
  'bsv_change/0',                                      // Key ID (currency_type/index pattern)
  'self'                                               // Counterparty
);
```

#### 2. Architecture Documentation

**File:** `/docs/architecture/blockchain-lib-client-server-separation.md`

**Contains:**
- Client/server separation pattern
- Platform-specific exports
- Security considerations
- BRC-42 usage examples

**Key Section:**
```typescript
// Derive BSV key for receiving payments
const bsvReceiveKey = deriver.deriveKey(
  [SecurityLevel.STANDARD, 'com gojiwallet app'],  // Protocol ID
  'bsv_receive/0',                                      // Key ID (currency_type/index pattern)
  'self'                                                // Counterparty
);

// Derive MNEE key for change outputs
const mneeChangeKey = deriver.deriveKey(
  [SecurityLevel.STANDARD, 'com gojiwallet app'],
  'mnee_change/0',                                      // Key ID (currency_type/index pattern)
  'self'
);
```

### External Documentation

#### 3. BRC-42 Specification

**URL:** https://github.com/bitcoin-sv/BRCs/blob/master/key-derivation/0042.md

**Contains:**
- Official BRC-42 standard
- Protocol ID format specification
- Derivation algorithm details
- Security level definitions
- HMAC-SHA256 derivation process

**Key Concepts:**
- ProtocolID format: `[SecurityLevel, ProtocolName]`
- KeyID: Application-specific identifier
- Counterparty: 'self', 'anyone', or specific identifier
- Deterministic derivation

#### 4. BSV SDK Documentation

**URL:** https://docs.bsvblockchain.org/

**Contains:**
- @bsv/sdk API reference
- CachedKeyDeriver documentation
- SecurityLevel enum
- PrivateKey / PublicKey classes
- Transaction building

**Relevant Sections:**
- `@bsv/sdk/wallet` - CachedKeyDeriver
- `@bsv/sdk` - PrivateKey, PublicKey
- `@bsv/sdk/compat` - Mnemonic

---

## 13. Quick Reference Card

### Copy-Paste Ready Code for Coding Agent

```typescript
// ============================================
// BRC-42 Protocol ID Quick Reference
// ============================================

// ============================================
// 1. IMPORTS
// ============================================

// Client-side (React Native)
import {
  BRC42KeyDeriver,
  GOJI_PROTOCOLS,
  SecurityLevel,
  type DerivedBRC42Key,
  type ProtocolID
} from '@goji-system/blockchain-lib/client';

// Server-side (NestJS)
import {
  BRC42KeyDeriver,
  GOJI_PROTOCOLS,
  SecurityLevel,
  type DerivedBRC42Key,
  type ProtocolID
} from '@goji-system/blockchain-lib/server';

// ============================================
// 2. PROTOCOL ID (IMMUTABLE - DO NOT CHANGE)
// ============================================

const PROTOCOL = GOJI_PROTOCOLS.WALLET_APP;
// = {
//   id: [SecurityLevel.STANDARD, 'com gojiwallet app'],
//   name: 'Goji Wallet',
//   description: 'Primary key derivation protocol...',
//   securityLevel: SecurityLevel.STANDARD,
//   protocolName: 'com gojiwallet app'
// }

// Protocol ID tuple
const protocolID = PROTOCOL.id;
// = [2, 'com gojiwallet app']

// Formatted string
const formattedID = '2-com gojiwallet app';

// ============================================
// 3. CREATE KEY DERIVER
// ============================================

const mnemonic = 'witch collapse practice feed...';  // 12 or 24 words

const deriver = BRC42KeyDeriver.fromMnemonic({
  mnemonic: mnemonic,
  passphrase: 'optional-passphrase'  // Optional
});

// ============================================
// 4. DERIVE KEYS (CURRENCY-SPECIFIC)
// ============================================

// BSV wallet keys
const bsvReceive = deriver.deriveKey(PROTOCOL.id, 'bsv_receive/0', 'self');
const bsvReceive2 = deriver.deriveKey(PROTOCOL.id, 'bsv_receive/1', 'self');
const bsvChange = deriver.deriveKey(PROTOCOL.id, 'bsv_change/0', 'self');

// MNEE wallet keys
const mneeReceive = deriver.deriveKey(PROTOCOL.id, 'mnee_receive/0', 'self');
const mneeChange = deriver.deriveKey(PROTOCOL.id, 'mnee_change/0', 'self');

// Future: Other key types
const bsvSavings = deriver.deriveKey(PROTOCOL.id, 'bsv_savings/0', 'self');
const mneeTrading = deriver.deriveKey(PROTOCOL.id, 'mnee_trading/0', 'self');

// ============================================
// 5. KEYID PATTERN: '{currency}_{type}/{index}'
// ============================================

// Format: currency + '_' + type + '/' + index
// - currency: lowercase currency code (e.g., 'bsv', 'mnee')
// - type: lowercase key purpose (e.g., 'receive', 'change', 'savings')
// - index: non-negative integer starting from 0

// BSV examples:
'bsv_receive/0', 'bsv_receive/1', 'bsv_receive/2', ...
'bsv_change/0', 'bsv_change/1', 'bsv_change/2', ...
'bsv_savings/0', 'bsv_trading/0', ...

// MNEE examples:
'mnee_receive/0', 'mnee_receive/1', 'mnee_receive/2', ...
'mnee_change/0', 'mnee_change/1', 'mnee_change/2', ...
'mnee_savings/0', 'mnee_trading/0', ...

// ============================================
// 6. EXTRACT WALLET INFO (MULTI-CURRENCY)
// ============================================

// BSV Wallet
const bsvWallet = {
  mnemonic: mnemonic,                           // BIP39 mnemonic
  currency: 'bsv',                              // Currency identifier
  address: bsvReceive.address,                  // '1ABC...'
  publicKey: bsvReceive.publicKey.toDER('hex'), // Hex public key
  protocolID: bsvReceive.protocolID,            // '2-com gojiwallet app'
  keyID: bsvReceive.keyID,                      // 'bsv_receive/0'
  rootPublicKey: deriver.getRootPublicKey(),    // Root public key
  counterparty: bsvReceive.counterparty         // 'self'
};

// MNEE Wallet (same mnemonic, different address)
const mneeWallet = {
  mnemonic: mnemonic,                            // Same mnemonic
  currency: 'mnee',                              // Different currency
  address: mneeReceive.address,                  // Different address!
  publicKey: mneeReceive.publicKey.toDER('hex'),
  protocolID: mneeReceive.protocolID,            // Same protocol ID
  keyID: mneeReceive.keyID,                      // 'mnee_receive/0'
  rootPublicKey: deriver.getRootPublicKey(),     // Same root public key
  counterparty: mneeReceive.counterparty
};

// ============================================
// 7. CRITICAL CONSTRAINTS
// ============================================

// ✅ ALWAYS DO:
// ✅ USE: SecurityLevel.STANDARD (level 2)
// ✅ USE: Spaces in protocol name ('com gojiwallet app')
// ✅ USE: Currency prefix in keyID ('bsv_receive/0', 'mnee_receive/0')
// ✅ USE: GOJI_PROTOCOLS.WALLET_APP constant
// ✅ USE: Constants, not hardcoded strings

// ❌ NEVER DO:
// ❌ NEVER: Change protocol ID after release (breaks wallet recovery)
// ❌ NEVER: Use dots ('com.gojiwallet.app') - SDK validation error
// ❌ NEVER: Use SecurityLevel.HIGH (not supported by SDK)
// ❌ NEVER: Use old pattern without currency ('receive/0', 'change/0')
// ❌ NEVER: Use old hyphen pattern ('address-0', 'receive-0')
// ❌ NEVER: Use WALLET_RECEIVE or WALLET_CHANGE (removed)
// ❌ NEVER: Hardcode protocol ID strings
// ❌ NEVER: Store private keys (derive from mnemonic when needed)

// ============================================
// 8. HELPER FUNCTIONS (CURRENCY-AWARE)
// ============================================

type Currency = 'bsv' | 'mnee';
type KeyType = 'receive' | 'change' | 'savings' | 'trading';

// Generate keyID
function generateKeyID(
  currency: Currency,
  type: KeyType,
  index: number
): string {
  return `${currency}_${type}/${index}`;
}

// Parse keyID
function parseKeyID(keyID: string): {
  currency: string;
  type: string;
  index: number;
} {
  const [currencyType, indexStr] = keyID.split('/');
  const [currency, type] = currencyType.split('_');
  return { currency, type, index: parseInt(indexStr, 10) };
}

// Derive key by currency and type
function deriveKeyByCurrencyAndType(
  deriver: BRC42KeyDeriver,
  currency: Currency,
  type: KeyType,
  index: number
): DerivedBRC42Key {
  const keyID = generateKeyID(currency, type, index);
  return deriver.deriveKey(PROTOCOL.id, keyID, 'self');
}

// ============================================
// 9. FILE LOCATIONS
// ============================================

// Protocol Registry:
//   /libs/blockchain-lib/src/brc42/protocol-registry.ts

// Key Derivation:
//   /libs/blockchain-lib/src/brc42/key-deriver.ts

// Wallet Creation Service:
//   /libs/blockchain-lib/src/bsv/wallet-creation-service.ts

// Platform Exports:
//   /libs/blockchain-lib/src/client/index.ts (React Native)
//   /libs/blockchain-lib/src/server/index.ts (NestJS)

// ============================================
// 10. EXAMPLE: MULTI-CURRENCY WALLET CREATION
// ============================================

import { BRC42KeyDeriver, GOJI_PROTOCOLS } from '@goji-system/blockchain-lib/client';

// 1. Generate/import mnemonic
const mnemonic = 'witch collapse practice feed shame open despair creek road again ice least';

// 2. Create deriver
const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic });

// 3. Derive BSV receiving key
const bsvKey = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, 'bsv_receive/0', 'self');

// 4. Derive MNEE receiving key (same mnemonic, different address!)
const mneeKey = deriver.deriveKey(GOJI_PROTOCOLS.WALLET_APP.id, 'mnee_receive/0', 'self');

// 5. Create BSV wallet object
const bsvWallet = {
  mnemonic: mnemonic,
  currency: 'bsv',
  address: bsvKey.address,
  publicKey: bsvKey.publicKey.toDER('hex'),
  protocolID: bsvKey.protocolID,
  keyID: bsvKey.keyID,  // 'bsv_receive/0'
  rootPublicKey: deriver.getRootPublicKey()
};

// 6. Create MNEE wallet object
const mneeWallet = {
  mnemonic: mnemonic,
  currency: 'mnee',
  address: mneeKey.address,
  publicKey: mneeKey.publicKey.toDER('hex'),
  protocolID: mneeKey.protocolID,
  keyID: mneeKey.keyID,  // 'mnee_receive/0'
  rootPublicKey: deriver.getRootPublicKey()
};

// Done! Multi-currency wallets created from single mnemonic.
// bsvWallet.address !== mneeWallet.address (different addresses)
```

---

## End of Guide

**For Questions or Issues:**
- Check test files for reference patterns
- Review internal documentation (README, architecture docs)
- Consult BRC-42 specification for cryptographic details
- Reference BSV SDK docs for API details

**Remember:**
- Protocol ID is IMMUTABLE (never change after release)
- Use SDK-compliant naming (spaces, not dots)
- Always use GOJI_PROTOCOLS.WALLET_APP constant
- Follow keyID pattern: `'{type}/{index}'`
- Security level: STANDARD (level 2)

**Good luck with your wallet implementation!**
