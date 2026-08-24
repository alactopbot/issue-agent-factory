# Issue Agent Factory contributor guide

This repository builds a portable, GitHub-based workflow for coding agents. It is framework infrastructure, not a
product repository.

## Repository boundaries

- Everything installed into another repository lives under `template/`; root files document, install, and test the
  framework itself.
- Keep installed guidance free of product-specific entities, language rules, repository paths, accounts, and
  agent-runtime branding.
- `.agents/skills/` is the complete, portable workflow. Runtime adapters may expose it, but must not contain a second
  canonical implementation.
- GitHub is the live workflow state.

## Workflow invariants

- One independently acceptable requirement uses one Issue, one branch, and one pull request.
- Internal work units do not create additional human gates.
- Scope follows product outcomes and explicit authorization, not line, file, or commit counts.
- Pattern authority comes from a user-reviewed configuration on the default branch and explicit Issue selection.
- Agents do not merge or publish.

## Development

Use patches for file changes and preserve unrelated user work. Run `bash tests/run.sh` before handing off changes. When a
skill changes, update and execute `evals/evals.json` as well.
