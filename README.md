# Skills

A personal fork of [mattpocock/skills](https://github.com/mattpocock/skills), restructured to a flat layout and trimmed to the set I actually use.

## What's different from upstream

- **Flat layout.** Skills live directly in [`.agents/skills/<name>/`](./.agents/skills) instead of `skills/<category>/<name>/`. [`.claude/skills/`](./.claude/skills) holds symlinks into them so Claude Code picks them up in-repo.
- **Curated set.** 22 skills, dropping upstream's in-progress, misc, and a few I don't use (`wizard`, `to-questionnaire`, `wait-what`, etc.). `writing-for-agents` is kept as `writing-great-skills`.
- **No tagging.** The issue-tracker label/triage-tagging setup (`triage-labels.md`) is removed; `/setup-matt-pocock-skills` no longer asks about labels.
- **Publishing cruft removed.** No changesets, release workflow, npm package, or Claude Code plugin manifest — this fork is consumed via the `skills` CLI.

## Install into a project

From the target repo:

```bash
npx skills@latest add sandwichlegend/skills
```

Pick the skills and agents you want, or take everything non-interactively:

```bash
npx skills@latest add sandwichlegend/skills --skill '*' --agent claude-code -y
```

Then run `/setup-matt-pocock-skills` once per repo to wire up the issue tracker and docs location.

## Skills

`ask-matt` · `code-review` · `codebase-design` · `diagnosing-bugs` · `domain-modeling` · `grill-me` · `grill-with-docs` · `grilling` · `handoff` · `implement` · `improve-codebase-architecture` · `prototype` · `research` · `resolving-merge-conflicts` · `setup-matt-pocock-skills` · `tdd` · `teach` · `to-spec` · `to-tickets` · `triage` · `wayfinder` · `writing-great-skills`

---

Original work and design by [Matt Pocock](https://www.aihero.dev). Licensed MIT (see [LICENSE](./LICENSE)).
