# Publishing

Both `@puppledoc/nestjs-api-reference` and `@puppledoc/space-ui` are published together (fixed versions).
Core bundles the UI's `dist/`, so every core release implicitly ships a UI.

---

## First-time setup

### 1. Claim the npm scope

```bash
npm view @puppledoc/nestjs-api-reference      # → E404  →  name is free on the registry
npm view @puppledoc/space-ui   # → E404  →  same
```

If the `@space` organization does **not** belong to you, either:
- create it at https://www.npmjs.com/org (free plan is fine for public packages), or
- change the scope across the repo (`rg -l '@space/' | xargs sed -i '' 's/@space/@yourname/g'`) and commit.

### 2. Create the GitHub repo

```bash
cd /Users/belle/space-api
git init
git add -A
git commit -m "Initial release of @puppledoc/nestjs-api-reference"
git branch -M main
git remote add origin git@github.com:hebee935/puppledoc.git
git push -u origin main
```

Then update the three placeholders:

```bash
rg -l 'github.com/hebee935/puppledoc' | xargs sed -i '' 's|github.com/hebee935/puppledoc|github.com/YOUR_ORG/space-api|g'
```

### 3. Log in to npm

```bash
npm login                 # 2FA recommended
npm whoami                # should print your username
```

If you're using an org, make sure your user is a member and has publish rights.

---

## Release flow

Every release goes through Changesets. One changeset = one release note entry.

```bash
# 1. Work, then record the intent:
pnpm changeset             # pick @puppledoc/nestjs-api-reference + @puppledoc/space-ui, bump (patch/minor/major), write summary
# commit the generated .changeset/*.md file

# 2. Apply version bumps across both packages:
pnpm -w changeset version  # updates package.json versions + writes CHANGELOG.md

# 3. Build everything:
pnpm -w turbo run build --filter='!playground'

# 4. Publish to npm:
pnpm -w changeset publish  # runs `npm publish` per package, tags them, respects publishConfig.access
```

Post-publish:

```bash
git push --follow-tags
```

---

## Verify before publishing

Always pack first — `pnpm publish` does this too, but a manual check lets you
read the real tarball contents.

```bash
# Dry-run pack each publishable package into /tmp
pnpm -F @puppledoc/nestjs-api-reference     pack --pack-destination /tmp
pnpm -F @puppledoc/space-ui  pack --pack-destination /tmp

# Inspect what's inside the tarball (especially the resolved package.json):
tar -tzf /tmp/space-api-*.tgz
tar -xzOf /tmp/space-api-0.1.0.tgz package/package.json | jq .
```

Things to sanity-check in the extracted `package.json`:

- `dependencies["@puppledoc/space-ui"]` → an actual version like `"0.1.0"`, not `"workspace:*"`
- No stray `devDependencies` leaked in
- `files` matches what you expect (dist + README + LICENSE, nothing else)
- `types`, `main`, `module`, `exports` all resolve inside the tarball

---

## CI (optional)

A minimal GitHub Actions workflow:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    permissions: { contents: write, id-token: write }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, registry-url: 'https://registry.npmjs.org' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -w turbo run build --filter='!playground'
      - uses: changesets/action@v1
        with:
          publish: pnpm -w changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Configure `NPM_TOKEN` in repo secrets (npm → Access Tokens → **Automation**).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `402 Payment Required` on publish | Scope is private by default; ensure `publishConfig.access: "public"` is set on the package (we set it already). |
| `403 Forbidden` | You're not a member of the `@space` org on npm, or the package name is already owned by someone else. |
| `workspace:*` appears in the published `package.json` | You published with a non-pnpm tool. Always use `pnpm publish` / `pnpm -w changeset publish`. |
| UI shows an old asset hash after publish | `@puppledoc/nestjs-api-reference` caches `index.html` at boot. Nothing to do on the library side; host apps will pick up the new HTML on restart. |

---

## Release checklist (copy into the PR description)

- [ ] Tests / typecheck green on main
- [ ] `pnpm changeset` recorded with a meaningful summary
- [ ] `pnpm -w changeset version` applied
- [ ] CHANGELOG.md updated for both packages (Changesets does this)
- [ ] `pnpm -w turbo run build --filter='!playground'` clean
- [ ] `pnpm -F @puppledoc/nestjs-api-reference pack --pack-destination /tmp` inspected
- [ ] Manual smoke test: install the tarball into a fresh Nest app and confirm docs UI loads
- [ ] `pnpm -w changeset publish` → `git push --follow-tags`
