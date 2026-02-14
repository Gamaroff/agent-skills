---
name: multi-wallet-architecture-enforcer
description: Enforce single-currency wallet constraint and multi-wallet architecture patterns. Use when implementing wallet creation, validating wallet operations, reviewing wallet-related code, or ensuring each wallet holds ONE currency only (BSV or MNEE_USD). Prevents mixed-currency wallets and validates multi-wallet user patterns.
---

# Multi-Wallet Architecture Enforcer

Enforce single-currency wallet constraint and validate multi-wallet architecture patterns.

## When to Use This Skill

Activate this skill when:

1. **Implementing wallet creation** - Ensure single-currency constraint
2. **Validating wallet operations** - Check currency isolation
3. **Reviewing wallet code** - Audit architecture compliance
4. **Adding currency support** - Create separate wallet per currency
5. **Testing wallet features** - Validate multi-wallet scenarios
6. **Auditing wallet data** - Check for mixed-currency violations

## Single-Currency Wallet Constraint

### Critical Rule

**Each wallet holds ONE currency type only. NEVER mix currencies in a single wallet.**

\`\`\`typescript
// ✅ CORRECT - Separate wallets per currency
const bsvWallet = {
  id: 'wallet-123',
  userId: 'user-456',
  currency: 'BSV',
  balance: new Decimal('100.50')
};

const usdWallet = {
  id: 'wallet-789',
  userId: 'user-456',
  currency: 'MNEE_USD',
  balance: new Decimal('500.00')
};

// ❌ INCORRECT - NEVER mix currencies
const mixedWallet = {
  id: 'wallet-bad',
  currencies: ['BSV', 'MNEE_USD'],  // VIOLATION
  balances: {
    BSV: new Decimal('100'),
    MNEE_USD: new Decimal('500')
  }
};
\`\`\`

## Multi-Wallet User Pattern

### User Has Multiple Wallets

\`\`\`typescript
interface User {
  id: string;
  handle: string;
  wallets: Wallet[];  // Multiple wallets, one per currency
}

interface Wallet {
  id: string;
  userId: string;
  currency: 'BSV' | 'MNEE_USD';
  balance: Decimal;
  createdAt: Date;
}

// User with 2 wallets (BSV + USD)
const user = {
  id: 'user-123',
  handle: 'alice',
  wallets: [
    { id: 'w1', userId: 'user-123', currency: 'BSV', balance: new Decimal('10') },
    { id: 'w2', userId: 'user-123', currency: 'MNEE_USD', balance: new Decimal('100') }
  ]
};
\`\`\`

## Wallet Creation Pattern

### Create Separate Wallet Per Currency

\`\`\`typescript
// ✅ CORRECT - Create wallet for specific currency
async function createWallet(userId: string, currency: 'BSV' | 'MNEE_USD') {
  // Check if user already has wallet for this currency
  const existing = await findWalletByUserAndCurrency(userId, currency);
  if (existing) {
    throw new Error(\`User already has a \${currency} wallet\`);
  }

  return await db.wallet.create({
    data: {
      userId,
      currency,
      balance: new Decimal('0')
    }
  });
}

// Create both wallets on user registration
async function createDefaultWallets(userId: string) {
  const bsvWallet = await createWallet(userId, 'BSV');
  const usdWallet = await createWallet(userId, 'MNEE_USD');
  return [bsvWallet, usdWallet];
}
\`\`\`

## Wallet Operations

### Get Wallet by Currency

\`\`\`typescript
function getWalletByCurrency(
  user: User,
  currency: 'BSV' | 'MNEE_USD'
): Wallet {
  const wallet = user.wallets.find(w => w.currency === currency);
  if (!wallet) {
    throw new Error(\`No \${currency} wallet found for user\`);
  }
  return wallet;
}

// Usage
const bsvWallet = getWalletByCurrency(user, 'BSV');
const usdWallet = getWalletByCurrency(user, 'MNEE_USD');
\`\`\`

### Prevent Cross-Currency Transfers

\`\`\`typescript
async function transferBetweenWallets(
  fromWallet: Wallet,
  toWallet: Wallet,
  amount: Decimal
) {
  // Enforce same currency
  if (fromWallet.currency !== toWallet.currency) {
    throw new Error(
      \`Cannot transfer between different currencies: \${fromWallet.currency} → \${toWallet.currency}\`
    );
  }

  // Process transfer
  await processTransfer(fromWallet, toWallet, amount);
}
\`\`\`

## Validation Checklist

### Wallet Creation
- [ ] Each wallet created with single currency
- [ ] No currencies array in wallet schema
- [ ] User can have multiple wallets (one per currency)
- [ ] Prevent duplicate currency wallets per user

### Wallet Operations
- [ ] Balance updates isolated per wallet
- [ ] No cross-currency operations
- [ ] Currency validated before operations
- [ ] Wallet selected by currency

### Schema Validation
- [ ] Wallet has currency field (not currencies)
- [ ] Currency is 'BSV' or 'MNEE_USD'
- [ ] Balance is Decimal type
- [ ] One-to-one currency-to-wallet mapping

## Common Violations

### Violation 1: Mixed-Currency Wallet

\`\`\`typescript
// ❌ VIOLATION
const wallet = {
  balances: {
    BSV: new Decimal('100'),
    MNEE_USD: new Decimal('500')
  }
};

// ✅ CORRECT
const bsvWallet = { currency: 'BSV', balance: new Decimal('100') };
const usdWallet = { currency: 'MNEE_USD', balance: new Decimal('500') };
\`\`\`

### Violation 2: Cross-Currency Transfer

\`\`\`typescript
// ❌ VIOLATION
transferFunds(bsvWallet, usdWallet, amount);

// ✅ CORRECT - Require same currency
if (fromWallet.currency !== toWallet.currency) {
  throw new Error('Currency mismatch');
}
\`\`\`

## Resources

### Reference Documentation

- **architecture.md** - System architecture including multi-wallet design

---

**Skill Version**: 1.0.0
**Last Updated**: 2025-12-31
