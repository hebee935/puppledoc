import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { flattenEndpoints } from '../spec';
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
      <header className="docs-header">
        <div className="docs-title-row">
          <h1 className="docs-title">{doc.info?.title ?? 'API'}</h1>
          {doc.info?.version && <span className="docs-version">{doc.info.version}</span>}
          <span className="docs-version">OpenAPI {doc.openapi ?? '3.1'}</span>
        </div>
        {doc.info?.description && <p className="docs-sub">{doc.info.description}</p>}
      </header>

      {active?.kind === 'rest' && <RestEndpointPage doc={doc} endpoint={active} />}
      {active?.kind === 'ws-connection' && <WsConnectionPage doc={doc} endpoint={active} />}
      {active?.kind === 'ws-event' && <WsEventPage doc={doc} endpoint={active} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px 40px 48px', gap: 12 }}>
        <button
          className="foot-btn"
          style={{ flex: '0 0 auto', padding: '10px 14px', visibility: prev ? 'visible' : 'hidden' }}
          onClick={() => prev && selectEndpoint(prev.id)}
        >
          <ArrowLeft size={12} /> {prev?.title}
        </button>
        <button
          className="foot-btn"
          style={{ flex: '0 0 auto', padding: '10px 14px', visibility: next ? 'visible' : 'hidden' }}
          onClick={() => next && selectEndpoint(next.id)}
        >
          {next?.title} <ArrowRight size={12} />
        </button>
      </div>
    </main>
  );
}
