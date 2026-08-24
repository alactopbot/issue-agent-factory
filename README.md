# Issue Agent Factory

面向编码 Agent 的通用 Issue 驱动研发框架。一个用户可独立验收的需求只使用一个 GitHub Issue、一个分支和
一个 PR；方案、实现、反馈、验证与最终验收都围绕这个 PR 演进。

它解决的不是“让 Agent 多写代码”，而是让新的执行会话或定时任务只凭 GitHub 实时状态就能安全地
接续工作，同时尽量减少成熟需求模式中的人工介入。

## 核心体验

1. 用户创建一个描述完整产品结果的 Issue。
2. 普通需求在唯一 Draft PR 提交统一 Spec；用户显式启用并由 Issue 标签选择的固定 Pattern 直接执行。
3. 普通方案有问题时保持 Draft 并留评论；通过时点击 **Ready for review**。
4. Agent 原子认领由 Issue 编号和标题生成的确定性分支，完成整个需求、确定性 Gate 和独立验证。
5. 人类合并 verified PR，合并本身就是产品验收。

Pattern 是用户通过独立 PR 建设并显式启用的长期授权。固定模式可省略逐 Issue 方案确认，但仍执行
Gate、独立验证和最终人工合并。

## 安装

```bash
git clone <本仓库地址> issue-agent-factory
cd issue-agent-factory
./install.sh /path/to/your-project
```

安装器不会覆盖已有文件。然后按 [GETTING_STARTED.md](GETTING_STARTED.md) 配置项目策略、Gate、GitHub
标签和分支保护。

## 目录

- `template/.agents/skills/`：与具体 Agent 运行器无关的完整 Factory skills。
- `template/.factory/`：项目策略、Pattern schema、确定性 Gate、协议验证和辅助脚本。
- `template/.github/workflows/factory-gates.yml`：GitHub 必需检查。
- `template/docs/factory/`：安装到项目内的人类契约与使用说明。
- `tests/`：安装、协议、Gate、钩子和文档回归测试。

核心契约和 skills 不绑定具体 Agent 产品；当前发行版提供 `.codex/hooks.json` 作为可选运行器适配。相关
能力可参考：
[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、
[Build skills](https://learn.chatgpt.com/docs/build-skills)、
[Scheduled tasks](https://learn.chatgpt.com/docs/automations)。

本项目参考 Addy Osmani 的 Factory 思路，保留原项目 MIT 许可，并提供一套可移植的 Issue/PR 研发协议。
