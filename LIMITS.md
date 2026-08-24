# 边界与限制

- Factory 不提供 Codex 托管服务；scheduled task 需要用户在 Codex 环境中创建。
- GitHub ruleset/branch protection 才是合并边界；本地 hook 只是纵深防御。
- stock Gate 支持常见 Node、Python、Rust、Go 项目，特殊构建链必须按项目配置。
- GitHub Actions 的 `GITHUB_TOKEN` 权限、组织策略或 fork PR 可能限制协作者权限查询，应先在真实仓库验证。
- 独立验证需要新的 Codex Agent/上下文；无法做到时不能宣称完成。
- 自动化不能自行扩展章程、Pattern 权限、依赖或允许路径。

Factory 不设置文件数或代码行数上限。范围失控应通过更清楚的产品结果、允许路径、Pattern 不变量和
确定性验证解决，而不是用数量阈值替代判断。
