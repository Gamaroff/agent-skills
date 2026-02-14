---
name: bsv-wallet-implementer
description: Use this agent when implementing BSV blockchain wallet functionality, including transaction creation, key management, address generation, UTXO handling, or wallet-toolbox integration. Examples - User is implementing BSV wallet features and needs help with transaction signing. user 'I need to implement transaction signing for my BSV wallet' assistant 'I'll use the bsv-wallet-implementer agent to help with proper BSV transaction signing implementation' The user needs BSV-specific wallet implementation help, so use the bsv-wallet-implementer agent. - User is working on UTXO management for their BSV application. user 'How do I properly handle UTXO selection and change outputs in BSV?' assistant 'Let me use the bsv-wallet-implementer agent to provide guidance on BSV UTXO management best practices' This requires BSV blockchain expertise for wallet functionality.
---

# BSV Blockchain Wallet Implementer

## Overview

This skill provides comprehensive guidance for implementing BSV (Bitcoin SV) blockchain wallet functionality following BRC-42 protocol standards, production-grade security patterns, and the Goji multi-wallet architecture. Use this skill when implementing wallet creation, mnemonic management, key derivation, transaction handling, or any BSV blockchain integration.

The skill ensures implementations follow:
- **BRC-42 Protocol** - Standardized key derivation and protocol IDs
- **Multi-Wallet Architecture** - Single-currency wallet constraint (BSV or MNEE USD, never mixed)
- **Production Security** - Mnemonic encryption, secure storage, platform separation
- **95%+ Test Coverage** - Financial operations testing requirements

## When to Use This Skill

Use this skill when implementing:
- New BSV wallet creation with BRC-42 key derivation
- Mnemonic generation, encryption, and secure storage
- Private key management and address generation
- Transaction building, signing, and broadcasting
- UTXO management and coin selection
- Multi-wallet architecture features
- Wallet backup and recovery flows
- BSV blockchain integration in React Native or NestJS

## Core Implementation Workflow

Follow this workflow for wallet implementation tasks:

### 1. Validate Context and Requirements

Before implementing, validate:
- **Platform**: Client (React Native) or Server (NestJS)
- **Security boundary**: Crypto operations MUST be server-side only
- **Wallet type**: BSV or MNEE USD (single-currency constraint)
- **Test coverage**: 95%+ required for financial operations

**Platform Separation (CRITICAL)**:
```typescript
// ✅ Server (NestJS) - Crypto operations allowed
import { PrivateKey } from '@bsv/sdk';
const privateKey = PrivateKey.fromRandom();

// ✅ Client (React Native) - UI and storage only
import { storeMnemonic } from './secureStorage';
await storeMnemonic(encryptedMnemonic);

// ❌ NEVER - Crypto in React Native
import { PrivateKey } from '@bsv/sdk'; // Will fail - Node.js dependency
```

Refer to `references/blockchain-lib-client-server-separation.md` for complete separation patterns.

### 2. Read Reference Documentation

Based on the implementation area, read the relevant references:

**For wallet creation and key derivation**:
- Read `references/BRC42-PROTOCOL-ID-GUIDE.md`
- Focus on: Protocol ID format, key derivation patterns, keyID conventions

**For mnemonic security**:
- Read `references/SECURE-MNEMONIC-STORAGE-IMPLEMENTATION.md`
- Focus on: Encryption patterns, secure storage integration, biometric auth

**For blockchain integration**:
- Read `references/blockchain-architecture.md`
- Focus on: Transaction patterns, UTXO management, broadcasting

**For security requirements**:
- Read `references/blockchain-security-standards.md`
- Focus on: Security checklist, validation requirements, audit standards

### 3. Implement Following Proven Patterns

#### BRC-42 Wallet Creation Pattern

```typescript
import { PrivateKey, HD } from '@bsv/sdk';
import type { ProtocolID, KeyID } from '@bsv/sdk';

// BRC-42 Protocol ID (MUST use this exact format)
const protocolID: ProtocolID = [2, 'com gojiwallet app'];

// Key derivation for primary BSV wallet
const keyID: KeyID = 'wallet-bsv-primary';

// Derive private key from mnemonic
const rootKey = HD.fromString(mnemonic);
const derivedKey = rootKey.derive(`m/42'/2'/0'`);
const privateKey = PrivateKey.fromWif(derivedKey.privKey.toWif());

// Generate address
const address = privateKey.toAddress().toString();
```

**Critical validations**:
- Protocol ID MUST be `[2, 'com gojiwallet app']` (no variations)
- KeyID format: `wallet-{currency}-{purpose}` (e.g., `wallet-bsv-primary`, `wallet-bsv-savings`)
- Single-currency constraint: Each wallet holds ONLY BSV or ONLY MNEE USD

#### Mnemonic Generation and Encryption Pattern

```typescript
// Server-side only (NestJS)
import * as bip39 from 'bip39';
import * as crypto from 'crypto';

// Generate 12-word mnemonic
const mnemonic = bip39.generateMnemonic(128);

// Validate mnemonic
if (!bip39.validateMnemonic(mnemonic)) {
  throw new Error('Invalid mnemonic generated');
}

// Encrypt with device-specific key
const deviceKey = await getDeviceEncryptionKey(); // From secure storage
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', deviceKey, iv);

let encryptedMnemonic = cipher.update(mnemonic, 'utf8', 'hex');
encryptedMnemonic += cipher.final('hex');
const authTag = cipher.getAuthTag().toString('hex');

// Store encrypted mnemonic
await secureStorage.setItem('encrypted_mnemonic', JSON.stringify({
  data: encryptedMnemonic,
  iv: iv.toString('hex'),
  authTag
}));
```

**Security requirements**:
- NEVER store plaintext mnemonics
- ALWAYS use device-specific encryption keys
- ALWAYS use AES-256-GCM with authentication tags
- NEVER expose mnemonics in logs or error messages

Refer to `references/SECURE-MNEMONIC-STORAGE-IMPLEMENTATION.md` for complete encryption patterns.

#### Multi-Wallet Architecture Pattern

```typescript
// Each wallet holds EXACTLY one currency
interface Wallet {
  id: string;
  currency: 'BSV' | 'MNEE_USD'; // Single currency only
  address: string;
  balance: Decimal;
  privateKeyEncrypted: string;
}

// ✅ Correct - Separate wallets per currency
const bsvWallet: Wallet = {
  id: 'wallet-1',
  currency: 'BSV',
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  balance: new Decimal('0.5'),
  privateKeyEncrypted: '...'
};

const usdWallet: Wallet = {
  id: 'wallet-2',
  currency: 'MNEE_USD',
  address: '...',
  balance: new Decimal('100.00'),
  privateKeyEncrypted: '...'
};

// ❌ NEVER - Mixed currency wallet
const invalidWallet = {
  currencies: ['BSV', 'MNEE_USD'], // VIOLATION
  balances: { BSV: '0.5', USD: '100' }
};
```

**Multi-wallet validations**:
- Enforce single-currency constraint in type system
- Validate currency on wallet creation
- Prevent currency mixing in transactions
- Test coverage: 95%+ for wallet operations

#### Transaction Building Pattern

```typescript
import { Transaction, P2PKH, PrivateKey } from '@bsv/sdk';

// Build transaction
const tx = new Transaction();

// Add inputs (UTXOs)
utxos.forEach(utxo => {
  tx.addInput({
    sourceTXID: utxo.txid,
    sourceOutputIndex: utxo.vout,
    unlockingScript: new P2PKH().unlock(privateKey, 'all'),
    sequence: 0xffffffff
  });
});

// Add outputs
tx.addOutput({
  lockingScript: new P2PKH().lock(recipientAddress),
  satoshis: amountSatoshis
});

// Add change output if needed
if (changeSatoshis > 0) {
  tx.addOutput({
    lockingScript: new P2PKH().lock(changeAddress),
    satoshis: changeSatoshis
  });
}

// Sign and serialize
await tx.sign();
const rawTx = tx.toHex();
```

**Transaction validations**:
- Always use Decimal.js for satoshi calculations
- Validate sufficient balance before building
- Include proper fee estimation
- Handle change outputs correctly
- Never expose private keys in logs

### 4. Implement Comprehensive Tests

All wallet implementations MUST include co-located tests with 95%+ coverage.

**Test structure**:
```typescript
// wallet-creation.service.spec.ts (co-located with wallet-creation.service.ts)
describe('WalletCreationService', () => {
  describe('BRC-42 Compliance', () => {
    it('should use correct protocol ID format', () => {
      const protocolID = service.getProtocolID();
      expect(protocolID).toEqual([2, 'com gojiwallet app']);
    });

    it('should generate valid keyID format', () => {
      const keyID = service.generateKeyID('BSV', 'primary');
      expect(keyID).toBe('wallet-bsv-primary');
    });

    it('should derive deterministic keys from mnemonic', () => {
      const mnemonic = 'test mnemonic here...';
      const key1 = service.deriveKey(mnemonic, 'wallet-bsv-primary');
      const key2 = service.deriveKey(mnemonic, 'wallet-bsv-primary');
      expect(key1).toBe(key2); // Deterministic
    });
  });

  describe('Security', () => {
    it('should encrypt mnemonic before storage', async () => {
      const mnemonic = await service.generateMnemonic();
      const stored = await service.storeMnemonic(mnemonic);
      expect(stored).not.toContain(mnemonic); // Encrypted
    });

    it('should use device-specific encryption keys', async () => {
      const key = await service.getEncryptionKey();
      expect(key).toHaveLength(32); // 256-bit key
    });

    it('should never log plaintext mnemonics', () => {
      const logSpy = jest.spyOn(logger, 'error');
      try {
        service.validateMnemonic('invalid mnemonic');
      } catch (e) {
        expect(logSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('invalid mnemonic')
        );
      }
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

  describe('Transaction Handling', () => {
    it('should calculate satoshis correctly using Decimal.js', () => {
      const bsv = new Decimal('0.5');
      const satoshis = service.bsvToSatoshis(bsv);
      expect(satoshis.toString()).toBe('50000000');
    });

    it('should handle change outputs correctly', () => {
      const tx = service.buildTransaction({
        inputs: [{ satoshis: 100000 }],
        outputs: [{ satoshis: 50000 }],
        fee: 500
      });

      const changeOutput = tx.outputs.find(o => o.isChange);
      expect(changeOutput?.satoshis).toBe(49500); // 100000 - 50000 - 500
    });
  });
});
```

**Test coverage requirements**:
- 95%+ for all financial operations
- 100% for security-critical code (mnemonic handling, encryption)
- Integration tests for full wallet creation flow
- Edge cases: Invalid mnemonics, insufficient balance, network errors

### 5. Security Checklist

Before completing any wallet implementation, validate against this security checklist:

**Mnemonic Security**:
- [ ] Mnemonic generated using cryptographically secure randomness
- [ ] Mnemonic encrypted with AES-256-GCM before storage
- [ ] Device-specific encryption keys used
- [ ] Authentication tags validated on decryption
- [ ] No plaintext mnemonics in logs, errors, or memory dumps
- [ ] Secure deletion of plaintext mnemonic after encryption

**Platform Separation**:
- [ ] All crypto operations (key generation, signing) are server-side only
- [ ] React Native code uses `/client` imports only
- [ ] No Node.js dependencies in client bundle
- [ ] API endpoints handle all sensitive operations

**Multi-Wallet Architecture**:
- [ ] Single-currency constraint enforced in types
- [ ] Wallet creation validates currency parameter
- [ ] Transactions validate currency compatibility
- [ ] No currency mixing in any operation

**Transaction Security**:
- [ ] Decimal.js used for all monetary calculations
- [ ] Balance validation before transaction building
- [ ] Fee estimation includes safety margin
- [ ] Private keys never exposed in logs or responses
- [ ] Signed transactions validated before broadcasting

**Test Coverage**:
- [ ] 95%+ coverage for wallet operations
- [ ] 100% coverage for mnemonic handling
- [ ] All security edge cases tested
- [ ] Integration tests for full flows

Refer to `references/blockchain-security-standards.md` for complete security requirements.

## Common Implementation Scenarios

### Scenario 1: Creating First BSV Wallet

**User request**: "I need to create a BSV wallet for the user"

**Implementation approach**:
1. Read `references/BRC42-PROTOCOL-ID-GUIDE.md` for protocol details
2. Read `references/SECURE-MNEMONIC-STORAGE-IMPLEMENTATION.md` for security patterns
3. Generate 12-word mnemonic using `bip39.generateMnemonic(128)`
4. Encrypt mnemonic with device-specific key (AES-256-GCM)
5. Store encrypted mnemonic in secure storage
6. Derive wallet private key using BRC-42 protocol ID `[2, 'com gojiwallet app']`
7. Generate wallet address from private key
8. Create wallet record with currency: 'BSV'
9. Write co-located tests with 95%+ coverage
10. Validate security checklist

### Scenario 2: Implementing Mnemonic Backup

**User request**: "Add ability to view seed phrase for backup"

**Implementation approach**:
1. Read `references/SECURE-MNEMONIC-STORAGE-IMPLEMENTATION.md` for backup patterns
2. Implement biometric authentication requirement
3. Decrypt mnemonic using device key
4. Display mnemonic in secure UI (screenshot prevention)
5. Log security event (mnemonic viewed)
6. Clear mnemonic from memory after display
7. Write tests for auth flow and security logging
8. Validate no mnemonic leakage in logs

### Scenario 3: Multi-Wallet Management

**User request**: "Support multiple BSV wallets for savings and spending"

**Implementation approach**:
1. Read `references/blockchain-architecture.md` for multi-wallet patterns
2. Validate single-currency constraint (all wallets are BSV)
3. Use unique keyIDs: `wallet-bsv-spending`, `wallet-bsv-savings`
4. Derive separate private keys for each wallet
5. Create separate wallet records (all currency: 'BSV')
6. Implement wallet selection UI
7. Test wallet isolation (separate balances, transactions)
8. Validate 95%+ test coverage

### Scenario 4: Transaction Creation

**User request**: "Implement sending BSV to another address"

**Implementation approach**:
1. Read `references/blockchain-architecture.md` for transaction patterns
2. Validate sufficient balance using Decimal.js
3. Select UTXOs for transaction (coin selection)
4. Build transaction with inputs, outputs, change
5. Estimate and add transaction fee
6. Sign transaction with wallet private key
7. Broadcast transaction to BSV network
8. Update wallet balance optimistically
9. Write tests for balance validation, UTXO selection, fee calculation
10. Validate 95%+ test coverage

## Anti-Patterns to Avoid

**NEVER**:
- ❌ Store plaintext mnemonics in any storage
- ❌ Implement crypto operations in React Native client
- ❌ Create mixed-currency wallets (BSV + USD in one wallet)
- ❌ Use lowercase enum values for transaction status
- ❌ Skip test coverage for financial operations
- ❌ Expose private keys or mnemonics in logs
- ❌ Use `any` type for financial data
- ❌ Perform synchronous blockchain operations
- ❌ Hardcode encryption keys or secrets
- ❌ Use non-deterministic key derivation

**ALWAYS**:
- ✅ Encrypt mnemonics with device-specific keys
- ✅ Keep crypto operations server-side (NestJS)
- ✅ Enforce single-currency wallet constraint
- ✅ Use Decimal.js for all monetary calculations
- ✅ Write co-located tests with 95%+ coverage
- ✅ Use BRC-42 protocol ID: `[2, 'com gojiwallet app']`
- ✅ Validate security checklist before completion
- ✅ Use platform-separated imports (`/client` vs `/server`)

## Resources

This skill includes comprehensive reference documentation:

### references/

**BRC42-PROTOCOL-ID-GUIDE.md** - Complete BRC-42 protocol specification
- Protocol ID format and usage
- Key derivation patterns
- KeyID conventions
- Code examples for wallet creation

**SECURE-MNEMONIC-STORAGE-IMPLEMENTATION.md** - Production-grade mnemonic security
- Encryption patterns (AES-256-GCM)
- Secure storage integration
- Biometric authentication
- Security event logging
- Backup and recovery flows

**blockchain-architecture.md** - BSV blockchain integration patterns
- Transaction building and broadcasting
- UTXO management and coin selection
- Multi-wallet architecture
- Network communication patterns

**blockchain-lib-client-server-separation.md** - Platform separation requirements
- Client vs server capabilities
- Import path patterns
- Security boundaries
- Validation enforcement

**blockchain-security-standards.md** - Security requirements and audit checklist
- Cryptographic standards
- Key management requirements
- Transaction security
- Audit procedures
- Compliance requirements

## Success Criteria

A wallet implementation is complete when:

1. **Functionality**: All wallet operations work correctly (creation, backup, transactions)
2. **Security**: All items in security checklist are validated
3. **Architecture**: Single-currency constraint enforced, platform separation maintained
4. **Testing**: 95%+ coverage for wallet operations, 100% for security-critical code
5. **Documentation**: Code includes comments explaining BRC-42 patterns and security decisions
6. **Standards**: Follows all patterns from reference documentation

## Getting Help

If encountering issues:

1. **BRC-42 Questions**: Read `references/BRC42-PROTOCOL-ID-GUIDE.md` thoroughly
2. **Security Questions**: Read `references/SECURE-MNEMONIC-STORAGE-IMPLEMENTATION.md`
3. **Architecture Questions**: Read `references/blockchain-architecture.md`
4. **Platform Separation**: Read `references/blockchain-lib-client-server-separation.md`
5. **Validation Failures**: Check security checklist and test coverage requirements

For questions not covered in references, ask the user for clarification before implementing.
