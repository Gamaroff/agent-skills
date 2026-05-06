# Integration Tips

Tips for working with the specific tools and platforms used in your project stack.

---

## IN-01 — Resend: Transactional vs Broadcast vs Audience

Resend has three distinct email paradigms. **Transactional** (`send-email`) is for one-off emails triggered by user actions (signup, reset). **Broadcast** is for mass sends to a segment — scheduled, with analytics. **Audience/Contacts** is the CRM layer: contacts, segments, and contact properties. Mixing these up causes silent failures — e.g., adding a transactional email to a broadcast queue delays it until the send window.

**Example:** Waitlist confirmation → transactional `send-email`. Weekly newsletter → broadcast. Tracking which waitlist tier a user is on → contact property.
**Why it matters:** Wrong paradigm = wrong delivery guarantees, wrong analytics, wrong unsubscribe behaviour.

---

## IN-02 — Resend: Contact Property Sync Pattern

Resend contact properties are key/value metadata on contacts. They must be created in the Resend dashboard (or via API) before they can be set. The sync pattern: upsert the contact first, then update properties in a second call. Trying to set a non-existent property silently fails.

**Example:** `create-contact` → then `update-contact` with `{ properties: { waitlist_tier: 'early' } }` after the property is defined.
**Why it matters:** Silent failures here mean segmentation and personalisation logic silently breaks in production.

---

## IN-03 — Railway: generatePackageJson Gotcha

When `NxAppWebpackPlugin` generates a pruned `package.json` for the production bundle, it reads only from the app-level `package.json` — not the root. Any package imported at runtime that isn't listed there will be absent from the Docker image's `node_modules` even though the build succeeds.

**Example:** Add `nodemailer` to both root `dependencies` and `apps/my-web-api/package.json` dependencies, not just one.
**Why it matters:** Build passes in CI, container crashes on first request. Extremely hard to debug without knowing this pattern.

---

## IN-04 — Railway: Healthcheck Timing

Railway waits for a healthcheck URL to respond before routing traffic. If the API starts a long migration or seed on boot, the healthcheck may time out before the server is ready. Ensure the healthcheck endpoint (`/health`) responds immediately — before migrations complete — or adjust Railway's healthcheck delay in the service settings.

**Example:** Mount the health controller before running migrations in `entrypoint.sh`, or use Railway's "start command delay" setting.
**Why it matters:** Failed healthchecks cause Railway to cycle the container, creating a deploy loop that's hard to distinguish from a crash.

---

## IN-05 — Prisma: migrate dev vs migrate deploy

`migrate dev` is for local development — it creates new migration files and applies them. `migrate deploy` is for production — it applies existing migration files only, never creates new ones. Always use `migrate deploy` in `entrypoint.sh`; never `migrate dev` in production containers.

**Example:** `entrypoint.sh`: `npx prisma migrate deploy && node dist/main.js`
**Why it matters:** Running `migrate dev` in production can silently create empty migrations or fail with a prompt for database credentials.

---

## IN-06 — Prisma: Studio for Local Inspection

`npx prisma studio` launches a browser-based GUI for inspecting and editing the local database. It reads from `DATABASE_URL` in `.env`. Use it to verify seed data, check migration results, and debug query issues without writing raw SQL.

**Example:** After `prisma migrate dev`, open Prisma Studio to verify the new column is present and seeded correctly.
**Why it matters:** Faster than psql for visual inspection; no SQL needed for simple data verification.

---

## IN-07 — NestJS: forRootAsync for Dynamic Module Config

Use `forRootAsync` (not `forRoot`) whenever module config depends on injected values like `ConfigService`. `forRoot` with hardcoded values works in tests but breaks in production when config comes from environment variables via the DI container.

**Example:** `JwtModule.registerAsync({ useFactory: (cfg) => ({ secret: cfg.get('JWT_SECRET') }), inject: [ConfigService] })`
**Why it matters:** `forRoot({ secret: process.env.JWT_SECRET })` evaluates at import time before env vars are loaded, returning `undefined`.

---

## IN-08 — React/Vite: VITE_ Prefix is Mandatory

Only environment variables prefixed with `VITE_` are exposed to the browser bundle. `process.env` does not exist in Vite — use `import.meta.env`. Variables without the prefix are silently `undefined` in the browser, even if defined in `.env`.

**Example:** `.env`: `VITE_API_URL=http://localhost:3002` → accessed as `import.meta.env.VITE_API_URL`
**Why it matters:** A missing prefix is silent — no error, just `undefined` values that cause confusing fetch failures.

---

## IN-09 — Nx: Always Prefix with Package Manager

Run Nx commands as `npm exec nx <command>` or `npx nx <command>` — never as bare `nx`. This ensures the workspace's locally installed Nx version is used, not a global one that may differ. Mismatched versions cause subtle build and plugin resolution failures.

**Example:** `npm exec nx test {app-name}-web-app` — not `nx test {app-name}-web-app`
**Why it matters:** Global `nx` versions are often out of date with the workspace's `nx` package version, causing cryptic plugin errors.

---

## IN-10 — Nx: affected vs run-many

`nx affected --target=test` runs only the projects affected by changes since the base branch — fast in CI. `nx run-many --target=test --all` runs every project — slow but comprehensive. Use `affected` in PR checks; use `run-many` for full validation before a release.

**Example:** PR check: `npm exec nx affected --target=lint,test`. Pre-release: `npm exec nx run-many --target=build --all`.
**Why it matters:** Running all tests on every PR in a large monorepo adds minutes to CI time unnecessarily.
