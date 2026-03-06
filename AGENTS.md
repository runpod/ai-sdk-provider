<!-- Do not edit or remove this section -->
This document exists for non-obvious, error-prone shortcomings in the codebase, the model, or the tooling that an agent cannot figure out by reading the code alone. No architecture overviews, file trees, build commands, or standard behavior. When you encounter something that belongs here, first consider whether a code change could eliminate it and suggest that to the user. Only document it here if it can't be reasonably fixed.

---

## Branding

Always "Runpod" (capital R, lowercase unpod). Never "RunPod", "RUNPOD", or "run-pod".

## Documentation sync

**README.md** and the AI SDK community docs (`ai/content/providers/03-community-providers/22-runpod.mdx`) must stay in sync. Any change to examples, features, or capabilities must be updated in both files.

## Versioning

Never manually edit version numbers or CHANGELOG.md. Always create a changeset (`pnpm changeset`) before opening a pull request — this is mandatory for every PR with user-facing changes.

## Model ID validation

Never validate model IDs at provider creation time. Any string is accepted. Unknown models derive their endpoint by replacing `/` with `-`. Invalid models only fail when the API call is made.
