# Scheduled Task 执行内容

为目标仓库创建 Scheduled Task，并把下面的内容作为每次触发时的任务提示词。调度频率由用户在运行器
中按项目需要配置，不属于 Factory 仓库契约。

```text
在当前仓库执行 Issue Agent Factory 巡检。先读取 AGENTS.md、docs/factory/CONTRACT.md 和
docs/factory/CHARTER.md，再使用 factory-monitor 检查 GitHub 实时状态。
每次最多推进一个完整需求：新 Issue 用 factory-triage；ready-to-spec 或 Draft 有新反馈时用
factory-spec；ready-to-implement 时用 factory-implement。严格复用同一 Issue、分支和 PR。
不要替人点击 Ready for review，不要合并或发布；遇到停止条件时在 GitHub 留下证据并结束。
如果没有可执行工作，只输出简短状态，不制造文档或提交。
```

任务必须使用独立 worktree、工作区写权限、GitHub 网络访问和已认证的 `gh` 身份。该身份需要读取仓库、
管理 Issue/PR 标签、评论、普通分支和 PR，但不能绕过默认分支保护。

建议先人工运行 3–5 次，确认 GitHub 权限、Gate、恢复逻辑和项目 Pattern 都稳定，再启用 scheduled task。
手工会话和定时任务可以同时发现同一 Issue，但每个运行应使用独立 checkout/worktree，并在首次写仓库前
执行 `claim.sh`。确定性远端分支的首次非强推成功者继续，其他运行恢复胜出分支/PR 或结束；标签不承担锁。

当前附带的 Codex 适配可参考 scheduled tasks 说明：<https://learn.chatgpt.com/docs/automations>。
