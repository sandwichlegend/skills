# Skills

A personal fork of [mattpocock/skills](https://github.com/mattpocock/skills), trimmed to the set I actually use.

## What's different from upstream

- **Curated set.** Only the `engineering` and `productivity` buckets ship from upstream, plus a fork-only `gtm` bucket. Upstream's `in-progress`, `misc`, and `deprecated` buckets are left out. `resolving-merge-conflicts` stays even though upstream dropped it.
- **No tagging.** The issue-tracker label setup (`triage-labels.md`) is removed, and `/setup-matt-pocock-skills` no longer asks about labels. Exceptional work is marked by title prefix (`Research:`, `Decision:`, `Prototype:`) instead.
- **Linear tracker.** A Linear issue-tracker template is included. Specs land as Linear **project milestones**, not issues; `/to-tickets` attaches tickets to the milestone.
- **Publishing cruft removed.** No changesets, release workflow, docs site, or npm package. `.claude-plugin/marketplace.json` declares one plugin per bucket so the installer groups skills by category.

The rules behind these changes, and how to sync with upstream, are in [AGENTS.md](./AGENTS.md).

## Install into a project

From the target repo:

```bash
npx skills@latest add sandwichlegend/skills
```

The picker groups skills under **Engineering**, **Productivity** and **GTM**; toggling a group selects the whole bucket. To take everything non-interactively:

```bash
npx skills@latest add sandwichlegend/skills --skill '*' --agent claude-code -y
```

Then run `/setup-matt-pocock-skills` once per repo to wire up the issue tracker and docs location.

## Skills

**[Engineering](./skills/engineering/README.md)**: [`ask-matt`](./skills/engineering/ask-matt/SKILL.md) · [`code-review`](./skills/engineering/code-review/SKILL.md) · [`codebase-design`](./skills/engineering/codebase-design/SKILL.md) · [`diagnosing-bugs`](./skills/engineering/diagnosing-bugs/SKILL.md) · [`domain-modeling`](./skills/engineering/domain-modeling/SKILL.md) · [`grill-with-docs`](./skills/engineering/grill-with-docs/SKILL.md) · [`implement`](./skills/engineering/implement/SKILL.md) · [`implement-spec`](./skills/engineering/implement-spec/SKILL.md) · [`improve-codebase-architecture`](./skills/engineering/improve-codebase-architecture/SKILL.md) · [`pr`](./skills/engineering/pr/SKILL.md) · [`prototype`](./skills/engineering/prototype/SKILL.md) · [`research`](./skills/engineering/research/SKILL.md) · [`resolving-merge-conflicts`](./skills/engineering/resolving-merge-conflicts/SKILL.md) · [`retro`](./skills/engineering/retro/SKILL.md) · [`setup-matt-pocock-skills`](./skills/engineering/setup-matt-pocock-skills/SKILL.md) · [`tdd`](./skills/engineering/tdd/SKILL.md) · [`to-spec`](./skills/engineering/to-spec/SKILL.md) · [`to-tickets`](./skills/engineering/to-tickets/SKILL.md) · [`triage`](./skills/engineering/triage/SKILL.md) · [`wayfinder`](./skills/engineering/wayfinder/SKILL.md) · [`wizard`](./skills/engineering/wizard/SKILL.md)

**[Productivity](./skills/productivity/README.md)**: [`grill-me`](./skills/productivity/grill-me/SKILL.md) · [`grilling`](./skills/productivity/grilling/SKILL.md) · [`handoff`](./skills/productivity/handoff/SKILL.md) · [`teach`](./skills/productivity/teach/SKILL.md) · [`to-questionnaire`](./skills/productivity/to-questionnaire/SKILL.md) · [`wait-what`](./skills/productivity/wait-what/SKILL.md) · [`writing-for-agents`](./skills/productivity/writing-for-agents/SKILL.md)

**[GTM](./skills/gtm/README.md)**: [`partner-overlaps`](./skills/gtm/partner-overlaps/SKILL.md)

---

Original work and design by [Matt Pocock](https://www.aihero.dev). Licensed MIT (see [LICENSE](./LICENSE)).
