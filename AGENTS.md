# Issue Agent Factory 仓库协作说明

这是用于安装到其他项目的 Codex-only 通用框架，不是某个产品仓库。

- 所有可安装内容位于 `template/`；根目录是本框架自己的说明、安装器和测试。
- 不得加入具体业务实体、产品语言规则、项目路径或某个仓库账号。
- `.agents/skills/` 必须是完整实现，不能依赖 `.claude` 或机器外的私有提示词。
- GitHub 是实时流程状态；不要恢复 QUEUE、STATE 或 runs 流水账。
- 一个完整需求一个 Issue、一个分支、一个 PR；内部 work units 不产生人工 Gate。
- 不用代码行数、文件数或提交数定义范围。
- 修改文件使用补丁，保留用户已有改动；不执行自动合并或发布。
- 运行 `bash tests/run.sh` 验证。skill 变化还要维护并执行 `evals/evals.json`。
