/**
 * finalise-ci-poll.sh on Bitbucket (task.319): the same one-line result as on GitHub, from the status
 * key of the PR's own destination. A fake `curl` answers the two endpoints; nothing reaches the network.
 * The GitHub arm is covered in ci-tree-equivalence.test.mjs.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neverRan, spawnBudget } from "../spawn-budget.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const POLL = resolve(HERE, "..", "finalise-ci-poll.sh");
const BUDGET = spawnBudget("CI_POLL");
const HEAD = "a".repeat(40);

const status = (key, state) => ({ key, state });

/** Runs the poll against fixtures; `statuses` is what the statuses endpoint answers, in order. */
function runPoll(
  t,
  {
    statuses,
    code = 200,
    prCode = 200,
    destination = "develop",
    head = HEAD,
    floor = "1",
    maxWait = "90",
    movesAfter = 0,
    engine = false,
  },
) {
  const dir = mkdtempSync(join(tmpdir(), "ci-poll-bb-"));
  t.after(() =>
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    }),
  );
  const repo = join(dir, "repo");
  const bin = join(dir, "bin");
  mkdirSync(repo);
  mkdirSync(bin);
  execFileSync("git", ["init", "-q", repo]);
  execFileSync("git", [
    "-C",
    repo,
    "remote",
    "add",
    "origin",
    "git@bitbucket.org:ws/app.git",
  ]);
  writeFileSync(
    join(dir, "pr.json"),
    JSON.stringify({
      id: 7,
      // Bitbucket answers a 12-character hash
      source: {
        commit: { hash: head.slice(0, 12) },
        branch: { name: "feature/x" },
      },
      destination: { branch: { name: destination } },
    }),
  );
  statuses.forEach((s, i) =>
    writeFileSync(
      join(dir, `statuses.${i}.json`),
      typeof s === "string" ? s : JSON.stringify(s),
    ),
  );
  // The fake curl logs each URL, so a test can assert which endpoints were read.
  writeFileSync(
    join(bin, "curl"),
    `#!/bin/sh
out=""; prev=""; url=""
for a in "$@"; do [ "$prev" = "-o" ] && out="$a"; prev="$a"; url="$a"; done
echo "$url" >> "${dir}/curl.log"
limit=""; prev=""
for a in "$@"; do [ "$prev" = "--max-time" ] && limit="$a"; prev="$a"; done
case "$limit" in "" | 0 | *[!0-9]*) echo "unbounded $url" >> "${dir}/curl.log" ;; esac
case "$url" in
  */pullrequests/7)
    if [ ${movesAfter} -gt 0 ] && [ "$(grep -c 'pullrequests/7' "${dir}/curl.log")" -gt ${movesAfter} ]; then
      sed 's/${head.slice(0, 12)}/${"c".repeat(12)}/' "${dir}/pr.json" > "$out"
    else cat "${dir}/pr.json" > "$out"; fi
    printf '${prCode}' ;;
  */statuses*)
    n=$(grep -c statuses "${dir}/curl.log"); n=$((n - 1))
    while [ "$n" -gt 0 ] && [ ! -f "${dir}/statuses.$n.json" ]; do n=$((n - 1)); done
    cat "${dir}/statuses.$n.json" > "$out"; printf '${code}' ;;
  *) printf '404' ;;
esac
`,
  );
  writeFileSync(join(bin, "sleep"), "#!/bin/sh\nexit 0\n");
  // A `gh` on a Bitbucket run is a defect: it answers a green GitHub rollup, so using it is visible.
  writeFileSync(
    join(bin, "gh"),
    `#!/bin/sh\necho gh >> "${dir}/curl.log"\necho SUCCESS\n`,
  );
  for (const f of ["curl", "sleep", "gh"]) chmodSync(join(bin, f), 0o755);
  const result = join(dir, "result.txt");
  const fakeEngine = join(dir, "engine.js");
  writeFileSync(
    fakeEngine,
    `require("fs").appendFileSync(${JSON.stringify(join(dir, "curl.log"))}, "engine " + process.argv.slice(2).join(" ") + "\\n");
console.log(JSON.stringify({ reason: "tree-equivalent", greenSha: "${"b".repeat(40)}" }));
`,
  );
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    GIT_CONFIG_GLOBAL: "/dev/null",
    BITBUCKET_ACCESS_TOKEN: "fake",
  };
  delete env.VCS;
  delete env.TRACKER;
  let r;
  for (let i = 0; i <= BUDGET.retries; i += 1) {
    const args = [POLL, "7", HEAD, maxWait, result, floor];
    if (engine) args.push(fakeEngine);
    r = spawnSync("bash", args, {
      cwd: repo,
      env,
      encoding: "utf8",
      timeout: BUDGET.timeoutMs,
    });
    if (!neverRan(r)) break;
  }
  return {
    line: existsSync(result) ? readFileSync(result, "utf8").trim() : null,
    log: readFileSync(join(dir, "curl.log"), "utf8"),
    stderr: r.stderr,
    code: r.status,
  };
}

const SHORT = HEAD.slice(0, 12);

test("Bitbucket: the result line carries the rollup of the PR's own destination", (t) => {
  const values = [
    status("prs:**:develop", "SUCCESSFUL"),
    status("prs:**:main", "FAILED"),
  ];
  const green = runPoll(t, { statuses: [{ values }] });
  assert.equal(green.line, `SUCCESS ${SHORT} 1 30s TREE_EQ=`, green.stderr);
  assert.doesNotMatch(
    green.log,
    /^gh$/m,
    "the Bitbucket arm must not call gh for a reading",
  );
  assert.match(
    green.log,
    new RegExp(`/repositories/ws/app/commit/${SHORT}/statuses`),
  );
  const red = runPoll(t, { statuses: [{ values }], destination: "main" });
  assert.equal(red.line, `FAILURE ${SHORT} 1 30s TREE_EQ=`, red.stderr);
});

test("Bitbucket: a status that is not a PR pipeline's counts: an external failure is a failure (T319-CR-110)", (t) => {
  const values = [
    status("prs:**:develop", "SUCCESSFUL"),
    status("prs:**:main", "SUCCESSFUL"),
    status("sonar", "FAILED"),
  ];
  const red = runPoll(t, { statuses: [{ values }] });
  assert.equal(red.line, `FAILURE ${SHORT} 2 30s TREE_EQ=`, red.stderr);
  values[2] = status("sonar", "SUCCESSFUL");
  const green = runPoll(t, { statuses: [{ values }] });
  assert.equal(green.line, `SUCCESS ${SHORT} 2 30s TREE_EQ=`, green.stderr);
});

test("Bitbucket: pending resolves on a later sample; statuses for another destination only are PENDING, none at all is NONE", (t) => {
  const late = runPoll(t, {
    statuses: [
      { values: [status("prs:**:develop", "INPROGRESS")] },
      { values: [status("prs:**:develop", "INPROGRESS")] },
      { values: [status("prs:**:develop", "SUCCESSFUL")] },
    ],
  });
  assert.equal(late.line, `SUCCESS ${SHORT} 1 60s TREE_EQ=`, late.stderr);
  // this PR's own pipeline has not registered: never green, never "no checks" (T319-CR-111)
  for (const extra of [[], [status("sonar", "SUCCESSFUL")]]) {
    const other = runPoll(t, {
      statuses: [{ values: [status("prs:**:main", "SUCCESSFUL"), ...extra] }],
      maxWait: "60",
    });
    assert.equal(
      other.line,
      `PENDING ${SHORT} ${extra.length} 60s TREE_EQ=`,
      other.stderr,
    );
  }
  // …but a failure already in is a failure
  const failed = runPoll(t, {
    statuses: [
      {
        values: [
          status("prs:**:main", "SUCCESSFUL"),
          status("sonar", "FAILED"),
        ],
      },
    ],
  });
  assert.equal(failed.line, `FAILURE ${SHORT} 1 30s TREE_EQ=`, failed.stderr);
  const none = runPoll(t, { statuses: [{ values: [] }], maxWait: "60" });
  assert.equal(none.line, `NONE ${SHORT} 0 60s TREE_EQ=`, none.stderr);
});

test("Bitbucket: a status list without prs: keys is read whole, and a paged or unreadable one is UNKNOWN", (t) => {
  const flat = runPoll(t, {
    statuses: [
      { values: [status("build", "SUCCESSFUL"), status("lint", "FAILED")] },
    ],
  });
  assert.equal(flat.line, `FAILURE ${SHORT} 2 30s TREE_EQ=`, flat.stderr);
  const unknown = `UNKNOWN ${SHORT} 0 30s TREE_EQ=`;
  const values = [status("prs:**:develop", "SUCCESSFUL")];
  assert.equal(
    runPoll(t, { statuses: [{ values, next: "x" }], maxWait: "30" }).line,
    unknown,
  );
  assert.equal(
    runPoll(t, { statuses: ["not json"], maxWait: "30" }).line,
    unknown,
  );
  assert.equal(
    runPoll(t, { statuses: [{ values }], code: 403, maxWait: "30" }).line,
    unknown,
  );
});

test("Bitbucket: a PR that cannot be read is `unknown`, and a moved head never decides", (t) => {
  const values = [status("prs:**:develop", "SUCCESSFUL")];
  const gone = runPoll(t, {
    statuses: [{ values }],
    prCode: 404,
    maxWait: "30",
  });
  assert.equal(gone.line, "UNKNOWN unknown 0 30s TREE_EQ=");
  const moved = runPoll(t, {
    statuses: [{ values }],
    head: "b".repeat(40),
    maxWait: "60",
  });
  assert.equal(moved.line, `UNDECIDED ${"b".repeat(12)} 1 60s TREE_EQ=`);
});

test("Bitbucket: the head in the result line is read when the line is written (T319-CR-109)", (t) => {
  // the head moves after the second sample decided
  const r = runPoll(t, {
    statuses: [{ values: [status("prs:**:develop", "SUCCESSFUL")] }],
    movesAfter: 2,
  });
  assert.equal(r.line, `SUCCESS ${"c".repeat(12)} 1 30s TREE_EQ=`, r.stderr);
});

test("Bitbucket: the docs-only rule is asked with the PR's destination, so ancestors are read as the head is (T319-CR-306)", (t) => {
  const r = runPoll(t, {
    statuses: [{ values: [status("prs:**:main", "INPROGRESS")] }],
    destination: "main",
    engine: true,
  });
  assert.equal(
    r.line,
    `SUCCESS ${SHORT} 1 30s TREE_EQ=${"b".repeat(12)}`,
    r.stderr,
  );
  assert.match(r.log, /^engine .*--pr 7 --destination main --json$/m);
});

test("Bitbucket: every request carries a time limit, so a stalled server cannot hold the poll (T319-CR-311)", (t) => {
  const r = runPoll(t, {
    statuses: [{ values: [status("prs:**:develop", "SUCCESSFUL")] }],
  });
  assert.match(r.log, /pullrequests\/7$/m, "the PR was read");
  assert.match(r.log, /\/statuses\?/, "the statuses were read");
  assert.doesNotMatch(r.log, /^unbounded /m);
});

test("Bitbucket: the check floor holds a partial rollup", (t) => {
  const r = runPoll(t, {
    statuses: [{ values: [status("prs:**:develop", "SUCCESSFUL")] }],
    floor: "3",
    maxWait: "60",
  });
  assert.equal(r.line, `UNDECIDED ${SHORT} 1 60s TREE_EQ=`);
  assert.match(r.stderr, /floor 3, saw 1/);
});
