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
        <div className="endpoint-hero-row">
          <MethodPill method={endpoint.method} />
          <span className="endpoint-path-static">
            <span className="path-var">type:</span> "{ev.event}"
          </span>
          {/* data-dir is from the client's perspective (matches the SEND/RECV
              pill colors); the spec's `direction` field is server-perspective
              and gets inverted here. */}
          <span className="event-dir" data-dir={ev.direction === 'send' ? 'recv' : 'send'}>
            {ev.direction === 'send' ? 'server → client' : 'client → server'}
          </span>
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
            <h3 className="card-title">Reply</h3>
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
