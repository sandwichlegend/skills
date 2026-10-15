# CI

Pull-request automation: configure Foreman and drive a PR through its reviewer.

## User-invoked

Reachable only when you type them (Claude Code: `disable-model-invocation: true`; Codex: `policy.allow_implicit_invocation: false` in `agents/openai.yaml`).

- **[babysit](./babysit/SKILL.md)**: Drive a pull request to the Foreman bar by fixing the reviewer's findings, pushing, and waiting for each pass, stopping to report an impasse.
- **[foreman-init](./foreman-init/SKILL.md)**: Prepare the current repo for the Foreman reviewer by writing its foreman.md and checking the GitHub App install.

## Foreman source and local changes

Both skills originate in [bold-gtm/foreman](https://github.com/bold-gtm/foreman). When updating `foreman-init`, merge upstream changes and preserve these local changes:

- Codex requires explicit invocation, matching Claude Code.
- The installed App is `bold-foreman`. Verify its identity against GitHub before changing the lookup or install link.
- Personal owners and selected repositories use installation settings. Failed API calls leave access unverified.
- App access and reviewer activity are separate claims. The allowlist still needs confirmation.
- Install commands and workspace script invocations may be derived from repository configuration rather than copied verbatim from scripts.

Re-run `claude plugin validate .` and `npx skills@latest add . --list` after a sync. Keep both skills under CI.
