# Issue Agent Factory

Before requirement work, read `docs/factory/CONTRACT.md` and use `factory-run`. GitHub is the live state. One requirement
uses one Issue, the deterministic `issue/<number>` branch, one Spec, and one pull request.

Do not implement while the pull request is Draft. A trusted human Ready transition authorizes implementation. Verify the
current PR head before handing it to a human for merge. Agents do not merge.
