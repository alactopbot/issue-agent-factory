# 架构

```text
GitHub Issue
    │ triage
    ▼
统一 Spec + factory.json ──► 唯一 PR（新模式 Draft / trusted 非 Draft）
    │                           │
    │ 人工评论 / Ready          │ GitHub 时间线 + Actions 绑定批准头
    ▼                           ▼
同一 PR 实现 ──► 确定性 Gate ──► 独立 Codex 验证 ──► 人工合并
                         │
                         └── Pattern 干净交付 / 降级证据
```

三层职责互不替代：

- GitHub 控制面保存实时状态、人工决定、并发对象与不可变检查证据。
- 仓库契约保存项目边界、Pattern、需求决策和确定性脚本。
- Codex skills 解释状态并执行流程，但 Agent 会话本身不保存授权。

实现步骤不是流程对象。只有用户可独立验收的产品结果才拥有 Issue/分支/PR。Pattern 成熟度决定是否
需要人工方案确认；独立验证和人工合并始终保留。
