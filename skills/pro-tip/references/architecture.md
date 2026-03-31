# Architecture Tips

Tips for making sound architectural decisions in full-stack TypeScript/NestJS/React projects.

---

## AR-01 — Two-Level package.json for Production Deploys

In Nx monorepos with NestJS on Railway, every runtime import must appear in TWO places: the root `package.json` (for local dev and build) and the app-level `package.json` (used by `generatePackageJson: true` to produce the pruned production bundle). Missing the app-level entry causes `Cannot find module` in production even though the build succeeds.

**Example:** Adding `@aws-sdk/client-s3` → add to root `dependencies` AND `apps/goji-web-api/package.json` dependencies.
**Why it matters:** The build passes locally and in CI, but the production container crashes on first use.

---

## AR-02 — Schema Change Always Needs a Migration File

Every change to `schema.prisma` — new field, new model, renamed field, removed index — requires a migration file created in the same PR. The migration is what actually updates the production database; the schema alone does nothing at deploy time.

**Example:** `cd apps/goji-web-api && npx prisma migrate dev --name add_user_verified_at`
**Why it matters:** Production DB schema diverges from the Prisma client silently — runtime queries fail with cryptic column-not-found errors.

---

## AR-03 — Client/Server Library Separation

When a shared library needs to work in both browser/React Native and Node.js, expose two entry points: `/client` (no Node deps, no secrets) and default/`/server` (full Node capabilities). Never import Node-only modules from the client path.

**Example:** `import { logger } from '@rebirth-system/logging-lib/client'` in React; `import { logger } from '@rebirth-system/logging-lib'` in NestJS.
**Why it matters:** Bundlers will try to include Node.js modules in browser bundles, causing build failures or security leaks.

---

## AR-04 — Port Allocation as a First-Class Concern

In a multi-project developer environment, port conflicts are silent and confusing. Assign ports per project and document them — then enforce them in Docker Compose, Dockerfiles, environment files, and proxy configs. Keep all four in sync.

**Example:** `goji-web-api` owns port 3002 everywhere: `compose.yml`, `Dockerfile`, `.env`, `vite.config.mts` proxy.
**Why it matters:** Changing one without the others causes the proxy to silently forward to the wrong service.

---

## AR-05 — Response Envelope Pattern

Wrap all API responses in `{ success: boolean, data: T }`. This gives clients a consistent shape to unwrap, makes error handling uniform, and lets middleware/interceptors add metadata without changing individual endpoints. Always unwrap `.data` before setting state in the frontend.

**Example:** `apiClient.get('/users')` → `{ success: true, data: [...] }` → unwrap: `setUsers(response.data)`
**Why it matters:** Inconsistent response shapes are the #1 source of "undefined is not iterable" bugs in React.

---

## AR-06 — NestJS Module Boundaries

Never import a service from one NestJS module directly into another without exporting it through the module's `exports` array. Cross-module service imports that bypass the module system break dependency injection and make testing impossible.

**Example:** `UsersService` needed in `AuthModule` → export `UsersService` from `UsersModule`, import `UsersModule` in `AuthModule`.
**Why it matters:** Direct service imports work until they don't — DI container can't inject them correctly and you get circular dependency errors.

---

## AR-07 — Validate at System Boundaries Only

Don't add validation, error handling, or defensive checks inside internal functions for scenarios that can't happen. Validate at the edges: HTTP request bodies, external API responses, user input. Trust internal services to receive correct data.

**Example:** A DTO class with `@IsEmail()` at the controller level — not re-validated inside the service or repository.
**Why it matters:** Over-validation bloats code and creates false confidence; edge validation catches real problems.

---

## AR-08 — Caching: Redis vs In-Memory

Use Redis for data that must survive restarts, be shared across multiple server instances, or expire after a set time. Use in-memory (Map/WeakMap) only for short-lived, per-process caching where stale data on restart is acceptable. In a single-instance Railway deploy, in-memory is often sufficient.

**Example:** JWT blocklist (must persist across deploys) → Redis. Rate limiter per request (reset on restart OK) → in-memory.
**Why it matters:** Redis adds infra cost and latency; using it where in-memory suffices is premature complexity.

---

## AR-09 — Seed Scripts: System vs Test Data

Split seed scripts into two categories: system seeds (data required for the app to function — roles, config, event types) that run on every deploy, and test-data seeds (demo accounts, sample content) that run only in dev/staging. Never mix them.

**Example:** `seed-system.ts` (roles, email event types) → runs in `entrypoint.sh`. `seed-test-data.ts` → runs via separate npm script in dev only.
**Why it matters:** Running test data seeds in production creates fake users, corrupts analytics, and violates data compliance.
