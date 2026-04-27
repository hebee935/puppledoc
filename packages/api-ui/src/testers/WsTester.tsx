import { useEffect, useRef, useState } from 'react';
import { Play, Plus, Send, Square, X } from 'lucide-react';
import type { OpenApiDoc, WsConnectionEndpoint, WsEventEndpoint } from '../types';
import { MethodPill } from '../components/MethodPill';
import { buildExampleFromSchema } from '../samples';
import { resolveRef } from '../spec';
import { openWs, type WsClient, type WsFrame, type WsState } from '../runners/ws';
import { useStore } from '../store';

interface Props {
  doc: OpenApiDoc;
  endpoint: WsConnectionEndpoint | WsEventEndpoint;
  leftEdge?: React.ReactNode;
}

/**
 * Unified WS tester. Used for:
 *  - a channel connection (no event filter; compose panel lets you send any JSON)
 *  - a single event (for send events → compose pre-filled with event's schema example;
 *    for recv events → compose is hidden, log auto-filters to `frame.type === event.event`)
 */
export function WsTester({ doc, endpoint, leftEdge }: Props) {
  const { token, server } = useStore();
  const isEvent = endpoint.kind === 'ws-event';
  const ev = isEvent ? endpoint.event : null;
  const channel = endpoint.channel;

  const [state, setState] = useState<WsState>('idle');
  const [frames, setFrames] = useState<WsFrame[]>([]);
  const [compose, setCompose] = useState(() => initialCompose(doc, endpoint));
  const [query, setQuery] = useState<Array<{ key: string; value: string }>>([]);
  const [subprotocols, setSubprotocols] = useState('');
  const clientRef = useRef<WsClient | null>(null);
  const pendingRef = useRef<unknown[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCompose(initialCompose(doc, endpoint));
    setFrames([]);
    setState('idle');
    setQuery([]);
    setSubprotocols('');
    clientRef.current?.close();
    clientRef.current = null;
  }, [doc, endpoint]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 1e9 });
  }, [frames]);

  useEffect(() => () => clientRef.current?.close(), []);

  const connect = () => {
    if (state === 'connecting' || state === 'connected') return;
    const url = channel.url.startsWith('ws://') || channel.url.startsWith('wss://')
      ? channel.url
      : `${server.replace(/^http/, 'ws')}${channel.url}`;
    const queryObj: Record<string, string> = {};
    for (const { key, value } of query) {
      const k = key.trim();
      if (k) queryObj[k] = value;
    }
    const protocols = subprotocols
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    clientRef.current = openWs({
      url,
      token: endpoint.auth ? token : undefined,
      query: queryObj,
      protocols: protocols.length > 0 ? protocols : undefined,
      onState: (s) => {
        setState(s);
        if (s === 'connected' && pendingRef.current.length > 0) {
          const queue = pendingRef.current;
          pendingRef.current = [];
          for (const msg of queue) clientRef.current?.send(msg);
        }
      },
      onFrame: (f) => setFrames((prev) => [...prev, f]),
    });
  };

  const disconnect = () => {
    clientRef.current?.close();
    clientRef.current = null;
  };

  const sendNow = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(compose);
    } catch (e) {
      setFrames((prev) => [
        ...prev,
        { dir: 'system', at: Date.now(), text: `JSON error: ${(e as Error).message}` },
      ]);
      return;
    }
    if (state !== 'connected') {
      pendingRef.current.push(parsed);
      connect();
      return;
    }
    clientRef.current?.send(parsed);
  };

  const visibleFrames = ev && ev.direction === 'recv'
    ? frames.filter((f) => f.dir !== 'recv' || matchesEventType(f.body, ev.event))
    : frames;

  const sendable = !isEvent || ev?.direction === 'send';

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
        {state === 'connected' ? (
          <button className="btn" onClick={disconnect}>
            <Square size={12} /> Disconnect
          </button>
        ) : (
          <button className="btn" onClick={connect}>
            <Play size={12} /> Connect
          </button>
        )}
      </div>

      <details className="wss-handshake" open>
        <summary>Handshake</summary>
        <div className="wss-hs-section">
          <div className="wss-hs-head">
            <span>Query params</span>
            <button
              type="button"
              className="wss-hs-add"
              onClick={() => setQuery((q) => [...q, { key: '', value: '' }])}
              disabled={state === 'connected' || state === 'connecting'}
            >
              <Plus size={11} /> Add
            </button>
          </div>
          {query.length === 0 ? (
            <div className="wss-hs-empty">
              None. Token from Authorize is appended automatically when the connection requires auth.
            </div>
          ) : (
            query.map((row, i) => (
              <div className="wss-hs-row" key={i}>
                <input
                  className="input"
                  placeholder="key"
                  value={row.key}
                  onChange={(e) =>
                    setQuery((q) => q.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))
                  }
                  spellCheck={false}
                  disabled={state === 'connected' || state === 'connecting'}
                />
                <input
                  className="input"
                  placeholder="value"
                  value={row.value}
                  onChange={(e) =>
                    setQuery((q) => q.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
                  }
                  spellCheck={false}
                  disabled={state === 'connected' || state === 'connecting'}
                />
                <button
                  type="button"
                  className="wss-hs-remove"
                  onClick={() => setQuery((q) => q.filter((_, j) => j !== i))}
                  disabled={state === 'connected' || state === 'connecting'}
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            ))
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
            onChange={(e) => setSubprotocols(e.target.value)}
            spellCheck={false}
            disabled={state === 'connected' || state === 'connecting'}
          />
        </div>

      </details>

      <div className="wss-log" ref={logRef} style={{ maxHeight: 320 }}>
        {visibleFrames.length === 0 && (
          <div className="resp-empty">
            No frames yet
            <div className="hint">
              {sendable ? 'Compose a payload below and press send' : 'Connect and wait for events'}
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
