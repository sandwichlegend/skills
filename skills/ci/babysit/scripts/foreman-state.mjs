#!/usr/bin/env node
// Prints the Foreman reviewer's state for one pull request as JSON, read only
// from the hidden markers the reviewer embeds in its reviews and comments.
// Never parses prose. Also lists unresolved review threads someone other than
// the reviewer started (other bots, people): the bar is not met while any is open.
// Counts failed fix attempts from the babysitter's round commit subjects.
//
//   node foreman-state.mjs <owner/repo> <number> [--bar medium] [--wait [--interval 30] [--timeout 30]]
//
// With --wait it prints nothing until something the reviewer controls changes
// (a new review, a finding's status, a reviewer reply in a finding's thread),
// an unresolved thread opens or closes, or the PR closes, then prints the new state and exits. Run it under the
// harness Monitor to wait for the reviewer.
//
// Needs the GitHub CLI (`gh`) signed in with read access to the repo.

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SEVERITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["open", "fixed", "held", "withdrawn"];
/** Passes in a row that may leave a fixed-and-pushed finding open before it is an impasse. */
const FIX_ATTEMPTS = 3;
const MARKER = /<!--\s*foreman:(verdict|finding)\s+(\{[\s\S]*?\})\s*-->/g;

export function parseMarkers(body) {
  const markers = [];
  for (const match of String(body ?? "").matchAll(MARKER)) {
    try {
      const payload = JSON.parse(match[2]);
      if (match[1] === "verdict" && isVerdict(payload)) markers.push({ kind: "verdict", ...payload });
      if (match[1] === "finding" && isFinding(payload)) markers.push({ kind: "finding", ...payload });
    } catch {
      // A malformed marker is skipped, never guessed at.
    }
  }
  return markers;
}

function isVerdict(value) {
  return (
    (value.verdict === "approve" || value.verdict === "changes_needed") &&
    /^[0-9a-f]{40}$/.test(value.head) &&
    Number.isInteger(value.pass) &&
    typeof value.counts === "object"
  );
}

function isFinding(value) {
  return (
    typeof value.id === "string" &&
    ["standards", "spec", "correctness"].includes(value.axis) &&
    SEVERITIES.includes(value.severity) &&
    ["confirmed", "plausible"].includes(value.evidence) &&
    STATUSES.includes(value.status)
  );
}

/** At or above `bar` blocks: with bar "medium", critical, high and medium block. */
export function blocks(severity, bar) {
  return SEVERITIES.indexOf(severity) <= SEVERITIES.indexOf(bar);
}

/**
 * Folds reviews (oldest first) and review comments into the current state.
 * A finding with an inline comment takes its status from that comment, which
 * the reviewer edits in place; a finding without one takes it from the newest
 * review body that carries its marker. `threads` are the PR's review threads
 * as { rootCommentId, isResolved } (only GraphQL knows whether one is resolved).
 * `commits` are the PR's commits oldest first, as the REST API lists them.
 */
export function foldState({ head, reviews, comments, bar, threads = [], commits = [] }) {
  const reviewers = reviewerLogins(reviews);
  const isReviewer = (user) => user?.type === "Bot" && reviewers.has(user.login);
  const findings = new Map();
  const reviewedHeads = new Set();
  let latest = null;
  for (const review of reviews.filter((candidate) => isReviewer(candidate.user))) {
    for (const marker of parseMarkers(review.body)) {
      if (marker.kind === "verdict") {
        reviewedHeads.add(marker.head);
        // The newest review is current even when its pass number is lower:
        // the reviewer starts over at pass 1 when it cannot read its record.
        latest = { reviewId: review.id, submittedAt: review.submitted_at, ...marker };
      } else {
        const known = findings.get(marker.id);
        if (known === undefined || known.commentId === null) {
          findings.set(marker.id, { ...strip(marker), commentId: null, path: null, line: null, title: null, replies: [] });
        }
      }
    }
  }
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  for (const comment of comments) {
    if (comment.in_reply_to_id != null || !isReviewer(comment.user)) continue;
    for (const marker of parseMarkers(comment.body)) {
      if (marker.kind !== "finding") continue;
      const title = /^\*\*(?:critical|high|medium|low): (.+)\*\*$/m.exec(comment.body)?.[1] ?? null;
      findings.set(marker.id, { ...strip(marker), commentId: comment.id, path: comment.path ?? null, line: comment.line ?? null, title, replies: [] });
    }
  }
  for (const comment of comments) {
    if (comment.in_reply_to_id == null) continue;
    const root = byId.get(comment.in_reply_to_id);
    for (const finding of findings.values()) {
      if (finding.commentId !== null && finding.commentId === (root?.id ?? comment.in_reply_to_id)) {
        finding.replies.push({ id: comment.id, author: comment.user?.login ?? null, byReviewer: isReviewer(comment.user), createdAt: comment.created_at });
      }
    }
  }

  const attempts = failedFixAttempts(commits, reviewedHeads);
  for (const finding of findings.values()) finding.failedFixAttempts = finding.status === "open" ? attempts(finding.id) : 0;

  const list = [...findings.values()].sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
  const live = list.filter((finding) => finding.status === "open" || finding.status === "held");
  const blocking = live.filter((finding) => blocks(finding.severity, bar));
  const passCaughtUp = latest !== null && latest.head === head;
  const impasse = list.filter(
    (finding) =>
      (finding.status === "held" && (finding.severity !== "low" || blocks(finding.severity, bar))) ||
      (finding.status === "open" && blocks(finding.severity, bar) && finding.failedFixAttempts >= FIX_ATTEMPTS),
  );
  const unresolved = threads
    .filter((thread) => !thread.isResolved)
    .map((thread) => byId.get(thread.rootCommentId))
    .filter((root) => root !== undefined && !isReviewer(root.user))
    .map((root) => ({
      commentId: root.id,
      author: root.user?.login ?? null,
      path: root.path ?? null,
      line: root.line ?? null,
      excerpt: String(root.body ?? "").slice(0, 200),
      replies: comments.filter((comment) => comment.in_reply_to_id === root.id).map((comment) => ({ id: comment.id, author: comment.user?.login ?? null })),
    }));
  return {
    head,
    bar,
    reviewer: [...reviewers][0] ?? null,
    latestReview: latest,
    passPending: !passCaughtUp,
    barMet: passCaughtUp && blocking.length === 0 && (bar !== "medium" || latest.verdict === "approve") && unresolved.length === 0,
    impasse: impasse.map((finding) => finding.id),
    toHandle: live.filter((finding) => finding.status === "open").map((finding) => finding.id),
    findings: list,
    unresolved,
  };
}

/** What a wait watches: changes here mean the reviewer (or GitHub) did something. */
export function fingerprint(state) {
  return JSON.stringify({
    state: state.state,
    review: state.latestReview === null ? null : [state.latestReview.reviewId, state.latestReview.pass, state.latestReview.verdict],
    findings: state.findings.map((finding) => [finding.id, finding.status, finding.replies.filter((reply) => reply.byReviewer).length]),
    unresolved: state.unresolved.map((thread) => thread.commentId),
  });
}

/**
 * A failed fix attempt is a pass that reviewed a round commit naming the
 * finding in its subject ("Address Foreman findings F1, F3") and left the
 * finding open. The count is of rounds running, up to the latest pass: a
 * reviewed round that did not name the finding starts it again. Several such
 * commits before one pass count once, and commits no pass has reviewed yet do
 * not count. `commits` are the PR's commits oldest first; `reviewedHeads` the
 * heads that got a verdict. Returns a function from finding id to its count.
 */
function failedFixAttempts(commits, reviewedHeads) {
  const rounds = []; // per reviewed round, oldest first: the finding ids its commits named
  let named = new Set();
  for (const commit of commits) {
    const subject = /^Address Foreman findings? (.+)$/.exec(String(commit.commit?.message ?? "").split("\n")[0]);
    if (subject !== null) for (const id of subject[1].split(/[\s,]+/).filter(Boolean)) named.add(id);
    if (reviewedHeads.has(commit.sha)) {
      rounds.push(named);
      named = new Set();
    }
  }
  return (id) => {
    let count = 0;
    for (let index = rounds.length - 1; index >= 0 && rounds[index].has(id); index--) count++;
    return count;
  };
}

function strip(marker) {
  const { kind, ...rest } = marker;
  return rest;
}

/**
 * The reviewer is whichever GitHub App posts verdict markers, so the state
 * follows the installed App under any name (agnet-foreman[bot], foreman[bot]).
 */
function reviewerLogins(reviews) {
  const logins = new Set();
  for (const review of reviews) {
    if (review.user?.type !== "Bot" || typeof review.user.login !== "string") continue;
    if (parseMarkers(review.body).some((marker) => marker.kind === "verdict")) logins.add(review.user.login);
  }
  return logins;
}

function gh(args) {
  return JSON.parse(execFileSync("gh", ["api", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
}

const THREADS_QUERY = `query($owner: String!, $name: String!, $number: Int!, $endCursor: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes { isResolved comments(first: 1) { nodes { databaseId } } }
      }
    }
  }
}`;

function reviewThreads(repo, number) {
  const [owner, name] = repo.split("/");
  const pages = gh(["graphql", "--paginate", "--slurp", "-f", `query=${THREADS_QUERY}`, "-F", `owner=${owner}`, "-F", `name=${name}`, "-F", `number=${number}`]);
  return pages
    .flatMap((page) => page.data.repository.pullRequest.reviewThreads.nodes)
    .map((thread) => ({ rootCommentId: thread.comments.nodes[0]?.databaseId ?? null, isResolved: thread.isResolved }));
}

function ghPaged(path) {
  // `gh api --paginate --slurp` returns one array per page.
  return gh(["--paginate", "--slurp", path]).flat();
}

// Run as a script (also through a symlinked skills directory), not when imported by the tests.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [repo, number, ...rest] = process.argv.slice(2);
  if (repo === undefined || number === undefined) {
    console.error("usage: foreman-state.mjs <owner/repo> <number> [--bar critical|high|medium|low] [--wait [--interval seconds] [--timeout minutes]]");
    process.exit(2);
  }
  const barIndex = rest.indexOf("--bar");
  const bar = barIndex === -1 ? "medium" : rest[barIndex + 1];
  if (!SEVERITIES.includes(bar)) {
    console.error(`--bar must be one of ${SEVERITIES.join(", ")}`);
    process.exit(2);
  }
  const read = () => {
    const pull = gh([`repos/${repo}/pulls/${number}`]);
    const reviews = ghPaged(`repos/${repo}/pulls/${number}/reviews?per_page=100`);
    const comments = ghPaged(`repos/${repo}/pulls/${number}/comments?per_page=100`);
    const commits = ghPaged(`repos/${repo}/pulls/${number}/commits?per_page=100`);
    const threads = reviewThreads(repo, number);
    return { state: pull.state, merged: pull.merged, ...foldState({ head: pull.head.sha, reviews, comments, bar, threads, commits }) };
  };
  const option = (name, fallback) => {
    const index = rest.indexOf(name);
    return index === -1 ? fallback : Number(rest[index + 1]);
  };

  if (!rest.includes("--wait")) {
    console.log(JSON.stringify(read(), null, 2));
  } else {
    const intervalMs = option("--interval", 30) * 1000;
    const deadline = Date.now() + option("--timeout", 30) * 60_000;
    const before = fingerprint(read());
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      let now;
      try {
        now = read();
      } catch {
        continue; // One failed read must not end the wait.
      }
      if (fingerprint(now) !== before) {
        console.log(JSON.stringify(now));
        break;
      }
      if (Date.now() > deadline) {
        console.log(JSON.stringify({ timedOut: true, ...now }));
        break;
      }
    }
  }
}
