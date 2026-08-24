import assert from "node:assert/strict";
import test from "node:test";

import { paginate, readyRunForTransition, validateGateContext } from "../template/.factory/scripts/validate-pr-gates.mjs";

const specSha = "1".repeat(40);
const headSha = "2".repeat(40);

function comment(body, overrides = {}) {
  return {
    body,
    authorAssociation: "COLLABORATOR",
    createdAt: "2026-08-24T00:00:00Z",
    url: "https://github.com/example/project/pull/8#issuecomment-1",
    ...overrides,
  };
}

function transition(event = "ready_for_review", overrides = {}) {
  return {
    event,
    commitId: specSha,
    trustedActor: true,
    createdAt: "2026-08-24T00:00:00Z",
    url: "https://api.github.com/repos/example/project/issues/events/1",
    ...overrides,
  };
}

function verification(sha = headSha, decision = "accepted") {
  return comment(`<!-- factory-verification -->\nrequirement: REQ-007\ndecision: ${decision}\nverified_sha: ${sha}`);
}

function reviewedContext() {
  return {
    pr: {
      number: 8,
      state: "OPEN",
      isDraft: false,
      headSha,
      labels: ["factory:verified"],
      changedFiles: ["src/feature.js", "docs/requirements/REQ-007-example/design.md", "docs/requirements/REQ-007-example/delivery.md"],
    },
    issue: { number: 7, state: "OPEN", labels: [] },
    issueComments: [comment("<!-- factory-handoff -->\nrequirement: REQ-007\npattern: none\ndone_when: the complete result works")],
    prComments: [verification()],
    specTransitions: [transition()],
    openLinkedPrs: [8],
    comparisons: { [specSha]: { ancestorOfHead: true, changedFiles: ["src/feature.js"] } },
    pattern: null,
    hasReviewedSpec: true,
  };
}

function patternContext() {
  const context = reviewedContext();
  context.issue.labels = ["factory:pattern:feature-family"];
  context.issueComments = [comment("<!-- factory-handoff -->\nrequirement: REQ-007\npattern: feature-family\ndone_when: the complete result works")];
  context.pr.changedFiles = ["src/feature.js", "docs/requirements/REQ-007-example/delivery.md"];
  context.pr.isDraft = false;
  context.specTransitions = [];
  context.comparisons = {};
  context.hasReviewedSpec = false;
  context.pattern = {
    id: "feature-family",
    version: 1,
    enabled: true,
    activation: { issueLabel: "factory:pattern:feature-family" },
    scope: { allowedPaths: ["src/**"], preserved: ["existing behavior"] },
    execution: {
      planReview: "none",
      gateLevel: "full",
      independentVerification: "required",
      completion: "verified-pr",
    },
  };
  return context;
}

test("reviewed Spec Ready state and current independent verification pass", () => {
  assert.deepEqual(validateGateContext(reviewedContext()), { ok: true, errors: [] });
});

test("Actions run head binds Ready when timeline commit_id is absent", () => {
  const context = reviewedContext();
  context.specTransitions[0].commitId = null;
  context.specTransitions[0].runHeadSha = specSha;
  context.specTransitions[0].runUrl = "https://github.com/example/project/actions/runs/1";
  assert.equal(validateGateContext(context).ok, true);
});

test("Ready approval cannot move past Spec drift", () => {
  const context = reviewedContext();
  context.specTransitions[0].commitId = null;
  context.specTransitions[0].runHeadSha = specSha;
  context.specTransitions[0].runUrl = "https://github.com/example/project/actions/runs/1";
  context.comparisons[specSha].changedFiles = ["docs/requirements/REQ-007-example/design.md"];
  const errors = validateGateContext(context).errors;
  assert.ok(errors.includes("spec-ready:spec-drift"));
});

test("Draft and Convert to draft revoke approval", () => {
  const missing = reviewedContext();
  missing.pr.isDraft = true;
  missing.specTransitions = [];
  assert.ok(validateGateContext(missing).errors.includes("spec-ready:missing"));

  const converted = reviewedContext();
  converted.pr.isDraft = true;
  converted.specTransitions.push(transition("convert_to_draft", { createdAt: "2026-08-24T00:01:00Z" }));
  assert.ok(validateGateContext(converted).errors.includes("spec-ready:pr-is-draft"));
});

test("write collaborator is trusted but untrusted actor is rejected", () => {
  const collaborator = reviewedContext();
  collaborator.specTransitions[0] = transition("ready_for_review", { trustedActor: true, authorAssociation: "NONE" });
  assert.equal(validateGateContext(collaborator).ok, true);

  const outsider = reviewedContext();
  outsider.specTransitions[0] = transition("ready_for_review", { trustedActor: false, authorAssociation: "NONE" });
  assert.ok(validateGateContext(outsider).errors.includes("spec-ready:untrusted-actor"));
});

test("unique PR and current verification fail closed", () => {
  const secondPr = reviewedContext();
  secondPr.openLinkedPrs.push(9);
  assert.ok(validateGateContext(secondPr).errors.includes("pr:not-unique-open"));

  const stale = reviewedContext();
  stale.prComments[0] = verification(specSha);
  assert.ok(validateGateContext(stale).errors.includes("verification:stale-sha"));

  const rejected = reviewedContext();
  rejected.pr.labels.push("factory:rejected");
  assert.ok(validateGateContext(rejected).errors.includes("verification:rejected-label-present"));
});

test("missing reviewed Spec and closed issue fail closed", () => {
  const context = reviewedContext();
  context.issue.state = "CLOSED";
  context.hasReviewedSpec = false;
  const errors = validateGateContext(context).errors;
  assert.ok(errors.includes("issue:not-open"));
  assert.ok(errors.includes("spec:design-missing"));
});

test("an enabled Pattern cannot authorize Factory governance changes", () => {
  const context = patternContext();
  context.pr.changedFiles.push(".agents/skills/factory-spec/SKILL.md");
  context.pattern.scope.allowedPaths.push(".agents/**");
  assert.ok(validateGateContext(context).errors.includes("governance:pattern-cannot-authorize:.agents/skills/factory-spec/SKILL.md"));
});

test("an explicitly enabled Pattern skips Spec Ready but keeps scope and verification", () => {
  const context = patternContext();
  assert.equal(validateGateContext(context).ok, true);

  context.pr.isDraft = true;
  assert.ok(validateGateContext(context).errors.includes("pattern:pr-is-draft"));
  context.pr.isDraft = false;

  context.pr.changedFiles.push("package.json");
  assert.ok(validateGateContext(context).errors.includes("pattern:not-allowed:package.json"));
  context.pr.changedFiles.pop();

  context.prComments = [];
  assert.ok(validateGateContext(context).errors.includes("verification:missing"));
});

test("a disabled or unlabeled Pattern cannot bypass Spec Ready", () => {
  const disabled = patternContext();
  disabled.pattern.enabled = false;
  assert.ok(validateGateContext(disabled).errors.includes("pattern:missing-disabled-or-invalid"));

  const unlabeled = patternContext();
  unlabeled.issue.labels = [];
  assert.ok(validateGateContext(unlabeled).errors.includes("pattern:configuration-without-activation-label"));
  assert.ok(validateGateContext(unlabeled).errors.includes("spec-ready:missing"));
});

test("an untrusted marker cannot shadow the latest trusted handoff", () => {
  const context = reviewedContext();
  context.issueComments.push(comment(
    "<!-- factory-handoff -->\nrequirement: REQ-999\npattern: none",
    { authorAssociation: "NONE", createdAt: "2026-08-24T00:05:00Z" },
  ));
  assert.equal(validateGateContext(context).ok, true);
});

test("pagination reads item 101", async () => {
  const originalFetch = globalThis.fetch;
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }));
  globalThis.fetch = async (url) => {
    const page = new URL(url).searchParams.get("page");
    return new Response(JSON.stringify(page === "1" ? firstPage : [{ id: 101 }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const result = await paginate("/repos/example/project/pulls/8/files", "token");
    assert.equal(result.length, 101);
    assert.equal(result.at(-1).id, 101);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Ready binds the first matching Factory Gates run after transition", () => {
  const event = { created_at: "2026-08-24T00:00:00Z" };
  const runs = [
    { name: "Factory Gates", event: "pull_request", created_at: "2026-08-23T23:59:59Z", head_sha: "old", pull_requests: [{ number: 8 }] },
    { name: "Other", event: "pull_request", created_at: "2026-08-24T00:00:01Z", head_sha: "other", pull_requests: [{ number: 8 }] },
    { name: "Factory Gates", event: "pull_request", created_at: "2026-08-24T00:00:02Z", head_sha: specSha, pull_requests: [{ number: 8 }] },
    { name: "Factory Gates", event: "pull_request", created_at: "2026-08-24T00:00:03Z", head_sha: headSha, pull_requests: [{ number: 8 }] },
  ];
  assert.equal(readyRunForTransition(event, runs, 8).head_sha, specSha);
});
