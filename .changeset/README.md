# Changesets

Use `pnpm changeset` to record a version bump for an upcoming release. `@belle.develop/space-api` and `@belle.develop/space-ui` are pinned to the same version ("fixed" group) — a bump on one bumps the other automatically.

Release flow:

```bash
pnpm changeset         # create a changeset
pnpm -w changeset version   # apply version bumps
pnpm -r build
pnpm -w changeset publish
```
