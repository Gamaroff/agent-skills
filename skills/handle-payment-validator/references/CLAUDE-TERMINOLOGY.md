# CLAUDE.md

Guidance for Claude Code when working with this Goji Mobile Wallet repository.

## Quick Facts

**Goji**: Blockchain wallet with chat payments, multi-type contacts, cross-border transfers, digital marketplace

**Stack**: React Native 0.81.5 + Expo 54 + NestJS 11.1.8 + PostgreSQL + Prisma 6.18.0 + Redis + Jest

**Status**: Production-ready (all major versions at target, NX 22, 106/325 tests passing)

## Critical Terminology & Architecture

**CRITICAL**: Use "**handle**" not "username" for user identity (@handle for payments/social, username only for database credentials)

**CRITICAL**: Multi-wallet app with single-currency wallets (BSV, MNEE USD). Each wallet holds one currency type only.

**CRITICAL - Definitive Group Types**: The system supports exactly **5 group types**:

- `'private_chat'` - Private 1:1 or small group messaging (2-50 members)
- `'savings_circle'` - ROSCA savings pools (3-50 members)
- `'betting_pool'` - Prediction markets and betting pools (3-100 members)
- `'creator_community'` - Public communities with content monetization (unlimited)
- `'poker_place'` - Blockchain-powered poker games (2-10 members)

## Essential Commands

**Development** (PREFERRED):
- `npm run goji-api:start:dev` - NestJS API with hot reload (tsx)
- `npm run goji-wallet:start:device` - Android app on device/emulator

**Build/Test**:
- `npm run build:all` - Build libraries + API
- `npx nx test <project> --coverage` - Test with coverage
- `npx nx reset` - Clear cache

**Utils**: `npx nx show projects`, `npx nx graph`, `npx nx lint <project>`

## Setup

```bash
npm install
docker compose -f ./docker/docker-compose.dev.yml -p goji-system up -d
cd apps/goji-api && npx prisma generate && npx prisma db push
```

**Docker**: PostgreSQL (localhost:5432, user: goji), Redis (6379), PgAdmin (5050), Redis Commander (8082)

**Start Dev** (separate terminals):
```bash
npm run goji-api:start:dev        # API (port 3000)
npm run goji-wallet:start:device  # Android app
```

**Guest Mode**: User-facing "Try Without Account" with mock data. NOT a developer tool. See `docs/prd/user-experience/traditional-auth/epics/epic.4.guest-mode.md`

## Package Installation

**CRITICAL - NX monorepo**: Install from root only
- ✅ `npm install <package> -w apps/goji-wallet`
- ❌ NEVER `cd apps/goji-wallet && npm install`

**If local node_modules mistake**: `rm -rf apps/goji-wallet/node_modules package-lock.json && npm install`

## Project Structure

```
apps/goji-wallet/app/(drawer)/    # Main screens (home, contacts, transactions, etc.)
apps/goji-api/src/modules/        # NestJS modules
libs/@goji-system/                # 19 shared libraries
  auth-lib, shared-types, wallet-lib, chat-lib, groups-lib,
  contact-lib, transactions-lib, shopping-lib, notifications-lib, etc.
```

**Key**: Native dirs MUST be in `apps/goji-wallet/android/ios/` (not root)

## Creating Libraries

```bash
npx nx generate @nx/react-native:library my-lib --directory=libs/my-lib --linter=eslint --unitTestRunner=jest
```

**Checklist**:
- ✅ Barrel exports in `src/index.ts`
- ✅ If used by API: Add explicit re-exports (see "Explicit Re-Exports" below)

## Build Architecture

**Dev**: Metro processes TypeScript directly from `libs/*/src/`
**Prod**: Compiled JavaScript in `dist/libs/@goji-system/` with tree-shaking

**Hybrid Approach** (tsx for dev, compiled JS for prod):
- **Dev**: `npm run goji-api:start:dev` uses tsx, auto-builds deps, hot reload
- **Prod**: `npm run start:goji-api` compiles all to JS, runs Node.js

Library `package.json` exports from `dist/` (production)

### Explicit Re-Exports for API Imports

For API-imported libraries, add explicit re-exports in `src/index.ts`:

```typescript
// Barrel exports (standard)
export * from './lib/types';

// Explicit re-exports for critical types (TypeScript module resolution workaround)
export { CriticalClass, CriticalFunction } from './lib/engine';
export type { CriticalType, AnotherType } from './lib/types';
```

**Libraries with re-exports** (100% of API imports): compliance-lib, contact-lib, groups-lib, help-lib, localization-lib, logging-lib, cache-lib, notifications-lib, requests-lib, rewards-lib, shared-types, transactions-lib, user-lib, wallet-lib

## TypeScript Path Mappings

**Status**: Fully migrated (Task 5). All libraries use `@goji-system/library-name` imports.

**Sync**: tsconfig.base.json, babel.config.js, package.json exports MUST stay synchronized

**Issues**: Module not found → verify path mappings, rebuild library, clear Metro cache

---

## User Type System (Task 40)

**Canonical Type**: `User` (single source of truth)

**Key Types**:
- `User` - All user fields
- `PublicUser` - API responses (sensitive fields omitted)
- `UserSummary` - Minimal for lists
- `UserUpdatePayload` - Updatable fields
- `AppUser` - Discriminated union: `AuthenticatedUser | GuestUser`

**Usage**:
```typescript
// Type-safe discrimination
if (isAuthenticatedUser(user)) { /* database user */ }
if (isGuestUser(user)) { /* mock user */ }

// Computed fields
const computed = computeUserFields(user);
// → fullName, avatarInitials, profileCompletionScore
```

**Deprecated** (never use): `UserProfile`, `PublicUserProfile`, `MockUser`, `ExtendedUserProfile`

---

## Platform-Specific Security Architecture

**CRITICAL**: No Node.js deps in client. Server handles crypto. Use "client" not "mobile".

**Client/Server Separation**:
- `/client` - React Native/browser (no Node.js deps, no crypto)
- `/server` - Node.js/NestJS (bcrypt, JWT, AES, filesystem)
- Default (`.`) - Common + server

**Import Example**:
```typescript
// Server: hashPassword, generateTokenPair
import { hashPassword } from '@goji-system/auth-lib';
// Client: decodeToken, isTokenExpired
import { decodeToken } from '@goji-system/auth-lib/client';
```

**Decorator-Free Services**: Shared libs use plain TS classes (no @Injectable)
- Library: `export class ConfigValidationService { validate(...) {} }`
- NestJS wrapper: `@Injectable() export class GroupsConfigValidationService { private readonly validator = new ConfigValidationService(); }`

## NestJS Dependency Injection Patterns

**PassportStrategy DI** (CRITICAL - Task 38):

**Problem**: PassportStrategy services receive `null` dependencies
**Root Cause**: Injection token mismatch or dual-factory pattern

**Working Pattern**:
```typescript
// auth.module.ts - Single factory, class token
{
  provide: AuthService,
  useFactory: (...deps) => new AuthService(...deps),
  inject: [forwardRef(() => UsersService), JwtService, ConfigService, SocialAccountService]
}

// strategy.ts - Standard injection
constructor(private readonly authService: AuthService) {
  super({ usernameField: 'email' });
}
```

**Anti-Patterns** (NEVER):
- ❌ Dual-factory: `'AuthService'` string token → `AuthService` class token
- ❌ `@Inject('ServiceName')` with useFactory string token
- ❌ `forwardRef()` in strategy constructor

**Fix**: Use single factory with class token + explicit inject array

**Docs**: `docs/development/tasks/task.38.authservice-di-failure/`

## Testing & Quality

**Framework**: Jest 30.0.2 + React Native Testing Library 13.2.0
**Target**: 80%+ overall, 95%+ for financial ops

**Co-location** (MANDATORY): Test files next to source
- ✅ `user-service.ts` + `user-service.spec.ts`
- ❌ NEVER `__tests__/` directory

**Requirements**:
- All new code MUST include tests
- Run `npx nx test <project> --coverage` after implementation
- E2E: `npm run test:e2e:setup && npm run test:e2e:api` (uses `goji_test` DB)

**CI Development Mode**: Only compilation/build failures block PRs. Test failures are informational.

## Documentation Standards

**Libraries**: README.md required (API reference, examples)
**PRDs/Epics/Stories**: Use templates in `docs/templates/` (CRITICAL)
- Stories: `docs/prd/[domain]/[feature]/stories/` (co-located)
- Epics: YAML frontmatter, completion tracking

**File Naming** (use DOTS, hyphens in descriptive names only):
- `epic.[number].[name].md` → `epic.163.wallet-security.md`
- `story.[epic].[story].[name].md` → `story.1.1.1.core-architecture.md`
- `feature/story.[epic].[story].[name]` → `feature/story.1.1.1.core-arch`

**Epic Numbering**: Globally unique (check `/docs/development/epic-registry.md` for next number)

## Troubleshooting

**Build issues**: `npx nx reset`
**Metro cache**: `npx nx start goji-wallet --reset-cache`
**Native builds**: `cd apps/goji-wallet/android && ./gradlew clean`

**Android emulator stuck**: `bash scripts/nuke-android.sh` (kills QEMU, Gradle, Watchman, Metro, clears locks)

**CRITICAL**: Native dirs in `apps/goji-wallet/android/ios/` (not root)

## Claude Code Development Guidance

**Testing**: 95%+ financial ops, 80%+ overall. Write tests immediately. Run coverage after each task.

**Platform Rules**:
- Server: hashPassword, generateTokenPair, JWT signing, bcrypt, AES
- Client: decodeToken (parse only), UI, device functions, no crypto
- Use `/client` imports for React Native
- NEVER: crypto polyfills, password hashing in client, secrets in code
- Terminology: "client" not "mobile"

**Workflow**:
1. Use TodoWrite for multi-step tasks (3+ steps)
2. Read files first, understand dependencies
3. Implement: utilities → services → components → screens
4. Write tests co-located (`.spec.ts` suffix)
5. Run `npx nx test <project> --coverage`
6. Update docs last
7. QA Handoff: Mark "Ready for QA", add notes, verify all passing

**Anti-Patterns** (NEVER):
- Server imports in React Native (ESLint enforced)
- `any` type for financial data
- Lowercase enum values (`'PENDING'` not `'pending'`)
- Sync blockchain operations
- `__tests__/` directories (use co-location)
- Hardcoded secrets

**Logging**: Use `@goji-system/logging-lib` (client/server versions). Auto-sanitizes PII.

## In-App Notifications Component

**Location**: `/apps/goji-wallet/components/in-app-notifications/`

### Backend Synchronization Pattern

The InAppNotifications component uses **optimistic updates with rollback** for all mutations:

1. **Optimistic Update**: UI updates immediately (mark as read, delete)
2. **Backend Sync**: Call API asynchronously (non-blocking)
3. **Success**: Keep optimistic state, update unread count, log success
4. **Failure**: Rollback to previous state, show error toast, log error

This ensures instant UI feedback while maintaining data consistency.

### Key Methods

**Mark as Read** (`handleNotificationPress`):
- Optimistic: Set `isRead = true` immediately
- API: `notificationService.markAsRead(id)`
- Success: Update unread count (-1 if was unread)
- Failure: Rollback to previous `isRead` state, show toast
- Navigate regardless of API result (don't block user)

**Delete** (`handleNotificationDismiss`):
- Optimistic: Remove from list immediately
- API: `notificationService.deleteNotification(id)`
- Success: Update unread count (-1 if was unread)
- Failure: Re-insert notification in sorted order (by timestamp), show toast

**Fetch Unread Count**:
- API: `notificationService.getUnreadCount()`
- Refresh: On mount, pull-to-refresh, after mutations
- Hook: `useNotificationUnreadCount` (auto-refresh every 60s)

### State Management

Uses **Pattern A - Direct Service Calls** (component-local state):

- `allNotifications`: Full notification list
- `unreadCount`: Badge count from API
- `isMarkingAsRead: Set<string>`: Track in-flight mark operations (duplicate prevention)
- `isDismissing: Set<string>`: Track in-flight delete operations (duplicate prevention)

### Duplicate Prevention

```typescript
// Check before operation
if (isMarkingAsRead.has(notificationId)) return;

// Track during operation
setIsMarkingAsRead(prev => new Set(prev).add(notificationId));

// Clean up after completion (finally block)
setIsMarkingAsRead(prev => {
  const next = new Set(prev);
  next.delete(notificationId);
  return next;
});
```

### Loading Indicators

Pass loading state to NotificationItem:

```typescript
const isItemLoading = isMarkingAsRead.has(notification.id) || isDismissing.has(notification.id);

<NotificationItem isLoading={isItemLoading} />
```

NotificationItem renders overlay with ActivityIndicator when `isLoading = true`.

### Testing Requirements

- 80%+ code coverage for component
- Unit tests: mark as read, delete, unread count
- Integration tests: full user flow
- Mock `notificationService` methods
- Test optimistic updates, rollbacks, duplicate prevention

### Backend API

- `PATCH /notifications/:id/read` - Mark as read (cache invalidation built-in)
- `DELETE /notifications/:id` - Delete notification (cache invalidation built-in)
- `GET /notifications/unread-count` - Get badge count

### Files

- Component: `InAppNotifications.tsx`
- Service: `/services/api/notification-service.ts`
- Hook: `/hooks/useNotificationUnreadCount.ts`
- Utility: `/utils/retry-with-backoff.ts`
- Tests: `InAppNotifications.spec.tsx`, `useNotificationUnreadCount.spec.ts`

## Slash Commands & Constraints

**Slash Commands**: Execute directly. Never manually implement alternatives.
- ✅ Execute `/create-worktree` directly
- ❌ NEVER bypass with manual git commands
- Report errors with exact details, ask for guidance

**No Autonomous Operations**:
- ❌ NEVER run `npx expo start` or `npm run goji-wallet:start:device`
- ❌ NEVER build/deploy without explicit request
- ✅ Ask first for dev servers

**Other Constraints**:
- Don't create guides unless asked
- Android only (no iOS builds)
- Never run `npx expo install` from goji-wallet dir
- Main tsconfig excludes tests from compilation
