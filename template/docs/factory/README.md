# Issue Agent Factory 使用指南

## 配置结构

| 路径 | 作用 |
|---|---|
| `.factory/project.json` | 项目、语言、人工决策、自治与证据策略 |
| `.factory/requirement.schema.json` | 每个需求 `factory.json` 的通用结构 |
| `.factory/patterns/*.json` | 可复用需求模式、成熟度、晋级与降级条件 |
| `docs/factory/CHARTER.md` | 人类批准的风险与产品边界 |
| `docs/factory/CONTRACT.md` | Codex 执行契约 |
| `docs/requirements/REQ-*/` | 每个完整需求的方案与交付证据 |
| `.agents/skills/` | Codex 的完整 Factory 工作流 |

日常流程是 Issue → 统一 Spec → 人工 Ready（bootstrap/supervised Draft）或 Pattern 自动通过
（trusted/autonomous 非 Draft）→ 同一 PR 实现 → 独立验证 →
人工合并。GitHub 是实时状态，仓库不维护队列或运行流水账。

## 本地检查

```bash
./.factory/scripts/doctor.sh
./.factory/scripts/gates.sh fast
./.factory/scripts/gates.sh full
./.factory/scripts/gates.sh deep
```

定时运行时先使用 `factory-monitor`，再根据标签选择 triage、spec 或 implement。每次最多推进一个完整
需求；没有可执行工作时不创建提交。
