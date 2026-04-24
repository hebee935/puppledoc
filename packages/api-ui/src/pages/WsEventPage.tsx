import { Lock, Play } from 'lucide-react';
import type { OpenApiDoc, WsEventEndpoint } from '../types';
import { resolveRef } from '../spec';
import { MethodPill } from '../components/MethodPill';
import { SchemaTree } from '../components/SchemaTree';
import { JsonView } from '../components/JsonView';
import { buildExampleFromSchema } from '../samples';
import { useStore } from '../store';

interface Props {
  doc: OpenApiDoc;
  endpoint: WsEventEndpoint;
}

export function WsEventPage({ doc, endpoint }: Props) {
  const { openDrawer } = useStore();
  const ev = endpoint.event;
  const payloadSchema = resolveRef(doc, ev.payload) ?? ev.payload;
  const replySchema = resolveRef(doc, ev.reply) ?? ev.reply;
  const exampleFrame = { type: ev.event, ...(buildExampleFromSchema(doc, payloadSchema) as object ?? {}) };
  const exampleReply = replySchema ? buildExampleFromSchema(doc, replySchema) : undefined;

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
          <span className="event-dir" data-dir={ev.direction}>
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
        {ev.description && <p className="endpoint-desc">{ev.description}</p>}
      </header>

      <section className="card">
        <header className="card-head">
          <h3 className="card-title">Frame Schema</h3>
        </header>
        <div className="card-body">
          <SchemaTree doc={doc} schema={payloadSchema} />
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h3 className="card-title">Example Frame</h3>
        </header>
        <div className="card-body">
          <div className="example-block flush">
            <JsonView data={exampleFrame} maxHeight={240} />
          </div>
        </div>
      </section>

      {replySchema && exampleReply !== undefined && (
        <section className="card">
          <header className="card-head">
            <h3 className="card-title">Expected Reply</h3>
            <span className="card-subtitle">← server</span>
          </header>
          <div className="card-body">
            <div className="example-block flush">
              <JsonView data={exampleReply} maxHeight={240} />
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
