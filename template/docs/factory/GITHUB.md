# GitHub 控制面

GitHub 承载实时状态、Draft/Ready 方案决定、并发对象和最终证据。Factory Agent 在外部运行，不安装或
依赖 GitHub Actions。

一个完整需求只有一个 Issue、确定性分支和 PR。普通需求使用 Draft：方案有问题就保持 Draft 并留普通
评论，通过就点击 Ready for review，反悔就 Convert to draft 并留评论。只有用户已启用并由 Issue 的
唯一 `factory:pattern:<id>` 标签显式选择的 Pattern 才直接进入实现，不需要逐 Issue Ready。最终产品
满意时由人类合并。

外部 Agent 运行 `node .factory/scripts/validate-pr-state.mjs --pr <编号>`，校验 PR 开放且唯一、可信
handoff、Ready 操作者写权限、批准提交绑定、Spec 漂移、显式 Pattern 配置与路径、独立验证的当前 SHA、
实际 Gate 结果和标签一致性。校验器复用已认证的 `gh`，也接受 `--repo owner/name` 和 `GH_TOKEN`。

可信 Ready 后，Agent 把 Issue 转入实现状态；PR 的 Draft/Ready 直接表示方案审核状态。验证者发布的新
verdict 必须先移除旧 `factory:verified`，在包含当前 SHA、`gate_level` 和 `gate_status: GREEN` 的接受评论
存在后再添加该标签并运行状态校验。普通需求至少运行 CHARTER 默认等级，纯文档可运行 fast，Factory 治理改动强制
deep；Pattern 必须运行其配置的精确等级。项目已有 CI 可以继续作为项目自己的合并要求。

标签不是并发锁。首次仓库写操作运行 `claim.sh`，用 Issue 编号无强推地创建
`issue/<issue-number>`；两个运行
竞争时只有第一个 push 成功。已有远端分支或 PR 必须恢复，不能换名重试。陈旧认领由 monitor 报告，
不自动删除或偷取。

运行以下命令创建标签：

```bash
./.factory/scripts/bootstrap-github.sh
./.factory/scripts/bootstrap-github.sh --apply
```

默认分支必须要求 PR、禁止强推和 Agent 绕过。Hooks 只是纵深防御，不能代替 GitHub ruleset。使用附带
的 Codex hook 适配时，首次安装或 hook 变化后运行
`/hooks` 审阅并信任
项目 hook。实现分支使用确定性名称并禁止强推；已有 PR 时必须恢复而非新建。为每个启用的 Pattern
另建与 `activation.issueLabel` 完全相同的标签；Pattern 配置通过普通人工 PR 进入默认分支后，后续
Issue 才能使用该授权。
