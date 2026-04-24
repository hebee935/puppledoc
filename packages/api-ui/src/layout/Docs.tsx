import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { flattenEndpoints } from '../spec';
import { OverviewPage } from '../pages/OverviewPage';
import { RestEndpointPage } from '../pages/RestEndpointPage';
import { WsConnectionPage } from '../pages/WsConnectionPage';
import { WsEventPage } from '../pages/WsEventPage';

export function Docs() {
  const { doc, groups, activeId, selectEndpoint } = useStore();
  const scrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeId]);

  if (!doc) return <main className="docs" />;
  const all = flattenEndpoints(groups);
  const active = all.find((e) => e.id === activeId);
  const idx = activeId ? all.findIndex((e) => e.id === activeId) : -1;
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <main className="docs" ref={scrollRef}>
      <div className="docs-inner">
        {!active && <OverviewPage doc={doc} />}

        {active?.kind === 'rest' && <RestEndpointPage doc={doc} endpoint={active} />}
        {active?.kind === 'ws-connection' && <WsConnectionPage doc={doc} endpoint={active} />}
        {active?.kind === 'ws-event' && <WsEventPage doc={doc} endpoint={active} />}

        {active && (
          <nav className="endpoint-nav">
            {prev ? (
              <button className="endpoint-nav-btn" onClick={() => selectEndpoint(prev.id)}>
                <ArrowLeft size={12} />
                <span>
                  <span className="endpoint-nav-label">Previous</span>
                  <span className="endpoint-nav-title">{prev.title}</span>
                </span>
              </button>
            ) : <div />}
            {next ? (
              <button className="endpoint-nav-btn endpoint-nav-right" onClick={() => selectEndpoint(next.id)}>
                <span>
                  <span className="endpoint-nav-label">Next</span>
                  <span className="endpoint-nav-title">{next.title}</span>
                </span>
                <ArrowRight size={12} />
              </button>
            ) : <div />}
          </nav>
        )}
      </div>
    </main>
  );
}
