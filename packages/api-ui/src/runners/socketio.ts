import { io, type Socket } from 'socket.io-client';
import type { WsClient, WsFrame, WsState } from './ws';

export interface SocketIoOptions {
  /** Full URL including host. The path part is treated as the namespace. */
  url: string;
  /** Sent on `auth` of the socket.io handshake. */
  authData?: Record<string, string>;
  /** Query params attached to the underlying engine.io request. */
  query?: Record<string, string>;
  /** Subset of socket.io transports to negotiate. */
  transports?: Array<'websocket' | 'polling'>;
  onState: (state: WsState) => void;
  onFrame: (frame: WsFrame) => void;
}

/**
 * Open a socket.io connection that exposes the same `WsClient` shape as the
 * raw-ws runner — `send` emits an event derived from the payload's `type`
 * field, and incoming events are normalized into `WsFrame` objects so the
 * docs UI's log can render them uniformly.
 */
export function openSocketIo(opts: SocketIoOptions): WsClient {
  const u = new URL(opts.url, window.location.href);
  // Translate ws/wss → http/https. socket.io-client expects the http origin
  // and joins the path (= namespace) on its own.
  if (u.protocol === 'ws:') u.protocol = 'http:';
  else if (u.protocol === 'wss:') u.protocol = 'https:';
  const namespace = u.pathname && u.pathname !== '/' ? u.pathname : '';
  const origin = `${u.protocol}//${u.host}`;

  opts.onState('connecting');
  opts.onFrame({
    dir: 'system',
    at: Date.now(),
    text: `Connecting to ${origin}${namespace} (socket.io)…`,
  });

  const socket: Socket = io(`${origin}${namespace}`, {
    transports: opts.transports ?? ['websocket'],
    auth: opts.authData,
    query: opts.query,
    forceNew: true,
    reconnection: false,
  });

  // socket.io's onAny captures every server-emitted event into a single log
  // entry shaped like a raw frame so the existing UI keeps working.
  socket.onAny((event: string, ...args: unknown[]) => {
    const body = args.length === 1 ? args[0] : args;
    opts.onFrame({
      dir: 'recv',
      at: Date.now(),
      body: { event, data: body },
    });
  });

  socket.on('connect', () => {
    opts.onState('connected');
    opts.onFrame({ dir: 'system', at: Date.now(), text: `Connected · sid ${socket.id}` });
  });
  socket.on('connect_error', (err) => {
    opts.onState('error');
    opts.onFrame({
      dir: 'system',
      at: Date.now(),
      text: `Connection error · ${err instanceof Error ? err.message : String(err)}`,
    });
  });
  socket.on('disconnect', (reason) => {
    opts.onState('closed');
    opts.onFrame({ dir: 'system', at: Date.now(), text: `Closed · ${reason}` });
  });

  return {
    state: 'connecting',
    send: (payload) => {
      // The compose textarea always produces an object with `type` (matching
      // the raw-ws convention). For socket.io we emit that as the event name
      // and pass the rest as data.
      let event = 'message';
      let data: unknown = payload;
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const obj = payload as Record<string, unknown>;
        if (typeof obj.type === 'string') {
          event = obj.type;
          // Strip the type field from data so server handlers receive a clean
          // payload that mirrors what `client.emit('subscribe', dto)` sends.
          const { type: _t, ...rest } = obj;
          data = Object.keys(rest).length === 0 ? undefined : rest;
        }
      }
      socket.emit(event, data);
      opts.onFrame({
        dir: 'send',
        at: Date.now(),
        body: { event, data },
      });
    },
    close: () => {
      if (socket.connected || socket.active) socket.disconnect();
    },
  };
}
