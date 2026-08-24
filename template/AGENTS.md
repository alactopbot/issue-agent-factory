# <PROJECT_NAME> collaboration guide

## Project context

<Describe the product, its users, and the invariants that must remain true.>

## Project commands

```bash
# Install dependencies
<INSTALL_COMMAND>

# Test
<TEST_COMMAND>

# Build
<BUILD_COMMAND>

# Run locally
<RUN_COMMAND>
```

## Issue Agent Factory

Before requirement work, read `docs/factory/CONTRACT.md`, `docs/factory/CHARTER.md`, and `.factory/project.json`, then
use the applicable workflow under `.agents/skills/`.

GitHub is the live state; chat history is not authorization. One complete requirement uses one Issue, one deterministic
branch, and one pull request. Ordinary work requires a reviewed Spec. Only a Pattern that users have enabled and selected
with the Issue's unique activation label may skip per-Issue plan review.

Do not create or expand Pattern authority, split internal work into extra process objects, merge, or publish. Run
`./.factory/scripts/gates.sh <fast|full|deep>` for the deterministic verdict; a required skip or misconfiguration is not
green.
