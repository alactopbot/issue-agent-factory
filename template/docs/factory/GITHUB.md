# GitHub 控制面

GitHub 承载实时状态、Draft/Ready 方案决定、并发对象、PR Gate 和最终证据。

一个完整需求只有一个 Issue、分支和 PR。bootstrap/supervised 使用 Draft：方案有问题就保持 Draft 并
留普通评论，方案通过就点击 Ready for review，反悔就 Convert to draft 并留评论。trusted/autonomous
直接创建非 Draft PR，不需要额外人工方案操作。最终产品满意时由人类合并。

`validate-pr-gates.mjs` 会校验 PR 开放且唯一、机读 Spec、完整 diff、Ready 操作者写权限、批准提交绑定、
Spec 漂移、独立验证的当前 SHA 和标签一致性。等待方案或候选验证时 Check 为红是预期的失败关闭。

运行以下命令创建标签：

```bash
./.factory/scripts/bootstrap-github.sh
./.factory/scripts/bootstrap-github.sh --apply
```

默认分支必须要求 PR、禁止强推和 Agent 绕过，并要求 `Factory Gates / factory-gates` 检查。Hooks 只是
纵深防御，不能代替 GitHub ruleset。首次安装或 hook 变化后，在 Codex 中运行 `/hooks` 审阅并信任
项目 hook。实现分支使用确定性名称并禁止强推；已有 PR 时必须恢复而非新建。
