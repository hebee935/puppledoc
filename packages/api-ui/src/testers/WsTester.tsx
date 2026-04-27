import { useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, Play, Plus, Send, Square, X } from 'lucide-react';
import type { OpenApiDoc, WsConnectionEndpoint, WsEventEndpoint } from '../types';
import { MethodPill } from '../components/MethodPill';
import { buildExampleFromSchema } from '../samples';
import { resolveRef } from '../spec';
import { extractPathVars, useStore } from '../store';

interface Props {
  doc: OpenApiDoc;
  endpoint: WsConnectionEndpoint | WsEventEndpoint;
  leftEdge?: React.ReactNode;
}

/**
 * Unified WS tester. Connection state (socket, frames, handshake inputs) lives
 * in the store keyed by channel URL, so it survives navigation between events
 * on the same channel — only the compose textarea is per-event local.
 *
 *  - Connection page: shows the handshake editor (query/subprotocols).
 *  - Send event: hides the handshake editor; compose pre-filled with the event's example.
 *  - Recv event: hides compose; log filters to frames whose `type` matches.
 */
export function WsTester({ doc, endpoint, leftEdge }: Props) {
  const token = useStore((s) => s.token);
  const session = useStore((s) => s.wsSessions[endpoint.channel.url]);
  const wsConnect = useStore((s) => s.wsConnect);
  const wsDisconnect = useStore((s) => s.wsDisconnect);
  const wsSend = useStore((s) => s.wsSend);
  const wsSetQuery = useStore((s) => s.wsSetQuery);
  const wsSetSubprotocols = useStore((s) => s.wsSetSubprotocols);
  const wsSetPathParam = useStore((s) => s.wsSetPathParam);
  const wsClearFrames = useStore((s) => s.wsClearFrames);

  const isEvent = endpoint.kind === 'ws-event';
  const ev = isEvent ? endpoint.event : null;
  const isConnPage = endpoint.kind === 'ws-connection';
  const channel = endpoint.channel;
  const channelUrl = channel.url;

  const [compose, setCompose] = useState(() => initialCompose(doc, endpoint));
  const logRef = useRef<HTMLDivElement>(null);

  const state = session?.state ?? 'idle';
  const frames = session?.frames ?? [];
  const query = session?.query ?? [];
  const subprotocols = session?.subprotocols ?? '';

  // Compose resets per endpoint; the connection itself does not.
  useEffect(() => {
    setCompose(initialCompose(doc, endpoint));
  }, [doc, endpoint]);

  // Pre-populate handshake query rows from the channel's `@ConnQuery`
  // declarations on first touch. Once the session exists (even with an empty
  // query array because the user cleared it), we don't re-seed.
  const declaredQuery = useMemo(
    () => channel.conn?.query ?? [],
    [channel.conn?.query],
  );
  const declaredByName = useMemo(
    () => Object.fromEntries(declaredQuery.map((q) => [q.name, q])),
    [declaredQuery],
  );
  // Names whose value should be auto-filled with the Authorize bearer token
  // when left empty: declared `bearer: true` rows + the literal `token`
  // convention.
  const bearerKeys = useMemo(
    () => declaredQuery.filter((q) => q.bearer || q.name.toLowerCase() === 'token').map((q) => q.name),
    [declaredQuery],
  );
  const isBearerRow = (key: string) =>
    bearerKeys.includes(key) || key.toLowerCase() === 'token';
  const declaredSubprotocols = useMemo(
    () => channel.conn?.subprotocols ?? [],
    [channel.conn?.subprotocols],
  );
  const pathVars = useMemo(() => extractPathVars(channelUrl), [channelUrl]);
  const pathParams = session?.pathParams ?? {};
  useEffect(() => {
    if (session) return;
    if (declaredQuery.length > 0) {
      wsSetQuery(channelUrl, declaredQuery.map((q) => ({ key: q.name, value: '' })));
    }
    if (declaredSubprotocols.length > 0) {
      wsSetSubprotocols(channelUrl, declaredSubprotocols.join(', '));
    }
  }, [channelUrl, session, declaredQuery, declaredSubprotocols, wsSetQuery, wsSetSubprotocols]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 1e9 });
  }, [frames]);

  const connect = () => {
    if (state === 'connecting' || state === 'connected') return;
    wsConnect(channelUrl, { token: endpoint.auth ? token : undefined, bearerKeys });
  };

  const disconnect = () => wsDisconnect(channelUrl);

  const sendNow = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(compose);
    } catch (e) {
      // Surface JSON errors as a synthetic system frame so the user sees feedback
      // in the same place as live frames.
      useStore.setState((s) => {
        const cur = s.wsSessions[channelUrl] ?? {
          state: 'idle' as const, frames: [], query: [], subprotocols: '',
        };
        return {
          wsSessions: {
            ...s.wsSessions,
            [channelUrl]: {
              ...cur,
              frames: [
                ...cur.frames,
                { dir: 'system', at: Date.now(), text: `JSON error: ${(e as Error).message}` },
              ],
            },
          },
        };
      });
      return;
    }
    wsSend(channelUrl, parsed, { token: endpoint.auth ? token : undefined, bearerKeys });
  };

  // Filter only when watching a server-pushed event (SEND pill): the user
  // wants to isolate that one event's frames. On client-send (RECV pill) and
  // connection pages, show the full conversation so replies stay visible.
  const visibleFrames = ev && ev.direction === 'send'
    ? frames.filter((f) => f.dir !== 'recv' || matchesEventType(f.body, ev.event))
    : frames;

  // The user composes on the connection page and on client→server events.
  const sendable = !isEvent || ev?.direction === 'recv';
  const editingDisabled = state === 'connected' || state === 'connecting';

  return (
    <section className="test wss-tester">
      {leftEdge}
      <div className="test-head">
        <MethodPill method={endpoint.method} variant="head" />
        <span className="test-path">
          {isEvent ? (
            <>type: "{ev?.event}"</>
          ) : (
            channel.url
          )}
        </span>
      </div>

      <div className="wss-status-row">
        <span
          className="wss-dot"
          data-state={
            state === 'connected'
              ? 'connected'
              : state === 'connecting'
              ? 'connecting'
              : state === 'error'
              ? 'error'
              : ''
          }
        />
        <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
          {state === 'connected'
            ? `LIVE · ${visibleFrames.filter((f) => f.dir !== 'system').length} frames`
            : state === 'connecting'
            ? 'Connecting…'
            : state === 'closed'
            ? 'Closed'
            : state === 'error'
            ? 'Error'
            : 'Disconnected'}
        </span>
        {frames.length > 0 && (
          <button
            className="btn"
            onClick={() => wsClearFrames(channelUrl)}
            title="Clear log"
            aria-label="Clear log"
          >
            <Eraser size={12} />
          </button>
        )}
        {state === 'connected' || state === 'connecting' ? (
          <button className="btn" onClick={disconnect}>
            <Square size={12} /> Disconnect
          </button>
        ) : (
          <button className="btn" onClick={connect}>
            <Play size={12} /> Connect
          </button>
        )}
      </div>

      {isConnPage && (
        <details className="wss-handshake" open>
          <summary>Handshake</summary>
          {pathVars.length > 0 && (
            <div className="wss-hs-section">
              <div className="wss-hs-head">
                <span>Path params</span>
                <span className="wss-hs-meta">URL substitution</span>
              </div>
              {pathVars.map((name) => (
                <div className="wss-hs-row" key={name}>
                  <span className="wss-hs-label" title={name}>
                    {name}
                    <span className="req">*</span>
                  </span>
                  <input
                    className="input"
                    placeholder={`:${name}`}
                    value={pathParams[name] ?? ''}
                    onChange={(e) => wsSetPathParam(channelUrl, name, e.target.value)}
                    spellCheck={false}
                    disabled={editingDisabled}
                  />
                  <span aria-hidden="true" className="wss-hs-remove-placeholder" />
                </div>
              ))}
            </div>
          )}
          <div className="wss-hs-section">
            <div className="wss-hs-head">
              <span>Query params</span>
              <button
                type="button"
                className="wss-hs-add"
                onClick={() => wsSetQuery(channelUrl, [...query, { key: '', value: '' }])}
                disabled={editingDisabled}
              >
                <Plus size={11} /> Add
              </button>
            </div>
            {query.length === 0 ? (
              <div className="wss-hs-empty">
                None. Token from Authorize is appended automatically when the connection requires auth.
              </div>
            ) : (
              query.map((row, i) => {
                const decl = declaredByName[row.key];
                const isDeclared = !!decl;
                return (
                  <div className="wss-hs-row" key={i}>
                    {isDeclared ? (
                      <span className="wss-hs-label" title={row.key}>
                        {row.key}
                        {decl.required && <span className="req">*</span>}
                      </span>
                    ) : (
                      <input
                        className="input"
                        placeholder="key"
                        value={row.key}
                        onChange={(e) =>
                          wsSetQuery(
                            channelUrl,
                            query.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)),
                          )
                        }
                        spellCheck={false}
                        disabled={editingDisabled}
                      />
                    )}
                    <input
                      className="input"
                      placeholder={
                        isBearerRow(row.key) && token
                          ? '(from Authorize)'
                          : decl?.example ?? 'value'
                      }
                      value={row.value}
                      onChange={(e) =>
                        wsSetQuery(
                          channelUrl,
                          query.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)),
                        )
                      }
                      spellCheck={false}
                      disabled={editingDisabled}
                    />
                    {isDeclared ? (
                      <span aria-hidden="true" className="wss-hs-remove-placeholder" />
                    ) : (
                      <button
                        type="button"
                        className="wss-hs-remove"
                        onClick={() => wsSetQuery(channelUrl, query.filter((_, j) => j !== i))}
                        disabled={editingDisabled}
                        aria-label="Remove"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="wss-hs-section">
            <div className="wss-hs-head">
              <span>Subprotocols</span>
              <span className="wss-hs-meta">Sec-WebSocket-Protocol</span>
            </div>
            <input
              className="input"
              placeholder="comma-separated, e.g. v1.chat, json.v2"
              value={subprotocols}
              onChange={(e) => wsSetSubprotocols(channelUrl, e.target.value)}
              spellCheck={false}
              disabled={editingDisabled}
            />
          </div>
        </details>
      )}

      <div className="wss-log" ref={logRef} style={{ maxHeight: 320 }}>
        {visibleFrames.length === 0 && (
          <div className="resp-empty">
            No frames yet
            <div className="hint">
              {sendable
                ? state === 'connected'
                  ? 'Compose a payload below and press send'
                  : 'Click Connect or just send — connect happens automatically'
                : state === 'connected'
                ? 'Listening for events…'
                : 'Connect to start receiving events'}
            </div>
          </div>
        )}
        {visibleFrames.map((f, i) => {
          if (f.dir === 'system') {
            return (
              <div key={i} className="wss-frame" data-dir="system">
                <span className="wss-frame-arrow">·</span>
                <div>{f.text}</div>
              </div>
            );
          }
          const ts = new Date(f.at).toLocaleTimeString('en-US', { hour12: false });
          const body = typeof f.body === 'string' ? f.body : JSON.stringify(f.body, null, 2);
          const size = typeof f.body === 'string' ? f.body.length : JSON.stringify(f.body).length;
          return (
            <div key={i} className="wss-frame" data-dir={f.dir}>
              <span className="wss-frame-arrow">{f.dir === 'send' ? '→' : '←'}</span>
              <div>
                <div className="wss-frame-meta">
                  {f.dir === 'send' ? 'sent' : 'received'} · {ts} · {size}B
                </div>
                <pre>{body}</pre>
              </div>
            </div>
          );
        })}
      </div>

      {sendable && (
        <>
          <div
            style={{
              padding: '10px 12px 6px',
              borderTop: '1px solid var(--line-dark)',
              fontSize: 11,
              color: 'var(--ink-dark-faint)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Payload
          </div>
          <div className="wss-compose">
            <textarea
              className="input input-textarea"
              value={compose}
              onChange={(e) => setCompose(e.target.value)}
              spellCheck={false}
            />
            <button className="btn primary" onClick={sendNow} style={{ alignSelf: 'stretch', padding: '0 14px' }}>
              <Send size={14} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function initialCompose(doc: OpenApiDoc, endpoint: Props['endpoint']): string {
  if (endpoint.kind === 'ws-event') {
    const schema = resolveRef(doc, endpoint.event.payload) ?? endpoint.event.payload;
    const base = buildExampleFromSchema(doc, schema) as Record<string, unknown> | undefined;
    const withType = { type: endpoint.event.event, ...(base ?? {}) };
    return JSON.stringify(withType, null, 2);
  }
  // connection-level: generic ping stub
  return JSON.stringify({ type: 'ping', t: Date.now() }, null, 2);
}

function matchesEventType(body: unknown, eventName: string): boolean {
  if (!body || typeof body !== 'object') return false;
  const t = (body as { type?: unknown }).type;
  return typeof t === 'string' && t === eventName;
}
