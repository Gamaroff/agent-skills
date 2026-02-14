# Blockchain-Lib Client/Server Architecture

**Status**: Implemented
**Last Updated**: 2024-01-15
**Related ADRs**: [ADR-005](../adr/ADR-005-client-side-wallet-creation.md), [ADR-006](../adr/ADR-006-bsv-sdk-react-native-polyfills.md)

## Overview

The `blockchain-lib` provides Bitcoin SV wallet functionality for both client (React Native) and server (Node.js/NestJS) environments using a unified codebase based on the official @bsv/sdk.

## Architecture Principles

### 1. Unified SDK

Both environments use **@bsv/sdk** (not separate implementations):

- **Client**: @bsv/sdk with React Native polyfills
- **Server**: @bsv/sdk with native Node.js

### 2. Full Capabilities on Both Sides

Both client and server have **complete wallet functionality**:

- BIP39 mnemonic generation and validation
- BRC-42 key derivation (Type-42 Linked Keys)
- P2PKH address generation
- Transaction signing (future)

### 3. Two Wallet Types

The architecture supports two distinct wallet types:

#### User Wallets (Non-Custodial)

- **Keys**: Generated and stored on client device
- **Signing**: Client signs transactions with local keys
- **Backend**: Stores only addresses (public information)
- **Recovery**: User responsible for mnemonic backup

#### Company Wallets (Custodial)

- **Keys**: Generated and stored on server
- **Signing**: Server signs transactions for Goji operations
- **Backend**: Full control over wallet
- **Use Cases**: Company operations, automated payments, treasury

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Blockchain-Lib Package                       │
│                 @goji-system/blockchain-lib                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼───────┐           ┌───────▼───────┐
        │  /client      │           │  /server      │
        │  Export       │           │  Export       │
        └───────────────┘           └───────────────┘
                │                           │
    ┌───────────┴───────────┐   ┌───────────┴───────────┐
    │                       │   │                       │
┌───▼──────────────┐ ┌──────▼────────┐ ┌──────────────▼─┐
│ React Native App │ │ Future Web    │ │ NestJS Backend │
│                  │ │ App           │ │                │
│ User Wallets     │ │               │ │ Company Wallets│
│ (Non-Custodial)  │ │               │ │ (Custodial)    │
└──────────────────┘ └───────────────┘ └────────────────┘
```

## Client Export (`/client`)

### Entry Point

```typescript
import { ... } from '@goji-system/blockchain-lib/client';
```

Maps to: `libs/blockchain-lib/src/client.ts`

### Exported Functionality

```typescript
// Wallet Creation
export { WalletCreationService } from './bsv/wallet-creation-service';

// BRC-42 Key Derivation
export { BRC42KeyDeriver } from './brc42/key-deriver';
export type { DerivedBRC42Key, BRC42KeyDeriverOptions };

// Address Generation
export { AddressGenerator } from './bsv/address-generator';

// Invoice Generation
export { InvoiceGenerator } from './brc42/invoice-generator';

// Protocol Registry
export {
  SecurityLevel,
  GOJI_PROTOCOLS,
  parseProtocolID,
  formatProtocolID
} from './brc42/protocol-registry';

// Mnemonic Utilities
export { MnemonicGenerator } from './bip39/mnemonic-generator';
export { MnemonicValidator } from './bip39/mnemonic-validator';
export { BIP39_ENGLISH_WORDS } from './bip39/english';

// Secure Random (platform-aware)
export { SecureRandom } from './bip39/secure-random';

// Types
export type {
  WalletCreationResult,
  DerivedAddress,
  ProtocolID,
  ProtocolDefinition,
  ValidationResult
};
```

### React Native Requirements

Client applications must configure polyfills:

1. **Install dependencies**:
   ```bash
   npm install react-native-get-random-values @craftzdog/react-native-buffer readable-stream events
   ```

2. **Import polyfills** (before any blockchain-lib usage):
   ```typescript
   import 'react-native-get-random-values';
   import { Buffer } from '@craftzdog/react-native-buffer';
   global.Buffer = Buffer;
   global.process = { env: {} } as any;
   ```

3. **Configure Metro bundler** (see [README-REACT-NATIVE.md](../../libs/blockchain-lib/README-REACT-NATIVE.md))

## Server Export (`/server`)

### Entry Point

```typescript
import { ... } from '@goji-system/blockchain-lib/server';
```

Maps to: `libs/blockchain-lib/src/server.ts`

### Exported Functionality

Same as `/client` export plus:

```typescript
// NestJS Module Integration
export { BlockchainModule } from './lib/blockchain.module';

// Additional server-specific utilities (if any)
```

### Usage in NestJS

```typescript
import { BlockchainModule } from '@goji-system/blockchain-lib/server';

@Module({
  imports: [BlockchainModule],
  // ...
})
export class AppModule {}
```

## Implementation Examples

### User Wallet Creation (Client)

**Use Case**: User creates new wallet during onboarding

```typescript
import { WalletCreationService } from '@goji-system/blockchain-lib/client';
import * as SecureStore from 'expo-secure-store';

// 1. Generate wallet on device
const wallet = WalletCreationService.createBSVWallet();

// 2. Store mnemonic securely on device (NEVER send to backend)
await SecureStore.setItemAsync('wallet_mnemonic', wallet.mnemonic);

// 3. Send ONLY address to backend
await userService.post('/wallets/register', {
  address: wallet.address,
  publicKey: wallet.publicKey
});

// Result:
// - Mnemonic: Stored in expo-secure-store (encrypted, device-local)
// - Address: Stored in backend database (public)
// - Private Key: NEVER leaves device, derived from mnemonic when needed
```

### Company Wallet Creation (Server)

**Use Case**: Backend creates company wallet for automated operations

```typescript
import { WalletCreationService } from '@goji-system/blockchain-lib/server';

// 1. Generate wallet on server
const companyWallet = WalletCreationService.createBSVWallet();

// 2. Store mnemonic in secure server storage (encrypted)
await this.vaultService.store('company-wallet-mnemonic', companyWallet.mnemonic);

// 3. Store wallet record in database
await this.walletRepository.create({
  address: companyWallet.address,
  publicKey: companyWallet.publicKey,
  type: 'COMPANY',
  purpose: 'TREASURY'
});

// Result:
// - Mnemonic: Stored in HashiCorp Vault or AWS Secrets Manager
// - Address: Stored in database
// - Backend can sign transactions for this wallet
```

### User Transaction Signing (Client)

**Use Case**: User sends payment to another user

```typescript
import { BRC42KeyDeriver } from '@goji-system/blockchain-lib/client';
import * as SecureStore from 'expo-secure-store';

// 1. Retrieve mnemonic from secure storage
const mnemonic = await SecureStore.getItemAsync('wallet_mnemonic');

// 2. Derive signing key
const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic });
const signingKey = deriver.deriveKey(
  [SecurityLevel.STANDARD, 'goji-wallet'],
  'default',
  'self'
);

// 3. Sign transaction (future - when transaction signing is implemented)
// const signedTx = TransactionBuilder.sign(unsignedTx, signingKey.privateKey);

// 4. Broadcast to network
// await blockchainService.broadcast(signedTx);
```

### Company Transaction Signing (Server)

**Use Case**: Backend sends automated payment (e.g., rewards, refunds)

```typescript
import { BRC42KeyDeriver } from '@goji-system/blockchain-lib/server';

// 1. Retrieve mnemonic from secure vault
const mnemonic = await this.vaultService.get('company-wallet-mnemonic');

// 2. Derive signing key
const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic });
const signingKey = deriver.deriveKey(
  [SecurityLevel.STANDARD, 'goji-company'],
  'treasury',
  'self'
);

// 3. Sign and broadcast transaction
// (same as client, but server-side)
```

## BRC-42 Key Derivation

### Protocol-Specific Keys

BRC-42 allows deriving keys for specific protocols and counterparties:

```typescript
import { BRC42KeyDeriver, SecurityLevel } from '@goji-system/blockchain-lib/client';

const deriver = BRC42KeyDeriver.fromMnemonic({ mnemonic });

// Derive key for receiving payments
const receiveKey = deriver.deriveKey(
  [SecurityLevel.STANDARD, 'com gojiwallet app'],  // Protocol ID
  'receive/0',                                          // Key ID (type/index pattern)
  'self'                                                // Counterparty
);

// Derive key for change outputs
const changeKey = deriver.deriveKey(
  [SecurityLevel.STANDARD, 'com gojiwallet app'],
  'change/0',                                            // Key ID (type/index pattern)
  'self'
);

// Derive key for specific counterparty (e.g., group payments)
const groupKey = deriver.deriveKey(
  [SecurityLevel.STANDARD, 'goji-group-payments'],
  'group-123',
  'group-member-456'  // Specific counterparty
);
```

### Invoice Generation

BRC-42 invoices enable counterparty-specific payments:

```typescript
import { InvoiceGenerator } from '@goji-system/blockchain-lib/client';

// Generate invoice for payment
const invoice = InvoiceGenerator.generate({
  protocolID: [SecurityLevel.STANDARD, 'goji-wallet'],
  keyID: 'payment-123',
  counterparty: 'sender-user-id',
  amount: 1000,  // satoshis
  description: 'Payment for services'
});

// Invoice contains:
// - Derivation path for this specific payment
// - Amount and description
// - Counterparty identifier
```

## Security Model

### User Wallets (Non-Custodial)

```
┌────────────────────────────────────────────────────────────┐
│ Client Device (React Native)                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  expo-secure-store (encrypted)                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Mnemonic: "abandon abandon ... art"                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                         │                                  │
│                         ▼                                  │
│  BRC42KeyDeriver.fromMnemonic()                            │
│                         │                                  │
│                         ▼                                  │
│  Private Key: 0x1234... (never stored, derived on demand) │
│                         │                                  │
│                         ▼                                  │
│  Sign Transaction (client-side)                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼ (signed transaction only)
┌────────────────────────────────────────────────────────────┐
│ Backend (NestJS)                                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Database:                                                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa         │ │
│  │ Public Key: 02e9e... (for verification only)        │ │
│  │ Type: USER_WALLET                                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ❌ NEVER receives mnemonic                                │
│  ❌ NEVER receives private key                             │
│  ✅ Only receives signed transactions                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Company Wallets (Custodial)

```
┌────────────────────────────────────────────────────────────┐
│ Backend (NestJS)                                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  HashiCorp Vault / AWS Secrets Manager (encrypted)         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Company Wallet Mnemonic: "abandon ... art"           │ │
│  └──────────────────────────────────────────────────────┘ │
│                         │                                  │
│                         ▼                                  │
│  BRC42KeyDeriver.fromMnemonic()                            │
│                         │                                  │
│                         ▼                                  │
│  Private Key: 0xabcd... (derived on demand)                │
│                         │                                  │
│                         ▼                                  │
│  Sign Transaction (server-side)                            │
│                         │                                  │
│                         ▼                                  │
│  Broadcast to Network                                      │
│                                                            │
│  Database:                                                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Address: 1RebCo...                                   │ │
│  │ Type: COMPANY_WALLET                                 │ │
│  │ Purpose: TREASURY | REWARDS | REFUNDS                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Security Best Practices

### Client-Side (User Wallets)

- ✅ **Store mnemonics in expo-secure-store** (encrypted, device-local)
- ✅ **Generate wallets on device** (per ADR-005)
- ✅ **Sign transactions on device** (private keys never leave)
- ✅ **Validate user input** (mnemonic format, address format)
- ❌ **NEVER log mnemonics** (even in development)
- ❌ **NEVER send mnemonics to backend** (violates non-custodial architecture)
- ❌ **NEVER store in AsyncStorage** (not encrypted)

### Server-Side (Company Wallets)

- ✅ **Store mnemonics in secure vault** (HashiCorp Vault, AWS Secrets Manager)
- ✅ **Encrypt mnemonics at rest** (AES-256 or better)
- ✅ **Use IAM roles for vault access** (not hardcoded credentials)
- ✅ **Audit all wallet operations** (who, what, when)
- ✅ **Implement multi-signature for high-value operations** (future)
- ❌ **NEVER store mnemonics in database** (even encrypted)
- ❌ **NEVER log mnemonics** (even in server logs)

## File Structure

```
libs/blockchain-lib/
├── src/
│   ├── client.ts                      # Client export (React Native)
│   ├── server.ts                      # Server export (Node.js)
│   │
│   ├── bip39/                         # BIP39 Mnemonic (client + server)
│   │   ├── mnemonic-generator.ts      # ✅ Uses @bsv/sdk Hash
│   │   ├── mnemonic-validator.ts      # ✅ Uses @bsv/sdk Hash
│   │   ├── secure-random.ts           # ✅ Platform-aware (expo-crypto | crypto)
│   │   └── english.ts                 # ✅ Wordlist (no dependencies)
│   │
│   ├── brc42/                         # BRC-42 Key Derivation (client + server)
│   │   ├── key-deriver.ts             # ✅ Uses @bsv/sdk (requires polyfills)
│   │   ├── invoice-generator.ts       # ✅ Uses @bsv/sdk
│   │   └── protocol-registry.ts       # ✅ Enums only (no dependencies)
│   │
│   ├── bsv/                           # BSV Utilities (client + server)
│   │   ├── wallet-creation-service.ts # ✅ Uses @bsv/sdk
│   │   ├── address-generator.ts       # ✅ Uses @bsv/sdk
│   │   └── types.ts                   # ✅ Types only
│   │
│   └── lib/
│       ├── blockchain.module.ts       # NestJS module (server-only)
│       └── types/
│           └── blockchain-api.types.ts
│
├── README-REACT-NATIVE.md             # React Native setup guide
└── package.json
```

## Testing Strategy

### Client Tests

```typescript
// Mock @bsv/sdk to avoid polyfill complexity
jest.mock('@bsv/sdk', () => ({
  Hash: {
    sha256: jest.fn(() => new Uint8Array(32))
  },
  PrivateKey: {
    fromRandom: jest.fn()
  }
}));

describe('WalletCreationService (Client)', () => {
  it('should create wallet without polyfills in tests', () => {
    const wallet = WalletCreationService.createBSVWallet();
    expect(wallet.mnemonic).toBeDefined();
    expect(wallet.address).toBeDefined();
  });
});
```

### Server Tests

```typescript
// Use real @bsv/sdk (no polyfills needed in Node.js)
describe('WalletCreationService (Server)', () => {
  it('should create wallet with real @bsv/sdk', () => {
    const wallet = WalletCreationService.createBSVWallet();
    expect(wallet.address).toMatch(/^1[a-zA-Z0-9]{25,34}$/);
  });
});
```

### Integration Tests

```typescript
// Test full flow with device
describe('User Wallet Creation E2E', () => {
  it('should create wallet, store mnemonic, register with backend', async () => {
    // 1. Create wallet
    const wallet = WalletCreationService.createBSVWallet();

    // 2. Store mnemonic
    await SecureStore.setItemAsync('test_mnemonic', wallet.mnemonic);

    // 3. Register with backend
    const response = await userService.post('/wallets/register', {
      address: wallet.address,
      publicKey: wallet.publicKey
    });

    expect(response.success).toBe(true);

    // 4. Verify backend does NOT have mnemonic
    const walletRecord = await walletRepository.findByAddress(wallet.address);
    expect(walletRecord.mnemonic).toBeUndefined();
  });
});
```

## Future Enhancements

### Transaction Signing

```typescript
// Future implementation
export class TransactionBuilder {
  static sign(unsignedTx: Transaction, privateKey: string): SignedTransaction {
    // Use @bsv/sdk transaction signing
  }
}
```

### Multi-Signature Wallets

```typescript
// Future implementation
export class MultiSigWallet {
  static create(requiredSignatures: number, publicKeys: string[]): MultiSigWallet {
    // Implement m-of-n multi-sig
  }
}
```

### SPV (Simplified Payment Verification)

```typescript
// Future implementation
export class SPVClient {
  static verifyTransaction(txid: string, merkleProof: MerkleProof): boolean {
    // Verify transaction inclusion in block
  }
}
```

## Related Documentation

- [README-REACT-NATIVE.md](../../libs/blockchain-lib/README-REACT-NATIVE.md) - Polyfill setup guide
- [ADR-005: Client-Side Wallet Creation](../adr/ADR-005-client-side-wallet-creation.md) - Non-custodial architecture
- [ADR-006: BSV SDK React Native Polyfills](../adr/ADR-006-bsv-sdk-react-native-polyfills.md) - Polyfill decision
- [@bsv/sdk Documentation](https://docs.bsvblockchain.org/)
- [BRC-42 Specification](https://brc.dev/42)
- [Task 49: Streamlined Onboarding](../development/tasks/task.49.streamlined-onboarding/)
- [Task 51: BRC-42 Group Payment Keys](../development/tasks/task.51.brc42-group-payment-keys/)

## Maintenance

This architecture should be reviewed when:

- @bsv/sdk releases major version updates
- React Native adds native crypto support
- New wallet types are required (e.g., multi-sig)
- Transaction signing is implemented
- SPV support is added

## Version History

| Version | Date       | Changes                                      |
|---------|------------|----------------------------------------------|
| 1.0     | 2024-01-15 | Initial implementation with polyfills        |
