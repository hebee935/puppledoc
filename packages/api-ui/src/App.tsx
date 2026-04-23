import { useEffect } from 'react';
import { Sidebar } from './layout/Sidebar';
import { Docs } from './layout/Docs';
import { TestPanel } from './layout/TestPanel';
import { CommandPalette } from './components/CommandPalette';
import { AuthorizeModal } from './components/AuthorizeModal';
import { useStore } from './store';
import type { OpenApiDoc } from './types';

export function App() {
  const { load, doc, bootstrap, openPalette, openAuth } = useStore();

  useEffect(() => {
    (async () => {
      const url = `${bootstrap.basePath || ''}/openapi.json`;
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as OpenApiDoc;
        load(json);
      } catch (err) {
        // Dev fallback: when running `vite dev` outside a Nest host, try a mock.
        try {
          const res = await fetch('/mock-openapi.json');
          if (res.ok) {
            load((await res.json()) as OpenApiDoc);
            return;
          }
        } catch {
          // ignore
        }
        console.error('[@space/api-ui] Failed to load openapi spec:', err);
      }
    })();
  }, [bootstrap.basePath, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        openAuth();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPalette, openAuth]);

  if (!doc) {
    return <div style={{ padding: 40, color: 'var(--ink-muted)' }}>Loading spec…</div>;
  }

  return (
    <>
      <AppShell />
      <CommandPalette />
      <AuthorizeModal />
    </>
  );
}

function AppShell() {
  const { sidebarWidth, testWidth } = useStore();
  const style = {
    ['--sidebar-w' as string]: `${sidebarWidth}px`,
    ['--test-w' as string]: `${testWidth}px`,
  } as React.CSSProperties;
  return (
    <div className="app" style={style}>
      <Sidebar />
      <Docs />
      <TestPanel />
    </div>
  );
}
