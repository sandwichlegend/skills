---
name: foreman-init
description: Prepare the current repo for the Foreman reviewer by writing its foreman.md and checking the GitHub App install.
disable-model-invocation: true
---

# Foreman init

Run from a clone of a **target repo**. Writes the repo's **Foreman file** (`foreman.md` at the repo root), which tells the Foreman reviewer how to prepare and check the repo in its sandbox, then reports the evidence for GitHub App access and reviewer activity. Never commits or pushes: the developer reviews and commits the file.

## 1. Read the repo

Find the repo with `gh repo view --json nameWithOwner,defaultBranchRef`.

The deployed `bold-foreman` App is private and owned by `bold-gtm`. [Private Apps can only be installed on their owner's account](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/making-a-github-app-public-or-private). If the repo owner is not `bold-gtm`, stop before writing `foreman.md`. Report that this reviewer cannot review the repo. Do not suggest installing this App there. Supporting other owners requires the App owner to change its distribution or provide a separate deployment.

For a `bold-gtm` repo, read, where present:

- agent docs: `AGENTS.md`, `CLAUDE.md`, `docs/agents/*.md`;
- the issue-tracker doc (usually `docs/agents/issue-tracker.md`): it names the Linear project;
- `package.json` (`scripts`, `packageManager`) and which lockfile sits at the root (`pnpm-lock.yaml`, `yarn.lock`, `bun.lock`/`bun.lockb`, `package-lock.json`);
- in a workspace (`pnpm-workspace.yaml`, or `workspaces` in the root `package.json`), every member package's `package.json` too: a workspace root often has no scripts of its own, and the checks live in its packages;
- any existing `foreman.md`.

Done when you can name the package manager, every script in every `package.json`, and the Linear project (or know there is none).

## 2. Draft the frontmatter

The reviewer runs `setup` in order, then each `checks` command, inside a sandbox with network access but **no secrets and no production keys**. Every command must work there.

- **setup**: the frozen install for the package manager (`pnpm install --frozen-lockfile`, `npm ci`, `yarn install --immutable` for Yarn 2+ or `--frozen-lockfile` for Yarn 1, `bun install --frozen-lockfile`), plus any secret-free step the agent docs say tests need first (codegen, for example).
- **checks**: the scripts that judge a change without secrets: tests, typecheck, lint. Use the form the docs use (`pnpm test`, `pnpm typecheck`). In a workspace, run a member package's script from the root with the package manager's filter (`pnpm --filter console typecheck`, `npm run typecheck -w console`). Leave out anything that needs a database, an API key, or a deploy.
- **forbidden**: the build (`pnpm build` and `pnpm run build`, or the package manager's equivalent), every deploy or migration command you find in scripts or docs (`npx convex deploy`, `vercel --prod`, `prisma migrate deploy`, and so on), and anything the docs say must not run in CI. The reviewer refuses these.
- **linear_project**: the Linear project from the issue-tracker doc, exactly as named there. Omit the key when the repo tracks no Linear project.
- Derive install commands from the package manager and lockfile. Derive script commands from existing scripts or agent docs, using workspace filters where needed. Do not invent script names or package names.

Ask the developer one question before writing: **may the reviewer run the build?** Default no. If yes, move the build command from `forbidden` into `checks`.

## 3. Draft the body

The body is free-text guidance the reviewer reads as a standards source, after the agent docs, glossary, and ADRs it already reads. Write only what those do not already say: conventions the developer cares about in review, areas that need extra care, known false-positive patterns to leave alone. Three to ten lines. If you have nothing the docs do not already cover, write one line pointing the reviewer at the agent docs.

## 4. Write the file

Format, which the reviewer's parser reads strictly (anything else is reported as ignored):

```markdown
---
setup:
  - pnpm install --frozen-lockfile
checks:
  - pnpm test
  - pnpm typecheck
forbidden:
  - pnpm build
  - pnpm run build
  - npx convex deploy
linear_project: Example project
---

Reviewer guidance in markdown.
```

- Only the four keys above. `setup`, `checks`, and `forbidden` are lists, one `- command` per line (or `[]` when empty); `linear_project` is one value.
- One command per list item, no YAML features beyond that: no anchors, no multi-line strings, no nested maps.

If `foreman.md` already exists, do not overwrite it: show the developer a diff of what you would change and write only what they accept.

Done when `foreman.md` exists at the repo root in exactly this format.

## 5. Check GitHub App access

The reviewer runs as the GitHub App `bold-foreman`. Print its install link, `https://github.com/apps/bold-foreman/installations/new`. For the supported `bold-gtm` owner, check with the GitHub CLI:

```bash
gh api --paginate "orgs/<owner>/installations" --jq '.installations[] | select(.app_slug == "bold-foreman") | {id, app_slug, repository_selection}'
```

- A successful query with no result: the App is not installed in the org.
- A failed query: installation access is **unverified**. Report the error, not a missing installation.
- `repository_selection` is `all`: the App can see this repo.
- `selected`: repo access is unverified until the developer confirms this repo is selected at `https://github.com/organizations/<owner>/settings/installations/<id>`. The `user/installations` API requires a compatible token and does not work with the usual `gh` OAuth token.

The App seeing the repo is necessary but not sufficient: the reviewer also ignores any repo missing from its `FOREMAN_REPOS` allowlist on the `foreman-agent` Vercel project, which you cannot check from here. App access alone does not establish reviewer activity.

## 6. Report

Tell the developer, briefly:

- the path written (or the diff proposed) and the commands it declares;
- App access confirmed, missing, or unverified, with the evidence. Report reviewer activity as unverified until the allowlist is confirmed or a Foreman review is observed;
- next steps: review and commit `foreman.md`; ask a `bold-gtm` administrator to install the App if it is missing; add `<owner>/<repo>` to `FOREMAN_REPOS` if it is new.
