// Guards for the config `setup-consumer.sh` generates, and for the detector that
// recognises the narrowing statusMap older versions of it used to write.
//
// (1) The wizard must not emit an ACTIVE statusMap. A commented one is the point:
//     an override REPLACES the built-in candidate list, so a generated override
//     narrows matching to one name per status on every consumer it touches.
// (2) The generated file must still parse under every hand-rolled reader in the
//     repo — the new block is all comments, and each reader handles comments its
//     own way.
// (3) detectNarrowingStatusMap must recognise exactly the historical block, leave
//     a deliberate list-valued override alone, and — the failure mode that
//     motivated a dedicated test — never be fed loadStatusMap()'s merged output.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const WIZARD = path.join(REPO, "scripts", "setup-consumer.sh");

const {
  DEFAULT_STATUS_MAP,
  loadStatusMap,
  loadStatusMapOverrides,
  detectNarrowingStatusMap,
  parseJiraScalar,
} = require(path.join(REPO, "shared", "resources", "jira-sync.js"));

// The exact block setup-consumer.sh generated before this was fixed.
const HISTORICAL_BLOCK = {
  draft: "To Do",
  planned: "To Do",
  "ready-for-development": "To Do",
  "in-progress": "In Progress",
  "ready-for-review": "In Review",
  accepted: "Done",
  cancelled: "Cancelled",
};

// Run the wizard's config writer in isolation. SETUP_CONSUMER_NO_MAIN keeps
// `main` from running on source; the three blank lines accept the path defaults.
function generateConfig(tracker) {
  const dir = mkdtempSync(path.join(tmpdir(), "setup-consumer-"));
  try {
    execFileSync(
      "bash",
      ["-c", `source '${WIZARD}'; write_skills_config`],
      {
        cwd: dir,
        input: "\n\n\n",
        env: { ...process.env, SETUP_CONSUMER_NO_MAIN: "1", TRACKER: tracker },
        stdio: ["pipe", "ignore", "ignore"],
      },
    );
    return readFileSync(path.join(dir, "skills-config.yaml"), "utf-8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// A throwaway repo root holding just the config, for the readers that take one.
function withConfig(body, fn) {
  const dir = mkdtempSync(path.join(tmpdir(), "config-root-"));
  try {
    writeFileSync(path.join(dir, "skills-config.yaml"), body);
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("the wizard emits no active jira.statusMap", () => {
  const out = generateConfig("jira");
  assert.ok(
    !/^\s*statusMap:/m.test(out),
    "setup-consumer.sh must not generate an active jira.statusMap — it narrows the candidate lists",
  );
  assert.match(out, /#\s*statusMap/, "the commented guidance should still be present");
  assert.match(out, /--probe-workflow/, "the guidance should point at the probe");
});

test("the wizard's github config carries no jira block at all", () => {
  const out = generateConfig("github");
  assert.ok(!/^\s*statusMap:/m.test(out));
  assert.ok(!/^jira:/m.test(out));
});

test("the generated jira config parses under every hand-rolled reader", () => {
  const out = generateConfig("jira");

  withConfig(out, (root) => {
    // jira-sync.js: the two scanners that walk the `jira:` block by indentation.
    assert.deepEqual(
      loadStatusMapOverrides(root),
      {},
      "an all-comment jira block must yield no overrides",
    );
    assert.deepEqual(
      loadStatusMap(root),
      { ...DEFAULT_STATUS_MAP },
      "with no overrides the effective map is exactly the defaults",
    );

    // A live `jira.` scalar must still resolve past the comment block.
    const withScalar = out.replace(
      /^jira:$/m,
      "jira:\n  devEstimateField: customfield_10594",
    );
    assert.equal(
      parseJiraScalar(withScalar, "devEstimateField"),
      "customfield_10594",
    );

    // The three shell readers.
    const sh = (script) =>
      execFileSync("bash", ["-c", script], {
        cwd: root,
        encoding: "utf-8",
        env: { ...process.env, SETUP_CONSUMER_NO_MAIN: "1" },
        stdio: ["pipe", "pipe", "ignore"],
      }).trim();

    assert.equal(
      sh(`source '${path.join(REPO, "shared/resources/resolve-platform.sh")}'; echo "$TRACKER"`),
      "jira",
    );
    assert.equal(
      sh(`source '${path.join(REPO, "shared/resources/resolve-paths.sh")}'; echo "$PRD_ROOT"`),
      "docs/prd",
    );
    assert.equal(
      sh(`source '${WIZARD}'; _read_config_path prdShardedLocation`),
      "docs/prd",
    );

    // generate-prd-epic-index.mjs resolves the same key with its own scanner.
    assert.equal(
      execFileSync(
        "node",
        [
          "-e",
          `process.chdir(${JSON.stringify(root)});
           const s=require('fs').readFileSync('skills-config.yaml','utf8');
           const m=s.match(/^prd:\\s*$([\\s\\S]*?)^\\S/m)||[];
           process.stdout.write((/prdShardedLocation:\\s*(\\S+)/.exec(m[1]||'')||[])[1]||'');`,
        ],
        { encoding: "utf-8" },
      ),
      "docs/prd",
    );
  });
});

test("detectNarrowingStatusMap recognises the historical wizard block", () => {
  const r = detectNarrowingStatusMap(HISTORICAL_BLOCK);
  assert.equal(r.wholeMap, true);
  assert.equal(r.keys.length, 7);
});

test("detectNarrowingStatusMap leaves deliberate overrides alone", () => {
  // A list is always deliberate.
  assert.equal(
    detectNarrowingStatusMap({
      "ready-for-review": ["Waiting for Review", "In Review"],
    }).wholeMap,
    false,
  );
  // A scalar that is not candidates[0] is a real choice, not the wizard's.
  assert.equal(
    detectNarrowingStatusMap({ "ready-for-review": "Waiting for Review" })
      .wholeMap,
    false,
  );
  // One narrowed key among deliberate ones is not the whole-map fingerprint.
  const mixed = detectNarrowingStatusMap({
    "ready-for-review": "In Review",
    accepted: ["Shipped", "Done"],
  });
  assert.equal(mixed.wholeMap, false);
  assert.deepEqual(mixed.keys, ["ready-for-review"]);
});

test("detectNarrowingStatusMap ignores an empty or absent map", () => {
  for (const empty of [{}, null, undefined]) {
    assert.deepEqual(detectNarrowingStatusMap(empty), {
      keys: [],
      wholeMap: false,
    });
  }
});

test("the detector must be fed raw overrides, never the merged map", () => {
  const yaml = `tracker: jira

jira:
  statusMap:
${Object.entries(HISTORICAL_BLOCK)
  .map(([k, v]) => `    ${k}: ${v}`)
  .join("\n")}
`;

  withConfig(yaml, (root) => {
    // Raw: exactly the seven keys the project wrote, and the fingerprint fires.
    const raw = loadStatusMapOverrides(root);
    assert.deepEqual(raw, HISTORICAL_BLOCK);
    assert.equal(detectNarrowingStatusMap(raw).wholeMap, true);

    // Merged: DEFAULT_STATUS_MAP's aliases are still arrays, so wholeMap can
    // never be true. This is the wiring mistake the detector must not be given —
    // it would ship, pass, and silently never fire.
    const merged = loadStatusMap(root);
    assert.ok(Object.keys(merged).length > Object.keys(raw).length);
    assert.equal(detectNarrowingStatusMap(merged).wholeMap, false);
  });
});
