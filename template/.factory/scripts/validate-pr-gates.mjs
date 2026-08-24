#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import process from "node:process";

const trustedAssociations = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const trustedPermissions = new Set(["admin", "maintain", "write"]);
const protectedPlanPaths = [
  /^docs\/requirements\/REQ-[^/]+\/design\.md$/,
  /^docs\/requirements\/REQ-[^/]+\/factory\.json$/,
  /^\.factory\/patterns\//,
  /^\.factory\/project\.json$/,
  /^\.factory\/(?:gates\.conf|.*\.schema\.json|scripts\/|hooks\/)/,
  /^\.agents\/skills\//,
  /^\.codex\//,
  /^\.github\/workflows\/factory-gates\.yml$/,
  /^AGENTS\.md$/,
  /^docs\/factory\/(?:CHARTER|CONTRACT)\.md$/,
];
const fieldLine = /^([a-z_]+):\s*(.+)$/;

export function parseMarker(body, marker) {
  const start = body.indexOf(`<!-- ${marker} -->`);
  if (start < 0) return null;
  const fields = {};
  for (const line of body.slice(start).split("\n").slice(1)) {
    if (line.startsWith("<!-- ") || line.startsWith("```")) break;
    const match = line.trim().match(fieldLine);
    if (!match) {
      if (line.trim()) break;
      continue;
    }
    fields[match[1]] = match[2].trim();
  }
  return fields;
}

function isFullSha(value) {
  return /^[0-9a-f]{40}$/.test(value ?? "");
}

function trusted(item) {
  return trustedAssociations.has(item.authorAssociation) || item.trustedActor === true;
}

function latestMarker(items, marker, predicate = () => true) {
  return items
    .map((item) => ({ item, fields: parseMarker(item.body ?? "", marker) }))
    .filter(({ fields, item }) => fields && predicate(fields, item))
    .sort((a, b) => new Date(a.item.createdAt) - new Date(b.item.createdAt))
    .at(-1);
}

function requirementId(issueNumber) {
  return `REQ-${String(issueNumber).padStart(3, "0")}`;
}

function pathMatches(pattern, path) {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*" && pattern[index + 1] === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else {
      source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`${source}$`).test(path);
}

export function validateGateContext(context) {
  const errors = [];
  const { pr, issue, issueComments, prComments, specTransitions, openLinkedPrs, comparisons, spec } = context;

  if (pr.state !== "OPEN") errors.push("pr:not-open");
  if (issue.state && issue.state !== "OPEN") errors.push("issue:not-open");
  if (openLinkedPrs.length !== 1 || openLinkedPrs[0] !== pr.number) errors.push("pr:not-unique-open");

  const handoff = latestMarker(issueComments, "factory-handoff");
  if (!handoff || !trusted(handoff.item)) {
    errors.push("handoff:missing-or-untrusted");
    return { ok: false, errors };
  }

  if (handoff.fields.requirement !== requirementId(issue.number)) errors.push("handoff:requirement-mismatch");
  if (Number(handoff.fields.review_pr) !== pr.number) errors.push("handoff:review-pr-mismatch");

  if (!spec || spec.requirement !== requirementId(issue.number) || spec.issue !== issue.number) {
    errors.push("spec:missing-or-mismatched-manifest");
  } else {
    if (spec.schemaVersion !== 1) errors.push("spec:unsupported-schema-version");
    if (!["bootstrap", "supervised", "trusted", "autonomous"].includes(spec.mode)) errors.push("spec:invalid-mode");
    if (!["fast", "full", "deep"].includes(spec.gateLevel)) errors.push("spec:invalid-gate-level");
    if (typeof spec.pattern !== "string" || !spec.pattern.trim()) errors.push("spec:invalid-pattern");
    if (spec.reviewPr !== pr.number) errors.push("spec:review-pr-mismatch");
    if (!Array.isArray(spec.allowedPaths) || !Array.isArray(spec.humanGates)) {
      errors.push("spec:invalid-manifest");
    } else {
      for (const path of pr.changedFiles) {
        if (!spec.allowedPaths.some((pattern) => pathMatches(pattern, path))) errors.push(`scope:not-allowed:${path}`);
      }
    }

    if (Array.isArray(spec.humanGates) &&
        pr.changedFiles.some((path) => protectedPlanPaths.some((pattern) => pattern.test(path))) &&
        !spec.humanGates.includes("spec-ready")) {
      errors.push("governance:human-spec-ready-required");
    }

    if (Array.isArray(spec.humanGates) && spec.humanGates.includes("spec-ready")) {
      const transition = specTransitions
        .filter((item) => ["ready_for_review", "convert_to_draft"].includes(item.event))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .at(-1);
      if (!transition) {
        errors.push("spec-ready:missing");
      } else if (transition.event === "convert_to_draft" || pr.isDraft) {
        errors.push("spec-ready:pr-is-draft");
      } else if (!trusted(transition)) {
        errors.push("spec-ready:untrusted-actor");
      } else if (!isFullSha(transition.commitId ?? transition.runHeadSha)) {
        errors.push("spec-ready:invalid-sha");
      } else if (!transition.url || (!transition.commitId && !transition.runUrl)) {
        errors.push("spec-ready:missing-source");
      } else {
        const approvedSha = transition.commitId ?? transition.runHeadSha;
        if (handoff.fields.approved_plan_sha !== approvedSha) errors.push("handoff:approved-plan-sha-mismatch");
        const comparison = comparisons[approvedSha];
        if (!comparison || !comparison.ancestorOfHead) {
          errors.push("spec-ready:sha-not-in-pr-history");
        } else if (comparison.changedFiles.some((path) => protectedPlanPaths.some((pattern) => pattern.test(path)))) {
          errors.push("spec-ready:spec-drift");
        }
      }
    } else if (pr.isDraft) {
      errors.push("spec:automatic-mode-still-draft");
    }
  }

  if (pr.labels.includes("factory:plan-review")) errors.push("pr:plan-review-pending");
  if (pr.labels.includes("factory:rejected")) errors.push("verification:rejected-label-present");
  if (!pr.labels.includes("factory:verified")) errors.push("verification:label-missing");

  const verification = latestMarker(prComments, "factory-verification", (_fields, item) => trusted(item));
  if (!verification) {
    errors.push("verification:missing");
  } else {
    if (verification.fields.decision !== "accepted") errors.push("verification:latest-decision-not-accepted");
    if (verification.fields.requirement !== requirementId(issue.number)) errors.push("verification:requirement-mismatch");
    if (!isFullSha(verification.fields.verified_sha)) errors.push("verification:invalid-sha");
    if (verification.fields.verified_sha !== pr.headSha) errors.push("verification:stale-sha");
    if (!verification.item.url) errors.push("verification:missing-source");
  }

  return { ok: errors.length === 0, errors };
}

async function github(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${path}`);
  return response.json();
}

export async function paginate(path, token, collectionKey) {
  const separator = path.includes("?") ? "&" : "?";
  const items = [];
  for (let page = 1; ; page += 1) {
    const data = await github(`${path}${separator}per_page=100&page=${page}`, token);
    const pageItems = collectionKey ? data[collectionKey] : data;
    if (!Array.isArray(pageItems)) throw new Error(`GitHub API pagination response is not an array: ${path}`);
    items.push(...pageItems);
    if (pageItems.length < 100) return items;
  }
}

export function readyRunForTransition(transition, workflowRuns, prNumber) {
  const transitionTime = new Date(transition.created_at).getTime();
  return workflowRuns
    .filter((item) => item.name === "Factory Gates" && item.event === "pull_request")
    .filter((item) => item.pull_requests?.some((pull) => pull.number === prNumber))
    .filter((item) => {
      const runTime = new Date(item.created_at).getTime();
      return runTime >= transitionTime && runTime - transitionTime <= 5 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .at(0);
}

function linkedIssueNumber(body) {
  const match = body.match(/(?:close[sd]?|fixe[sd]?|resolve[sd]?)\s+#(\d+)/i);
  return match ? Number(match[1]) : null;
}

async function hasWritePermission(apiRoot, login, token) {
  if (!login) return false;
  try {
    const data = await github(`${apiRoot}/collaborators/${encodeURIComponent(login)}/permission`, token);
    return trustedPermissions.has(data.permission) || trustedPermissions.has(data.user?.permissions?.role_name);
  } catch {
    return false;
  }
}

async function liveContext(event, token, repository) {
  const prNumber = event.pull_request?.number;
  if (!prNumber) throw new Error("Only pull_request events are supported");
  const [owner, repo] = repository.split("/");
  const apiRoot = `/repos/${owner}/${repo}`;
  const pr = await github(`${apiRoot}/pulls/${prNumber}`, token);
  const issueNumber = linkedIssueNumber(pr.body ?? "");
  if (!issueNumber) throw new Error("PR body must contain Closes #<issue>");

  const [issue, issueComments, prComments, timeline, prFiles, openPulls, workflowRuns] = await Promise.all([
    github(`${apiRoot}/issues/${issueNumber}`, token),
    paginate(`${apiRoot}/issues/${issueNumber}/comments`, token),
    paginate(`${apiRoot}/issues/${prNumber}/comments`, token),
    paginate(`${apiRoot}/issues/${prNumber}/timeline`, token),
    paginate(`${apiRoot}/pulls/${prNumber}/files`, token),
    paginate(`${apiRoot}/pulls?state=open`, token),
    paginate(`${apiRoot}/actions/runs?event=pull_request&branch=${encodeURIComponent(pr.head.ref)}`, token, "workflow_runs"),
  ]);
  const openLinkedPrs = openPulls
    .filter((candidate) => linkedIssueNumber(candidate.body ?? "") === issueNumber)
    .map((candidate) => candidate.number);

  const rawTransitions = timeline.filter((item) => ["ready_for_review", "convert_to_draft"].includes(item.event));
  const readyRuns = new Map();
  for (const transition of rawTransitions.filter((item) => item.event === "ready_for_review")) {
    const run = readyRunForTransition(transition, workflowRuns, prNumber);
    if (run) readyRuns.set(transition.id, run);
  }
  const trustedLogins = new Map();
  for (const transition of rawTransitions) {
    const login = transition.actor?.login;
    if (login && !trustedLogins.has(login)) trustedLogins.set(login, await hasWritePermission(apiRoot, login, token));
  }
  const transitionShas = [
    ...rawTransitions.map((item) => item.commit_id),
    ...[...readyRuns.values()].map((run) => run.head_sha),
  ].filter(isFullSha);
  const comparisons = {};
  for (const sha of new Set(transitionShas)) {
    const comparison = await github(`${apiRoot}/compare/${sha}...${pr.head.sha}`, token);
    comparisons[sha] = {
      ancestorOfHead: ["identical", "ahead"].includes(comparison.status),
      changedFiles: (comparison.files ?? []).map((file) => file.filename),
    };
  }

  const normalizeComment = (comment) => ({
    body: comment.body,
    authorAssociation: comment.author_association,
    createdAt: comment.created_at,
    url: comment.html_url,
  });
  const requirementPrefix = requirementId(issueNumber);
  const requirementDirectories = await readdir("docs/requirements", { withFileTypes: true });
  const matchingRequirementDirectories = requirementDirectories.filter(
    (entry) => entry.isDirectory() && entry.name.startsWith(`${requirementPrefix}-`),
  );
  if (matchingRequirementDirectories.length > 1) {
    throw new Error(`Multiple requirement directories match ${requirementPrefix}`);
  }
  const requirementDirectory = matchingRequirementDirectories[0];
  const spec = requirementDirectory
    ? JSON.parse(await readFile(`docs/requirements/${requirementDirectory.name}/factory.json`, "utf8"))
    : null;
  return {
    pr: {
      number: pr.number,
      state: pr.state.toUpperCase(),
      isDraft: pr.draft,
      headSha: pr.head.sha,
      labels: pr.labels.map((label) => label.name),
      changedFiles: prFiles.map((file) => file.filename),
    },
    issue: { number: issue.number, state: issue.state.toUpperCase() },
    issueComments: issueComments.map(normalizeComment),
    prComments: prComments.map(normalizeComment),
    specTransitions: rawTransitions.map((transition) => ({
      event: transition.event,
      commitId: transition.commit_id,
      runHeadSha: readyRuns.get(transition.id)?.head_sha,
      runUrl: readyRuns.get(transition.id)?.html_url,
      trustedActor: trustedLogins.get(transition.actor?.login) === true,
      createdAt: transition.created_at,
      url: transition.url,
    })),
    openLinkedPrs,
    comparisons,
    spec,
  };
}

async function main() {
  const fixtureIndex = process.argv.indexOf("--fixture");
  const context = fixtureIndex >= 0
    ? JSON.parse(await readFile(process.argv[fixtureIndex + 1], "utf8"))
    : await liveContext(
      JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8")),
      process.env.GITHUB_TOKEN,
      process.env.GITHUB_REPOSITORY,
    );
  const result = validateGateContext(context);
  for (const error of result.errors) console.error(`FACTORY_PR_GATE_ERROR: ${error}`);
  console.log(`FACTORY_PR_GATES: status=${result.ok ? "GREEN" : "RED"} errors=${result.errors.join(",") || "none"}`);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(`FACTORY_PR_GATES: status=MISCONFIGURED error=${error.message}`);
    process.exitCode = 2;
  });
}
