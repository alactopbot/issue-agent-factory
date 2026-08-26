import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyVerification,
  paginate,
  routePrState,
  validatePrState,
} from "../template/.factory/scripts/validate-pr-state.mjs";

const oldSha = "1".repeat(40);
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

function verification(sha = headSha, decision = "accepted", gateStatus = "GREEN") {
  return comment(`<!-- factory-verification -->\ndecision: ${decision}\nverified_sha: ${sha}\ngate_status: ${gateStatus}`);
}

function context() {
  return {
    pr: { number: 8, state: "OPEN", isDraft: false, headSha },
    issue: { number: 7, state: "OPEN" },
    prComments: [verification()],
    specTransitions: [{ event: "ready_for_review", trustedActor: true, createdAt: "2026-08-24T00:00:00Z" }],
    openLinkedPrs: [8],
    hasSpec: true,
  };
}

test("a Ready PR with current accepted verification can await merge", () => {
  const value = context();
  assert.deepEqual(validatePrState(value), { ok: true, errors: [] });
  assert.equal(classifyVerification(value), "accepted");
  assert.equal(routePrState(value), "AWAITING_MERGE");
});

test("Draft or revoked Ready remains in Spec review", () => {
  const draft = context();
  draft.pr.isDraft = true;
  draft.specTransitions = [];
  assert.equal(routePrState(draft), "AWAITING_SPEC_REVIEW");
  assert.ok(validatePrState(draft).errors.includes("spec:pr-is-draft"));

  const revoked = context();
  revoked.pr.isDraft = true;
  revoked.specTransitions.push({ event: "convert_to_draft", trustedActor: true, createdAt: "2026-08-24T00:01:00Z" });
  assert.ok(validatePrState(revoked).errors.includes("spec-ready:revoked"));
});

test("only a trusted human Ready transition authorizes delivery", () => {
  const missing = context();
  missing.specTransitions = [];
  assert.ok(validatePrState(missing).errors.includes("spec-ready:missing"));

  const outsider = context();
  outsider.specTransitions[0].trustedActor = false;
  assert.ok(validatePrState(outsider).errors.includes("spec-ready:untrusted-actor"));
});

test("verification routes stale and missing heads back to verification", () => {
  const pending = context();
  pending.prComments = [];
  assert.equal(classifyVerification(pending), "pending");
  assert.equal(routePrState(pending), "VERIFYING");

  const stale = context();
  stale.prComments = [verification(oldSha)];
  assert.equal(classifyVerification(stale), "stale");
  assert.equal(routePrState(stale), "VERIFYING");
  assert.ok(validatePrState(stale).errors.includes("verification:stale-sha"));
});

test("a current rejection routes back to implementation", () => {
  const rejected = context();
  rejected.prComments = [verification(headSha, "rejected", "RED")];
  assert.equal(classifyVerification(rejected), "rejected");
  assert.equal(routePrState(rejected), "IMPLEMENTING");
  assert.ok(validatePrState(rejected).errors.includes("verification:current-head-rejected"));
});

test("acceptance fails closed on bad evidence", () => {
  const red = context();
  red.prComments = [verification(headSha, "accepted", "RED")];
  assert.equal(classifyVerification(red), "invalid");
  assert.ok(validatePrState(red).errors.includes("verification:gate-not-green"));

  const noSpec = context();
  noSpec.hasSpec = false;
  assert.ok(validatePrState(noSpec).errors.includes("spec:design-missing"));

  const duplicate = context();
  duplicate.openLinkedPrs.push(9);
  assert.ok(validatePrState(duplicate).errors.includes("pr:not-unique-open"));
});

test("an untrusted verification marker cannot shadow trusted evidence", () => {
  const value = context();
  value.prComments.push(comment(
    `<!-- factory-verification -->\ndecision: rejected\nverified_sha: ${headSha}\ngate_status: RED`,
    { authorAssociation: "NONE", createdAt: "2026-08-24T00:05:00Z" },
  ));
  assert.equal(validatePrState(value).ok, true);
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
