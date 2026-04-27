import { Lock, Play } from 'lucide-react';
import type { ConnInputOptions, OpenApiDoc, WsConnectionEndpoint } from '../types';
import { MethodPill } from '../components/MethodPill';
import { extractPathVars, useStore } from '../store';
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
          {endpoint.channel.tags?.slice(1).map((t) => (
            <span key={t} className="ws-tag-chip">{t}</span>
          ))}
        </div>
        <div className="endpoint-hero-row">
          <MethodPill method={endpoint.method} />
          <span className="endpoint-path-static">{endpoint.channel.url}</span>
          {endpoint.channel.transport && (
            <span className="ws-transport-chip" data-transport={endpoint.channel.transport}>
              {endpoint.channel.transport}
            </span>
          )}
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

      {(() => {
        const pathVars = extractPathVars(endpoint.channel.url);
        const conn = endpoint.channel.conn;
        if (!conn && pathVars.length === 0) return null;
        return <HandshakeCard conn={conn ?? {}} pathVars={pathVars} />;
      })()}
    </article>
  );
}

function HandshakeCard({
  conn,
  pathVars,
}: {
  conn: NonNullable<WsConnectionEndpoint['channel']['conn']>;
  pathVars: string[];
}) {
  const sections: Array<{ label: string; meta: string; rows?: ConnInputOptions[] }> = [];
  if (conn.query?.length) sections.push({ label: 'Query', meta: '?key=value', rows: conn.query });
  if (conn.headers?.length) sections.push({ label: 'Headers', meta: 'HTTP upgrade', rows: conn.headers });
  if (
    sections.length === 0 &&
    !conn.description &&
    !conn.bearerAuth &&
    !conn.subprotocols?.length &&
    !conn.closeCodes?.length &&
    pathVars.length === 0
  ) return null;

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
        {pathVars.length > 0 && (
          <div className="handshake-section">
            <div className="handshake-section-head">
              <span className="handshake-section-label">Path</span>
              <span className="handshake-section-meta">URL variables</span>
            </div>
            <div className="handshake-rows">
              {pathVars.map((name) => (
                <div className="handshake-row" key={name}>
                  <code className="handshake-name">
                    {name}
                    <span className="handshake-req">required</span>
                  </code>
                  <div className="handshake-detail">
                    <div className="handshake-desc-inline">
                      Substituted into the channel URL at connect time.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
        {conn.subprotocols?.length ? (
          <div className="handshake-section">
            <div className="handshake-section-head">
              <span className="handshake-section-label">Subprotocols</span>
              <span className="handshake-section-meta">Sec-WebSocket-Protocol</span>
            </div>
            <div className="handshake-subprotocols">
              {conn.subprotocols.map((p) => (
                <code key={p} className="handshake-subprotocol">{p}</code>
              ))}
            </div>
          </div>
        ) : null}
        {conn.bearerAuth && (
          <div className="handshake-section">
            <div className="handshake-section-head">
              <span className="handshake-section-label">Security</span>
              <span className="handshake-section-meta">{conn.bearerAuth.name}</span>
            </div>
            <div className="handshake-bearer">
              <span className="handshake-bearer-badge">Bearer</span>
              <span className="handshake-bearer-text">
                Pass the token via the <code>?token=</code> query, an
                <code>Authorization: Bearer &lt;jwt&gt;</code> header (non-browser
                clients), or socket.io's <code>handshake.auth.token</code>.
              </span>
            </div>
          </div>
        )}
        {conn.closeCodes?.length ? (
          <div className="handshake-section">
            <div className="handshake-section-head">
              <span className="handshake-section-label">Close codes</span>
              <span className="handshake-section-meta">RFC 6455</span>
            </div>
            <div className="handshake-rows">
              {conn.closeCodes.map((c) => (
                <div className="handshake-row" key={c.code}>
                  <code className="handshake-name">
                    <span className={`close-code close-code-${closeCodeKind(c.code)}`}>
                      {c.code}
                    </span>
                    {c.reason && <span className="close-reason">{c.reason}</span>}
                  </code>
                  <div className="handshake-detail">
                    {c.description && (
                      <div
                        className="handshake-desc-inline"
                        dangerouslySetInnerHTML={{ __html: renderMarkdownInline(c.description) }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function closeCodeKind(code: number): 'normal' | 'protocol' | 'app' | 'unknown' {
  if (code === 1000 || code === 1001) return 'normal';
  if (code >= 1002 && code <= 1015) return 'protocol';
  if (code >= 4000 && code <= 4999) return 'app';
  return 'unknown';
}
