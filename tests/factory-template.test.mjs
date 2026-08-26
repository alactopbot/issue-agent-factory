import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (relative) => readFile(new URL(relative, root), "utf8");

async function filesUnder(relative) {
  const directory = new URL(relative, root);
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name));
}

test("installed workflow contains only the main runner and verifier", async () => {
  const files = await filesUnder("template/");
  const skills = files.filter((file) => /\/\.agents\/skills\/factory-[^/]+\/SKILL\.md$/.test(file));
  assert.equal(skills.length, 2);
  assert.ok(skills.some((file) => file.endsWith("/factory-run/SKILL.md")));
  assert.ok(skills.some((file) => file.endsWith("/factory-verify/SKILL.md")));
  assert.equal(files.some((file) => file.includes("/.factory/pattern")), false);
  assert.equal(files.some((file) => file.endsWith("/prove-test.sh")), false);
  assert.equal(files.some((file) => file.endsWith("/sync-default-branch.sh")), false);
});

test("the contract defines exactly the minimal Spec delivery chain", async () => {
  const contract = await read("template/docs/factory/CONTRACT.md");
  assert.match(contract, /Issue[\s\S]*scheduler scan[\s\S]*atomic issue\/<number> branch[\s\S]*Spec[\s\S]*Draft PR[\s\S]*Ready for review[\s\S]*implementation[\s\S]*verification[\s\S]*human merge/);
  assert.match(contract, /one Issue,[\s\S]*one deterministic branch,[\s\S]*one Spec, and one pull request/);
  assert.match(contract, /<!-- factory-verification -->/);
  assert.doesNotMatch(contract, /factory-handoff|Pattern|fast \| full \| deep|factory:verified|factory:rejected/);
});

test("the six Issue states are stable and mutually exclusive", async () => {
  const stateScript = await read("template/.factory/scripts/set-issue-state.sh");
  const bootstrap = await read("template/.factory/scripts/bootstrap-github.sh");
  const states = ["spec", "awaiting-spec-review", "implementing", "verifying", "awaiting-merge", "needs-info"];
  for (const state of states) {
    assert.match(stateScript, new RegExp(`factory:${state}`));
    assert.match(bootstrap, new RegExp(`factory:${state}`));
  }
  assert.match(bootstrap, /Would delete obsolete labels if present/);
  assert.match(bootstrap, /factory:pattern:\*/);
});

test("skills preserve human Ready, current-head verification, and human merge", async () => {
  const run = await read("template/.agents/skills/factory-run/SKILL.md");
  const verify = await read("template/.agents/skills/factory-verify/SKILL.md");
  assert.match(run, /claim\.sh <issue-number> <unique-run-id>/);
  assert.match(run, /trusted Ready authorizes implementation/);
  assert.match(run, /factory:verifying/);
  assert.match(verify, /verified_sha: <current full commit SHA>/);
  assert.match(verify, /factory:awaiting-merge/);
  assert.match(verify, /Do not merge the PR/);
});

test("installed guidance is portable and has no obsolete workflow", async () => {
  const files = await filesUnder("template/");
  const checked = files.filter((file) =>
    /\.(md|json|mjs|sh)$/.test(file)
    && !file.endsWith("/bootstrap-github.sh")
    && !file.endsWith("/set-issue-state.sh"));
  const text = (await Promise.all(checked.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(text, /Codex|Claude|OpenAI|Anthropic|\.claude/i);
  assert.doesNotMatch(text, /factory-(triage|spec|implement|monitor|status|tune)|factory:pattern:|factory-handoff/);
  assert.doesNotMatch(text, /300\s*行|900\s*行|lineBudget|line limit|文件数上限|代码行数上限/i);
});
