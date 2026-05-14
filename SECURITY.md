# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | yes       |

## Reporting

Do **not** open a public issue for security concerns.

Email **gamaroff@gmail.com** directly. Include:
- Description of the issue
- Steps to reproduce
- Potential impact

You will receive a response within 48 hours. Please allow time to patch before public disclosure.

## Scope

Skills are loaded by AI agents and may execute shell scripts on a developer's machine. In-scope concerns:

- Secrets, tokens, or credentials committed to the repo or its git history
- Skills that execute untrusted input without sanitization (command injection)
- Skills that write outside their intended target directories (path traversal)
- Supply-chain risks in bundled dependencies

Out of scope: skills that intentionally run privileged operations when used as documented (e.g. `deploy-remote`, `server-admin`, `railway-postgres-crud`); third-party services referenced in docs (report those to their vendors).

## Secret scanning

A pre-commit hook (`.pre-commit-config.yaml`) runs [gitleaks](https://github.com/gitleaks/gitleaks) on staged changes. To enable in your clone:

```bash
pip install pre-commit
pre-commit install
```

To scan full history manually:

```bash
gitleaks detect --source . --no-banner
```
