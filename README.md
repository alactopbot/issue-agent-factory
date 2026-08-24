# Issue Agent Factory

面向 Codex 的通用 Issue 驱动研发框架。一个用户可独立验收的需求只使用一个 GitHub Issue、一个分支和
一个 PR；方案、实现、反馈、验证与最终验收都围绕这个 PR 演进。

它解决的不是“让 Agent 多写代码”，而是让新的 Codex 会话或定时任务只凭 GitHub 实时状态就能安全地
接续工作，同时尽量减少成熟需求模式中的人工介入。

## 核心体验

1. 用户创建一个描述完整产品结果的 Issue。
2. Codex 分诊 Pattern，并在唯一 PR 提交统一 Spec；新模式使用 Draft，trusted Pattern 使用非 Draft。
3. 方案有问题时，人类保持 Draft 并留普通评论；方案通过时点击 **Ready for review**。
4. Codex 在同一 PR 完成实现、确定性 Gate 和独立验证。
5. 人类合并 PR，合并本身就是产品验收。

Pattern 从 `bootstrap`、`supervised` 演进到 `trusted` 后，可以省略方案确认，但不会自动合并。没有
Git 内队列、运行流水账、结构化人工评论或代码行数上限。

## 安装

```bash
git clone <本仓库地址> issue-agent-factory
cd issue-agent-factory
./install.sh /path/to/your-project
```

安装器不会覆盖已有文件。然后按 [GETTING_STARTED.md](GETTING_STARTED.md) 配置项目策略、Gate、GitHub
标签和分支保护。

## 目录

- `template/.agents/skills/`：Codex 直接执行的完整 Factory skills。
- `template/.factory/`：项目策略、Pattern schema、确定性 Gate、协议验证和辅助脚本。
- `template/.github/workflows/factory-gates.yml`：GitHub 必需检查。
- `template/docs/factory/`：安装到项目内的人类契约与使用说明。
- `tests/`：安装、协议、Gate、钩子和文档回归测试。

Codex 的 AGENTS.md、skills 与 scheduled tasks 能力可参考官方文档：
[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、
[Build skills](https://learn.chatgpt.com/docs/build-skills)、
[Scheduled tasks](https://learn.chatgpt.com/docs/automations)。

本项目参考 Addy Osmani 的 Factory 思路，保留原项目 MIT 许可，并提供一套 Codex-only 的 Issue/PR
研发协议。
