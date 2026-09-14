# Testing Stack Architecture

## Harness & Framework Matrix
- **Unit Tier:** Vitest (`src/checkout/checkout.service.spec.ts`)
- **Integration Tier:** Supertest / Vitest
- **Multi-Service E2E:** Playwright + Docker Compose Services

## Infrastructure & Dependencies
- Database: PostgreSQL Container (`docker compose up -d postgres`)
- Cache: Redis Container (`docker compose up -d redis`)
- Third-Party Gateway: Payment Mock API Container (`docker compose up -d payment-mock`)

## Data Setup & Fixtures
- Migrations: `pnpm prisma migrate dev`
- Seed Data: `pnpm db:seed`

## Personas & Auth States
- `customer@example.com` (Role: Buyer)
- `merchant@example.com` (Role: Merchant Admin)

## Execution Cheatsheet
- Scoped Unit: `pnpm test src/checkout/checkout.service.spec.ts`
- Scoped Multi-Service: `pnpm test:integration src/checkout/checkout.integration.spec.ts`

## Infrastructure Gaps & Improvement Suggestions
- Gap: Current test suite lacks a dedicated webhook listener fixture for asynchronous payment callback retries.
- Recommendation: Add a local WireMock or Prism stub container to `docker-compose.test.yml` to support deterministic async webhook response simulation.
