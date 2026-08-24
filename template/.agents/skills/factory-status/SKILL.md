---
name: factory-status
description: 从 GitHub Issue、PR、时间线、Checks 和 Factory 证据生成只读状态报告，突出当前需要人的方案或合并决定。用于 status、next、queue、stuck 或指定 Issue 查询。
---

# Factory 状态

读取契约、章程、项目配置、Pattern，并查询开放 Issue、唯一 PR、Draft/Ready 时间线、评论、Checks、
`factory-verification` 与 `factory-delivery`。只报告，不修改标签、不批准、不关闭、不合并。

按项目配置的工作语言依次报告：当前需要人在 GitHub 做的 Spec 反馈、Ready 或最终合并；等待人工决定
数量与背压；各状态需求数量和链接；默认分支与 PR Gate 健康；Pattern 成熟度与降级信号；最有价值的
下一步。数据不足时明确写“不足以判断”，不得从缺少评论或 Check 推断成功。
