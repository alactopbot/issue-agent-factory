---
name: factory-triage
description: 按项目策略与可复用 Pattern 分诊新的或需要重判的 GitHub Issue，确定一个完整产品需求的自治模式并写入可信交接。用于新 Issue、定时分诊和流程恢复；不用于直接实现代码。
---

# Factory 分诊

目标是把一个可独立验收的产品需求交给正确流程，而不是把实现步骤变成多个 Issue 或人工确认点。

## 前置读取

依次读取 `docs/factory/CONTRACT.md`、`docs/factory/CHARTER.md`、`.factory/project.json` 和
`.factory/patterns/*.json`。GitHub Issue、标签、分支、PR、时间线和评论是实时状态来源；Agent 会话不是。

只处理没有 Factory 状态标签或明确要求重新分诊的开放 Issue。跳过 `factory:in-progress`；
`factory:awaiting-review` 只交给巡检或交付恢复。

## 判断需求和 Pattern

先用一句话写出用户可独立验收的最终结果。只有 Issue 包含互不依赖、可以分别发布和验收的产品结果时
才建议拆分。实现顺序只是统一 Spec 内的 work units，不创建额外 Issue、分支、PR 或 Gate。

Pattern 必须逐项满足 `appliesWhen`、`allowedChanges` 和全部 `preserved` 不变量，并且版本、成熟度与
最近交付证据有效。无法证明完全匹配时进入新方案，不能勉强套用。模式为：

- `bootstrap`：首次建立该模式，人工审阅完整 Spec。
- `supervised`：复用校准中的 Pattern，人工审阅差异化 Spec。
- `trusted`：成熟 Pattern 自动通过 Spec，仍需独立验证和人工合并。
- `autonomous`：仅项目配置显式开启时可选；人工合并规则仍不改变。

## 分类与交接

使用唯一状态标签：`factory:ready-to-spec`、`factory:wait-to-implement`、
`factory:ready-to-implement`、`factory:needs-info`、`factory:in-progress` 或
`factory:awaiting-review`。创建或更新由仓库协作者发布的单条 Issue 评论：

```text
<!-- factory-handoff -->
requirement: REQ-<三位 Issue 编号>
disposition: ready-to-spec | wait-to-implement | ready-to-implement | needs-info
mode: bootstrap | supervised | trusted | autonomous
pattern: <pattern-id | new>
pattern_version: <number | pending>
done_when: <完整且可验证的产品结果>
allowed_paths: <机读 Spec 的只读摘要或 pending>
load_bearing: true | false
gate_level: fast | full | deep
human_gates: spec-ready=required | automatic, merge=required
review_pr: <唯一 PR 编号或 pending>
approved_plan_sha: <Actions Ready 运行头的只读镜像 | automatic | pending>
created_at: <UTC timestamp>
```

交接不能扩大 `factory.json` 权限。缺少会改变结果的信息时只问一个最小必要问题并标记 `needs-info`。
用 `.factory/project.json` 的 `language.workflow` 输出 GitHub 文本。分诊不写实现代码。
