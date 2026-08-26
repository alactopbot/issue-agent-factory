# Issue Agent Factory

一个面向编码 Agent 的最小 GitHub Spec 研发流程：

```text
Issue -> Scheduler -> atomic branch -> Spec -> Draft review -> Ready -> Implement -> Verify -> Human merge
```

一个完整需求只使用一个 Issue、确定性分支 `issue/<number>`、一个 Spec 和一个 PR。Spec 与实现使用同一个
PR：Draft 表示等待方案审核，可信用户点击 Ready 表示允许实现，当前 SHA 验证通过后由人类合并。

## 安装

```bash
git clone <本仓库地址> issue-agent-factory
cd issue-agent-factory
./install.sh /path/to/your-project
```

在目标项目配置一个现有验证命令：

```bash
# .factory/gates.conf
VERIFY_COMMAND="npm test && npm run build"

./.factory/scripts/doctor.sh
./.factory/scripts/gates.sh
./.factory/scripts/bootstrap-github.sh --apply
```

保护 GitHub 默认分支并要求人工合并 PR。

## Scheduler

定时任务使用 `factory-run` 扫描 open Issues，持续推进到人工审核、缺少决定或等待合并。任务需要独立
checkout、工作区写权限、GitHub 网络访问和已认证的 `gh` 身份。并发任务由 `claim.sh` 的首次非强推成功
决定胜者。

可以直接使用下面的任务提示词：

```text
读取 AGENTS.md 和 docs/factory/CONTRACT.md，然后使用 factory-run 扫描 GitHub open Issues。
推进可执行 Issue，直到遇到人工审核、缺少决定或等待合并。复用 issue/<number> 和唯一 PR。
Draft PR 只修改 Spec；只有可信用户点击 Ready for review 后才能实现。
实现完成后运行 factory-verify。不要替人 Ready，不要合并 PR。
没有可执行工作时只报告简短状态。
```

## 目录

- `template/.agents/skills/factory-run/`：Scheduler 和主流程执行入口。
- `template/.agents/skills/factory-verify/`：验证阶段入口。
- `template/.factory/scripts/`：原子认领、状态变更、项目 Gate 和最终 PR 状态校验。
- `template/docs/factory/CONTRACT.md`：安装到目标项目的执行契约。
- `tests/`：安装、状态、认领和验证测试。

Factory 不合并 PR。
