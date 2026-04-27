import { useEffect } from 'react';
import { TopBar } from './layout/TopBar';
import { Sidebar } from './layout/Sidebar';
import { Docs } from './layout/Docs';
import { TestDrawer } from './layout/TestDrawer';
import { CommandPalette } from './components/CommandPalette';
import { AuthorizeModal } from './components/AuthorizeModal';
import { useStore } from './store';
import type { OpenApiDoc } from './types';

export function App() {
  const { load, doc, bootstrap, openPalette, openAuth, openDrawer, toggleSidebar, syncFromHash } = useStore();

  useEffect(() => {
    (async () => {
      const url = `${bootstrap.basePath || ''}/openapi.json`;
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as OpenApiDoc;
        load(json);
      } catch (err) {
        try {
          const res = await fetch('/mock-openapi.json');
          if (res.ok) {
            load((await res.json()) as OpenApiDoc);
            return;
          }
        } catch { /* ignore */ }
        console.error('[space-ui] Failed to load openapi spec:', err);
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
      // ⌘⇧T → open test drawer
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        openDrawer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPalette, openAuth, openDrawer]);

  // Hash-based deep links: any change to window.location.hash (back/forward,
  // manual edit, copied URL) re-syncs the active page.
  useEffect(() => {
    const onHash = () => syncFromHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [syncFromHash]);

  if (!doc) {
    return (
      <div className="boot-loader">
        <div className="dots"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <>
      <TopBar onToggleSidebar={toggleSidebar} />
      <Shell />
      <TestDrawer />
      <CommandPalette />
      <AuthorizeModal />
    </>
  );
}

function Shell() {
  const { sidebarCollapsed } = useStore();
  return (
    <div className="app" data-sidebar-collapsed={sidebarCollapsed}>
      <Sidebar />
      <Docs />
    </div>
  );
}
