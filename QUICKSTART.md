# 快速开始

```bash
./install.sh /path/to/project
cd /path/to/project
# 编辑 .factory/project.json、docs/factory/CHARTER.md、AGENTS.md、gates.conf
./.factory/scripts/doctor.sh
./.factory/scripts/bootstrap-github.sh --apply
git add . && git commit -m "chore: install Issue Agent Factory" && git push
```

创建一个 GitHub Issue，然后让 Agent 使用 `factory-triage` 和 `factory-spec` 推进下一个可执行 Issue。
人工只在 GitHub 做两类决定：Draft Spec 的 Ready for review，以及最终 PR 合并。
