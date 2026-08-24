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

test("installed workflow has one portable canonical layout", async () => {
  const files = await filesUnder("template/");
  assert.equal(files.filter((file) => file.endsWith("/AGENTS.md")).length, 1);
  assert.equal(files.filter((file) => /\/\.agents\/skills\/factory-[^/]+\/SKILL\.md$/.test(file)).length, 7);
  assert.equal(files.filter((file) => file.endsWith("/docs/factory/CONTRACT.md")).length, 1);
});

test("AGENTS and every Factory skill are complete, portable, and runtime-neutral", async () => {
  const names = ["triage", "spec", "implement", "verify", "monitor", "status", "tune"];
  const agents = await read("template/AGENTS.md");
  assert.doesNotMatch(agents, /Codex|Claude|OpenAI|Anthropic/i);
  for (const name of names) {
    const skill = await read(`template/.agents/skills/factory-${name}/SKILL.md`);
    assert.match(skill, /^---\nname: factory-/);
    assert.doesNotMatch(skill, /Codex|Claude|OpenAI|Anthropic|\.claude/i);
  }
  assert.match(await read("template/.agents/skills/factory-spec/SKILL.md"), /Ready for review/);
  assert.match(await read("template/.agents/skills/factory-implement/SKILL.md"), /fresh independent Agent context/);
  assert.match(await read("template/.agents/skills/factory-implement/SKILL.md"), /issue-number.*exact Issue title/s);
});

test("framework has no project business residue or line-count policy", async () => {
  const files = await filesUnder("template/");
  const text = (await Promise.all(files.filter((file) => /\.(md|json|mjs|sh|yml)$/.test(file)).map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(text, /\bDUN\b|triceratops|stegosaurus|animal-exhibit|museum|恐龙|三角龙|剑龙/i);
  assert.doesNotMatch(text, /300\s*行|900\s*行|lineBudget|line limit|文件数上限|代码行数上限/i);
});

test("policy preserves one requirement, one PR and human merge", async () => {
  const contract = await read("template/docs/factory/CONTRACT.md");
  assert.match(contract, /一个用户可独立验收的完整需求对应一个 Issue、一个分支和一个 PR/);
  assert.match(contract, /<!-- factory-handoff -->/);
  assert.match(contract, /<!-- factory-verification -->/);
  assert.match(contract, /最终合并代表产品验收/);
  assert.match(contract, /普通评论/);
  assert.doesNotMatch(contract, /Review changes|结构化人工评论/);
});

test("Patterns have an explicit user-controlled activation contract", async () => {
  const schema = await read("template/.factory/pattern.schema.json");
  const parsed = JSON.parse(schema);
  const triage = await read("template/.agents/skills/factory-triage/SKILL.md");
  assert.deepEqual(parsed.required, ["id", "version", "enabled", "activation", "scope", "execution"]);
  assert.equal(parsed.properties.enabled.type, "boolean");
  assert.match(parsed.properties.activation.properties.issueLabel.pattern, /factory:pattern:/);
  assert.match(triage, /user-reviewed configuration is enabled on the default branch/);
});

test("ordinary requirements use one complete human-readable Spec", async () => {
  const spec = await read("template/.agents/skills/factory-spec/SKILL.md");
  assert.match(spec, /design\.md/);
  assert.match(spec, /design\.md` is the complete plan authority/);
  assert.match(await read("template/docs/requirements/README.md"), /design\.md/);
  assert.match(await read("template/docs/requirements/README.md"), /delivery\.md/);
});
