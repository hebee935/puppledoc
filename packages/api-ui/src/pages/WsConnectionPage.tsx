import { Lock, Play } from 'lucide-react';
import type { OpenApiDoc, WsConnectionEndpoint } from '../types';
import { MethodPill } from '../components/MethodPill';
import { useStore } from '../store';

interface Props {
  doc: OpenApiDoc;
  endpoint: WsConnectionEndpoint;
}

export function WsConnectionPage({ endpoint }: Props) {
  const { openDrawer } = useStore();
  return (
    <article className="endpoint-card">
      <header className="endpoint-hero">
        <div className="endpoint-breadcrumb">
          <span>{endpoint.groupName}</span>
        </div>
        <div className="endpoint-hero-row">
          <MethodPill method={endpoint.method} />
          <span className="endpoint-path-static">{endpoint.channel.url}</span>
          <div className="hero-actions">
            {endpoint.auth && (
              <span className="ep-lock-icon" title="Authentication required">
                <Lock size={12} />
              </span>
            )}
            <button className="btn primary btn-try" onClick={openDrawer}>
              <Play size={13} /> Try it
            </button>
          </div>
        </div>
        <h1 className="endpoint-title">{endpoint.title} · {endpoint.channel.name}</h1>
        {endpoint.description && <p className="endpoint-desc">{endpoint.description}</p>}
      </header>

      <section className="card">
        <header className="card-head">
          <h3 className="card-title">Events</h3>
          <span className="card-subtitle">{endpoint.channel.events.length} frame types</span>
        </header>
        <div className="card-body">
          <div className="event-list">
            {endpoint.channel.events.map((ev) => (
              <div key={`${ev.direction}:${ev.event}`} className="event-row">
                <span className="event-dir" data-dir={ev.direction}>
                  {ev.direction === 'send' ? 'send' : 'recv'}
                </span>
                <div>
                  <div className="event-row-type">{ev.event}</div>
                  {ev.summary && <div className="event-row-desc">{ev.summary}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
