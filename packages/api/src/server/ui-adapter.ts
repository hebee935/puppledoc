import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HttpServer } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { SpaceApiUiOptions } from '../metadata/types.js';

const requireFrom = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Serve the bundled docs UI under `basePath` on the Nest http adapter.
 * Also exposes `openapi.json` and injects the UI options into `index.html` so the
 * SPA boots with the right title / servers without an extra round trip.
 */
export function serveUi(
  http: HttpServer,
  basePath: string,
  document: OpenAPIObject,
  ui: SpaceApiUiOptions = {},
): void {
  const indexPath = resolveUiIndex();
  const uiDir = dirname(indexPath);
  const prefix = normalizePath(basePath);

  // JSON spec — primary boot source for the UI, also useful for `curl`.
  http.get(`${prefix}/openapi.json`, (_req: unknown, res: any) => {
    res.setHeader?.('Content-Type', 'application/json; charset=utf-8');
    res.send ? res.send(JSON.stringify(document)) : res.end(JSON.stringify(document));
  });

  // index.html with bootstrap payload injected (title, theme, servers). We also
  // inject `<base href="{prefix}/">` so relative asset paths resolve correctly
  // whether the user landed on `/docs` or `/docs/`. Read per request so that
  // rebuilding the UI during `pnpm dev` is reflected immediately without
  // restarting the host server.
  const bootstrap = { basePath: prefix, ui };
  const baseHref = prefix ? `${prefix}/` : '/';
  const renderIndex = () =>
    readFileSync(indexPath, 'utf8').replace(
      /<head>/i,
      `<head><base href="${baseHref}"><script>window.__SPACE_API__ = ${JSON.stringify(bootstrap).replace(/</g, '\\u003c')};</script>`,
    );

  http.get(prefix, (_req: unknown, res: any) => sendHtml(res, renderIndex()));
  http.get(`${prefix}/`, (_req: unknown, res: any) => sendHtml(res, renderIndex()));

  // Hash-named assets and any other static files.
  mountStatic(http, `${prefix}/assets`, join(uiDir, 'assets'));

  // Root-level static files (favicon, robots, etc.) — explicit allowlist to avoid
  // accidentally exposing index.html or other internals via a generic glob.
  for (const name of [
    'favicon.ico',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
    'site.webmanifest',
    'robots.txt',
  ]) {
    const abs = join(uiDir, name);
    if (!existsSync(abs)) continue;
    http.get(`${prefix}/${name}`, (_req: unknown, res: any) => {
      const ext = name.slice(name.lastIndexOf('.'));
      res.setHeader?.('Content-Type', contentType(ext));
      res.setHeader?.('Cache-Control', 'public, max-age=86400');
      const body = readFileSync(abs);
      res.send ? res.send(body) : res.end(body);
    });
  }
}

function sendHtml(res: any, html: string) {
  res.setHeader?.('Content-Type', 'text/html; charset=utf-8');
  res.send ? res.send(html) : res.end(html);
}

function normalizePath(p: string): string {
  const stripped = p.replace(/^\/+|\/+$/g, '');
  return stripped ? `/${stripped}` : '';
}

function resolveUiIndex(): string {
  // Prefer the workspace UI package when available — it tracks `pnpm dev`
  // rebuilds immediately and avoids serving a stale ./ui copy that lingers
  // from a previous `pnpm publish` (which runs `bundle-ui` as prepublishOnly).
  try {
    return requireFrom.resolve('@puppledoc/space-ui/dist/index.html');
  } catch { /* not in workspace — fall through to bundled copy */ }
  // Published layout: UI copied into ./ui at publish time, sits alongside dist/.
  const bundled = join(HERE, '..', 'ui', 'index.html');
  if (existsSync(bundled)) return bundled;
  throw new Error(
    '[@puppledoc/nestjs-api-reference] Could not locate the UI bundle. In development, run `pnpm --filter @puppledoc/space-ui build`; if this is an installed package, reinstall — the ./ui directory is missing.',
  );
}

function mountStatic(http: HttpServer, mountPath: string, dir: string) {
  // Prefer express.static when the adapter is express; otherwise fall back to a tiny
  // path-safe file reader that supports hashed asset names.
  const adapter = http as unknown as {
    getType?: () => string;
    use?: (path: string, handler: unknown) => void;
  };
  if (adapter.getType?.() === 'express') {
    try {
      const express = requireFrom('express') as typeof import('express');
      adapter.use?.(mountPath, express.static(dir, { immutable: true, maxAge: '1y' }));
      return;
    } catch {
      // fall through to generic handler
    }
  }

  http.get(`${mountPath}/:file`, (req: any, res: any) => {
    const file = typeof req.params?.file === 'string' ? req.params.file : '';
    // Prevent traversal — only base filenames allowed.
    if (!file || file.includes('..') || file.includes('/') || file.includes('\\')) {
      return res.status?.(400)?.send?.('bad request') ?? res.end('bad request');
    }
    const abs = join(dir, file);
    if (!abs.startsWith(dir) || !existsSync(abs)) {
      return res.status?.(404)?.send?.('not found') ?? res.end('not found');
    }
    const ext = abs.slice(abs.lastIndexOf('.'));
    res.setHeader?.('Content-Type', contentType(ext));
    res.setHeader?.('Cache-Control', 'public, max-age=31536000, immutable');
    res.send ? res.send(readFileSync(abs)) : res.end(readFileSync(abs));
  });
}

function contentType(ext: string): string {
  switch (ext) {
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.ico': return 'image/x-icon';
    case '.webmanifest': return 'application/manifest+json';
    case '.woff2': return 'font/woff2';
    case '.woff': return 'font/woff';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
}
