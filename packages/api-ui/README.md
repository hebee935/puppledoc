# `@puppledoc/space-ui`

Static UI bundle for [`@puppledoc/nestjs-api-reference`](../api). Normally consumed transitively — `@puppledoc/nestjs-api-reference` takes it as a dependency and serves the `dist/` directory directly.

Do not import this package from application code.

## Build output

```
dist/
├── index.html        # entry, bootstrap script gets injected by @puppledoc/nestjs-api-reference
└── assets/
    ├── index-*.js    # React bundle
    └── index-*.css
```

## Runtime contract

The UI reads `window.__PUPPLEDOC__` on boot:

```ts
interface PuppleDocBootstrap {
  basePath: string;         // e.g. '/docs'
  ui?: {
    title?: string;
    theme?: 'light' | 'dark' | 'auto';
    servers?: { label: string; url: string }[];
  };
}
```

It then fetches `${basePath}/openapi.json` and renders.
