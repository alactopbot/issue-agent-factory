#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const trustedAssociations = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const trustedPermissions = new Set(["admin", "maintain", "write"]);

function isFullSha(value) {
  return /^[0-9a-f]{40}$/i.test(value ?? "");
}

function trustedComment(item) {
  return trustedAssociations.has(item.authorAssociation);
}

function parseMarker(body, name) {
  const marker = `<!-- ${name} -->`;
  const start = body.indexOf(marker);
  if (start === -1) return null;
  const fields = {};
  for (const line of body.slice(start + marker.length).split("\n")) {
    const match = line.match(/^([a-z_]+):\s*(.*?)\s*$/);
    if (match) fields[match[1]] = match[2];
  }
  return fields;
}

function latestVerification(comments) {
  return comments
    .filter(trustedComment)
    .map((item) => ({ item, fields: parseMarker(item.body ?? "", "factory-verification") }))
    .filter((entry) => entry.fields)
    .sort((a, b) => new Date(a.item.createdAt) - new Date(b.item.createdAt))
    .at(-1) ?? null;
}

function latestSpecTransition(transitions) {
  return transitions
    .filter((item) => ["ready_for_review", "convert_to_draft"].includes(item.event))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .at(-1) ?? null;
}

export function classifyVerification(context) {
  const verification = latestVerification(context.prComments);
  if (!verification) return "pending";
  const { decision, verified_sha: verifiedSha, gate_status: gateStatus } = verification.fields;
  if (!isFullSha(verifiedSha) || !["accepted", "rejected"].includes(decision)) return "invalid";
  if (verifiedSha !== context.pr.headSha) return "stale";
  if (decision === "rejected") return "rejected";
  return gateStatus === "GREEN" ? "accepted" : "invalid";
}

export function validatePrState(context) {
  const errors = [];
  const { pr, issue, prComments, specTransitions, openLinkedPrs, hasSpec } = context;

  if (pr.state !== "OPEN") errors.push("pr:not-open");
  if (issue.state !== "OPEN") errors.push("issue:not-open");
  if (openLinkedPrs.length !== 1 || openLinkedPrs[0] !== pr.number) errors.push("pr:not-unique-open");
  if (pr.isDraft) errors.push("spec:pr-is-draft");
  if (!hasSpec) errors.push("spec:design-missing");

  const transition = latestSpecTransition(specTransitions);
  if (!transition) {
    errors.push("spec-ready:missing");
  } else if (transition.event !== "ready_for_review" || pr.isDraft) {
    errors.push("spec-ready:revoked");
  } else if (!transition.trustedActor) {
    errors.push("spec-ready:untrusted-actor");
  }

  const verification = latestVerification(prComments);
  const verificationState = classifyVerification(context);
  if (!verification) {
    errors.push("verification:missing");
  } else if (verificationState === "invalid") {
    if (!isFullSha(verification.fields.verified_sha)) errors.push("verification:invalid-sha");
    if (!["accepted", "rejected"].includes(verification.fields.decision)) errors.push("verification:invalid-decision");
    if (verification.fields.decision === "accepted" && verification.fields.gate_status !== "GREEN") {
      errors.push("verification:gate-not-green");
    }
  } else if (verificationState === "stale") {
    errors.push("verification:stale-sha");
  } else if (verificationState === "rejected") {
    errors.push("verification:current-head-rejected");
  } else {
    if (!verification.item.url) errors.push("verification:missing-source");
  }

  return { ok: errors.length === 0, errors };
}

export function routePrState(context, result = validatePrState(context)) {
  if (context.pr.isDraft) return "AWAITING_SPEC_REVIEW";
  const verificationState = classifyVerification(context);
  if (verificationState === "rejected") return "IMPLEMENTING";
  if (["pending", "stale"].includes(verificationState)) return "VERIFYING";
  return result.ok ? "AWAITING_MERGE" : "BLOCKED";
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

export async function paginate(path, token) {
  const separator = path.includes("?") ? "&" : "?";
  const items = [];
  for (let page = 1; ; page += 1) {
    const pageItems = await github(`${path}${separator}per_page=100&page=${page}`, token);
    if (!Array.isArray(pageItems)) throw new Error(`GitHub pagination response is not an array: ${path}`);
    items.push(...pageItems);
    if (pageItems.length < 100) return items;
  }
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

async function githubContext(prNumber, token, repository) {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) throw new Error("Repository must be owner/name");
  const apiRoot = `/repos/${owner}/${repo}`;
  const pr = await github(`${apiRoot}/pulls/${prNumber}`, token);
  const issueNumber = linkedIssueNumber(pr.body ?? "");
  if (!issueNumber) throw new Error("PR body must contain Closes #<issue>");

  const [issue, prComments, timeline, prFiles, openPulls] = await Promise.all([
    github(`${apiRoot}/issues/${issueNumber}`, token),
    paginate(`${apiRoot}/issues/${prNumber}/comments`, token),
    paginate(`${apiRoot}/issues/${prNumber}/timeline`, token),
    paginate(`${apiRoot}/pulls/${prNumber}/files`, token),
    paginate(`${apiRoot}/pulls?state=open`, token),
  ]);

  const transitionItems = timeline.filter((item) => ["ready_for_review", "convert_to_draft"].includes(item.event));
  const permissionPairs = await Promise.all(transitionItems.map(async (item) => [
    item.id,
    await hasWritePermission(apiRoot, item.actor?.login, token),
  ]));
  const transitionPermissions = new Map(permissionPairs);

  return {
    pr: {
      number: pr.number,
      state: pr.state.toUpperCase(),
      isDraft: pr.draft,
      headSha: pr.head.sha,
    },
    issue: {
      number: issue.number,
      state: issue.state.toUpperCase(),
    },
    prComments: prComments.map((item) => ({
      body: item.body ?? "",
      authorAssociation: item.author_association,
      createdAt: item.created_at,
      url: item.html_url,
    })),
    specTransitions: transitionItems.map((item) => ({
      event: item.event,
      trustedActor: transitionPermissions.get(item.id) === true,
      createdAt: item.created_at,
    })),
    openLinkedPrs: openPulls
      .filter((candidate) => linkedIssueNumber(candidate.body ?? "") === issueNumber)
      .map((candidate) => candidate.number),
    hasSpec: prFiles.some((file) => file.filename === `docs/requirements/${issueNumber}.md`),
  };
}

async function ghOutput(args) {
  const { stdout } = await execFileAsync("gh", args, { encoding: "utf8" });
  return stdout.trim();
}

function parseArgs(argv) {
  let pr = null;
  let repo = process.env.GITHUB_REPOSITORY ?? null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--pr") pr = Number(argv[++index]);
    else if (argv[index] === "--repo") repo = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!Number.isInteger(pr) || pr <= 0) throw new Error("usage: validate-pr-state.mjs --pr <number> [--repo owner/name]");
  return { pr, repo };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = args.repo ?? await ghOutput(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  const token = process.env.GH_TOKEN ?? await ghOutput(["auth", "token"]);
  const context = await githubContext(args.pr, token, repository);
  const result = validatePrState(context);
  const route = routePrState(context, result);
  console.log(`FACTORY_PR_STATE: pr=${args.pr} status=${result.ok ? "GREEN" : "RED"} route=${route}`);
  for (const error of result.errors) console.log(`- ${error}`);
  if (!result.ok) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`FACTORY_PR_STATE: status=MISCONFIGURED reason=${error.message}`);
    process.exitCode = 2;
  });
}
