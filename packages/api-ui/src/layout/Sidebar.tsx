import { useState } from 'react';
import { ChevronDown, Download, Key, Lock, Search } from 'lucide-react';
import { MethodPill } from '../components/MethodPill';
import { ColumnResizer } from '../components/ColumnResizer';
import { useStore } from '../store';

export function Sidebar() {
  const { doc, groups, activeId, selectEndpoint, openPalette, openAuth, bootstrap, sidebarWidth, setSidebarWidth } = useStore();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, true])),
  );
  const toggle = (id: string) => setOpenGroups((s) => ({ ...s, [id]: !s[id] }));

  const title = bootstrap.ui?.title ?? doc?.info?.title ?? 'API Docs';
  const version = doc?.info?.version ?? '';

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" />
        <div>
          <div className="brand-name">{title}</div>
          {version && <div className="brand-sub">{version}</div>}
        </div>
      </div>

      <button className="searchbar" onClick={openPalette} aria-label="Search endpoints">
        <Search size={14} />
        <span className="searchbar-label">Search endpoints…</span>
        <span className="kbd">⌘K</span>
      </button>

      <nav className="nav" aria-label="API endpoints">
        <div className="nav-group" data-open="true">
          <div style={{ padding: '4px 10px 8px' }}>
            <button className="nav-item" onClick={openAuth} style={{ gap: 8 }}>
              <Key size={14} />
              <span className="nav-item-label">Authorize</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-muted)' }}>⌥A</span>
            </button>
          </div>
        </div>

        {groups.map((g) => (
          <div key={g.id} className="nav-group" data-open={openGroups[g.id] ?? true}>
            <button className="nav-group-title" onClick={() => toggle(g.id)}>
              <ChevronDown size={12} className="chev" />
              {g.name}
            </button>
            <div className="nav-items">
              {g.endpoints.map((ep) => (
                <button
                  key={ep.id}
                  className="nav-item"
                  data-active={activeId === ep.id}
                  onClick={() => selectEndpoint(ep.id)}
                  title={ep.title}
                >
                  <MethodPill method={ep.method} />
                  <span className="nav-item-label">{ep.title}</span>
                  {ep.auth && <Lock size={10} className="nav-item-lock" aria-label="auth required" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <button className="foot-btn" onClick={() => downloadDoc(doc, 'openapi.json')}>
          <Download size={12} /> OpenAPI
        </button>
      </div>

      <ColumnResizer edge="right" current={sidebarWidth} onChange={setSidebarWidth} />
    </aside>
  );
}

function downloadDoc(doc: unknown, name: string) {
  if (!doc) return;
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
