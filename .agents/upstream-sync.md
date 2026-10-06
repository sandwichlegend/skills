# Upstream sync

Pull `mattpocock/skills` changes into this fork while keeping its **deviations** (see [AGENTS.md](../AGENTS.md)).

1. `git fetch upstream`. The **base** is the upstream commit named in the last sync commit (`git log --grep '^Sync skills' -1`, which says `through <sha>`).
2. Three-way merge every shipped file with `git merge-file <ours> <base> <theirs>`, reading base and theirs via `git show <sha>:skills/<bucket>/<name>/<file>`. Place each skill in the bucket upstream uses, and carry upstream renames across (e.g. `CONTEXT-FORMAT.md` → `GLOSSARY-FORMAT.md`). When an upstream rewording conflicts with a deviation, keep the deviation and apply the rewording around it. Done when no conflict markers remain.
3. Adopt skills upstream adds to `engineering/` or `productivity/`, editing them to the deviations. Keep any skill upstream deletes that this fork still ships (`resolving-merge-conflicts`), along with its `ask-matt` route. Leave `triage-labels.md` deleted.
4. Audit until every check passes:
   - `grep -rnE "label|ready-for-|needs-(triage|info)|wontfix|wayfinder:" skills` hits only the no-labels rules and unrelated UI wording.
   - Every step that publishes, reads or closes a spec handles the Linear milestone case.
   - Every skill `ask-matt` routes to ships here.
5. Update the four registrations (AGENTS.md, Layout), then commit as `Sync skills with upstream mattpocock/skills through <sha>`.
