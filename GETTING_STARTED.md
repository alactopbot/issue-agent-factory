# 初始化一个项目

## 1. 安装模板

目标目录应当是已经能本地构建和测试、并已关联 GitHub remote 的 Git 仓库。

```bash
./install.sh /path/to/project
```

## 2. 完成项目配置

必须先修改以下文件，Factory 才会工作：

- `.factory/project.json`：项目名、项目类型、工作语言和产品语言。
- `docs/factory/CHARTER.md`：承重路径、允许自动处理的工作、需要方案的工作和停止条件。
- `.factory/gates.conf`：fast/full/deep 三档必需检查。
- `.factory/scripts/ci-setup.sh`：如果默认依赖安装不适合项目，在这里替换。
- `AGENTS.md`：在“项目命令”中写入安装、测试、构建和本地运行命令。

配置完成后把 `CHARTER_STATUS` 改为 `ready`。

## 3. 验证本地配置

```bash
./.factory/scripts/doctor.sh
./.factory/scripts/gates.sh full
```

Gate 必须真正执行；必需项被跳过会返回 `MISCONFIGURED`，而不是绿色。

## 4. 配置 GitHub

```bash
./.factory/scripts/bootstrap-github.sh
./.factory/scripts/bootstrap-github.sh --apply
```

将安装内容提交并推送。为默认分支启用 ruleset 或 branch protection：要求 PR、禁止强推、禁止 Agent
绕过，并将 `Factory Gates / factory-gates` 设为必需检查。

## 5. 首次校准

用一个真实、完整但风险可控的需求建立第一个 Pattern：

1. 创建 GitHub Issue。
2. 让 Codex 使用 `factory-triage`，随后使用 `factory-spec`。
3. 在 Draft PR 审阅统一 Spec；有问题就留评论，没有问题就点 Ready for review。
4. 让后续 Codex 使用 `factory-implement`；它会请求独立 Codex 验证。
5. 检查产品并合并。

前几次同类迭代保留方案确认。证据足够后，通过独立 PR 把 Pattern 晋级为 `trusted`。

## 6. 自动化

在 Codex 中为项目建立一个 scheduled task，提示词使用 [AUTOMATIONS.md](AUTOMATIONS.md) 的模板。
定时任务只负责轮询和推进；GitHub Issue/PR/Checks 始终是可恢复状态，聊天不是批准来源。
