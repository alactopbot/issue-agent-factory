# Codex 自动化建议

Codex scheduled task 运行下面的提示词即可覆盖分诊、方案反馈恢复、实现恢复和巡检。执行频率从每小时
一次开始；实际频率取决于项目活跃度和人工审阅速度。

```text
在当前仓库执行 Issue Agent Factory 巡检。先读取 AGENTS.md、docs/factory/CONTRACT.md、
docs/factory/CHARTER.md 和 .factory/project.json，再使用 factory-monitor 检查 GitHub 实时状态。
每次最多推进一个完整需求：新 Issue 用 factory-triage；ready-to-spec 或 Draft 有新反馈时用
factory-spec；ready-to-implement 时用 factory-implement。严格复用同一 Issue、分支和 PR。
不要替人点击 Ready for review，不要合并或发布；遇到停止条件时在 GitHub 留下证据并结束。
如果没有可执行工作，只输出简短状态，不制造文档或提交。
```

建议先人工运行 3–5 次，确认 GitHub 权限、Gate、恢复逻辑和项目 Pattern 都稳定，再启用 scheduled task。
不要并行运行多个会认领相同 Issue 的任务；若确需并行，按标签或项目区域划分互斥范围。

官方 Codex scheduled tasks 说明见 <https://learn.chatgpt.com/docs/automations>。
