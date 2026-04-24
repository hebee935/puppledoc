import { useState } from 'react';
import { ChevronDown, Home, Key, Lock } from 'lucide-react';
import { MethodPill } from '../components/MethodPill';
import { useStore } from '../store';

export function Sidebar() {
  const { groups, activeId, selectEndpoint, goOverview, openAuth, token } = useStore();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, true])),
  );
  const toggle = (id: string) => setOpenGroups((s) => ({ ...s, [id]: !s[id] }));

  return (
    <aside className="sidebar">
      <nav className="nav" aria-label="API endpoints">
        <button
          className="nav-overview"
          data-active={activeId === null}
          onClick={goOverview}
        >
          <Home size={14} />
          <span>Overview</span>
        </button>
        <button className="nav-authorize" onClick={openAuth}>
          <Key size={14} />
          <span>Authorize</span>
          {token && <span className="nav-authorize-dot" aria-label="token set" />}
          <span className="kbd">⌥A</span>
        </button>

        {groups.map((g) => (
          <div key={g.id} className="nav-group" data-open={openGroups[g.id] ?? true}>
            <button className="nav-group-title" onClick={() => toggle(g.id)}>
              <ChevronDown size={12} className="chev" />
              <span>{g.name}</span>
              <span className="nav-group-count">{g.endpoints.length}</span>
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
                  <span className="nav-item-label" data-deprecated={ep.deprecated || undefined}>
                    {ep.title}
                  </span>
                  {ep.auth && <Lock size={10} className="nav-item-lock" aria-label="auth required" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
