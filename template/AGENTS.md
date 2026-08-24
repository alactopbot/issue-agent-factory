# <PROJECT_NAME> 的 Codex 协作说明

## 项目上下文

<用一段话说明产品、用户和最重要的不变量。>

## 项目命令

```bash
# 安装依赖
<INSTALL_COMMAND>

# 本地测试
<TEST_COMMAND>

# 构建
<BUILD_COMMAND>

# 本地运行
<RUN_COMMAND>
```

## Issue Agent Factory

开始需求工作前读取：

1. `docs/factory/CONTRACT.md`
2. `docs/factory/CHARTER.md`
3. `.factory/project.json`
4. 适用的 `.factory/patterns/*.json`

GitHub Issue、唯一 PR、Draft/Ready 时间线、评论、标签和 Checks 是实时状态与人工决定来源。Agent 聊天
不是授权。一个用户可独立验收的完整需求只使用一个 Issue、一个分支和一个 PR；内部 work units 不创建
额外流程对象。

按任务使用 `.agents/skills/` 中的 `factory-triage`、`factory-spec`、`factory-implement`、
`factory-verify`、`factory-monitor`、`factory-status` 或 `factory-tune`。人工方案决定只通过 Draft PR 的
Ready for review；trusted Pattern 直接使用非 Draft PR。最终合并就是产品验收。Codex 不替人批准需要
人工方案决定的 PR，也不合并或发布。

运行 `./.factory/scripts/gates.sh <fast|full|deep>` 获取确定性结论。必需 Gate 跳过或误配置不算绿色。
