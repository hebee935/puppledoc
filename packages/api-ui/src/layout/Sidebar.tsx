import { useState } from 'react';
import { ChevronDown, Home, Key, Lock } from 'lucide-react';
import { MethodPill } from '../components/MethodPill';
import { useStore } from '../store';

export function Sidebar() {
  const { groups, activeId, selectEndpoint, selectGroup, goOverview, openAuth, token } = useStore();
  const wsSessions = useStore((s) => s.wsSessions);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, true])),
  );
  const toggle = (id: string) => setOpenGroups((s) => ({ ...s, [id]: !(s[id] ?? true) }));
  const ensureOpen = (id: string) => setOpenGroups((s) => ({ ...s, [id]: true }));

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
            <div
              className="nav-group-title"
              data-active={activeId === g.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                selectGroup(g.id);
                ensureOpen(g.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectGroup(g.id);
                  ensureOpen(g.id);
                }
              }}
            >
              <button
                type="button"
                className="nav-group-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(g.id);
                }}
                aria-label={openGroups[g.id] ?? true ? 'Collapse' : 'Expand'}
              >
                <ChevronDown size={12} className="chev" />
              </button>
              <span>{g.name}</span>
              <span className="nav-group-count">{g.endpoints.length}</span>
            </div>
            <div className="nav-items">
              {g.endpoints.map((ep) => {
                const liveState =
                  ep.kind === 'ws-connection' ? wsSessions[ep.channel.url]?.state : undefined;
                return (
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
                    {liveState === 'connected' && (
                      <span className="nav-item-live" aria-label="Connected" />
                    )}
                    {liveState === 'connecting' && (
                      <span className="nav-item-live" data-state="connecting" aria-label="Connecting" />
                    )}
                    {ep.auth && <Lock size={10} className="nav-item-lock" aria-label="auth required" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
