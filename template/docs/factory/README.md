# Issue Agent Factory 使用指南

## 配置结构

| 路径 | 作用 |
|---|---|
| `.factory/project.json` | 项目、语言、默认 Gate 与证据策略 |
| `.factory/patterns/*.json` | 用户显式启用的固定需求授权 |
| `docs/factory/CHARTER.md` | 人类批准的风险与产品边界 |
| `docs/factory/CONTRACT.md` | Agent 执行契约 |
| `docs/requirements/REQ-*/` | 普通需求的统一 Spec 与交付证据 |
| `.agents/skills/` | 运行器无关的完整 Factory 工作流 |

普通流程是 Issue → 统一 Spec → 人工 Ready → 同一 PR 实现 → 独立验证 → 人工合并。用户提前建设并
启用 Pattern 后，带唯一 `factory:pattern:<id>` 标签的固定模式 Issue 省略逐次 Spec 确认，直接实现到
verified PR。GitHub 是实时状态。

## 本地检查

```bash
./.factory/scripts/doctor.sh
./.factory/scripts/gates.sh fast
./.factory/scripts/gates.sh full
./.factory/scripts/gates.sh deep
```

定时运行时先使用 `factory-monitor`，再根据状态选择 triage、spec 或 implement。每次最多推进一个完整
需求；首次写仓库前由 `claim.sh` 原子认领确定性分支，没有可执行工作时不创建提交。
