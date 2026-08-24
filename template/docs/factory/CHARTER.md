# 项目 Factory 章程

本文件承载人类确认的项目边界。只有 GitHub PR 的可信人工决定能批准规则变化，聊天不构成授权。

```text
CHARTER_STATUS: incomplete
TIER: <revival | greenfield | oss | client-production>
```

## 承重路径

进入这些路径需要 Deep Gate，并且本次 Spec 必须明确包含。按项目替换示例：

```text
LOAD_BEARING:
  - "package.json"
  - "lockfiles"
  - "database/**"
  - "auth/**"
  - ".github/workflows/**"
  - ".factory/**"
  - ".agents/**"
  - ".codex/**"
  - "AGENTS.md"

TESTS_ARE_LOAD_BEARING: true
```

既有测试语义变化必须写入统一 Spec 并通过 Draft/Ready 决定；成熟 Pattern 明确允许的机械迁移除外。

## 自动化边界

用具体的项目规则替换占位内容：

```text
AUTOMATABLE:
  - <不改变产品行为的低风险维护>
  - <成熟 Pattern 明确允许的完整需求>

NEEDS_SPEC:
  - <新的用户可见能力>
  - <新依赖、公共 API、数据或基础设施变化>
  - <超出 Pattern 的变化>

NEVER_AUTOMATE:
  - 合并与发布决定
  - 未经批准的架构方向或权限扩大
  - <项目绝不允许 Agent 自主执行的工作>
```

## 完成定义与 Gate

```text
DONE:
  - 规定等级 gates.sh 报告 GREEN
  - 行为变化有旧实现失败、新实现通过的证据
  - 完整需求成立且未越出批准范围
  - Pattern 全部不变量得到验证
  - 全新 Codex 上下文独立验证接受
  - PR 清楚说明结果、风险和证据

GATES:
  default: full
  load_bearing: deep
  docs_only: fast
```

## 停止与背压

```text
STOP_IF:
  - 同一需求 Gate 连续两次失败
  - 独立验证连续两次拒绝
  - 一次澄清后仍有改变结果的歧义
  - 需要未批准的承重路径、既有测试变化、依赖或范围
  - 超过 <NUMBER> 个开放需求正在等待人工决定
```

范围依据产品结果、允许路径、Pattern 不变量和证据，不依据文件数或代码行数。

```text
LAST_REVIEWED: <YYYY-MM-DD>
NEXT_REVIEW: <YYYY-MM-DD>
```
