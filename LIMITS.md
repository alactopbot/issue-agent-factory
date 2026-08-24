# 边界与限制

- Factory 不托管 Agent 运行器；scheduled task 需要用户在所选运行环境中创建。
- GitHub ruleset/branch protection 才是合并边界；本地 hook 只是纵深防御。
- stock Gate 支持常见 Node、Python、Rust、Go 项目，特殊构建链必须按项目配置。
- Factory 不安装或依赖 GitHub Actions；项目已有 CI 的权限、环境和必需检查由项目自行维护。
- 独立验证需要隔离的新 Agent 上下文或等价执行环境；无法做到时不能宣称完成。
- 自动化不能自行扩展章程、Pattern 权限、依赖或允许路径。

Factory 不设置文件数或代码行数上限。范围失控应通过更清楚的产品结果、允许路径、Pattern 不变量和
确定性验证解决，而不是用数量阈值替代判断。
