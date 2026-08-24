# GitHub 控制面

GitHub 承载实时状态、Draft/Ready 方案决定、并发对象、PR Gate 和最终证据。

一个完整需求只有一个 Issue、确定性分支和 PR。普通需求使用 Draft：方案有问题就保持 Draft 并留普通
评论，通过就点击 Ready for review，反悔就 Convert to draft 并留评论。只有用户已启用并由 Issue 的
唯一 `factory:pattern:<id>` 标签显式选择的 Pattern 才直接进入实现，不需要逐 Issue Ready。最终产品
满意时由人类合并。

`validate-pr-gates.mjs` 会校验 PR 开放且唯一、可信 handoff、Ready 操作者写权限、批准提交绑定、Spec
漂移、显式 Pattern 配置与路径、独立验证的当前 SHA 和标签一致性。等待方案或候选验证时 Check 为红是
预期的失败关闭。

标签不是并发锁。首次仓库写操作运行 `claim.sh`，用 Issue 编号和规范化标题无强推地创建
`issue/<issue-number>-<normalized-title>`；两个运行
竞争时只有第一个 push 成功。已有远端分支或 PR 必须恢复，不能换名重试。陈旧认领由 monitor 报告，
不自动删除或偷取。

运行以下命令创建标签：

```bash
./.factory/scripts/bootstrap-github.sh
./.factory/scripts/bootstrap-github.sh --apply
```

默认分支必须要求 PR、禁止强推和 Agent 绕过，并要求 `Factory Gates / factory-gates` 检查。Hooks 只是
纵深防御，不能代替 GitHub ruleset。使用附带的 Codex hook 适配时，首次安装或 hook 变化后运行
`/hooks` 审阅并信任
项目 hook。实现分支使用确定性名称并禁止强推；已有 PR 时必须恢复而非新建。为每个启用的 Pattern
另建与 `activation.issueLabel` 完全相同的标签；Pattern 配置通过普通人工 PR 进入默认分支后，后续
Issue 才能使用该授权。
