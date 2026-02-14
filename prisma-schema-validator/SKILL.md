---
name: prisma-schema-validator
description: This skill should be used when validating Prisma schema patterns, reviewing database models, creating new models, optimizing indexes, planning migrations, or ensuring schema follows Goji naming conventions and relationship patterns. Use when working with schema.prisma files or database design decisions.
license: Complete terms in LICENSE.txt
---

# Prisma Schema Validator

Validate and enforce Prisma schema patterns, naming conventions, relationships, indexes, and migration best practices for the Goji platform.

## Purpose

Ensure database schema consistency, performance, and maintainability by validating Prisma models against Goji's established patterns. This skill prevents common schema mistakes, enforces naming conventions, validates relationship patterns, and ensures proper indexing for optimal query performance.

## When to Use This Skill

Use this skill when:

- Creating new Prisma models or fields
- Reviewing schema changes in pull requests
- Adding or modifying relationships between models
- Planning database indexes for performance
- Designing migrations for schema changes
- Validating enum definitions and constraints
- Optimizing database queries through schema design
- Ensuring compliance with Goji schema standards

## Goji Schema Standards

### Naming Conventions

**Model Names** (PascalCase):
- Singular nouns: `User`, `Wallet`, `Transaction`
- Compound names: `PaymentRequest`, `GroupMember`, `ChatMessage`
- NEVER plural: `Users` ❌, `Wallets` ❌

**Field Names** (camelCase):
- Descriptive: `firstName`, `passwordHash`, `createdAt`
- Boolean prefix: `isEmailVerified`, `hasAcceptedTerms`, `canTransact`
- Timestamps: `createdAt`, `updatedAt`, `lastLoginAt`, `scheduledAt`
- Foreign keys: `userId`, `walletId`, `groupId` (singular + Id)

**Enum Names** (PascalCase + Enum suffix):
- Format: `<Context>Enum`
- Examples: `TransactionStatusEnum`, `WalletTypeEnum`, `KycTierEnum`
- NEVER: `TransactionStatus` ❌, `WALLET_TYPE` ❌

**Enum Values** (UPPERCASE_SNAKE_CASE):
- Format: `CONSTANT_VALUE`
- Examples: `PENDING`, `VERIFIED`, `TIER_3`, `MOBILE_MONEY`
- NEVER lowercase: `pending` ❌, `verified` ❌

### Field Type Standards

**Primary Keys**:
```prisma
id String @id @default(uuid())
```
ALWAYS UUID strings, NEVER auto-incrementing integers for user-facing tables.

**Timestamps**:
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```
ALWAYS include both for auditable entities.

**Financial Amounts**:
```prisma
amount Decimal @db.Decimal(20, 8)
```
Use `Decimal` type with 20 total digits, 8 decimal places for cryptocurrency precision.

**Strings with Constraints**:
```prisma
email    String  @unique
handle   String? @unique
phoneNumber String? @unique
```
Add `@unique` for identity fields, use `String?` for optional fields.

**JSON Fields**:
```prisma
metadata Json?
chatPreferences Json?
```
Use `Json` type for flexible data structures, make optional with `?` unless required.

### Relationship Patterns

**One-to-Many** (Most Common):
```prisma
model User {
  id       String   @id @default(uuid())
  wallets  Wallet[]
}

model Wallet {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
```
Foreign key in child table, relation array in parent.

**One-to-One**:
```prisma
model User {
  id              String           @id @default(uuid())
  kycVerification KycVerification?
}

model KycVerification {
  id     String @id @default(uuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}
```
Use `@unique` on foreign key in child, optional relation in parent.

**Many-to-Many** (Explicit Join Table):
```prisma
model Group {
  id      String        @id @default(uuid())
  members GroupMember[]
}

model User {
  id              String        @id @default(uuid())
  groupMemberships GroupMember[]
}

model GroupMember {
  id      String @id @default(uuid())
  groupId String
  userId  String
  role    String @default("MEMBER")
  group   Group  @relation(fields: [groupId], references: [id])
  user    User   @relation(fields: [userId], references: [id])

  @@unique([userId, groupId])
}
```
ALWAYS use explicit join tables with additional fields (role, joinedAt, etc.).

**Self-Referential Relationships**:
```prisma
model Contact {
  id        String    @id @default(uuid())
  userId    String
  contactId String
  user      User      @relation("OwnedContacts", fields: [userId], references: [id])
  contact   User      @relation("ContactOf", fields: [contactId], references: [id])

  @@unique([userId, contactId])
}
```
Use named relations with descriptive labels.

### Index Strategies

**High-Frequency Queries** (Add Indexes):
```prisma
model Transaction {
  id        String   @id @default(uuid())
  userId    String
  status    String
  createdAt DateTime @default(now())

  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
  @@index([userId, status, createdAt(sort: Desc)])
}
```

**Unique Constraints**:
```prisma
model User {
  email       String  @unique
  handle      String? @unique
  phoneNumber String? @unique

  @@index([email])
}
```
Add `@@index` even when `@unique` exists for query performance.

**Composite Indexes**:
```prisma
model GroupMember {
  groupId String
  userId  String
  role    String

  @@unique([userId, groupId])
  @@index([groupId, role])
}
```
Order by selectivity: most selective field first.

**Partial Indexes** (PostgreSQL):
```prisma
model Wallet {
  userId String
  status String

  @@index([userId, status], where: { status: "ACTIVE" })
}
```
Use WHERE clause for filtered queries.

## Validation Checklist

Run this checklist for every schema change:

### Model-Level Validation

- [ ] Model name is PascalCase singular noun
- [ ] Has `id String @id @default(uuid())` primary key
- [ ] Has `createdAt DateTime @default(now())`
- [ ] Has `updatedAt DateTime @updatedAt` for mutable entities
- [ ] No plural model names (User not Users)
- [ ] All relations have proper `@relation` attributes

### Field-Level Validation

- [ ] Field names are camelCase
- [ ] Boolean fields start with `is`, `has`, `can`, `should`
- [ ] Timestamp fields end with `At` suffix
- [ ] Foreign key fields end with `Id` suffix
- [ ] Optional fields use `?` syntax
- [ ] Financial amounts use `Decimal` type
- [ ] Identity fields have `@unique` constraint
- [ ] Sensitive fields (passwordHash, secrets) are NOT exposed in relations

### Enum Validation

- [ ] Enum name is PascalCase with `Enum` suffix
- [ ] All enum values are UPPERCASE_SNAKE_CASE
- [ ] Enum has at least 2 values
- [ ] Enum values are descriptive and unambiguous
- [ ] Default value is specified where appropriate

### Relationship Validation

- [ ] One-to-many relationships have array in parent, foreign key in child
- [ ] Many-to-many uses explicit join table with metadata fields
- [ ] Self-referential relations have named relation labels
- [ ] Cascade delete behavior is appropriate (`onDelete: Cascade` or `SetNull`)
- [ ] No orphaned records possible (proper cascade rules)
- [ ] Relation names are descriptive and match business logic

### Index Validation

- [ ] Unique fields have `@unique` constraint
- [ ] High-frequency query fields have `@@index`
- [ ] Foreign keys have indexes for join performance
- [ ] Composite indexes ordered by selectivity
- [ ] Timestamp queries have descending sort indexes
- [ ] Partial indexes used for filtered queries
- [ ] No redundant indexes (covered by composite indexes)

### Migration Safety

- [ ] New required fields have default values or migration script
- [ ] Dropping columns is done in two-step migration (deprecate then drop)
- [ ] Renaming uses explicit migration script
- [ ] Data backfill planned for new constraints
- [ ] Index creation uses `CREATE INDEX CONCURRENTLY` in production
- [ ] Breaking changes have rollback plan

## Common Schema Anti-Patterns

### NEVER Do This

**Plural Model Names**:
```prisma
model Users { } // ❌ WRONG
model User { }  // ✅ CORRECT
```

**Auto-Increment IDs for User Data**:
```prisma
id Int @id @default(autoincrement()) // ❌ WRONG (exposes sequence, not globally unique)
id String @id @default(uuid())       // ✅ CORRECT
```

**Lowercase Enum Values**:
```prisma
enum Status {
  pending  // ❌ WRONG
  PENDING  // ✅ CORRECT
}
```

**Implicit Many-to-Many**:
```prisma
model User {
  groups Group[]
}
model Group {
  users User[]
}
// ❌ WRONG - No metadata, no join table control
```

**Missing Indexes on Foreign Keys**:
```prisma
model Transaction {
  userId String
  user   User @relation(fields: [userId], references: [id])
  // ❌ MISSING: @@index([userId])
}
```

**No Timestamps on Auditable Entities**:
```prisma
model Transaction {
  id     String @id @default(uuid())
  amount Decimal
  // ❌ MISSING: createdAt, updatedAt
}
```

## Reference Documentation

Use the `references/` directory files for detailed information:

- `schema.prisma` - Complete production schema with all models
- `schema-catalog.md` - Detailed field descriptions and business logic
- `index-performance-guide.md` - Index strategies and query optimization

## Examples from Goji Schema

### Well-Designed Model (User)

```prisma
model User {
  id                   String                @id @default(uuid())
  email                String                @unique
  handle               String?               @unique
  firstName            String?
  lastName             String?
  passwordHash         String?
  isEmailVerified      Boolean               @default(false)
  kycTier              KycTierEnum           @default(TIER_0)
  kycStatus            KycStatusEnum         @default(PENDING)
  accountStatus        AccountStatusEnum     @default(ACTIVE)
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  wallets              Wallet[]
  transactions         Transaction[]         @relation("UserTransactions")
  groupMemberships     GroupMember[]
  notifications        Notification[]

  @@index([email])
  @@index([handle])
}
```

Why this is good:
- Clear naming (camelCase fields, PascalCase model)
- Proper types (String for UUID, Boolean for flags, DateTime for timestamps)
- Enums with descriptive names
- Defaults specified
- Indexes on frequently queried fields
- Relations properly named and typed

### Well-Designed Relationship (GroupMember Join Table)

```prisma
model GroupMember {
  id        String   @id @default(uuid())
  groupId   String
  userId    String
  role      String   @default("MEMBER")
  joinedAt  DateTime @default(now())
  leftAt    DateTime?

  group     Group    @relation(fields: [groupId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@unique([userId, groupId])
  @@index([groupId, role])
  @@index([userId])
}
```

Why this is good:
- Explicit join table with metadata (role, joinedAt, leftAt)
- Unique constraint prevents duplicate memberships
- Indexes for common queries (group members by role)
- Proper cascade behavior can be added (onDelete)

## Integration with Development Workflow

### Pre-Commit Checklist

Before committing schema changes:

1. Run schema validation: `npx prisma validate`
2. Check this skill's validation checklist
3. Generate migration: `npx prisma migrate dev --name descriptive-name`
4. Review generated SQL for safety
5. Test migration on development database
6. Document breaking changes in migration notes

### Code Review Checklist

When reviewing schema PRs:

1. Verify all checklist items above
2. Check for proper indexes on new foreign keys
3. Ensure backward compatibility or migration plan
4. Validate enum values match application constants
5. Confirm relationship patterns follow conventions
6. Review index strategy for query performance

## Migration Best Practices

### Safe Migration Pattern

1. **Add new field (optional)**: New nullable field or field with default
2. **Deploy code that reads both old and new**: Dual-read pattern
3. **Backfill data**: Migrate existing records to new field
4. **Make field required**: Add NOT NULL constraint if needed
5. **Remove old field**: Drop deprecated field in separate migration

### Dangerous Operations

These require extra caution:

- Adding NOT NULL to existing column (backfill first)
- Changing column type (may require data transformation)
- Dropping columns (ensure no code references)
- Renaming columns (use migration script, not Prisma rename)
- Adding unique constraints (check for duplicates first)

## Workflow Summary

To validate schema changes:

1. Read current schema from `references/schema.prisma`
2. Review change against validation checklist
3. Check naming conventions (models, fields, enums, relations)
4. Validate relationships and cascade behavior
5. Ensure proper indexes for query patterns
6. Review migration safety and rollback plan
7. Document any breaking changes
8. Generate migration and review SQL

For complex schema design decisions, consult `references/schema-catalog.md` for business logic context and `references/index-performance-guide.md` for performance implications.
