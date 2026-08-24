# 需求决策记录

每个完整 GitHub Issue 对应一个 `REQ-<三位 Issue 编号>-<slug>/` 目录：

- `design.md`：统一的产品、技术、数据或素材、风险、测试和验收方案。
- `factory.json`：机读范围、模式、Pattern、PR 与 Gate。
- `delivery.md`：候选交付与最终证据；实现完成前不存在或保持 `pending`。

这些文件记录稳定决策，不充当实时队列。实时状态只从 GitHub Issue、PR、评论、时间线与 Checks 读取。
