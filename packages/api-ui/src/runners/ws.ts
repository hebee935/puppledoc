export type WsState = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

export interface WsFrame {
  dir: 'send' | 'recv' | 'system';
  at: number;
  /** Parsed JSON if possible; otherwise the raw string. */
  body?: unknown;
  /** For system/informational events. */
  text?: string;
}

export interface WsClient {
  state: WsState;
  send: (payload: unknown) => void;
  close: (code?: number) => void;
  readonly socket: WebSocket;
}

export interface WsOptions {
  url: string;
  /** Handshake query params written verbatim into the URL search string. */
  query?: Record<string, string>;
  protocols?: string | string[];
  onState: (state: WsState) => void;
  onFrame: (frame: WsFrame) => void;
}

/**
 * Open a WebSocket and stream frames through the supplied callbacks. The
 * caller owns auth-token substitution and final query composition; this
 * runner just opens the URL it's given. `close()` is idempotent.
 */
export function openWs(opts: WsOptions): WsClient {
  const u = new URL(opts.url, window.location.href);
  if (u.protocol === 'http:') u.protocol = 'ws:';
  else if (u.protocol === 'https:') u.protocol = 'wss:';
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (k && v !== '') u.searchParams.set(k, v);
    }
  }

  opts.onState('connecting');
  opts.onFrame({ dir: 'system', at: Date.now(), text: `Connecting to ${u.toString()}…` });

  const ws = new WebSocket(u.toString(), opts.protocols);
  const client: WsClient = {
    state: 'connecting',
    socket: ws,
    send: (payload) => {
      const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
      ws.send(raw);
      opts.onFrame({
        dir: 'send',
        at: Date.now(),
        body: typeof payload === 'string' ? safeJson(payload) ?? payload : payload,
      });
    },
    close: (code = 1000) => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(code);
      }
    },
  };

  ws.addEventListener('open', () => {
    client.state = 'connected';
    opts.onState('connected');
    opts.onFrame({ dir: 'system', at: Date.now(), text: 'Connected' });
  });
  ws.addEventListener('message', (e) => {
    const text = typeof e.data === 'string' ? e.data : '';
    const parsed = text ? safeJson(text) : e.data;
    opts.onFrame({ dir: 'recv', at: Date.now(), body: parsed ?? text });
  });
  ws.addEventListener('error', () => {
    client.state = 'error';
    opts.onState('error');
    opts.onFrame({ dir: 'system', at: Date.now(), text: 'Connection error' });
  });
  ws.addEventListener('close', (e) => {
    client.state = 'closed';
    opts.onState('closed');
    opts.onFrame({ dir: 'system', at: Date.now(), text: `Closed · code ${e.code}` });
  });

  return client;
}

export function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
