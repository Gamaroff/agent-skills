---
name: security-implementation-reviewer
description: Review mnemonic storage, authentication, and encryption implementations against production-grade security standards. Use when auditing security-critical code for defense-in-depth controls, cryptographic best practices, and biometric authentication patterns.
license: Complete terms in LICENSE.txt
---

# Security Implementation Reviewer

## Purpose

To systematically review security implementations in the Goji wallet, focusing on:
- Defense-in-depth encryption architecture (3 layers: application, OS, access control)
- Cryptographic best practices (AES-256-GCM authenticated encryption, PBKDF2 key derivation)
- Biometric and PIN authentication patterns
- Secure storage integration (iOS Keychain, Android KeyStore)
- Security event logging and audit trails

## When to Use

Use this skill when:
- Reviewing mnemonic storage implementations for wallet security
- Validating PIN-based encryption and key derivation
- Auditing biometric authentication integrations
- Checking secure storage patterns (SecureStore)
- Validating crypto operation isolation (server vs client)
- Assessing authentication fallback chains

## Security Review Workflow

### Layer 1: Application Encryption Review

Verify encryption service implements defense-in-depth:

```typescript
// Review checklist for MnemonicEncryptionService
✓ Uses AES-256-GCM (authenticated encryption with built-in AEAD)
✓ Authentication tag generated and validated (GCM built-in)
✓ PBKDF2 key derivation with 100,000+ iterations
✓ Unique salt per encryption (cryptographically random)
✓ Unique IV per encryption (never reused)
✓ No plaintext mnemonic in encrypted output
✓ Comprehensive input validation
✓ Error messages don't leak sensitive information
```

Key questions for encryption review:
1. Are crypto primitives FIPS-approved?
2. Is key derivation using PBKDF2 with sufficient iterations (100,000+)?
3. Are salt and IV truly random, not sequential or hardcoded?
4. Is authentication tag validation mandatory before decryption (GCM AEAD)?
5. Do errors reveal encryption state or sensitive data?

### Layer 2: OS-Level Encryption Review

Validate secure storage integration:

```typescript
// SecureStore verification
✓ iOS: Uses Keychain Services (hardware-backed)
✓ Android: Uses KeyStore system (hardware-backed if available)
✓ Encrypted data stored as JSON strings
✓ No fallback to plain AsyncStorage
✓ Handles hardware unavailability gracefully
✓ Security events logged for storage operations
```

Check that:
- Encrypted data never falls back to unencrypted storage
- Hardware backing is confirmed (iOS Keychain, Android KeyStore)
- Corruption or missing data is handled safely
- Platform-specific availability is addressed

### Layer 3: Access Control Review

Ensure multi-factor authentication chain:

```typescript
// BiometricAuthService verification
✓ Hardware capability detection implemented
✓ Multiple biometric types supported (Face ID, Touch ID, Fingerprint)
✓ Fallback chain: Biometric → Device PIN → App PIN
✓ Context-specific authentication (seed phrase vs transaction)
✓ Authentication failure logging without sensitive data
✓ User-friendly error messages
```

Validate that:
- Biometric capability is tested before attempting authentication
- Fallback order is correct (don't skip stronger methods)
- Each authentication context (seed phrase, transaction) is enforced
- Failure messages don't leak authentication state

## Common Security Issues & Fixes

### Issue 1: Insufficient Key Derivation

**Problem**: PBKDF2 with < 100,000 iterations (enables password cracking)

**Fix**:
```typescript
const derivedKey = await pbkdf2(
  pin,
  salt,
  100000,  // Never below 100,000 iterations
  'sha256'
);
```

### Issue 2: Reused IV/Salt

**Problem**: Same IV/salt across multiple encryptions (reveals patterns)

**Fix**:
```typescript
const salt = randomBytes(32);  // Fresh salt per encryption
const iv = randomBytes(16);    // Fresh IV per encryption
```

### Issue 3: Missing Authentication Tag Validation

**Problem**: AES-GCM without authentication tag validation (no tamper detection)

**Fix**:
```typescript
// Encryption: Generate auth tag (GCM built-in)
const cipher = crypto.createCipheriv('aes-256-gcm', deviceKey, iv);
let encryptedMnemonic = cipher.update(mnemonic, 'utf8', 'hex');
encryptedMnemonic += cipher.final('hex');
const authTag = cipher.getAuthTag().toString('hex');

// Decryption: Validate auth tag before decryption
const decipher = crypto.createDecipheriv('aes-256-gcm', deviceKey, iv);
decipher.setAuthTag(Buffer.from(authTag, 'hex'));
let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
decrypted += decipher.final('utf8'); // Throws if auth tag invalid
```

### Issue 4: Plaintext in Error Messages

**Problem**: Error reveals encryption state

**Fix**:
```typescript
try {
  // decrypt operation
} catch (error) {
  logger.error('Decryption failed');  // No details
  throw new Error('Authentication failed');  // Generic message
}
```

## Security Review Checklist

### Pre-Implementation

- [ ] Threat model documented
- [ ] Key derivation parameters justified
- [ ] Biometric fallback chain designed
- [ ] Error handling strategy defined
- [ ] Logging plan excludes sensitive data

### Post-Implementation

- [ ] All crypto primitives are FIPS-approved
- [ ] Salt/IV random and unique per operation
- [ ] Authentication tag validation mandatory before decryption (GCM AEAD)
- [ ] PIN verification via decryption attempt
- [ ] Biometric fallback chain correct order
- [ ] No plaintext in error messages/logs
- [ ] Security events logged with timestamps
- [ ] Test coverage >95% for crypto operations

### Ongoing Maintenance

- [ ] Regular security dependency audits
- [ ] Crypto library version monitoring
- [ ] Key derivation parameter review
- [ ] Incident response procedures documented

## Reference Documents

See `references/` for detailed architecture:
- `SECURE-MNEMONIC-STORAGE-IMPLEMENTATION.md` - Complete 3-layer architecture
- `application-security-framework.md` - Broader security framework context

## Implementation Locations

Review these files for security patterns:
- `/apps/goji-wallet/services/security/mnemonic-encryption.service.ts` - Encryption layer
- `/apps/goji-wallet/services/security/mnemonic-storage.service.ts` - Storage layer
- `/apps/goji-wallet/services/security/biometric-auth.service.ts` - Access control layer

Run security test coverage: `npx nx test goji-wallet --coverage` (target: >95%)
