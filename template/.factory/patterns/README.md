# Pattern 构建指南

Pattern 是用户预先建设并通过独立普通 PR 批准的一类固定需求授权。它不是代码模板、Issue 模板或自动
分类器，而是允许明确选择它的后续 Issue 省略逐 Issue Draft/Ready 方案确认。

Pattern 只省略方案确认。原子认领、允许路径、项目章程、确定性 Gate、独立验证和最终人工合并始终
保留。Agent 不能自行创建、启用或扩大 Pattern；只有人类在当前会话明确要求时，Agent 才能写入 Pattern
配置或创建其治理 PR。

## 1. 何时适合提炼 Pattern

先从已经走完普通流程的真实交付收集证据。没有固定数量门槛，但通常应至少观察多个同类 Issue，并能
同时证明：

- 每次都是同一个完整产品结果，而不是仅仅修改了相似文件；
- 输入、完成条件、允许路径和必须保持的不变量可以准确复述；
- 最近的方案审阅没有反复出现新的产品、架构、依赖、数据或素材决策；
- Gate 与独立验证能稳定区分正确交付、越界和缺失证据；
- 失败、返工和 escaped defect 已经转化为确定性检查或明确停止条件；
- 省略逐 Issue 方案审核带来的收益，大于长期授权扩大后的风险。

以下情况继续走普通 Spec，不建立 Pattern：

- 每个 Issue 都需要新的产品判断、设计选择或技术方案；
- 只能用“与上次差不多”“改相关文件”等模糊语言描述范围；
- 需要 Agent 临场决定新依赖、承重路径、许可、数据迁移或外部系统；
- 允许路径必须宽到能修改不相关既有行为；
- 关键不变量还只能依赖 reviewer 记忆，无法被 Gate 或验证证据证明；
- 最近同类交付仍经常被方案审阅、独立验证或人工验收退回。

## 2. 从交付证据形成提案

先使用 `factory-tune` 只读分析候选 Issue、Spec、PR、评论、Gate、验证结论和合并后缺陷。提案至少列出：

1. 支撑模式稳定的具体 Issue/PR 证据；
2. 可复用的完整结果和明确不属于该模式的反例；
3. Issue 如何由人类显式选择该 Pattern；
4. 最小允许路径及每个路径存在的原因；
5. 必须保持的不变量和证明每项不变量的证据；
6. 需要预先建设的测试、校验器或 Gate；
7. 误用后的影响、停止条件和关闭方案。

`factory-tune` 默认只产出提案，不修改授权。若证据不足，结论应是继续积累普通交付，而不是创建一个
更宽的 Pattern。

## 3. 先建设确定性约束

Pattern 不应把新的判断工作转移给 verifier。配置前先在默认分支建立能失败关闭的检查，例如：

- 输入或 manifest schema 校验；
- 必填字段、来源、许可、归属或哈希检查；
- 目录结构、命名、唯一性和引用完整性检查；
- 禁止修改既有单元、只允许新增一个单元等 diff 检查；
- 构建、行为、无障碍、性能或安全回归测试。

这些检查必须已经由普通人工 PR 合入默认分支，并纳入 Pattern 将运行的 Gate。不要让同一个 Pattern 用
自己的首次运行来创建授权自己的检查。

## 4. 设计最小授权

在 `.factory/patterns/<pattern-id>.json` 创建配置，并遵守 `../pattern.schema.json`。

### ID 与激活标签

- 文件名、`id` 和标签后缀完全一致；
- ID 只使用小写字母、数字和连字符；
- 激活标签固定为 `factory:pattern:<id>`；
- 一个 Issue 必须恰好带有一个 Pattern 标签才可能进入 Pattern 路径；
- 标签只是显式选择，不代表自动匹配成功，triage 仍须证明整个需求属于该模式。

### allowedPaths

`allowedPaths` 是变更文件的白名单，应从最小集合开始：

- `*` 只匹配一个路径段内的字符；
- `**` 可以跨目录匹配；
- 不支持变量、捕获组、负向规则或两个路径使用同一个动态 ID；
- `content/**` 这类宽规则也允许修改该目录下的既有内容；
- `tests/**` 也允许修改既有测试，不等于“只能新增测试”；
- 即使写入 `allowedPaths`，Factory 治理文件仍不能由 Pattern 授权修改。

因此，“只新增一个目录”“目录名必须等于 Issue 字段”“不能修改既有单元”等约束不能只靠 glob，必须
由确定性 Gate 检查。无法把允许路径收窄到可接受范围时，不应启用 Pattern。

### preserved

`preserved` 描述每次运行必须证明仍成立的不变量。每项应当具体、可观察、可被 verifier 引用证据验证：

- 写结果而不是实现偏好；
- 指明禁止改变的既有行为或边界；
- 指明证据来源，例如测试、校验器输出、构建产物或人工可检查内容；
- 避免“保持质量”“遵循最佳实践”“不要破坏其他功能”等不可判定表述。

自然语言不变量不会由 schema 自动执行。对安全、许可、数据完整性或“只能新增”一类硬边界，应同时有
确定性检查；`preserved` 用来要求 verifier 解释和引用这些检查的结果。

### execution

- `planReview` 固定为 `none`；
- `independentVerification` 固定为 `required`；
- `completion` 固定为 `verified-pr`；
- `gateLevel` 必须选择已经校准为 GREEN 且足以覆盖所有风险的 `fast`、`full` 或 `deep`。

Pattern 验证要求运行配置中的精确 Gate 等级，不用更高等级临时替代。需要永久加强 Gate 时，先通过新的
Pattern 治理 PR 修改配置并递增版本。

## 5. 配置示例

下面只展示结构，路径和不变量必须替换为目标项目的真实约束。首次编写时可保持 `enabled: false`，完成
检查和人工审阅后再通过治理 PR 启用。

```json
{
  "$schema": "../pattern.schema.json",
  "id": "add-repeated-unit",
  "version": 1,
  "enabled": false,
  "activation": {
    "issueLabel": "factory:pattern:add-repeated-unit"
  },
  "scope": {
    "allowedPaths": [
      "path/to/repeated-units/**",
      "tests/repeated-units/**"
    ],
    "preserved": [
      "只新增一个符合项目 schema 的单元，确定性检查证明没有修改既有单元",
      "所有必需来源与完整性字段存在，并通过项目校验命令",
      "既有公开行为和兼容性测试保持通过"
    ]
  },
  "execution": {
    "planReview": "none",
    "gateLevel": "full",
    "independentVerification": "required",
    "completion": "verified-pr"
  }
}
```

运行 `./.factory/scripts/doctor.sh` 检查结构。Pattern 涉及 Factory 治理，创建或修改它的 PR 必须走普通
人工审阅并运行 deep Gate；该 PR 不能使用自己或其他 Pattern 绕过方案确认。

## 6. 人工审核与启用

Pattern PR 的 reviewer 至少确认：

- 引用的成功与失败证据足以支持长期授权；
- Pattern 描述的是完整结果，而不是为了提高吞吐而拆出的内部步骤；
- 激活条件和反例清楚，Issue 不会因为相似标题就自动获得授权；
- `allowedPaths` 是最小集合，宽 glob 的实际授权范围已被理解；
- 每个关键不变量都有确定性检查或明确验证证据；
- Gate 已在默认分支校准，缺失或跳过会失败关闭；
- 错误匹配会转普通 Spec，不会临场扩大 Pattern；
- 版本、关闭和回滚方案明确。

配置以 `enabled: true` 合入默认分支后，创建同名激活标签：

```bash
gh label create "factory:pattern:<id>" --description "Use enabled Pattern <id>" --color "5319E7"
```

Pattern 文件、启用状态和标签缺一不可。不要用聊天、Issue 正文或 Agent 自己添加的普通标签替代已合并的
授权配置。

## 7. 试运行与规模化

先选择少量、低风险且完整匹配的真实 Issue 试运行：

1. 人类显式添加唯一的 `factory:pattern:<id>` 标签；
2. triage 验证配置存在于默认分支、`enabled: true` 且需求完整匹配；
3. implement 只能修改允许路径并运行配置的精确 Gate；
4. 独立 verifier 逐项证明 `preserved`，并将结论绑定当前完整 SHA；
5. 人类检查最终产品结果并决定是否合并；
6. `factory-tune` 比较试运行的返工、拒绝和 escaped defect，再决定是否扩大使用量。

只要不能完整证明匹配，就移除 Pattern 标签并转普通 Draft Spec。不要为了让运行继续而修改 Issue 描述、
扩大 glob、降低 Gate 或忽略不变量。

## 8. 版本、收紧与停用

- Pattern 配置任何变化都通过新的独立普通 PR；
- 授权扩大、授权收紧、不变量或 Gate 变化都递增 `version`；
- 有 Pattern Issue 正在运行时，不修改授权它的配置；先等待结束，或将该 Issue 转普通 Spec；
- 发现误匹配、验证缺口或 escaped defect 时，先停止给新 Issue 添加标签；
- 正式关闭时把 `enabled` 改为 `false` 并合入普通 PR；标签可以删除或保留为历史，但 disabled Pattern
  永远不能授权新运行；
- 修复证据和 Gate 后，通过新版本 PR 重新启用，不直接编辑运行中的分支。

## 9. Agent 构建 Pattern 的工作方式

用户要求评估候选模式时，Agent 应先读取本指南并使用 `factory-tune`，只提交证据、边界、风险和建议。
用户明确要求创建 Pattern 后，Agent 才能：

1. 从默认分支创建普通治理分支；
2. 建设缺失的确定性检查；
3. 新建或修改一个 Pattern JSON；
4. 运行 Doctor 和 deep Gate；
5. 创建等待人工审核的普通 PR；
6. 停止，不创建激活 Issue、不点击批准、不合并或发布。

Pattern 的目标不是消灭判断，而是把已经稳定的判断一次性固化为可审阅、可验证、可关闭的长期授权。
