/**
 * tick-pr.sh (task.319) — `developNext.tickVia: pr`: the tick goes through a pull request that merges
 * only on the merge gate's green. The git side is real (a temporary repository and a bare remote); the
 * forge is a fake `gh`, or a fake `curl` for Bitbucket, whose "merge" moves the bare remote's base.
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
const SCRIPT = resolve(HERE, "..", "tick-pr.sh");
const BUDGET = spawnBudget("TICK_PR");
const TICK = "docs/roadmap-tick-17.4";

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};
const git = (cwd, ...args) =>
  execFileSync(
    "git",
    ["-c", "maintenance.auto=false", "-c", "gc.auto=0", ...args],
    {
      cwd,
      env: GIT_ENV,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();

function fixture(t, { forge = "github" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "tick-pr-"));
  t.after(() =>
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    }),
  );
  const up = join(dir, "up.git");
  const wt = join(dir, "wt");
  const bin = join(dir, "bin");
  mkdirSync(bin);
  git(dir, "init", "-q", "--bare", "-b", "develop", up);
  git(dir, "init", "-q", "-b", "develop", wt);
  git(wt, "remote", "add", "origin", up);
  mkdirSync(join(wt, "docs"));
  writeFileSync(join(wt, "docs/roadmap.md"), "- [ ] 17.4\n");
  // Declared, because the insteadOf below hides the Bitbucket host from remote-based detection.
  writeFileSync(join(wt, "skills-config.yaml"), `vcs: ${forge}\n`);
  git(wt, "add", "-A");
  git(wt, "commit", "-q", "-m", "base");
  git(wt, "push", "-q", "-u", "origin", "develop");
  const st = (f) => join(dir, f);
  writeFileSync(st("rollup"), "SUCCESS\n");
  writeFileSync(st("log"), "");
  writeFileSync(
    join(bin, "gh"),
    `#!/bin/sh
echo "gh $*" >> "${st("log")}"
head() { git -C "${up}" rev-parse refs/heads/${TICK}; }
case "$*" in
  "pr list"*) [ -f "${st("pr")}" ] && echo 9; exit 0 ;;
  "pr create"*) touch "${st("pr")}"; echo https://x/pull/9 ;;
  *headRefName*) [ -f "${st("pr")}" ] && echo "9 $(cat "${st("head")}" 2>/dev/null || head) develop ${TICK}" ;;
  *headRefOid*) cat "${st("head")}" 2>/dev/null || head ;;
  *statusCheckRollup*unique*) echo 2 ;;
  *statusCheckRollup*) cat "${st("rollup")}" ;;
  "pr merge"*) [ -f "${st("merge-refused")}" ] && exit 1
     git -C "${up}" update-ref refs/heads/develop refs/heads/${TICK}; touch "${st("merged")}"
     [ ! -f "${st("merge-exit")}" ] ;;
  *"json state"*) if [ -f "${st("merged")}" ]; then echo MERGED; else echo OPEN; fi ;;
esac
`,
  );
  writeFileSync(
    join(bin, "curl"),
    `#!/bin/sh
out=/dev/null; prev=""; url=""; post=no; w=no
for a in "$@"; do [ "$prev" = "-o" ] && out="$a"; [ "$a" = POST ] && post=yes; [ "$a" = -w ] && w=yes; prev="$a"; url="$a"; done
# like the real one: a status code is printed only when -w asks for it
[ "$w" = yes ] || exec 1>/dev/null
echo "curl $post $url" >> "${st("log")}"
pr() { state=OPEN; [ -f "${st("merged")}" ] && state=MERGED
  printf '{"id":9,"state":"%s","source":{"commit":{"hash":"%s"},"branch":{"name":"${TICK}"}},"destination":{"branch":{"name":"develop"}}}' "$state" "$(git -C "${up}" rev-parse --short=12 refs/heads/${TICK})"; }
case "$post $url" in
  "yes "*/merge) cat > "${st("merge.json")}"; [ -f "${st("merge-refused")}" ] || { git -C "${up}" update-ref refs/heads/develop refs/heads/${TICK}; touch "${st("merged")}"; }; printf 200 ;;
  "yes "*/pullrequests) cat > "${st("create.json")}"; touch "${st("pr")}"; printf 201 ;;
  *pullrequests/9) pr > "$out"; printf 200 ;;
  *pullrequests) if [ -f "${st("pr")}" ]; then printf '{"values":[%s]}' "$(pr)" > "$out"; else printf '{"values":[]}' > "$out"; fi; printf 200 ;;
  *statuses*) printf '{"values":[{"key":"prs:**:develop","state":"%s"}]}' "$(cat "${st("bbstate")}" 2>/dev/null || echo SUCCESSFUL)" > "$out"; printf 200 ;;
  *) printf 404 ;;
esac
`,
  );
  writeFileSync(join(bin, "sleep"), "#!/bin/sh\nexit 0\n");
  for (const f of ["gh", "curl", "sleep"]) chmodSync(join(bin, f), 0o755);
  const env = {
    ...GIT_ENV,
    PATH: `${bin}:${process.env.PATH}`,
    BITBUCKET_ACCESS_TOKEN: "fake",
  };
  // The Bitbucket slug is read from the configured URL; pushes still go to the bare repository.
  if (forge === "bitbucket") {
    git(wt, "config", "remote.origin.url", "git@bitbucket.org:ws/app.git");
    git(wt, "config", "remote.origin.pushurl", up);
    git(wt, "config", `url.${up}.insteadOf`, "git@bitbucket.org:ws/app.git");
  }
  const tick = (...args) => {
    let r;
    for (let i = 0; i <= BUDGET.retries; i += 1) {
      r = spawnSync("bash", [SCRIPT, ...args], {
        cwd: wt,
        env,
        encoding: "utf8",
        timeout: BUDGET.timeoutMs,
      });
      if (!neverRan(r)) break;
    }
    return { code: r.status, out: r.stdout.trim(), err: r.stderr.trim() };
  };
  const at = ["--base", "develop", "--branch", TICK];
  return {
    dir,
    up,
    wt,
    st,
    start: () => tick("start", ...at),
    open: () => tick("open", ...at, "--title", "docs(roadmap): tick 17.4"),
    merge: (gate, ...more) =>
      tick(
        "merge",
        ...at,
        "--pr",
        "9",
        "--max-wait",
        "60",
        ...(gate === undefined ? [] : ["--quality-gate-exit", gate]),
        ...more,
      ),
    raw: tick,
    commit: () => {
      writeFileSync(join(wt, "docs/roadmap.md"), "- [x] 17.4\n");
      git(wt, "commit", "-q", "-am", "docs(roadmap): tick 17.4 [x]");
    },
    base: () => git(up, "rev-parse", "refs/heads/develop"),
    log: () => readFileSync(st("log"), "utf8"),
  };
}

function opened(t, opts) {
  const f = fixture(t, opts);
  assert.equal(f.start().out, "new");
  f.commit();
  const r = f.open();
  assert.equal(r.out, "9", r.err);
  return f;
}

for (const forge of ["github", "bitbucket"]) {
  test(`${forge}: the tick opens a PR, leaves the base alone, and merges on green`, (t) => {
    const f = opened(t, { forge });
    const before = f.base();
    assert.notEqual(before, git(f.up, "rev-parse", `refs/heads/${TICK}`));
    const r = f.merge("0", "--strategy", "squash");
    assert.equal(r.out, "merged", r.err);
    assert.notEqual(f.base(), before);
    assert.equal(git(f.wt, "symbolic-ref", "--short", "HEAD"), "develop");
    assert.match(readFileSync(join(f.wt, "docs/roadmap.md"), "utf8"), /\[x\]/);
    if (forge === "bitbucket") {
      const sent = (n) => JSON.parse(readFileSync(f.st(n), "utf8"));
      assert.equal(sent("merge.json").merge_strategy, "squash");
      assert.equal(sent("create.json").destination.branch.name, "develop");
      assert.doesNotMatch(f.log(), /^gh /m);
    } else assert.match(f.log(), /gh pr merge 9 --squash --match-head-commit/);
  });

  test(`${forge}: red, pending or unread CI never merges`, (t) => {
    const states =
      forge === "github"
        ? ["FAILURE", "PENDING", "CANCELLED", "UNKNOWN"]
        : ["FAILED", "INPROGRESS", "STOPPED"];
    for (const s of states) {
      const f = opened(t, { forge });
      const before = f.base();
      writeFileSync(
        f.st(forge === "github" ? "rollup" : "bbstate"),
        forge === "github" ? `${s}\n` : s,
      );
      const r = f.merge("0");
      assert.equal(r.code, 1, `${s}: ${r.err}`);
      assert.match(r.err, /HALT: .*not merged/);
      assert.equal(f.base(), before, s);
      assert.ok(!existsSync(f.st("merged")), s);
    }
  });
}

test("the quality gate's exit status is required: absent or non-zero refuses before any CI read", (t) => {
  const f = opened(t);
  for (const gate of [undefined, "1", ""]) {
    const r = f.merge(gate);
    assert.notEqual(r.code, 0);
    assert.ok(!existsSync(f.st("merged")), String(gate));
  }
  assert.doesNotMatch(f.log(), /statusCheckRollup/);
});

test("a head that moved since the tick, and another destination, are refused", (t) => {
  const f = opened(t);
  writeFileSync(f.st("head"), `${"b".repeat(40)}\n`);
  const r = f.merge("0");
  assert.equal(r.code, 1);
  assert.match(r.err, /is not the tick head/);
  const g = opened(t);
  const other = g.raw(
    "merge",
    "--base",
    "main",
    "--branch",
    TICK,
    "--pr",
    "9",
    "--quality-gate-exit",
    "0",
  );
  assert.equal(other.code, 1);
  assert.match(other.err, /targets develop, not main/);
});

test("a PR with no checks merges on the quality gate alone", (t) => {
  const f = opened(t);
  writeFileSync(f.st("rollup"), "NONE\n");
  const r = f.merge("0");
  assert.equal(r.out, "merged", r.err);
});

test("the merge is judged by the PR's state, not by the command's exit status", (t) => {
  const landed = opened(t);
  writeFileSync(landed.st("merge-exit"), "");
  assert.equal(landed.merge("0").out, "merged");
  const refused = opened(t);
  writeFileSync(refused.st("merge-refused"), "");
  const r = refused.merge("0");
  assert.equal(r.code, 1);
  assert.match(r.err, /'OPEN' after the merge call/);
});

test("resume: an interrupted tick is found again, locally or only on the remote, and no second PR opens", (t) => {
  const f = fixture(t);
  f.start();
  f.commit();
  git(f.wt, "checkout", "-q", "develop");
  assert.equal(f.start().out, "resume", "a local tick branch with a commit");
  f.open();
  git(f.wt, "checkout", "-q", "develop");
  git(f.wt, "branch", "-q", "-D", TICK);
  assert.equal(f.start().out, "resume", "only the remote has it");
  assert.equal(f.open().out, "9");
  assert.equal((f.log().match(/gh pr create/g) ?? []).length, 1);
});

test("open refuses a branch with no tick commit, and usage errors exit 2", (t) => {
  const f = fixture(t);
  f.start();
  const r = f.open();
  assert.equal(r.code, 1);
  assert.match(r.err, /no tick commit/);
  for (const args of [
    [],
    ["start"],
    ["bogus", "--base", "a", "--branch", "b"],
    ["start", "--base", "a", "--branch", "a"],
    [
      "merge",
      "--base",
      "a",
      "--branch",
      "b",
      "--pr",
      "1",
      "--strategy",
      "ours",
    ],
  ])
    assert.equal(f.raw(...args).code, 2, args.join(" "));
});
