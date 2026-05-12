---
title: Source tree
status: draft
---

# Source tree

> Where things live in this repository. Always loaded into the pipeline context so the agent knows where to put new code.

## Top-level layout

<!-- Replace with this project's actual layout. Example:

```
.
├── apps/
│   ├── api/            # NestJS backend
│   └── mobile/         # Expo Router app
├── libs/
│   ├── shared-types/   # cross-app TypeScript types
│   └── auth/           # auth domain (client + server entry points)
├── docs/
│   ├── architecture/   # this directory
│   ├── prd/            # product docs
│   └── tasks/          # standalone technical tasks
├── prisma/             # database schema and migrations
├── scripts/            # one-off operational scripts
└── tests/              # cross-cutting E2E tests only
```
-->

## Where to put what

<!-- Concrete rules so the agent doesn't guess. Example:
- New API endpoint: `apps/api/src/<domain>/<domain>.controller.ts` + sibling `.service.ts` + `.spec.ts`.
- New screen: `apps/mobile/app/(<group>)/<screen>.tsx`. No screens outside `app/`.
- New shared library: `libs/<lib-name>/` with `src/index.ts` as public entry.
- Database migration: `prisma/migrations/<timestamp>_<name>/migration.sql` via `pnpm prisma migrate dev`.
- One-off script: `scripts/<verb>-<noun>.ts`. Not co-located with app code.
-->

## Workspace boundaries

<!-- For monorepos. Example:
- `libs/*` may import other `libs/*` but never `apps/*`.
- `apps/mobile` may import from `libs/<lib>/client` only (never `/server`).
- `apps/api` may import from `libs/<lib>/server` only.
- Cross-app imports are forbidden.
-->
