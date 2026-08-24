---
name: factory-tune
description: 基于近期合并 PR、Factory 验证与交付证据评估 Pattern 和流程约束，提出晋级、降级、收紧或放宽建议。用于周期复盘；未经人工批准不修改规则。
---

# Factory 调优

读取最近 30 天或章程上次复核以来的合并 PR、Checks、验证评论、Issue 时间线、逃逸缺陷和
`factory-delivery`。分析 Pattern 连续干净执行、人工反复修改、验证常见问题、逃逸缺陷、人工等待
瓶颈和 Gate 误配置。

每项建议必须链接真实 Issue、PR、Check 或评论，并说明变化、收益、风险和撤销条件。只提出建议；
不得自行修改章程、项目配置、Pattern 或 Gate。获批决定记录到 `docs/factory/DECISIONS.md`，机读规则
变化仍通过一个独立需求 PR。最后回答：Factory 产生的产品价值是否值得它占用的人工注意力。
