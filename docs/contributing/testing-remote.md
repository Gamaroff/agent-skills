# Running the tests on the LAN server

> **Audience:** contributors and agents who run the suite from a laptop.

`npm run test:remote` syncs your working tree to the shared LAN server, runs root npm scripts there in a container that mirrors `.github/workflows/test.yml`, and exits with their status. The laptop only runs `ssh` and `rsync`.

## Usage

```bash
npm run test:remote                          # runs ci:fast on the server
npm run test:remote -- --run eval:all        # any root script; --run repeats
npm run test:remote -- --run format:check --run test
TEST_LOCAL=1 npm run test:remote             # the same scripts, on this machine
npm run test:remote -- --reap 7              # remove per-branch directories untouched for 7 days
```

| Option / variable                                | Meaning                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `--run SCRIPT`                                   | A root npm script (`[A-Za-z0-9:._-]+`). Anything else exits 2.      |
| `--host USER@HOST` / `TEST_REMOTE_HOST`          | The server. Default `ci@192.168.1.249`.                             |
| `--timeout-min N` / `TEST_REMOTE_TIMEOUT_MIN`    | Wall-clock ceiling for the run. Default 30. Exit status 124.        |
| `--reap DAYS`                                    | Remove stale `~/agent-skills-test-*` directories, then exit.        |
| `TEST_LOCAL=1`                                   | Run on this machine. The only way to run locally.                   |

## When to use it

Use the route whenever the server is up. Run locally (`TEST_LOCAL=1`) only when it is down. If the server is unreachable the route exits non-zero, says so, and names `TEST_LOCAL=1`. It never falls back by itself, because a silent fall back would hide the load it exists to move.

## What happens

1. A probe checks that the server answers and has `rsync` and a working `docker`.
2. The tree is synced to `~/agent-skills-test-<branch-slug>/` on the server: tracked files plus untracked files git does not ignore. Gitignored paths, `.env` and `.secrets/` are not sent, and `node_modules/` is installed on the server.
3. `.git` is synced separately so history-backed tests run. In a linked worktree `.git` is a file; the route says so, and those tests may fail or skip remotely.
4. A container built from `scripts/remote-test/Dockerfile` (Node 22, `python3-yaml`, `gawk`, `mawk`, `zsh`, `jq`, `git`) runs `npm ci` when `package-lock.json` changed, then each script in order. It runs as your UID at `--cpu-shares 128`.
5. `ssh` runs under `timeout --foreground -k 1m`. The route exits with that status.

The remote run is a clean-checkout run: the gitignored `.agents/skills` symlink is absent there. A test that passes locally and fails remotely because of that symlink is a real finding, not a route bug (see [traps](./traps.md)).

## Host rules

The server is shared with another repository's CI runner and is also a gaming PC. It is WSL2.

- Everything stays under the SSH user's home. Never write to the Windows C: drive: it once filled to 100% and WSL went read-only.
- The route prints `uptime` and the running containers before each run. If the host is loaded, wait.
- Do not prune Docker globally. Remove only what this route made (`agent-skills-test:*` images, `~/agent-skills-test-*` directories).
- Do not probe a closed loopback port on the server: it hangs for over two minutes.

## Troubleshooting

| Symptom                                    | Cause and fix                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `test server … is unreachable`             | The host is down or `ssh` needs a key. Check `ssh -o BatchMode=yes ci@192.168.1.249 true`.             |
| Exit 2, `--run needs an npm script name`   | The name has a character outside `[A-Za-z0-9:._-]`, or starts with `-`.                                 |
| Exit 124                                   | The run hit the timeout. Raise `--timeout-min` or look for a hung test.                                 |
| Root-owned files in the remote directory   | The container did not run as your UID. The route passes `--user`; do not run docker by hand without it. |
