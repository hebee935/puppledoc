# `@belle.develop/space-ui`

Static UI bundle for [`@belle.develop/space-api`](../api). Normally consumed transitively — `@belle.develop/space-api` takes it as a dependency and serves the `dist/` directory directly.

Do not import this package from application code.

## Build output

```
dist/
├── index.html        # entry, bootstrap script gets injected by @belle.develop/space-api
└── assets/
    ├── index-*.js    # React bundle
    └── index-*.css
```

## Runtime contract

The UI reads `window.__SPACE_API__` on boot:

```ts
interface SpaceApiBootstrap {
  basePath: string;         // e.g. '/docs'
  ui?: {
    title?: string;
    theme?: 'light' | 'dark' | 'auto';
    servers?: { label: string; url: string }[];
  };
}
```

It then fetches `${basePath}/openapi.json` and renders.
