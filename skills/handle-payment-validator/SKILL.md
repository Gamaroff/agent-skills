---
name: handle-payment-validator
description: Ensure correct terminology using "handle" not "username" for @handle payments and social features. Use when implementing payment flows, user identity features, reviewing variable names, validating UI labels, or auditing API endpoints. Enforces @handle for payments/social, "username" ONLY for database credentials.
---

# Handle Payment Validator

Validate correct terminology: "handle" for @handle payments/social, "username" only for database credentials.

## When to Use This Skill

Activate this skill when:

1. **Implementing payment flows** - Use @handle for recipient
2. **Creating user identity features** - Use handle for social identity
3. **Reviewing variable names** - Check for username misuse
4. **Validating UI labels** - Ensure correct terminology
5. **Auditing API endpoints** - Check parameter names
6. **Reviewing documentation** - Validate terminology consistency

## Critical Terminology

### Use "handle" for User Identity

**Rule**: Use "handle" for @handle payments, social features, and user-facing identity.

\`\`\`typescript
// ✅ CORRECT
interface User {
  id: string;
  handle: string;        // @alice for payments
  email: string;
  displayName: string;
}

// Payment to @handle
const payment = {
  recipient: '@alice',   // ✅ handle
  amount: new Decimal('100')
};

// Search by handle
async function findUserByHandle(handle: string): Promise<User> {
  return await db.user.findUnique({ where: { handle } });
}

// ❌ INCORRECT
interface User {
  username: string;      // WRONG - use "handle"
}

const payment = {
  recipientUsername: '@alice'  // WRONG - use "handle"
};
\`\`\`

### Use "username" ONLY for Database Credentials

**Rule**: "username" is ONLY for database connection credentials, NOT user identity.

\`\`\`typescript
// ✅ CORRECT - Database credentials only
const dbConfig = {
  host: 'localhost',
  port: 5432,
  username: 'goji_user',  // ✅ DB credential
  password: 'secure_password',
  database: 'goji_db'
};

// ❌ INCORRECT - Never for user identity
const user = {
  username: 'alice'  // WRONG - should be "handle"
};
\`\`\`

## Code Patterns

### Payment Implementation

\`\`\`typescript
// ✅ CORRECT
interface PaymentRequest {
  fromHandle: string;     // Sender's @handle
  toHandle: string;       // Recipient's @handle
  amount: Decimal;
  currency: 'BSV' | 'MNEE_USD';
}

async function sendPayment(request: PaymentRequest) {
  const sender = await getUserByHandle(request.fromHandle);
  const recipient = await getUserByHandle(request.toHandle);
  // Process payment
}

// ❌ INCORRECT
interface PaymentRequest {
  fromUsername: string;   // WRONG - use fromHandle
  toUsername: string;     // WRONG - use toHandle
}
\`\`\`

### User Search

\`\`\`typescript
// ✅ CORRECT
async function searchUsersByHandle(query: string) {
  return await db.user.findMany({
    where: {
      handle: { contains: query }
    }
  });
}

// UI Component
<SearchBar 
  placeholder="Search by @handle"
  onSearch={searchUsersByHandle}
/>

// ❌ INCORRECT
async function searchUsersByUsername(query: string) {
  // WRONG - use "handle"
}
\`\`\`

### API Endpoints

\`\`\`typescript
// ✅ CORRECT
router.get('/users/:handle', getUserByHandle);
router.post('/payments/send', (req, res) => {
  const { toHandle, amount } = req.body;
  // Process payment
});

// ❌ INCORRECT
router.get('/users/:username', getUser);  // WRONG - use :handle
router.post('/payments/send', (req, res) => {
  const { toUsername, amount } = req.body;  // WRONG - use toHandle
});
\`\`\`

## UI/UX Terminology

### Labels and Placeholders

\`\`\`tsx
// ✅ CORRECT
<Input
  label="Handle"
  placeholder="@alice"
  name="handle"
/>

<Text>Send to: @{recipient.handle}</Text>

<Button>Pay @{handle}</Button>

// ❌ INCORRECT
<Input
  label="Username"        // WRONG - use "Handle"
  placeholder="alice"     // WRONG - include @
  name="username"         // WRONG - use "handle"
/>
\`\`\`

### Error Messages

\`\`\`typescript
// ✅ CORRECT
'Handle not found'
'Invalid handle format'
'Handle already taken'

// ❌ INCORRECT
'Username not found'     // WRONG - use "Handle"
'Invalid username'       // WRONG - use "handle"
\`\`\`

## Validation Checklist

### Variable Names
- [ ] User identity uses "handle" not "username"
- [ ] Payment recipient uses "toHandle" not "toUsername"
- [ ] Search functions use "handle" parameter
- [ ] Database credentials use "username" ONLY

### UI/UX
- [ ] Labels say "Handle" not "Username"
- [ ] Placeholders show @handle format
- [ ] Error messages use "handle"
- [ ] Display shows @handle prefix

### API
- [ ] Endpoints use :handle not :username
- [ ] Request bodies use handle fields
- [ ] Response objects use handle property
- [ ] Documentation uses "handle" terminology

## Common Violations

### Violation 1: Variable Named username

\`\`\`typescript
// ❌ VIOLATION
const user = await db.user.findUnique({
  where: { username: 'alice' }
});

// ✅ CORRECT
const user = await db.user.findUnique({
  where: { handle: 'alice' }
});
\`\`\`

### Violation 2: UI Label Says "Username"

\`\`\`tsx
// ❌ VIOLATION
<Input label="Username" placeholder="alice" />

// ✅ CORRECT
<Input label="Handle" placeholder="@alice" />
\`\`\`

### Violation 3: API Parameter username

\`\`\`typescript
// ❌ VIOLATION
router.get('/users/:username', handler);

// ✅ CORRECT
router.get('/users/:handle', handler);
\`\`\`

## Resources

### Reference Documentation

- **HANDLE-FORMAT-SPECIFICATION.md** - Complete handle format specification
- **CLAUDE-TERMINOLOGY.md** - Critical terminology section from CLAUDE.md

---

**Skill Version**: 1.0.0
**Last Updated**: 2025-12-31
