import { Lock, Play } from 'lucide-react';
import type { OpenApiDoc, WsEventEndpoint } from '../types';
import { resolveRef } from '../spec';
import { MethodPill } from '../components/MethodPill';
import { SchemaTree } from '../components/SchemaTree';
import { useStore } from '../store';
import { renderMarkdownInline } from '../markdown';

interface Props {
  doc: OpenApiDoc;
  endpoint: WsEventEndpoint;
}

export function WsEventPage({ doc, endpoint }: Props) {
  const { openDrawer } = useStore();
  const ev = endpoint.event;
  const payloadSchema = resolveRef(doc, ev.payload) ?? ev.payload;
  const replySchema = resolveRef(doc, ev.reply) ?? ev.reply;

  return (
    <article className="endpoint-card">
      <header className="endpoint-hero">
        <div className="endpoint-breadcrumb">
          <span>{endpoint.groupName}</span>
          <span>›</span>
          <span>{endpoint.channel.url}</span>
        </div>
        <div className="endpoint-hero-row" data-deprecated={ev.deprecated || undefined}>
          <MethodPill method={endpoint.method} />
          <span className="endpoint-path-static">
            <span className="path-var">type:</span> "{ev.event}"
          </span>
          <span className="event-dir" data-dir={ev.direction}>
            {ev.direction === 'send' ? 'server → client' : 'client → server'}
          </span>
          {ev.deprecated && <span className="badge-deprecated">Deprecated</span>}
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
        <h1 className="endpoint-title">{ev.summary ?? ev.event}</h1>
        {ev.description && (
          <p
            className="endpoint-desc"
            dangerouslySetInnerHTML={{ __html: renderMarkdownInline(ev.description) }}
          />
        )}
      </header>

      <section className="card">
        <header className="card-head">
          <h3 className="card-title">Frame</h3>
          <span className="card-subtitle">
            {ev.direction === 'send' ? 'server → client' : 'client → server'}
          </span>
        </header>
        <div className="card-body">
          <SchemaTree doc={doc} schema={payloadSchema} />
        </div>
      </section>

      {replySchema && (
        <section className="card">
          <header className="card-head">
            <h3 className="card-title">
              Reply
              {ev.replyEvent && (
                <code className="card-title-event">type: "{ev.replyEvent}"</code>
              )}
            </h3>
            <span className="card-subtitle">← server</span>
          </header>
          <div className="card-body">
            <SchemaTree doc={doc} schema={replySchema} />
          </div>
        </section>
      )}
    </article>
  );
}
