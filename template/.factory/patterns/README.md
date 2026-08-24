# 可复用需求 Pattern

Pattern 是用户预先建设并通过 PR 批准的一类固定产品需求授权。

Pattern 只有在 `enabled: true` 且 Issue 带有配置的唯一 `factory:pattern:<id>` 标签时才生效。命中后
省略逐 Issue 的 Draft/Ready 方案确认，Agent 仍必须遵守允许路径、不变量、确定性 Gate、独立验证和
最终人工合并。Pattern 配置的任何变化都通过独立 PR 评审。

新建 `<pattern-id>.json`，并按 `../pattern.schema.json` 填写激活标签、允许路径、必须保持的不变量和
执行 Gate。Pattern ID 必须与文件内容以及 `factory:pattern:<id>` 标签一致。关闭固定模式时把
`enabled` 改为 `false` 并走普通 PR；运行中的需求不能修改授权自己的 Pattern。
