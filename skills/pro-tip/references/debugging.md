# Debugging Tips

Tips for systematic debugging workflows, framework-specific debugging, and diagnostic techniques.

---

## DB-01 — Use the Debug Skills Before Ad-Hoc Investigation

Dedicated debug skills (`/react-native-debug`, `/nestjs-debug`) follow structured diagnostic workflows — they check common causes in priority order and avoid rabbit holes. Use them before manual grep-and-guess debugging, especially for framework-specific errors (DI failures, bundler crashes, module resolution).

**Example:** NestJS `Nest can't resolve dependencies` error → `/nestjs-debug` walks through the 6-step diagnostic. Don't start by reading every module file.
**Why it matters:** Structured debugging finds root causes faster; ad-hoc investigation tends to fix symptoms.

---

## DB-02 — Read the Error Before Switching Tactics

When a command or test fails, read the full error message and stack trace before trying a different approach. Most errors contain the exact file, line, and reason for failure. Retrying the same command or switching to a different strategy without reading the error wastes cycles.

**Example:** `prisma migrate dev` fails → read the error: is it a connection issue, a schema conflict, or a pending migration? Each has a different fix.
**Why it matters:** Blind retries and premature strategy switches are the top source of wasted debugging time.

---

## DB-03 — git stash + Bisect for Regression Hunting

When something worked before but now doesn't, stash your changes and use `git bisect` (or manual checkout) to find the introducing commit. This is faster than reading diffs when the regression spans multiple commits.

**Example:** `git stash && git bisect start && git bisect bad HEAD && git bisect good v1.2.0` — then test at each step.
**Why it matters:** Reading 50 files of diff is slower than binary-searching 6 commits.

---

## DB-04 — Prisma Studio for Database State Inspection

When debugging data-related issues, use `npx prisma studio` to visually inspect the database state. It's faster than writing raw SQL queries and shows relationships between records. Useful after migrations, seed scripts, or when API responses don't match expectations.

**Example:** API returns empty array for `/users` → open Prisma Studio to check if users table has data, not just if the query is correct.
**Why it matters:** Many "bugs" are actually missing or misconfigured data — visual inspection catches this in seconds.

---

## DB-05 — Check the Proxy Chain for Silent Failures

In a proxied setup (Vite dev proxy → API, Nginx → API, Railway routing), a failing request might not reach the backend at all. Check each hop: is the proxy config correct? Is the target port running? Is the path being rewritten? Use browser DevTools Network tab or `curl -v` to trace the actual request path.

**Example:** Frontend fetch to `/api/users` returns 404 → check Vite proxy config in `vite.config.mts`: is `/api` being forwarded to `localhost:3002`?
**Why it matters:** Proxy misconfigurations return generic errors that look like backend bugs but aren't.

---

## DB-06 — Docker: Check Logs Before Rebuilding

When a Docker container fails, check `docker logs <container>` before rebuilding the image. Most failures are runtime issues (missing env vars, port conflicts, failed migrations) that rebuilding won't fix. Only rebuild when you've changed a Dockerfile or dependency.

**Example:** `docker logs my-web-api-1` shows `Cannot find module 'nodemailer'` → missing from app-level `package.json`, not a Docker issue.
**Why it matters:** Docker rebuilds are slow (minutes); log inspection is fast (seconds). Rebuild-first debugging wastes significant time.

---

## DB-07 — NestJS Circular Dependency Diagnosis

`Nest can't resolve dependencies of the X` usually means a circular import between modules. The fix is `forwardRef(() => ModuleName)` on both sides of the circle. But first: check if the dependency is actually necessary — often the real fix is extracting shared logic into a third module.

**Example:** `AuthModule` needs `UsersModule` and vice versa → extract `SharedAuthModule` with the common interface, imported by both.
**Why it matters:** `forwardRef` is a band-aid that masks architectural coupling; extraction fixes the root cause.

---

## DB-08 — Iterative Test Debugging: Is the Test Wrong or the Code?

When a test fails after implementation changes, always ask: is the test asserting the right behavior, or is it testing the old behavior? Read the test assertion first, then the implementation. The answer determines whether you fix the test or fix the code.

**Example:** Test expects `{ status: 'pending' }` but code now returns `{ status: 'PENDING' }` → the enum changed to uppercase; update the test.
**Why it matters:** Reflexively "fixing" the code to match an outdated test reintroduces the old behavior.
