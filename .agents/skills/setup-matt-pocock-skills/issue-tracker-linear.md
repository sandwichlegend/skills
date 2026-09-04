# Issue tracker: Linear

Issues and specs for this repo live in Linear. Use the Linear MCP tools for all operations: `save_issue`, `get_issue`, `list_issues`, `save_comment`, `list_comments`, `save_milestone`, `get_milestone`, `list_milestones`, and `get_project`.

- **Team**: `<team name or key>` _(fill in)_
- **Project**: `<project name or slug>` _(fill in; the Linear project that holds this repo's work)_

## Conventions

- **Create an issue**: `save_issue` with `team`, `project`, `title`, and a Markdown `description`. Never pass `labels` or `addLabels`.
- **Read an issue**: `get_issue` with the identifier (e.g. `ENG-123`), then `list_comments` for the discussion.
- **List issues**: `list_issues` scoped to the project, with state and assignee filters as needed.
- **Comment on an issue**: `save_comment`.
- **Close**: `save_issue` with `state` set to the team's completed state (usually `Done`). A rejected issue takes the canceled state instead, with an explanatory comment posted first.
- **Blocking**: `save_issue` with `blockedBy` / `blocks`. This is Linear's native relation and renders in the UI; never encode blocking in the body.
- **Parent / child**: `save_issue` with `parentId`. Linear's native sub-issues.

These skills do not create, apply, remove, or depend on labels. Ordinary issue titles describe implementation work. Prefix exceptional work with `Research:`, `Decision:`, or `Prototype:`.

## Specs are milestones

A spec is never an issue of its own. When `/to-spec` (or any skill) says "publish the spec to the issue tracker":

1. Create a **project milestone** with `save_milestone`: `project` is the configured project, `name` is the feature name, `description` is the full spec body in Markdown.
2. Report the milestone name back to the user; that name is the handle later skills use.

When `/to-tickets` breaks a spec into tickets, each ticket is an issue in the project with `milestone` set to that milestone. The milestone's own progress bar is the spec's progress; there is no parent issue to keep in sync. Use `list_milestones` to find a spec and `get_milestone` to read it.

## When a skill says "publish to the issue tracker"

For a spec, create a project milestone (see above). For anything else, create an issue in the configured project.

## When a skill says "fetch the relevant ticket"

Run `get_issue` with the identifier. If the reference is a spec, run `get_milestone` (or `list_milestones` on the project and pick by name) and read the tickets attached to it with `list_issues`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single parent issue in the project holding the Destination / Notes / Decisions-so-far / Fog body.
- **Child ticket**: an issue with `parentId` set to the map. Use the title prefixes `Research:`, `Decision:`, or `Prototype:` for those exceptional ticket types; an unprefixed child is an ordinary agent task. Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: `save_issue` with `blockedBy`, Linear's native relation and the canonical, UI-visible representation. A ticket is unblocked when every blocker is in a completed state.
- **Frontier query**: `list_issues` scoped to the map's children, drop any with an open blocker or an assignee; first in map order wins.
- **Claim**: `save_issue` with `assignee: "me"`, the session's first write.
- **Resolve**: `save_comment` with the answer, then `save_issue` moving the state to `Done`, then append a context pointer (gist + link) to the map's Decisions-so-far.
