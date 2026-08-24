---
name: factory-implement
description: 在统一 Spec 已由人类把 Draft PR 标为 Ready，或成熟 Pattern 自动通过后，恢复同一需求分支和 PR，完成整个需求、确定性 Gate 与独立验证，最后等待人类合并。
---

# Factory 实现

一次运行推进一个完整需求。先读取契约、章程、项目配置、Pattern、Issue、交接、`design.md`、
`factory.json`、唯一 PR、Ready/Convert 时间线和全部相关反馈。

## 恢复与约束

选择 `factory:ready-to-implement` 的开放 Issue，并验证：机读 Spec 与 Issue/PR/Pattern 一致；同一 Issue
只有一个开放 PR；需要人工方案决定时最新可信事件为 Ready；批准后无 Spec 漂移；完整 diff 每个路径
都符合 `allowedPaths`。失败则回到同一 PR 的 Spec 流程。成功后复用原分支和 PR，标记 `in-progress`。

## 实现完整需求

按 Spec 内部 work units 推进：先建立能在旧行为失败的测试或等价证据；实现最小完整行为；运行相关
检查并提交可恢复的语义节点；直到 `done_when` 全部成立。不得为 work unit 新建 Issue、分支或 PR。

如需改变既有测试语义、增加依赖、进入未批准承重路径、改变产品设计或扩大范围，先把同一 PR 转回
Draft，更新 Spec 并等待新一轮 Ready。不能用聊天批准代替 GitHub 状态。

## 候选与独立验证

运行规定等级的 `./.factory/scripts/gates.sh`；必需 Gate 缺失、跳过或 `MISCONFIGURED` 都不算绿色。
创建唯一 `delivery.md`，候选时保持 `outcome`、`verifier`、`eligible_clean_run` 为 `pending` 并推送。

随后启动一个没有实现上下文的全新 Codex 验证 Agent，明确让它使用 `factory-verify` 冷读完整需求。
实现者不得自我认证。验证拒绝时在同一分支修复并重新验证；连续两次拒绝时停止并留下可复现证据。

验证接受后，实现上下文只更新最终交付证据；再由原独立验证上下文确认该提交只有证据变化，并发布
绑定最终头 SHA 的 `factory-verification`。确保 `factory:verified` 存在、`factory:rejected` 不存在、
Factory Gates 绿色后，把 Issue 设为 `factory:awaiting-review`。

最终合并就是产品验收。Agent 不替人批准需要人工方案决定的 PR，也不合并或发布；trusted 模式的 PR
应由方案阶段直接创建为非 Draft，而不是额外请求一次人工 Ready。
