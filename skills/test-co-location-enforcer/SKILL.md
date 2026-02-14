---
name: test-co-location-enforcer
description: Ensure all tests are co-located with source files using .spec.ts suffix instead of __tests__/ directories. Use when creating new tests, moving legacy tests, validating test organization, or auditing test structure. Enforces 1:1 test-to-source file mapping and proper file naming conventions.
---

# Test Co-Location Enforcer

Enforce co-located test structure with .spec.ts suffix and prevent __tests__/ directory usage.

## When to Use This Skill

Activate this skill when:

1. **Creating new tests** - Ensure co-location from the start
2. **Moving legacy tests** - Migrate from __tests__/ to co-location
3. **Validating test structure** - Audit test organization
4. **Reviewing test PRs** - Check test placement compliance
5. **Refactoring tests** - Reorganize into co-located pattern
6. **Auditing codebase** - Find tests in __tests__/ directories

## Co-Location Standard

### Required Pattern

Tests MUST be co-located with source files using `.spec.ts` suffix.

\`\`\`
libs/wallet-lib/src/lib/
├── wallet-service.ts
├── wallet-service.spec.ts        ✅ CORRECT - Co-located
├── transaction-processor.ts
├── transaction-processor.spec.ts  ✅ CORRECT - Co-located
└── balance-calculator.ts
    └── balance-calculator.spec.ts ✅ CORRECT - Co-located
\`\`\`

### Forbidden Pattern

NEVER use __tests__/ directories.

\`\`\`
libs/wallet-lib/src/
├── lib/
│   ├── wallet-service.ts
│   └── transaction-processor.ts
└── __tests__/                      ❌ FORBIDDEN
    ├── wallet-service.test.ts      ❌ Not co-located
    └── transaction-processor.test.ts ❌ Not co-located
\`\`\`

## File Naming Conventions

### Test Files

**Pattern**: \`{source-name}.spec.ts\`

\`\`\`typescript
// Source file
wallet-service.ts

// Test file (same directory)
wallet-service.spec.ts
\`\`\`

### Integration Tests

**Pattern**: \`{source-name}.integration.spec.ts\`

\`\`\`typescript
// Source file
auth-service.ts

// Integration test (same directory)
auth-service.integration.spec.ts

// Unit test (same directory)
auth-service.spec.ts
\`\`\`

## Migration Workflow

### Step 1: Find Tests in __tests__/

\`\`\`bash
# Find all __tests__/ directories
find . -type d -name "__tests__"

# Find all test files in __tests__/
find . -path "*/__tests__/*" -name "*.test.ts" -o -name "*.spec.ts"
\`\`\`

### Step 2: Move Tests to Co-Location

\`\`\`bash
# Example: Move wallet-service test
mv src/__tests__/wallet-service.test.ts src/lib/wallet-service.spec.ts

# Update imports if directory changed
\`\`\`

### Step 3: Remove __tests__/ Directory

\`\`\`bash
# After all tests moved
rm -rf src/__tests__/
\`\`\`

## Validation Checklist

### Test Organization
- [ ] All tests co-located with source files
- [ ] No __tests__/ directories exist
- [ ] Test filename matches source filename
- [ ] .spec.ts suffix used (not .test.ts)
- [ ] Integration tests use .integration.spec.ts suffix

### Import Paths
- [ ] Imports reference co-located files
- [ ] No ../../__tests__/ paths
- [ ] Relative imports updated after migration

## Resources

### Reference Documentation

- **testing-framework-guide.md** - Testing standards including co-location requirement

---

**Skill Version**: 1.0.0
**Last Updated**: 2025-12-31
