---
name: factory-monitor
description: 定时检查并恢复 Factory 的 GitHub 实时状态，包括 Draft/Ready Spec、唯一 PR、验证证据、停滞流程和 Pattern 降级信号。用于跨 Codex 会话继续流程；不实现产品需求。
---

# Factory 巡检与恢复

GitHub 是实时状态来源。读取 Issue、标签、分支、唯一 PR、Draft/Ready 时间线、普通评论、Checks、
`factory.json`、Pattern 和交付证据，不依赖 Agent 会话。

检查：等待方案的 PR 是 Draft、Ready 还是后来 Convert；Draft 是否有新反馈；Ready 后是否发生 Spec
漂移；机读范围与完整 diff 是否一致；in-progress 是否有有效分支和 PR；awaiting-review 是否具有绑定
当前 SHA 的验证和绿色 Check；合并或关闭后状态是否收敛；Pattern 是否满足晋级或触发降级；等待人工
决定的开放需求是否超过章程背压阈值。

Draft 有新评论时触发同一 PR 的 Spec 修订。最新可信 Ready 通过协议校验时移除 `factory:plan-review`
并把 Issue 转为 `factory:ready-to-implement`。Agent 不替人批准需要人工方案决定的 PR；trusted 模式应
直接使用非 Draft PR。候选验证后只等待最终合并。

可以修复不改变产品结论的纯状态漂移。涉及产品结论、权限扩大、Pattern 晋级或规则变更时，只创建或
更新明确的 GitHub Issue/PR 供人决定。输出使用项目配置的工作语言并链接证据。
