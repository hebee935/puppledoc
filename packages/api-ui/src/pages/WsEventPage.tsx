import { Lock } from 'lucide-react';
import type { OpenApiDoc, WsEventEndpoint } from '../types';
import { resolveRef } from '../spec';
import { MethodPill } from '../components/MethodPill';
import { SchemaTree } from '../components/SchemaTree';
import { JsonView } from '../components/JsonView';
import { buildExampleFromSchema } from '../samples';

interface Props {
  doc: OpenApiDoc;
  endpoint: WsEventEndpoint;
}

export function WsEventPage({ doc, endpoint }: Props) {
  const ev = endpoint.event;
  const payloadSchema = resolveRef(doc, ev.payload) ?? ev.payload;
  const replySchema = resolveRef(doc, ev.reply) ?? ev.reply;
  const exampleFrame = { type: ev.event, ...(buildExampleFromSchema(doc, payloadSchema) ?? {}) };
  const exampleReply = replySchema ? buildExampleFromSchema(doc, replySchema) : undefined;

  return (
    <article className="endpoint">
      <div className="ep-header">
        <MethodPill method={endpoint.method} />
        <span className="ep-path">
          <span style={{ color: 'var(--ink-muted)' }}>type:</span> "{ev.event}"
        </span>
        {endpoint.auth && (
          <span className="ep-lock">
            <Lock size={10} /> auth required
          </span>
        )}
        <span className="event-dir" data-dir={ev.direction} style={{ marginLeft: 'auto' }}>
          {ev.direction === 'send' ? '→ client → server' : '← server → client'}
        </span>
      </div>
      <h2 className="ep-title">{ev.summary ?? ev.event}</h2>
      {ev.description && <p className="ep-desc">{ev.description}</p>}

      <div className="section">
        <div className="section-head">Frame Schema</div>
        <SchemaTree doc={doc} schema={payloadSchema} />
      </div>

      <div className="section">
        <div className="section-head">Example Frame</div>
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          <JsonView data={exampleFrame} maxHeight={240} />
        </div>
      </div>

      {replySchema && exampleReply !== undefined && (
        <div className="section">
          <div className="section-head">← Expected Reply</div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
            <JsonView data={exampleReply} maxHeight={240} />
          </div>
        </div>
      )}
    </article>
  );
}
