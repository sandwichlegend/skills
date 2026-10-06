# AGENTS.md

A personal fork of [mattpocock/skills](https://github.com/mattpocock/skills) (git remote `upstream`). It tracks upstream except for the **deviations** below; hold every skill edit to them.

## Layout

Two buckets ship: `skills/engineering/` (code work) and `skills/productivity/` (non-code workflow). Upstream's other buckets, `docs/`, changesets, release workflow and package manifests stay out.

Adding, moving or removing a skill touches four registrations:

- `.claude-plugin/marketplace.json`: one plugin per bucket, whose name is the category header `npx skills add` shows. Keep the repo free of a root `plugin.json`: the skills CLI lets its grouping override the marketplace's, collapsing every skill into one group.
- The bucket `README.md`, under **User-invoked** (`disable-model-invocation: true`) or **Model-invoked**.
- The top-level `README.md` skill list.
- A `.claude/skills/<name>` symlink into the bucket.

Done when `claude plugin validate .` passes and `npx skills@latest add . --list` shows every skill under its bucket's group.

## Titles, never labels

Tracker state lives in native fields: status, blocking relations, parent, assignee. Ordinary implementation work gets a plain title; exceptional work gets an exact prefix: `Research:`, `Decision:` or `Prototype:`. Hard guardrail: skills never create, apply, remove or depend on labels, bracketed tags or readiness markers.

## Specs are Linear milestones

On Linear a spec is a project **milestone** and its tickets are issues attached to it; on other trackers a spec is an issue. Every skill step that publishes, reads or closes a spec handles the milestone case. The Linear mechanics live in `skills/engineering/setup-matt-pocock-skills/issue-tracker-linear.md`.

## Upstream sync

When pulling `mattpocock/skills` changes into this fork, follow [.agents/upstream-sync.md](.agents/upstream-sync.md).
