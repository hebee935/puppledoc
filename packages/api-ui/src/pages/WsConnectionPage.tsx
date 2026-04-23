import { Lock } from 'lucide-react';
import type { OpenApiDoc, WsConnectionEndpoint } from '../types';
import { MethodPill } from '../components/MethodPill';

interface Props {
  doc: OpenApiDoc;
  endpoint: WsConnectionEndpoint;
}

export function WsConnectionPage({ endpoint }: Props) {
  return (
    <article className="endpoint">
      <div className="ep-header">
        <MethodPill method={endpoint.method} />
        <span className="ep-path">{endpoint.channel.url}</span>
        {endpoint.auth && (
          <span className="ep-lock">
            <Lock size={10} /> auth required
          </span>
        )}
      </div>
      <h2 className="ep-title">{endpoint.title} · {endpoint.channel.name}</h2>
      <p className="ep-desc">{endpoint.description}</p>

      <div className="section">
        <div className="section-head">Connection URL</div>
        <div
          style={{
            padding: '10px 12px',
            background: 'oklch(96% 0.005 80)',
            borderRadius: 8,
            border: '1px solid var(--line)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12.5,
          }}
        >
          {endpoint.channel.url}
        </div>
      </div>

      <div className="section">
        <div className="section-head">Events</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {endpoint.channel.events.map((ev) => (
            <div
              key={`${ev.direction}:${ev.event}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '84px 1fr',
                gap: 14,
                padding: 12,
                border: '1px solid var(--line)',
                borderRadius: 8,
                background: 'oklch(99% 0.003 80)',
              }}
            >
              <div>
                <span className="event-dir" data-dir={ev.direction}>
                  {ev.direction === 'send' ? '→ send' : '← recv'}
                </span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500 }}>
                  {ev.event}
                </div>
                {ev.summary && (
                  <div style={{ color: 'var(--ink-muted)', fontSize: 12.5, margin: '2px 0 0' }}>
                    {ev.summary}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
