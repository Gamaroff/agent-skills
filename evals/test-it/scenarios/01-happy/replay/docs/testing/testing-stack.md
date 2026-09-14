# Testing Stack Architecture

## Harness & Framework Matrix
- **Unit Tier:** Vitest (`*.spec.ts`)
- **Integration Tier:** Supertest / Vitest (`*.integration.spec.ts`)
- **E2E Tier:** Playwright (`e2e/*.spec.ts`)

## Infrastructure & Dependencies
- PostgreSQL Container: `docker compose up -d postgres`
- Redis Cache: `docker compose up -d redis`

## Data Setup & Fixtures
- Migrations: `pnpm prisma migrate dev`
- Seed Script: `pnpm db:seed`

## Personas & Auth States
- `admin@example.com` (Role: Admin)
- `user@example.com` (Role: Standard User)

## Execution Cheatsheet
- Scoped Unit Tests: `pnpm test src/auth/auth.service.spec.ts`
- Scoped E2E Tests: `npx playwright test e2e/auth.spec.ts`
