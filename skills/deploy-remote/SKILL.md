---
name: deploy-remote
description: Deploy and manage Goji Docker stacks on the LAN server (default goji-server / 192.168.1.247) via SSH-backed Docker context and a local registry. Use for any remote container build, push, deploy, restart, log, migrate, or teardown operation.
type: project
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
---

# Deploy Remote Skill

Operate Goji Docker stacks on the LAN deploy server. Wraps SSH + `docker context` + local registry so the laptop builds and the server runs.

## When to Use This Skill

- Deploying any Goji stack (dev/staging/prod) to the LAN server
- Pushing newly built images to the LAN registry
- Tailing logs, restarting services, running migrations against remote stacks
- Tearing a stack down or pruning resources on the server
- Connectivity / health diagnosis when a remote deploy fails

**Do NOT use** for:

- Local Docker work (use `docker` skill)
- Railway-managed deploys (use `use-railway` skill)
- General server sysadmin (apt, ufw, systemd) — use `server-admin` skill

## Prereqs (one-time)

```bash
bash scripts/server/setup-ssh.sh         # SSH key + alias + docker context
bash scripts/server/bootstrap-remote.sh  # Docker engine + registry on server
```

After these, the following are wired up:

| Resource          | Value                                         |
|-------------------|-----------------------------------------------|
| SSH alias         | `goji-server`                                 |
| Docker context    | `goji-server` (`docker --context goji-server`)|
| Registry          | `192.168.1.247:5000`                          |
| Compose project   | `goji-system`                                 |
| LAN overlay file  | `docker/docker-compose.lan.yml`               |

## Quick Reference

### Common Operations

```bash
# Full deploy: build + push + up
bash scripts/server/deploy-remote.sh dev

# Targeted ops
bash scripts/server/deploy-remote.sh dev build      # build only (local)
bash scripts/server/deploy-remote.sh dev push       # push images
bash scripts/server/deploy-remote.sh dev up         # start (no build)
bash scripts/server/deploy-remote.sh dev restart    # restart services
bash scripts/server/deploy-remote.sh dev logs       # tail logs
bash scripts/server/deploy-remote.sh dev down       # tear down

# Status + diagnostics
bash scripts/server/remote-status.sh                # full snapshot
bash scripts/server/remote-test.sh --check          # connectivity only

# Run local tests against remote DB
bash scripts/server/remote-test.sh goji-api
```

### Direct compose calls (if scripts not enough)

```bash
docker --context goji-server compose -p goji-system \
  -f docker/docker-compose.dev.yml \
  -f docker/docker-compose.lan.yml \
  ps
```

### Direct SSH

```bash
ssh goji-server                            # interactive shell
ssh goji-server 'docker ps'                # one-shot command
ssh goji-server 'docker logs goji-api -f'  # tail container logs
```

## Image Flow

1. **Build local** — `docker compose build` tags images as `192.168.1.247:5000/goji-api:lan`
2. **Push to LAN registry** — `docker compose push` (insecure HTTP, LAN-only)
3. **Server pulls + runs** — `docker --context goji-server compose pull && up -d`

Override the tag for parallel envs:
```bash
GOJI_IMAGE_TAG=feature-foo bash scripts/server/deploy-remote.sh dev push
```

## Common Workflows

### Iterate on backend changes

```bash
# Edit code locally, then:
bash scripts/server/deploy-remote.sh dev          # build + push + up
ssh goji-server 'docker logs -f goji-api'         # watch logs
```

### Run Prisma migrations against remote

```bash
docker --context goji-server compose -p goji-system \
  -f docker/docker-compose.dev.yml -f docker/docker-compose.lan.yml \
  exec goji-api npx prisma migrate deploy
```

Or, from local with remote DB pointed at:

```bash
DATABASE_URL=postgresql://goji:goji@192.168.1.247:5434/goji?schema=public \
  npx prisma migrate deploy
```

### Run laptop tests against remote DB (offload heavy DB work)

```bash
bash scripts/server/remote-test.sh goji-api --coverage
```

### Inspect registry contents

```bash
curl -s http://192.168.1.247:5000/v2/_catalog | jq
curl -s http://192.168.1.247:5000/v2/goji-api/tags/list | jq
```

### Prune unused images on server

```bash
ssh goji-server 'docker system prune -af --volumes'
```

## Troubleshooting

| Symptom | First check | Fix |
|---------|-------------|-----|
| `Cannot connect to Docker daemon` via context | `ssh goji-server docker ps` | Re-run `setup-ssh.sh`; user may not be in docker group (reconnect) |
| `denied: requested access to the resource is denied` on push | Local daemon `insecure-registries` config | Add `192.168.1.247:5000` to `~/.docker/daemon.json`, restart Docker Desktop |
| `connection refused` on registry | `bash scripts/server/remote-status.sh` | Registry container down — `ssh goji-server 'docker start goji-registry'` |
| Slow pushes | Layer cache miss | Confirm building from same base; consider pruning local images |
| Tests can't reach DB | `bash scripts/server/remote-test.sh --check` | ufw rule missing — re-run `bootstrap-remote.sh` |
| Stack starts then crashes | `ssh goji-server 'docker logs goji-api'` | Check env vars in compose + `.env` files synced to server |

## Local Docker Daemon Config (one-time)

On Mac/Linux, edit `~/.docker/daemon.json` (create if missing):

```json
{
  "insecure-registries": ["192.168.1.247:5000"]
}
```

Then restart Docker Desktop / `sudo systemctl restart docker`.

## Constraints

- Server is LAN-only; registry has no TLS (acceptable for private network)
- Single-server setup; no orchestration (Swarm/K8s) for now
- `goji-wallet` (mobile app) does NOT deploy here — Android only
- Production data lives on Railway; LAN server is for dev/staging/test workloads

## Related

- **`server-admin` skill** — sysadmin ops (apt, ufw, systemd, disk)
- **`docker` skill** — local Docker workflows
- **`use-railway` skill** — managed cloud deploys
- **[Remote Server Deployment Guide](../../../docs/development/remote-server-deployment.md)** — full setup walkthrough
