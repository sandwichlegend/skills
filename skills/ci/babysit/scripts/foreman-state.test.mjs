// Run with: node --test .agents/skills/babysit/scripts/foreman-state.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";

import { fingerprint, foldState, parseMarkers } from "./foreman-state.mjs";

const HEAD = "a".repeat(40);
const OLD = "b".repeat(40);
const reviewer = { login: "foreman[bot]", type: "Bot" };
const human = { login: "sandwichlegend", type: "User" };
const verdict = (head, pass, v) => `<!-- foreman:verdict ${JSON.stringify({ verdict: v, head, pass, counts: { critical: 0, high: 0, medium: 0, low: 0 } })} -->`;
const finding = (id, severity, status) =>
  `**${severity}: Do the thing**\n\nWhy.\n\n<!-- foreman:finding ${JSON.stringify({ id, axis: "correctness", severity, evidence: "confirmed", status })} -->`;

test("malformed markers are skipped", () => {
  assert.deepEqual(parseMarkers("<!-- foreman:finding {nope} --> <!-- foreman:verdict {\"verdict\":\"maybe\"} -->"), []);
});

test("the bar is met only when the pass caught up with the head and nothing blocking is live", () => {
  const reviews = [{ id: 1, user: reviewer, body: verdict(HEAD, 2, "approve") }];
  const comments = [{ id: 10, user: reviewer, path: "a.js", line: 3, body: finding("F1", "high", "fixed") }];
  const state = foldState({ head: HEAD, reviews, comments, bar: "medium" });
  assert.equal(state.barMet, true);
  assert.equal(state.passPending, false);
  assert.deepEqual(state.toHandle, []);
});

test("a pass for an older head is pending and never meets the bar", () => {
  const state = foldState({ head: HEAD, reviews: [{ id: 1, user: reviewer, body: verdict(OLD, 1, "approve") }], comments: [], bar: "medium" });
  assert.equal(state.passPending, true);
  assert.equal(state.barMet, false);
});

test("comment markers win over review bodies; held above low is an impasse; replies are attached", () => {
  const reviews = [{ id: 1, user: reviewer, body: `${verdict(HEAD, 1, "changes_needed")}\n${finding("F2", "low", "open")}` }];
  const comments = [
    { id: 10, user: reviewer, path: "a.js", line: 3, body: finding("F1", "medium", "held") },
    { id: 11, user: human, in_reply_to_id: 10, body: "I disagree" },
    { id: 12, user: reviewer, in_reply_to_id: 10, body: "Holding: ..." },
  ];
  const state = foldState({ head: HEAD, reviews, comments, bar: "medium" });
  assert.deepEqual(state.impasse, ["F1"]);
  assert.deepEqual(state.toHandle, ["F2"]);
  assert.equal(state.barMet, false);
  const f1 = state.findings.find((f) => f.id === "F1");
  assert.deepEqual(f1.replies.map((r) => r.byReviewer), [false, true]);
  assert.equal(f1.title, "Do the thing");
});

const sha = (n) => String(n).repeat(40).slice(0, 40);
const commit = (n, message) => ({ sha: sha(n), commit: { message } });
const pass = (id, head, n) => ({ id, user: reviewer, body: verdict(head, n, "changes_needed") });

test("a blocking finding still open after three passes over fix commits naming it is an impasse", () => {
  const commits = [
    commit(1, "Add the feature"),
    commit(2, "Address Foreman findings F1\n\n- F1: guard the empty case"),
    commit(3, "Address Foreman findings F1, F2\n\n- F1: guard it earlier"),
    commit(4, "Address Foreman findings F1\n\n- F1: guard it in the caller"),
  ];
  const reviews = [pass(1, sha(1), 1), pass(2, sha(2), 2), pass(3, sha(3), 3), pass(4, sha(4), 4)];
  const comments = [{ id: 10, user: reviewer, path: "a.js", line: 3, body: finding("F1", "medium", "open") }];
  const state = foldState({ head: sha(4), reviews, comments, commits, bar: "medium" });
  assert.deepEqual(state.impasse, ["F1"]);
  assert.equal(state.findings[0].failedFixAttempts, 3);
});

test("fix commits under one pass count once, and a fix not yet reviewed does not count", () => {
  const commits = [
    commit(1, "Address Foreman findings F1\n\n- F1: first try"),
    commit(2, "Address Foreman findings F1\n\n- F1: forgot a file"),
    commit(3, "Address Foreman findings F1, F10\n\n- F1: second try"),
    commit(4, "Address Foreman findings F1\n\n- F1: third try"),
  ];
  const reviews = [pass(1, sha(2), 1), pass(2, sha(3), 2)];
  const comments = [{ id: 10, user: reviewer, path: "a.js", line: 3, body: finding("F1", "high", "open") }];
  const state = foldState({ head: sha(4), reviews, comments, commits, bar: "medium" });
  assert.equal(state.findings[0].failedFixAttempts, 2);
  assert.deepEqual(state.impasse, []);
  assert.equal(state.passPending, true);
});

test("three failed fixes of a finding below the bar are not an impasse", () => {
  const commits = [1, 2, 3].map((n) => commit(n, `Address Foreman findings F1\n\n- F1: try ${n}`));
  const reviews = [pass(1, sha(1), 1), pass(2, sha(2), 2), pass(3, sha(3), 3)];
  const comments = [{ id: 10, user: reviewer, path: "a.js", line: 3, body: finding("F1", "low", "open") }];
  assert.deepEqual(foldState({ head: sha(3), reviews, comments, commits, bar: "medium" }).impasse, []);
  assert.deepEqual(foldState({ head: sha(3), reviews, comments, commits, bar: "low" }).impasse, ["F1"]);
});

test("failed fixes count only rounds running: a round that left the finding alone starts the count again", () => {
  const commits = [
    commit(1, "Address Foreman findings F1\n\n- F1: first try"),
    commit(2, "Address Foreman findings F1\n\n- F1: second try"),
    commit(3, "Address Foreman findings F2\n\n- F2: something else"),
    commit(4, "Address Foreman findings F1\n\n- F1: third try"),
  ];
  const reviews = [pass(1, sha(1), 1), pass(2, sha(2), 2), pass(3, sha(3), 3), pass(4, sha(4), 4)];
  const comments = [{ id: 10, user: reviewer, path: "a.js", line: 3, body: finding("F1", "high", "open") }];
  const state = foldState({ head: sha(4), reviews, comments, commits, bar: "medium" });
  assert.equal(state.findings[0].failedFixAttempts, 1);
  assert.deepEqual(state.impasse, []);
});

test("a newer review with a lower pass number is the current one, so the pass is not left pending", () => {
  // The reviewer's record degraded and it started over at pass 1 on the new head.
  const reviews = [pass(1, OLD, 3), { id: 2, user: reviewer, body: verdict(HEAD, 1, "approve") }];
  const state = foldState({ head: HEAD, reviews, comments: [], bar: "medium" });
  assert.equal(state.latestReview.reviewId, 2);
  assert.equal(state.passPending, false);
  assert.equal(state.barMet, true);
});

test("with --bar low a held low finding is an impasse, not something to wait out", () => {
  const reviews = [{ id: 1, user: reviewer, body: verdict(HEAD, 1, "approve") }];
  const comments = [{ id: 10, user: reviewer, path: "a.js", line: 3, body: finding("F1", "low", "held") }];
  assert.deepEqual(foldState({ head: HEAD, reviews, comments, bar: "low" }).impasse, ["F1"]);
  assert.deepEqual(foldState({ head: HEAD, reviews, comments, bar: "medium" }).impasse, []);
});

test("a stricter bar blocks on lows; a looser one ignores mediums", () => {
  const reviews = [{ id: 1, user: reviewer, body: `${verdict(HEAD, 1, "changes_needed")}` }];
  const comments = [{ id: 10, user: reviewer, path: "a.js", line: 3, body: finding("F1", "medium", "open") }];
  assert.equal(foldState({ head: HEAD, reviews, comments, bar: "high" }).barMet, true);
  assert.equal(foldState({ head: HEAD, reviews, comments, bar: "low" }).barMet, false);
});

test("a wait ends on a new review, a status change, or a reviewer reply, not on a human comment", () => {
  const reviews = [{ id: 1, user: reviewer, body: verdict(HEAD, 1, "changes_needed") }];
  const root = { id: 10, user: reviewer, path: "a.js", line: 3, body: finding("F1", "medium", "open") };
  const base = fingerprint({ state: "open", ...foldState({ head: HEAD, reviews, comments: [root], bar: "medium" }) });
  const disagreement = { id: 11, user: human, in_reply_to_id: 10, body: "I disagree" };
  const answer = { id: 12, user: reviewer, in_reply_to_id: 10, body: "Holding." };
  const held = { ...root, body: finding("F1", "medium", "held") };
  const after = (comments, extra = []) => fingerprint({ state: "open", ...foldState({ head: HEAD, reviews: [...reviews, ...extra], comments, bar: "medium" }) });
  assert.equal(after([root, disagreement]), base);
  assert.notEqual(after([root, disagreement, answer]), base);
  assert.notEqual(after([held]), base);
  assert.notEqual(after([root], [{ id: 2, user: reviewer, body: verdict(HEAD, 2, "approve") }]), base);
});

test("the reviewer is the App that posts verdicts, whatever its login; other bots' markers are ignored", () => {
  const app = { login: "agnet-foreman[bot]", type: "Bot" };
  const imposter = { login: "other[bot]", type: "Bot" };
  const reviews = [
    { id: 1, user: app, body: verdict(HEAD, 1, "approve") },
    { id: 2, user: human, body: verdict(HEAD, 2, "changes_needed") },
  ];
  const comments = [
    { id: 10, user: app, path: "a.js", line: 3, body: finding("F1", "medium", "held") },
    { id: 11, user: imposter, in_reply_to_id: 10, body: "Me too" },
    { id: 12, user: app, in_reply_to_id: 10, body: "Holding." },
  ];
  const state = foldState({ head: HEAD, reviews, comments, bar: "high" });
  assert.equal(state.reviewer, "agnet-foreman[bot]");
  assert.equal(state.passPending, false);
  assert.equal(state.latestReview.pass, 1);
  assert.equal(state.barMet, true);
  assert.deepEqual(state.findings[0].replies.map((r) => r.byReviewer), [false, true]);
});

test("a finding marker posted by another bot is not a finding", () => {
  const app = { login: "agnet-foreman[bot]", type: "Bot" };
  const imposter = { login: "other[bot]", type: "Bot" };
  const reviews = [{ id: 1, user: app, body: verdict(HEAD, 1, "approve") }];
  const comments = [{ id: 10, user: imposter, path: "a.js", line: 3, body: finding("F9", "high", "held") }];
  const state = foldState({ head: HEAD, reviews, comments, bar: "medium" });
  assert.equal(state.barMet, true);
  assert.deepEqual(state.impasse, []);
  assert.deepEqual(state.findings, []);
});

test("an unresolved thread someone else started keeps the bar unmet until it is resolved", () => {
  const scanner = { login: "scanner[bot]", type: "Bot" };
  const reviews = [{ id: 1, user: reviewer, body: verdict(HEAD, 1, "approve") }];
  const comments = [
    { id: 10, user: reviewer, path: "a.js", line: 3, body: finding("F1", "high", "fixed") },
    { id: 20, user: scanner, path: "b.js", line: 7, body: "SQL built from user input." },
    { id: 21, user: human, in_reply_to_id: 20, body: "Fixed in abc123." },
  ];
  const threads = [
    { rootCommentId: 10, isResolved: false },
    { rootCommentId: 20, isResolved: false },
  ];
  const open = foldState({ head: HEAD, reviews, comments, bar: "medium", threads });
  assert.equal(open.barMet, false);
  assert.deepEqual(open.unresolved.map((t) => [t.commentId, t.author, t.path, t.line, t.replies.length]), [[20, "scanner[bot]", "b.js", 7, 1]]);

  const resolved = foldState({ head: HEAD, reviews, comments, bar: "medium", threads: [threads[0], { rootCommentId: 20, isResolved: true }] });
  assert.equal(resolved.barMet, true);
  assert.deepEqual(resolved.unresolved, []);
  assert.notEqual(fingerprint({ state: "open", ...open }), fingerprint({ state: "open", ...resolved }));
});
