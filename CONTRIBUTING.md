# 贡献

本仓库是 Codex-only 的通用框架。变更必须保持：无业务名词和业务规则；无 Claude 目录或兼容层；无
Git 内实时队列；一个完整需求一个 Issue/分支/PR；人工合并始终保留；必需 Gate 失败关闭。

提交前运行：

```bash
bash tests/run.sh
```

修改 skill 时同时更新 `evals/evals.json`，并按 `skill-creator` 流程运行带 skill 与基线评测。修改 GitHub
协议时必须增加失败路径测试，尤其覆盖分页、可编辑评论、Spec 漂移、权限和陈旧 SHA。
