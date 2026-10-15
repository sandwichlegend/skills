---
name: babysit
description: Drive a pull request to the Foreman bar by fixing the reviewer's findings, pushing, and waiting for each pass, stopping to report an impasse.
disable-model-invocation: true
---

# Babysit

Run from a clone of the **target repo**. Drives one pull request until it meets the **bar** or hits an **impasse**, then stops and reports. Never merges.

Arguments, all optional:

- a PR URL; without one, use the PR for the current branch: `gh pr view --json number,url,headRefName,headRepository`.
- `--bar <severity>`: the lowest severity that blocks, `medium` by default. The bar is met when the reviewer's latest pass is on the current head, no open or held finding is at or above the bar, (with the default bar) the verdict is approve, and no review comment from anyone else (another bot, a person) is left unresolved. `--bar high` tolerates mediums; `--bar low` blocks on everything.
- `--merge`: reserved and **off** in this release. Accept it, say that merging stays the developer's call, and never merge.

## Reading state

All state comes from the reviewer's hidden markers, never from its prose, through the script bundled with this skill. `<skill-dir>` below is the directory this `SKILL.md` was loaded from (Claude Code shows it as the skill's base directory), wherever the skill is installed:

```bash
node <skill-dir>/scripts/foreman-state.mjs <owner/repo> <number> --bar <severity>
```

It prints JSON: `reviewer` (the App's login, e.g. `bold-foreman[bot]`; null before its first review), `passPending` (the reviewer has not yet reviewed the current head), `barMet`, `impasse` (held findings above low, or any held finding with `--bar low`, and open findings at or above the bar that three passes running left open after your fixes), `toHandle` (open finding ids), every finding with its severity, status, `failedFixAttempts`, `commentId` (null when it lives only in the review body), path, line, title, and thread replies, and `unresolved`: each unresolved review thread someone other than the reviewer started, with its `commentId`, author, path, line, an excerpt, and its replies.

Only the reviewer changes a finding's status. Never edit, resolve, or delete its comments.

## Each round

1. **Read state.** If the PR is closed or merged, stop and report it.
2. **Stop if done.** `barMet`: report the bar is met (see Report). `impasse` not empty: report the impasse (see Report). Nothing left but `unresolved` threads you already fixed or answered: report the open comments (see Report).
3. **Wait if the reviewer is behind.** `passPending`: wait (see Waiting), then start the round again.
4. **Handle every open finding at or above the bar.** Read its comment (`gh api repos/<repo>/pulls/comments/<commentId>`) or, without a comment, its section of the latest review body. Then either:
   - **fix it** in the working tree, when the finding is right; or
   - **mark it an impasse**, when you think it is wrong: note your reason and evidence for the report, and leave its code and its thread as they are. Your push is your only answer to the reviewer: a reply in a finding's thread wakes it for nothing. Fix a finding only when you agree with it, never just to satisfy the reviewer.
5. **Handle open low findings.** Fix the ones that are local and obvious. Skip the rest, noting each with a one-line reason for the commit message and the report.
6. **Handle every unresolved comment** in `unresolved`, whoever left it. Read the whole thread (`gh api repos/<repo>/pulls/comments/<commentId>` and its replies). If it is right, fix it and reply once in the thread saying what changed; if it is wrong, reply once with the reason. Skip threads that already have a reply from you (your `gh api user` login). Never resolve a thread yourself: whoever left it, or the developer, resolves it, and until then the bar is not met.
7. **Commit and push.** If you changed code, run the repo's checks (the `checks` in `foreman.md`, else its test and typecheck scripts), then make **one commit** for the round:

   ```
   Address Foreman findings F1, F3

   - F1: <what changed>
   - F3: <what changed>
   - scanner[bot] on b.js:7: <what changed>
   - Skipped F4 (low): <reason>
   ```

   The subject names exactly the findings you fixed this round: the state script counts failed fix attempts from it. Without a fixed finding, use the subject `Address review comments`. Then `git push`. Never force-push, never rewrite history the reviewer has seen.
8. **Stop on an impasse** you marked in step 4: report it (see Report). Otherwise **wait** for the next pass (see Waiting), then start the next round.

Done with a round when every open finding at or above the bar was fixed or marked an impasse, every low was fixed or noted as skipped, every unresolved comment was fixed or answered, and any fix was pushed.

## Waiting

Wait on the state script in `--wait` mode, never a timed loop of your own. It prints nothing until the reviewer does something (a new review, a status change, a reply in a finding's thread), an unresolved thread opens or is resolved, or the PR closes, then prints the new state as one line and exits. It polls on its own and always exits by `--timeout` minutes:

```bash
node <skill-dir>/scripts/foreman-state.mjs <owner/repo> <number> --bar <severity> --wait --timeout 30
```

Run it so that its exit wakes you:

- **Claude Code**: the Bash tool with `run_in_background: true` and a `timeout` above 30 minutes (e.g. `2400000`); you are re-invoked when it exits. Read its output then.
- **Any other harness**: run it as a foreground command with a command timeout above `--timeout`.

If the harness caps a command below 30 minutes, lower `--timeout` to fit and re-arm on `timedOut` until 30 minutes have passed since your push.

When it exits, start the round again from step 1; if it was not what you were waiting for, arm it again. If it reports `timedOut`, the reviewer has not answered in 30 minutes: report that and stop. A `timedOut` with `readError` means `gh` kept failing: report the error instead.

## Report

Stop and tell the developer, briefly, listing in every report the lows you skipped, each with its reason:

- **Bar met**: the PR URL, the passes it took, and the findings fixed. Merging is theirs.
- **Impasse**: each finding with its id, title, and one line on why it is stuck, so the developer makes the call: your reason and evidence when you think it is wrong; the reviewer's reasoning from its thread when it is held; what you tried when `failedFixAttempts` reached 3.
- **Open comments**: each unresolved thread (author, file and line, link), what you did about it, and that it needs resolving before the PR is done. Merging is still theirs.
- **Stalled**: what you were waiting for and since when.
