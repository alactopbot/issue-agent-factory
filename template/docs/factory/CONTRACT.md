# Factory 执行契约

执行前读取 `.factory/project.json`、`docs/factory/CHARTER.md` 和适用 Pattern。

## 核心单位与权威信息

一个完整需求对应一个 Issue、一个分支和一个 PR。内部 work units 只用于实现顺序、测试、语义提交和
恢复，不创建额外 Issue、分支、PR 或人工确认。需求边界由用户可独立验收的产品结果决定，不由文件、
提交或代码行数量决定。

- Issue：用户需求、讨论和实时状态。
- `docs/requirements/REQ-*/design.md`：产品、技术、数据或素材、风险、测试与验收的统一 Spec。
- `docs/requirements/REQ-*/factory.json`：与 Spec 一起确认的机读范围和流程配置。
- 同一个 PR：Draft 方案、实现、反馈、独立验证和最终合并。
- GitHub Checks 与结构化 Agent 证据：机器证据。

Issue 交接只用于发现与恢复，不能扩大 `factory.json` 权限。聊天记录和 Agent 会话不是批准来源。

## 渐进自治

- `bootstrap`：新 Pattern，人工审阅完整 Spec。
- `supervised`：校准中的 Pattern，人工审阅差异化 Spec。
- `trusted`：完整落在成熟 Pattern 内，Spec 自动通过。
- `autonomous`：只有项目策略显式开启才可用。

所有模式最终都由人类合并。合并同时代表产品验收，不再增加单独的验收评论。拒绝、人工修改、逃逸
缺陷、越界或 Pattern 升版触发降级评估。

## 单一 PR 的方案流程

1. Codex 从 Issue 创建统一 `design.md` 和 `factory.json`，推送需求分支并创建唯一 PR。
2. `bootstrap`/`supervised` 创建 Draft PR，加 `factory:plan-review`，Issue 设为
   `factory:wait-to-implement` 后结束运行；`trusted`/已启用的 `autonomous` 直接创建非 Draft PR 并进入实现。
3. 人类有问题时保持 Draft 并留普通评论；没问题时点击 **Ready for review**；反悔时点击
   **Convert to draft** 并留评论。
4. 后续 Codex 在 Draft 时处理反馈，在 Ready 时验证可信时间线、批准头和 Spec 漂移后进入实现。
5. Ready 时间线与紧随其后的 Factory Gates Actions 运行共同固定批准头；handoff 只镜像该 SHA。

人类不填写关键词、SHA、摘要或结构化协议。Codex 可以因 Spec 漂移转回 Draft，但不能替人批准需要
人工方案决定的 PR。trusted 的非 Draft 状态来自已获批 Pattern，不伪造人工 Ready。

## 机读 Spec

```json
{
  "schemaVersion": 1,
  "requirement": "REQ-017",
  "issue": 17,
  "mode": "supervised",
  "pattern": "feature-family",
  "reviewPr": 18,
  "humanGates": ["spec-ready", "merge"],
  "allowedPaths": ["src/**", "tests/**", "docs/requirements/REQ-017-example/**"],
  "gateLevel": "deep"
}
```

协议验证拒绝范围外路径、第二个开放 PR、非可信 Ready、批准 SHA 不在历史、Ready 后 Spec 漂移、
陈旧验证和冲突标签。

## Issue 状态与交接

状态标签为 `factory:ready-to-spec`、`factory:wait-to-implement`、`factory:ready-to-implement`、
`factory:needs-info`、`factory:in-progress` 和 `factory:awaiting-review`。PR 标签为
`factory:plan-review`、`factory:verified`、`factory:rejected`。

最新可信 Issue 评论保存恢复信息：

```text
<!-- factory-handoff -->
requirement: REQ-<三位 Issue 编号>
disposition: ready-to-spec | wait-to-implement | ready-to-implement | needs-info
mode: bootstrap | supervised | trusted | autonomous
pattern: <pattern-id | new>
pattern_version: <number | pending>
done_when: <完整且可验证的产品结果>
allowed_paths: <factory.json 的只读摘要或 pending>
load_bearing: true | false
gate_level: fast | full | deep
human_gates: spec-ready=required | automatic, merge=required
review_pr: <唯一 PR 编号或 pending>
approved_plan_sha: <Actions Ready 运行头的只读镜像 | automatic | pending>
created_at: <UTC timestamp>
```

## 实现、验证与交付

实现复用同一分支和 PR，按 work units 建立失败证据并完成整体结果。依赖、既有测试语义、承重路径、
产品设计或范围变化先回到 Draft Spec。规定等级 Gate 必须真正执行并绿色。

实现者写 `verifier: pending` 的候选 `delivery.md` 后，交给全新 Codex 上下文冷读验证。接受证据为：

```text
<!-- factory-verification -->
requirement: REQ-<三位 Issue 编号>
decision: accepted
verified_sha: <当前完整提交 SHA>
```

最终交付证据为：

```text
<!-- factory-delivery -->
requirement: REQ-<三位 Issue 编号>
outcome: pending | clean | corrected | rejected
pattern: <pattern-id | new>
pattern_version: <number | pending>
gates: <等级与状态>
verifier: pending | accepted | rejected
human_plan_change: true | false
human_product_change: true | false
eligible_clean_run: pending | true | false
completed_at: <UTC timestamp>
```

候选证据提交后验证必须重新绑定最终头。Checks 绿色后 Issue 进入 `awaiting-review`，由人类合并。

## 停止条件

一次澄清后仍有关键歧义；PR 仍是 Draft；Spec/范围漂移；需要未批准依赖、既有测试语义或承重路径；
同一需求连续两次 Gate 失败或验证拒绝；等待人工决定超过章程阈值。所有判断依据语义风险和证据，
不使用规模数字替代。
