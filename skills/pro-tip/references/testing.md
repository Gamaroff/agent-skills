# Testing Tips

Tips for testing patterns, test organization, framework quirks, and coverage strategies.

---

## TS-01 — Co-locate Tests with Source Files

Place test files adjacent to their source: `UserService.spec.ts` next to `UserService.ts`, not in a separate `__tests__/` directory. This makes tests discoverable, simplifies imports (no `../../` chains), and ensures tests move when files move.

**Example:** `src/auth/auth.service.ts` + `src/auth/auth.service.spec.ts` — not `src/__tests__/auth/auth.service.spec.ts`.
**Why it matters:** Separated test directories drift out of sync with source — files get renamed but their tests don't.

---

## TS-02 — jsdom Quirks: SVG className and CSS Variables

In jsdom (used by Vitest/RTL), SVG elements don't expose `.className` as a string — use `getAttribute('class')` instead. Similarly, `style.border` and `style.background` reject CSS `var()` values in JS event handlers; use resolved hex/rgba values.

**Example:** `expect(svgElement.getAttribute('class')).toContain('spin')` — not `expect(svgElement.className).toContain('spin')`.
**Why it matters:** Tests pass in the browser but fail in jsdom, creating false negatives that waste debugging time.

---

## TS-03 — jsdom Color Normalization

jsdom normalizes colors inconsistently: `style.background` converts hex to `rgb()` format, but `style.border` keeps lowercase hex. Write test assertions that match the format jsdom actually produces, not what you set.

**Example:** Set `background: '#FF0000'` → assert `rgb(255, 0, 0)`. Set `border: '1px solid #ff0000'` → assert lowercase hex.
**Why it matters:** Color assertion mismatches are the most common "test works locally, fails in CI" issue with style tests.

---

## TS-04 — Mock the API Response Envelope

When mocking API responses in frontend tests, always include the response envelope wrapper: `{ data: { success: true, data: T } }`. The outer `data` is from the HTTP client (axios/fetch wrapper); the inner `data` is the API envelope. Missing either layer causes `undefined` errors in the component under test.

**Example:** `vi.mocked(apiClient.get).mockResolvedValue({ data: { success: true, data: [{ id: 1, name: 'Test' }] } })`
**Why it matters:** Tests that mock raw data instead of the envelope shape test code that doesn't match production behavior.

---

## TS-05 — data-testid for Reliable DOM Queries

Use `data-testid` attributes for test selectors instead of CSS classes, text content, or DOM structure. Classes change with styling, text changes with copy updates, and DOM structure changes with refactors — test IDs are stable by design.

**Example:** `<button data-testid="submit-waitlist">Join</button>` → `screen.getByTestId('submit-waitlist')`
**Why it matters:** Fragile selectors cause test failures on unrelated changes, eroding trust in the test suite.

---

## TS-06 — Dual Testing Strategy: Unit + Integration

Use lightweight unit tests (Vitest/Jest) for business logic, pure functions, and component rendering. Use integration tests for flows that cross module boundaries — API endpoints with real database, multi-step user interactions. Don't mock the database in integration tests.

**Example:** Unit: test a price calculation function. Integration: test the full signup-to-verification endpoint with Prisma + test DB.
**Why it matters:** Over-mocking creates tests that pass with broken production code; over-integrating makes tests slow and flaky.

---

## TS-07 — motion-safe Prefix for Animation Classes

When testing components with CSS animations (spinners, transitions), the class is `motion-safe:animate-spin`, not bare `animate-spin`. The `motion-safe:` prefix is a Tailwind responsive variant that respects user motion preferences. Test assertions must include it.

**Example:** `expect(spinner).toHaveClass('motion-safe:animate-spin')` — not `toHaveClass('animate-spin')`.
**Why it matters:** The bare class doesn't exist in the compiled CSS; the test assertion silently passes because `toHaveClass` checks the DOM attribute, not computed styles.

---

## TS-08 — Named + Default Exports for Testability

Export UI components as both named and default exports. Named exports enable direct imports in tests without dealing with default export wrapping. Default exports keep `React.lazy()` and dynamic imports working.

**Example:** `export const Spinner = ...` + `export default Spinner` — test imports `{ Spinner }`, app imports `Spinner` or lazy-loads.
**Why it matters:** Default-only exports make tree-shaking harder and test imports more verbose.
