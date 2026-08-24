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

function validContext() {
  return {
    pr: {
      number: 8,
      state: "OPEN",
      isDraft: false,
      headSha,
      labels: ["factory:verified"],
      changedFiles: ["src/feature.js", "docs/requirements/REQ-007-example/delivery.md"],
    },
    issue: { number: 7, state: "OPEN" },
    issueComments: [comment(`<!-- factory-handoff -->\nrequirement: REQ-007\nreview_pr: 8\napproved_plan_sha: ${specSha}`)],
    prComments: [verification()],
    specTransitions: [transition()],
    openLinkedPrs: [8],
    comparisons: { [specSha]: { ancestorOfHead: true, changedFiles: ["src/feature.js"] } },
    spec: {
      schemaVersion: 1,
      requirement: "REQ-007",
      issue: 7,
      mode: "supervised",
      pattern: "feature-family",
      reviewPr: 8,
      humanGates: ["spec-ready", "merge"],
      allowedPaths: ["src/**", "docs/requirements/REQ-007-example/**"],
      gateLevel: "deep",
    },
  };
}

test("valid Ready state and current independent verification pass", () => {
  assert.deepEqual(validateGateContext(validContext()), { ok: true, errors: [] });
});

test("Actions run head binds Ready when timeline commit_id is absent", () => {
  const context = validContext();
  context.specTransitions[0].commitId = null;
  context.specTransitions[0].runHeadSha = specSha;
  context.specTransitions[0].runUrl = "https://github.com/example/project/actions/runs/1";
  assert.equal(validateGateContext(context).ok, true);
});

test("editable handoff cannot move approval past spec drift", () => {
  const context = validContext();
  context.specTransitions[0].commitId = null;
  context.specTransitions[0].runHeadSha = specSha;
  context.specTransitions[0].runUrl = "https://github.com/example/project/actions/runs/1";
  context.issueComments[0] = comment(`<!-- factory-handoff -->\nrequirement: REQ-007\nreview_pr: 8\napproved_plan_sha: ${headSha}`);
  context.comparisons[specSha].changedFiles = ["docs/requirements/REQ-007-example/design.md"];
  const errors = validateGateContext(context).errors;
  assert.ok(errors.includes("handoff:approved-plan-sha-mismatch"));
  assert.ok(errors.includes("spec-ready:spec-drift"));
});

test("Draft and Convert to draft revoke approval", () => {
  const missing = validContext();
  missing.pr.isDraft = true;
  missing.specTransitions = [];
  assert.ok(validateGateContext(missing).errors.includes("spec-ready:missing"));

  const converted = validContext();
  converted.pr.isDraft = true;
  converted.specTransitions.push(transition("convert_to_draft", { createdAt: "2026-08-24T00:01:00Z" }));
  assert.ok(validateGateContext(converted).errors.includes("spec-ready:pr-is-draft"));
});

test("write collaborator is trusted but untrusted actor is rejected", () => {
  const collaborator = validContext();
  collaborator.specTransitions[0] = transition("ready_for_review", { trustedActor: true, authorAssociation: "NONE" });
  assert.equal(validateGateContext(collaborator).ok, true);

  const outsider = validContext();
  outsider.specTransitions[0] = transition("ready_for_review", { trustedActor: false, authorAssociation: "NONE" });
  assert.ok(validateGateContext(outsider).errors.includes("spec-ready:untrusted-actor"));
});

test("unique PR, allowed paths and current verification fail closed", () => {
  const secondPr = validContext();
  secondPr.openLinkedPrs.push(9);
  assert.ok(validateGateContext(secondPr).errors.includes("pr:not-unique-open"));

  const outOfScope = validContext();
  outOfScope.pr.changedFiles.push("package.json");
  assert.ok(validateGateContext(outOfScope).errors.includes("scope:not-allowed:package.json"));

  const stale = validContext();
  stale.prComments[0] = verification(specSha);
  assert.ok(validateGateContext(stale).errors.includes("verification:stale-sha"));

  const rejected = validContext();
  rejected.pr.labels.push("factory:rejected");
  assert.ok(validateGateContext(rejected).errors.includes("verification:rejected-label-present"));
});

test("malformed requirement manifest and closed issue fail closed", () => {
  const context = validContext();
  context.issue.state = "CLOSED";
  context.spec.schemaVersion = 2;
  context.spec.mode = "unknown";
  context.spec.gateLevel = "none";
  const errors = validateGateContext(context).errors;
  assert.ok(errors.includes("issue:not-open"));
  assert.ok(errors.includes("spec:unsupported-schema-version"));
  assert.ok(errors.includes("spec:invalid-mode"));
  assert.ok(errors.includes("spec:invalid-gate-level"));
});

test("Factory governance changes cannot use trusted automatic spec approval", () => {
  const context = validContext();
  context.spec.mode = "trusted";
  context.spec.humanGates = ["merge"];
  context.specTransitions = [];
  context.pr.changedFiles.push(".agents/skills/factory-spec/SKILL.md");
  context.spec.allowedPaths.push(".agents/**");
  assert.ok(validateGateContext(context).errors.includes("governance:human-spec-ready-required"));
});

test("trusted pattern skips spec-ready only, not independent verification", () => {
  const context = validContext();
  context.spec.mode = "trusted";
  context.spec.humanGates = ["merge"];
  context.specTransitions = [];
  assert.equal(validateGateContext(context).ok, true);

  context.pr.isDraft = true;
  assert.ok(validateGateContext(context).errors.includes("spec:automatic-mode-still-draft"));
  context.pr.isDraft = false;

  context.prComments = [];
  assert.ok(validateGateContext(context).errors.includes("verification:missing"));
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
