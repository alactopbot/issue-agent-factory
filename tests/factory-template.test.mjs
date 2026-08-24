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

test("installed template is Codex-only and contains no duplicated live state", async () => {
  const files = await filesUnder("template/");
  assert.equal(files.some((file) => file.includes("/.claude/") || file.endsWith("/CLAUDE.md")), false);
  assert.equal(files.some((file) => /docs\/factory\/(QUEUE|STATE)\.md$/.test(file)), false);
  assert.equal(files.some((file) => file.includes("/docs/factory/runs/")), false);
  assert.equal(files.some((file) => file.includes("factory-fire.yml")), false);
});

test("every Codex Factory skill is complete and independent", async () => {
  const names = ["triage", "spec", "implement", "verify", "monitor", "status", "tune"];
  for (const name of names) {
    const skill = await read(`template/.agents/skills/factory-${name}/SKILL.md`);
    assert.match(skill, /^---\nname: factory-/);
    assert.doesNotMatch(skill, /\.claude|Claude Code|适配器/);
  }
  assert.match(await read("template/.agents/skills/factory-spec/SKILL.md"), /Ready for review/);
  assert.match(await read("template/.agents/skills/factory-implement/SKILL.md"), /全新 Codex 验证 Agent/);
});

test("framework has no project business residue or line-count policy", async () => {
  const files = await filesUnder("template/");
  const text = (await Promise.all(files.filter((file) => /\.(md|json|mjs|sh|yml)$/.test(file)).map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(text, /\bDUN\b|triceratops|stegosaurus|animal-exhibit|museum|恐龙|三角龙|剑龙/i);
  assert.doesNotMatch(text, /300\s*行|900\s*行|lineBudget|line limit|文件数上限|代码行数上限/i);
});

test("policy preserves one requirement, one PR and human merge", async () => {
  const contract = await read("template/docs/factory/CONTRACT.md");
  assert.match(contract, /一个完整需求对应一个 Issue、一个分支和一个 PR/);
  assert.match(contract, /<!-- factory-handoff -->/);
  assert.match(contract, /<!-- factory-verification -->/);
  assert.match(contract, /<!-- factory-delivery -->/);
  assert.match(contract, /最终都由人类合并/);
  assert.match(contract, /普通评论/);
  assert.doesNotMatch(contract, /方案通过|Review changes|结构化人工评论/);
});
