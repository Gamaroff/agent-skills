# Evals — Token Sources

> **Audience:** contributors running live eval drivers that need credentials.

Where to get the tokens the live drivers and live-tracker scenario require.


| Token | URL |
| --- | --- |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `GH_TOKEN` (fine-grained) | https://github.com/settings/personal-access-tokens/new |
| `JIRA_TOKEN` | https://id.atlassian.com/manage-profile/security/api-tokens |

SSH git auth is independent — `git push/clone` uses SSH, but `gh` cli and the GitHub API need a token.

### Safer than plaintext in `~/.zshrc`

```bash
# 1Password cli:
export ANTHROPIC_API_KEY="$(op read 'op://Personal/anthropic/key')"

# macOS keychain:
security add-generic-password -a "$USER" -s anthropic-api-key -w 'sk-ant-…'
export ANTHROPIC_API_KEY="$(security find-generic-password -a "$USER" -s anthropic-api-key -w)"
```

---

