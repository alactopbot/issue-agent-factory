# 初始化一个项目

## 1. 安装模板

目标目录应当是已经能本地构建和测试、并已关联 GitHub remote 的 Git 仓库。

```bash
./install.sh /path/to/project
```

## 2. 完成项目配置

必须先修改以下文件，Factory 才会工作：

- `docs/factory/CHARTER.md`：承重路径、允许自动处理的工作、需要方案的工作和停止条件。
- `.factory/gates.conf`：fast/full/deep 三档必需检查。
- `AGENTS.md`：在“项目命令”中写入安装、测试、构建和本地运行命令。

配置完成后把 `CHARTER_STATUS` 改为 `ready`。

## 3. 验证本地配置

```bash
./.factory/scripts/doctor.sh
./.factory/scripts/gates.sh full
./.factory/scripts/gates.sh deep  # 项目或 Pattern 会使用 deep 时也必须校准
```

Gate 必须真正执行；必需项被跳过会返回 `MISCONFIGURED`，而不是绿色。独立验证者运行并在评论中绑定
实际等级与结果：普通需求不得低于 CHARTER 默认等级，Factory 治理改动强制 deep，Pattern 必须与其配置一致。

## 4. 配置 GitHub

```bash
./.factory/scripts/bootstrap-github.sh
./.factory/scripts/bootstrap-github.sh --apply
```

将安装内容提交并推送。为默认分支启用 ruleset 或 branch protection：要求 PR、禁止强推、禁止 Agent
绕过。Factory 本身不安装 GitHub Actions；项目已有 CI 可以继续作为项目自己的必需检查。

## 5. 首次校准

先用一个真实、完整但风险可控的普通需求校准流程：

1. 创建 GitHub Issue。
2. 让 Agent 使用 `factory-triage`，随后使用 `factory-spec`。
3. 在 Draft PR 审阅统一 Spec；有问题就留评论，没有问题就点 Ready for review。
4. 让后续执行会话使用 `factory-implement`；它会请求独立验证上下文。
5. 检查产品并合并。

当项目已经有明确、固定且需要扩规模执行的需求模式时，由用户通过独立普通 PR 新建
`.factory/patterns/<id>.json`，明确激活标签、允许路径、不变量和 Gate，并设置 `enabled: true`。后续
Issue 只有显式带该 Pattern 标签才省略方案确认。

Pattern 合并后，由用户创建配置中同名的激活标签，例如：

```bash
gh label create "factory:pattern:<id>" --description "Use enabled Pattern <id>" --color "5319E7"
```

完整的成熟度判断、证据提炼、glob 限制、确定性约束、配置示例、人工审核、试运行、版本和停用流程见
[Pattern 构建指南](template/.factory/patterns/README.md)。

## 6. 自动化

在所选 Agent 运行器中为项目建立 scheduled task，提示词使用 [AUTOMATIONS.md](AUTOMATIONS.md) 的模板。
定时任务只负责轮询和推进；GitHub Issue、PR、标签和评论始终是可恢复状态，聊天不是批准来源。

定时任务必须运行在独立 worktree，具有工作区写权限和 GitHub 网络访问，并使用一个已认证、可读取
仓库、管理 Issue/PR 标签、创建普通分支与 PR、但不能绕过默认分支保护的身份。启用定时执行前先用
同一身份手工完整跑通一个普通 Issue。
