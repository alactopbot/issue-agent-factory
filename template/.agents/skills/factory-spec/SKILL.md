---
name: factory-spec
description: 把一个完整 GitHub Issue 的产品、技术、数据或素材、风险、测试和验收上下文合成统一 Spec，并通过同一 Draft PR 的 Draft/Ready 状态迭代。用于新模式、监督模式、方案反馈和范围变化。
---

# Factory Spec

Spec 阶段交付一份可直接执行的完整方案，不拆出更多流程对象，也不让人填写机器协议。

读取契约、章程、项目配置、Issue、最新可信交接和适用 Pattern。在确定性的需求分支中创建：

- `docs/requirements/REQ-<编号>-<slug>/design.md`：目标与非目标、用户体验、技术方案、数据或素材、
  影响范围、不变量、内部 work units、测试、验收和风险。
- 同目录 `factory.json`：`schemaVersion`、`requirement`、`issue`、`mode`、`pattern`、`reviewPr`、
  `humanGates`、`allowedPaths` 和 `gateLevel`。

推送分支并创建该 Issue 的唯一 PR，正文必须包含 `Closes #<issue>`。`bootstrap`/`supervised` 创建
Draft PR，添加 `factory:plan-review`，Issue 改为 `factory:wait-to-implement` 后结束运行；
`trusted`/已启用的 `autonomous` 由已获批 Pattern 自动通过方案，因此直接创建普通非 Draft PR，并把
Issue 设为 `factory:ready-to-implement`。自动通过不冒充一次人工 Ready 事件。

## 人工方案决定

- 有问题：人类保持 Draft 并留下普通 PR 评论；后续运行在同一 PR 修改 Spec。
- 没问题：人类点击 **Ready for review**，表示批准当前 Spec 并允许实现。
- Ready 后反悔：人类点击 **Convert to draft** 并留下评论。

人类不填写关键词、SHA、摘要或结构化字段。需要人工方案决定时，Agent 不得替人点击 Ready。GitHub 时间线与对应的
Factory Gates Actions 运行保存批准时 PR 头；交接中的 `approved_plan_sha` 只是只读镜像。

恢复时读取最新可信 Ready/Convert 事件和 Draft 期间的新评论。Draft 时修订同一份 Spec；Ready 时
确认操作者具有仓库写权限、批准提交属于 PR 历史、其后没有修改 design、factory.json、Pattern、
项目策略或章程，然后移除 `factory:plan-review` 并把 Issue 设为 `factory:ready-to-implement`。

产品、技术、依赖、既有测试语义或允许范围在 Ready 后改变时，必须将同一 PR 转回 Draft、更新 Spec
并重新等待。`trusted` Pattern 可自动通过 Spec 并使用非 Draft PR，但仍生成 design/factory.json、
执行独立验证并等待人工合并。

内部 work units 只描述行为结果、路径、失败证据和完成证据；不产生额外 Issue、PR 或确认。GitHub
文本使用项目配置的工作语言。
