# CI

Pull-request automation: driving a PR through an automated reviewer.

## User-invoked

Reachable only when you type them (Claude Code: `disable-model-invocation: true`; Codex: `policy.allow_implicit_invocation: false` in `agents/openai.yaml`).

- **[babysit](./babysit/SKILL.md)**: Drive a pull request to the Foreman bar by fixing the reviewer's findings, pushing, and waiting for each pass, stopping to report an impasse. Copied from [bold-gtm/foreman](https://github.com/bold-gtm/foreman), which stays the source of truth.
