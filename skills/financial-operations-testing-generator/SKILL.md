---
name: financial-operations-testing-generator
description: This skill should be used when generating test suites for financial operations (wallet operations, transactions, balance calculations, currency conversions), ensuring Decimal.js usage for monetary calculations, creating co-located test files, validating 95%+ coverage for financial code, or implementing the proven 32-phase testing methodology that achieved 99%+ coverage. Use when writing tests for new financial features, improving test coverage for existing financial code, or applying world-class testing standards to critical financial operations.
---

# Financial Operations Testing Generator

## Overview

This skill generates comprehensive test suites for financial operations using the proven 32-phase testing methodology that achieved 99.65% coverage in wallet-lib and 99.18% in auth-lib. The skill ensures Decimal.js is used for all monetary calculations, enforces co-located test structure, and validates 95%+ coverage for financial code.

## When to Use This Skill

Use this skill when:
- Writing tests for new financial operations (wallet, transactions, balances)
- Improving test coverage for existing financial code
- Implementing wallet creation, transaction handling, or currency operations
- Applying the 32-phase testing methodology
- Ensuring Decimal.js usage in monetary calculations
- Validating multi-wallet architecture constraints
- Creating co-located test files with proper structure

## Test Generation Workflow

### Step 1: Analyze Financial Code

Identify the financial operations in the code:
- **Wallet operations**: Creation, balance updates, currency management
- **Transaction operations**: Building, signing, broadcasting, state transitions
- **Balance calculations**: Additions, subtractions, fee calculations
- **Currency operations**: Conversions, validations, multi-wallet constraints
- **UTXO operations**: Selection, change calculation, fee estimation

### Step 2: Apply 32-Phase Methodology

For critical financial code (95%+ coverage required), apply phases:

**Phase 1-8 (Foundation)**: Basic functionality, happy paths, core operations
**Phase 9-16 (Edge Cases)**: Boundary conditions, error handling, validation
**Phase 17-24 (Integration)**: API interactions, database operations, state management
**Phase 25-32 (Advanced)**: Security, concurrency, performance, regression

Read `references/qa-methodology.md` for complete 32-phase breakdown.

### Step 3: Generate Test Structure

Create co-located test file following pattern:

```typescript
// wallet-creation.service.spec.ts (co-located with wallet-creation.service.ts)
import { Test, TestingModule } from '@nestjs/testing';
import Decimal from 'decimal.js';
import { WalletCreationService } from './wallet-creation.service';

describe('WalletCreationService', () => {
  let service: WalletCreationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletCreationService],
    }).compile();

    service = module.get<WalletCreationService>(WalletCreationService);
  });

  describe('Decimal.js Usage', () => {
    it('should use Decimal.js for all monetary calculations', () => {
      const amount = new Decimal('100.50');
      const result = service.calculateBalance(amount);
      expect(result).toBeInstanceOf(Decimal);
    });

    it('should handle precision correctly for satoshis', () => {
      const bsv = new Decimal('0.00000001'); // 1 satoshi
      const satoshis = service.bsvToSatoshis(bsv);
      expect(satoshis.toString()).toBe('1');
    });
  });

  describe('Multi-Wallet Architecture', () => {
    it('should enforce single-currency constraint', () => {
      expect(() => {
        service.createWallet({ currencies: ['BSV', 'MNEE_USD'] });
      }).toThrow('Single-currency constraint violated');
    });

    it('should create separate wallets for different currencies', () => {
      const bsvWallet = service.createWallet({ currency: 'BSV' });
      const usdWallet = service.createWallet({ currency: 'MNEE_USD' });

      expect(bsvWallet.currency).toBe('BSV');
      expect(usdWallet.currency).toBe('MNEE_USD');
      expect(bsvWallet.id).not.toBe(usdWallet.id);
    });
  });

  describe('Transaction Operations', () => {
    it('should calculate transaction fees correctly', () => {
      const inputs = [{ satoshis: new Decimal('100000') }];
      const outputs = [{ satoshis: new Decimal('50000') }];
      const fee = service.calculateFee(inputs, outputs);

      expect(fee).toBeInstanceOf(Decimal);
      expect(fee.toNumber()).toBeGreaterThan(0);
    });

    it('should handle change outputs correctly', () => {
      const tx = service.buildTransaction({
        inputs: [{ satoshis: new Decimal('100000') }],
        outputs: [{ satoshis: new Decimal('50000') }],
        fee: new Decimal('500')
      });

      const changeOutput = tx.outputs.find(o => o.isChange);
      expect(changeOutput?.satoshis.toString()).toBe('49500');
    });

    it('should validate sufficient balance before transaction', () => {
      const balance = new Decimal('1000');
      const amount = new Decimal('2000');

      expect(() => {
        service.createTransaction(balance, amount);
      }).toThrow('Insufficient balance');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid amounts gracefully', () => {
      expect(() => {
        service.calculateBalance(new Decimal('-100'));
      }).toThrow('Amount must be positive');
    });

    it('should handle division by zero in fee calculation', () => {
      expect(() => {
        service.calculateFeeRate(new Decimal('0'));
      }).toThrow('Invalid fee rate');
    });
  });

  describe('Security', () => {
    it('should not expose private keys in error messages', () => {
      const logSpy = jest.spyOn(console, 'error');

      try {
        service.signTransaction(invalidKey);
      } catch (e) {
        expect(logSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('private')
        );
      }
    });

    it('should validate transaction signatures', () => {
      const unsignedTx = service.buildTransaction(validInputs, validOutputs);
      expect(() => {
        service.broadcastTransaction(unsignedTx);
      }).toThrow('Transaction not signed');
    });
  });

  describe('Coverage Validation', () => {
    // Run after implementing all tests
    it('should have 95%+ test coverage', async () => {
      // This test serves as documentation
      // Run: npx nx test <project> --coverage
      // Verify coverage report shows 95%+ for this file
    });
  });
});
```

### Step 4: Test Decimal.js Usage

Ensure all monetary calculations use Decimal.js:

```typescript
describe('Decimal.js Enforcement', () => {
  it('should never use JavaScript number for money', () => {
    // ❌ WRONG
    const wrong = 0.1 + 0.2; // 0.30000000000000004

    // ✅ CORRECT
    const correct = new Decimal('0.1').plus(new Decimal('0.2'));
    expect(correct.toString()).toBe('0.3');
  });

  it('should maintain precision for satoshis', () => {
    const satoshis = new Decimal('100000000'); // 1 BSV
    const bsv = satoshis.dividedBy(new Decimal('100000000'));
    expect(bsv.toString()).toBe('1');
  });

  it('should handle large numbers correctly', () => {
    const largeAmount = new Decimal('999999999999.99999999');
    const result = largeAmount.plus(new Decimal('0.00000001'));
    expect(result.toString()).toBe('1000000000000');
  });
});
```

### Step 5: Validate Coverage

After implementing tests, validate coverage:

```bash
# Run tests with coverage
npx nx test <project> --coverage

# Check coverage report
# Financial operations MUST have 95%+ coverage
```

**Coverage Requirements**:
- Wallet operations: 95%+
- Transaction handling: 95%+
- Balance calculations: 95%+
- Currency operations: 95%+
- Authentication (security-critical): 100%

## Testing Patterns

### Pattern 1: Wallet Creation Tests

```typescript
describe('Wallet Creation', () => {
  it('should create wallet with correct currency', () => {
    const wallet = service.createWallet({ currency: 'BSV' });

    expect(wallet.currency).toBe('BSV');
    expect(wallet.balance).toBeInstanceOf(Decimal);
    expect(wallet.balance.toString()).toBe('0');
  });

  it('should generate unique wallet IDs', () => {
    const wallet1 = service.createWallet({ currency: 'BSV' });
    const wallet2 = service.createWallet({ currency: 'BSV' });

    expect(wallet1.id).not.toBe(wallet2.id);
  });

  it('should initialize wallet with zero balance', () => {
    const wallet = service.createWallet({ currency: 'BSV' });
    expect(wallet.balance.isZero()).toBe(true);
  });
});
```

### Pattern 2: Transaction State Tests

```typescript
describe('Transaction States', () => {
  it('should transition from PENDING to COMPLETED', async () => {
    const tx = await service.createTransaction(validInputs);
    expect(tx.status).toBe('PENDING'); // Uppercase enum

    await service.completeTransaction(tx.id);
    const completed = await service.getTransaction(tx.id);
    expect(completed.status).toBe('COMPLETED');
  });

  it('should handle FAILED transactions correctly', async () => {
    const tx = await service.createTransaction(invalidInputs);

    await expect(
      service.broadcastTransaction(tx.id)
    ).rejects.toThrow();

    const failed = await service.getTransaction(tx.id);
    expect(failed.status).toBe('FAILED');
  });
});
```

### Pattern 3: Balance Calculation Tests

```typescript
describe('Balance Calculations', () => {
  it('should add to balance correctly', () => {
    const initial = new Decimal('100.50');
    const addition = new Decimal('50.25');
    const result = service.addToBalance(initial, addition);

    expect(result.toString()).toBe('150.75');
  });

  it('should subtract from balance correctly', () => {
    const initial = new Decimal('100.50');
    const subtraction = new Decimal('50.25');
    const result = service.subtractFromBalance(initial, subtraction);

    expect(result.toString()).toBe('50.25');
  });

  it('should prevent negative balances', () => {
    const balance = new Decimal('50');
    const withdrawal = new Decimal('100');

    expect(() => {
      service.subtractFromBalance(balance, withdrawal);
    }).toThrow('Insufficient balance');
  });
});
```

## Anti-Patterns to Avoid

**NEVER**:
- ❌ Use JavaScript `number` for monetary calculations
- ❌ Skip test coverage for financial operations
- ❌ Place tests in `__tests__/` directory (use co-location)
- ❌ Use lowercase enum values (`'pending'` should be `'PENDING'`)
- ❌ Test financial code without Decimal.js validation
- ❌ Expose sensitive data (private keys, mnemonics) in test logs
- ❌ Skip edge cases (zero balances, max values, negative inputs)

**ALWAYS**:
- ✅ Use Decimal.js for all monetary calculations
- ✅ Co-locate tests with source files (`.spec.ts` suffix)
- ✅ Achieve 95%+ coverage for financial operations
- ✅ Test transaction state transitions thoroughly
- ✅ Validate single-currency wallet constraint
- ✅ Include security tests (no key exposure, signature validation)
- ✅ Run coverage checks after implementing tests

## Coverage Checklist

Before marking tests as complete:

**Decimal.js Usage**:
- [ ] All monetary calculations use Decimal.js
- [ ] Precision validated for satoshis
- [ ] Large number handling tested
- [ ] Division operations tested

**Multi-Wallet Architecture**:
- [ ] Single-currency constraint tested
- [ ] Separate wallets per currency tested
- [ ] Currency mixing prevention tested

**Transaction Operations**:
- [ ] Transaction building tested
- [ ] Fee calculation tested
- [ ] Change output handling tested
- [ ] Balance validation tested
- [ ] State transitions tested

**Error Handling**:
- [ ] Invalid amounts tested
- [ ] Insufficient balance tested
- [ ] Division by zero tested
- [ ] Invalid currency tested

**Security**:
- [ ] No private key exposure in logs
- [ ] Signature validation tested
- [ ] Authentication tested (if applicable)

**Coverage Requirements**:
- [ ] 95%+ for wallet operations
- [ ] 95%+ for transaction operations
- [ ] 100% for security-critical code

## Resources

### references/

**qa-methodology.md** - Complete 32-phase testing methodology that achieved 99%+ coverage. Read this for systematic approach to testing financial operations.

**testing-framework-guide.md** - Jest + React Native Testing Library setup, co-location requirements, and testing patterns for the Goji system.

**financial-operations-testing.md** (if exists) - Specific procedures for testing financial operations including wallet operations, transactions, and balance management.

## Success Criteria

Tests are complete when:
1. **Coverage**: 95%+ for all financial operations
2. **Decimal.js**: All monetary calculations use Decimal.js
3. **Co-location**: Tests are co-located with source files
4. **Patterns**: All test patterns applied (wallet, transaction, balance)
5. **Security**: No sensitive data exposure, proper validation
6. **Validation**: Coverage report confirms 95%+ achieved

Run `npx nx test <project> --coverage` to validate.
