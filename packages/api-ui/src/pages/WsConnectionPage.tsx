import { Lock, Play } from 'lucide-react';
import type { ConnInputOptions, OpenApiDoc, WsConnectionEndpoint } from '../types';
import { MethodPill } from '../components/MethodPill';
import { useStore } from '../store';
import { renderMarkdown, renderMarkdownInline } from '../markdown';

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
        {endpoint.description && (
          <p
            className="endpoint-desc"
            dangerouslySetInnerHTML={{ __html: renderMarkdownInline(endpoint.description) }}
          />
        )}
      </header>

      {endpoint.channel.conn && <HandshakeCard conn={endpoint.channel.conn} />}
    </article>
  );
}

function HandshakeCard({ conn }: { conn: NonNullable<WsConnectionEndpoint['channel']['conn']> }) {
  const sections: Array<{ label: string; meta: string; rows?: ConnInputOptions[] }> = [];
  if (conn.query?.length) sections.push({ label: 'Query', meta: '?key=value', rows: conn.query });
  if (conn.headers?.length) sections.push({ label: 'Headers', meta: 'HTTP upgrade', rows: conn.headers });
  if (conn.auth?.length) sections.push({ label: 'Auth', meta: 'socket.io handshake.auth', rows: conn.auth });
  if (sections.length === 0 && !conn.description) return null;

  return (
    <section className="card">
      <header className="card-head">
        <h3 className="card-title">Handshake</h3>
        <span className="card-subtitle">connect-time inputs</span>
      </header>
      <div className="card-body">
        {conn.description && (
          <div
            className="handshake-desc"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(conn.description) }}
          />
        )}
        {sections.map((s) => (
          <div className="handshake-section" key={s.label}>
            <div className="handshake-section-head">
              <span className="handshake-section-label">{s.label}</span>
              <span className="handshake-section-meta">{s.meta}</span>
            </div>
            <div className="handshake-rows">
              {s.rows!.map((r) => (
                <div className="handshake-row" key={r.name}>
                  <code className="handshake-name">
                    {r.name}
                    {r.required && <span className="handshake-req">required</span>}
                  </code>
                  <div className="handshake-detail">
                    {r.description && (
                      <div
                        className="handshake-desc-inline"
                        dangerouslySetInnerHTML={{ __html: renderMarkdownInline(r.description) }}
                      />
                    )}
                    {r.example && (
                      <div className="handshake-example">
                        <span>example</span> <code>{r.example}</code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
