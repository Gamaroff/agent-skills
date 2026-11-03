// ---------------------------------------------------------------------------
// accept-qa-residual-merge-rule.test.mjs (task.251, obs #150)
// ---------------------------------------------------------------------------
// develop-next Step 3 "Verify green" refuses to merge while the newest gate holds an `open`
// top_issues[] entry. task.250's owner accepted a loop-limit residual, the gate was hand-edited to
// WAIVED, and the merge still HALTed because the two findings kept `status: open`. This suite holds
// the claim that a gate written by accept-qa-residual.js passes that rule — and that the gate it
// started from does not, so the pass is the writer's doing, not a rule that never fires.
//
// The rule is prose (SKILL.md § Step 3, the decision table and its "An entry is open when…"
// paragraph), so it is restated here as a predicate and the paragraph is pinned beside it: a change
// to one without the other turns this suite red.
// ---------------------------------------------------------------------------

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");
const { acceptResidual } = require(
  path.join(ROOT, "shared/resources/accept-qa-residual.js"),
);
const { readGateToken, readTopIssues } = require(
  path.join(ROOT, "shared/resources/qa-diminishing-returns.js"),
);

// develop-next Step 3's decision for an `accepted` document, as the SKILL.md table states it.
function mergeDecision(gateText) {
  const token = readGateToken(gateText);
  if (!token) return "HALT";
  if (token === "FAIL") return "HALT";
  const waiverActive =
    /^waiver:\s*\n(?:[ \t]+.*\n)*?[ \t]+active:\s*true\b/m.test(gateText);
  const open = readTopIssues(gateText).filter((e) => {
    if (e.status === "open") return true;
    if (e.status === null) return !(token === "WAIVED" && waiverActive);
    return false;
  });
  return open.length === 0 ? "merge" : "HALT";
}

// task.250's gate.5 before the hand edit (commit 2b696725), trimmed to the keys the rule reads.
const GATE_250 = `schema: 1
gate: CONCERNS
head: '51ca2fdb02822a341bd3bb21a0de8e2a9153bfd6'
updated: '2026-11-02T19:43:02Z'
top_issues:
  - id: 'TASK-250-CR5-1'
    severity: medium
    finding: 'a nested template literal re-splits a write call'
    status: open
  - id: 'TASK-250-CR5-2'
    severity: low
    finding: 'the regex tripwire ignores a phantom regex'
    status: open
waiver:
  active: false
`;

const REPORT = `# Implementation Report

## Decisions Log

- startup

---

## QA Iteration History

### QA Cycle 5 — 2026-11-02
**Gate Result**: CONCERNS
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached

---
`;

test("SKILL.md still states the open-entry rule this suite restates", () => {
  const skill = readFileSync(
    path.join(ROOT, "skills/develop-next/SKILL.md"),
    "utf8",
  ).replace(/\s+/g, " ");
  assert.match(
    skill,
    /An entry is open when its `status:` is absent or reads `open`/,
  );
  assert.match(skill, /entries without a `status:` count as waived, not open/);
  assert.match(
    skill,
    /`accepted` \| `CONCERNS` \/ `WAIVED` \| \*\*yes\*\* \| \*\*HALT\*\*/,
  );
  assert.match(
    skill,
    /accept-qa-residual\.sh/,
    "the waived-stamp writer is named beside the rule",
  );
});

test("calibration: the gate task.250 escalated on HALTs the merge, and so does the hand edit that kept status: open", () => {
  assert.equal(mergeDecision(GATE_250), "HALT");
  const handEdit = GATE_250.replace("gate: CONCERNS", "gate: WAIVED").replace(
    "waiver:\n  active: false",
    "waiver:\n  active: true\n  reason: 'accepted'\n  approved_by: 'Owner'",
  );
  assert.equal(
    mergeDecision(handEdit),
    "HALT",
    "task.250's improvised WAIVED gate — the defect obs #150 recorded",
  );
});

test("the gate accept-qa-residual.js writes passes develop-next's merge rule", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "t251-"));
  try {
    const doc = path.join(root, "doc");
    mkdirSync(doc);
    const gate = path.join(doc, "task.250.gate.5.example.yml");
    const report = path.join(doc, "task.250.implementation.1.example.md");
    writeFileSync(gate, GATE_250);
    writeFileSync(report, REPORT);
    const r = acceptResidual({
      docDir: doc,
      report,
      approvedBy: "Owner",
      reason: "residual accepted at the loop-limit escalation",
      now: new Date("2026-11-03T06:00:00Z"),
    });
    assert.equal(r.reason, "accepted");
    assert.equal(mergeDecision(readFileSync(gate, "utf8")), "merge");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
