# Placeholders

Several skills use curly-brace placeholders in commands, file paths, and import examples. Replace these with the values from your project before running anything verbatim.

## Conventions

| Placeholder | Meaning | Example replacement |
|---|---|---|
| `{project}` | Top-level project / monorepo / docker-compose project name | `acme-platform` |
| `{api-service}` | Name of an HTTP API service (e.g. NestJS app, container name, NX project) | `api`, `web-api` |
| `{db-service}` | Name of the database service (container, NX project) | `postgres`, `db` |
| `{cache-service}` | Name of the cache service (container) | `redis`, `cache` |
| `@your-org/<lib>` | Scoped package from your monorepo or registry | `@acme/auth`, `@acme/logging` |
| `<your-server>` | SSH host or remote target | `prod-1.example.com` |
| `<registry-host>` | Container registry hostname | `registry.example.com` |

## Usage notes

- Placeholders are illustrative — skills do not auto-substitute. Treat code blocks as templates.
- For NX-style commands like `nx test {project}`, substitute the actual NX project name.
- Where a skill assumes a specific stack (NX, Docker Compose, NestJS, Expo Router), the assumption is called out in the skill's "When to Use" section. Skip the skill if your stack differs materially.
- Placeholder names follow this doc; if a skill uses different ones, that skill links here and lists its own legend.

## Why placeholders rather than concrete names

The skills in this repo were extracted from production codebases. Concrete service and library names were genericized so the patterns transfer cleanly. Where a real product name would help comprehension, the skill provides a worked example with synthetic names (e.g. `acme.com` for email, `auth-lib` for monorepo libraries).
