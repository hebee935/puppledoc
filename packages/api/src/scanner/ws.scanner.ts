import type { INestApplication, Type } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import {
  NEST_GATEWAY_NAMESPACE_KEY,
  NEST_GATEWAY_OPTIONS_KEYS,
  PUPPLEDOC_WS_CHANNEL,
  PUPPLEDOC_WS_CONN,
  PUPPLEDOC_WS_CONN_BEARER,
  PUPPLEDOC_WS_CONN_CLOSE,
  PUPPLEDOC_WS_CONN_HEADER,
  PUPPLEDOC_WS_CONN_QUERY,
  PUPPLEDOC_WS_CONN_SUBPROTOCOLS,
  PUPPLEDOC_WS_EVENTS,
} from '../metadata/keys.js';
import type {
  ConnCloseCodeOptions,
  ConnHandshakeRaw,
  ConnInputDecl,
  ConnOptions,
  WsChannelMeta,
  WsEventMeta,
} from '../metadata/types.js';

/**
 * Walk the Nest DI container, collect `@Receive`/`@Send` events, and group them
 * by gateway channel.
 *
 * Grouping rules:
 * 1. Events declared on a `@WebSocketGateway()` class belong to that gateway.
 * 2. Events declared elsewhere (service/controller) with `{ channel: GatewayClass }`
 *    are merged into that gateway's event list.
 * 3. Events with no gateway association and no explicit `channel` become their own
 *    synthetic channel (useful for ad-hoc documentation without a gateway).
 */
export function scanWsChannels(app: INestApplication): WsChannelMeta[] {
  const modulesContainer = app.get(ModulesContainer, { strict: false });

  // Pass 1: index gateway classes + harvest raw events keyed by declaring class.
  const gateways = new Map<Type<unknown>, { meta: GatewayMeta; events: WsEventMeta[] }>();
  const orphanEvents: Array<{ source: Type<unknown>; events: WsEventMeta[] }> = [];
  const seen = new Set<Type<unknown>>();

  const visit = (metatype: Type<unknown> | null | undefined) => {
    if (!metatype || seen.has(metatype)) return;
    seen.add(metatype);

    const events = (Reflect.getOwnMetadata(PUPPLEDOC_WS_EVENTS, metatype) as
      | WsEventMeta[]
      | undefined) ?? [];
    const gatewayMeta = readGatewayMeta(metatype);

    if (gatewayMeta) {
      const tag = Reflect.getMetadata(PUPPLEDOC_WS_CHANNEL, metatype) as
        | { name?: string; tags?: string[] }
        | undefined;
      const conn = readConnHandshake(metatype);
      gateways.set(metatype, {
        meta: {
          name: tag?.name ?? metatype.name,
          tags: tag?.tags,
          ...gatewayMeta,
          conn,
        },
        events: events.slice(),
      });
    } else if (events.length > 0) {
      orphanEvents.push({ source: metatype, events });
    }
  };

  for (const module of modulesContainer.values()) {
    for (const provider of module.providers.values()) visit(provider.metatype as Type<unknown> | null);
    for (const controller of module.controllers.values()) visit(controller.metatype as Type<unknown> | null);
  }

  // Pass 2: distribute orphan events. If `event.channel` is a known gateway ctor,
  // merge into it. Otherwise, collect under a synthetic channel per source class.
  const synthetic = new Map<Type<unknown>, { meta: GatewayMeta; events: WsEventMeta[] }>();
  for (const { source, events } of orphanEvents) {
    for (const ev of events) {
      const target = ev.channel ? gateways.get(ev.channel) : undefined;
      if (target) {
        target.events.push(ev);
        continue;
      }
      let bucket = synthetic.get(source);
      if (!bucket) {
        bucket = { meta: { name: source.name }, events: [] };
        synthetic.set(source, bucket);
      }
      bucket.events.push(ev);
    }
  }

  const channels: WsChannelMeta[] = [];
  for (const { meta, events } of gateways.values()) {
    if (events.length === 0) continue;
    channels.push({
      name: meta.name,
      path: meta.path,
      namespace: meta.namespace,
      events,
      tags: meta.tags,
      conn: meta.conn,
    });
  }
  for (const { meta, events } of synthetic.values()) {
    channels.push({ name: meta.name, events });
  }
  return channels;
}

interface GatewayMeta {
  name: string;
  path?: string;
  namespace?: string;
  tags?: string[];
  conn?: ConnHandshakeRaw;
}

function readConnHandshake(ctor: Type<unknown>): ConnHandshakeRaw | undefined {
  // Decorators are attached to the `handleConnection` method (per
  // `OnGatewayConnection`); fall back to the class itself so the legacy
  // class-level form keeps working during the deprecation window.
  const top = (Reflect.getMetadata(PUPPLEDOC_WS_CONN, ctor, 'handleConnection') ??
    Reflect.getMetadata(PUPPLEDOC_WS_CONN, ctor)) as ConnOptions | undefined;
  const query = readArray(PUPPLEDOC_WS_CONN_QUERY, ctor);
  const headers = readArray(PUPPLEDOC_WS_CONN_HEADER, ctor);
  const bearer = (Reflect.getMetadata(PUPPLEDOC_WS_CONN_BEARER, ctor, 'handleConnection') ??
    Reflect.getMetadata(PUPPLEDOC_WS_CONN_BEARER, ctor)) as { name: string } | undefined;
  const subprotocols = (Reflect.getMetadata(PUPPLEDOC_WS_CONN_SUBPROTOCOLS, ctor, 'handleConnection') ??
    Reflect.getMetadata(PUPPLEDOC_WS_CONN_SUBPROTOCOLS, ctor)) as string[] | undefined;
  const closeCodes = (Reflect.getMetadata(PUPPLEDOC_WS_CONN_CLOSE, ctor, 'handleConnection') ??
    Reflect.getMetadata(PUPPLEDOC_WS_CONN_CLOSE, ctor)) as ConnCloseCodeOptions[] | undefined;
  const result: ConnHandshakeRaw = {};
  if (top?.description) result.description = top.description;
  if (query?.length) result.query = query;
  if (headers?.length) result.headers = headers;
  if (bearer) result.bearerAuth = bearer;
  if (subprotocols?.length) result.subprotocols = subprotocols;
  if (closeCodes?.length) result.closeCodes = [...closeCodes].sort((a, b) => a.code - b.code);
  return result.description || result.query || result.headers || result.bearerAuth ||
    result.subprotocols || result.closeCodes
    ? result
    : undefined;
}

function readArray(key: symbol, ctor: Type<unknown>): ConnInputDecl[] | undefined {
  return (Reflect.getMetadata(key, ctor, 'handleConnection') ??
    Reflect.getMetadata(key, ctor)) as ConnInputDecl[] | undefined;
}

function readGatewayMeta(ctor: Type<unknown>): { path?: string; namespace?: string } | null {
  let found = false;
  let path: string | undefined;
  let namespace: string | undefined;
  for (const key of NEST_GATEWAY_OPTIONS_KEYS) {
    const raw = Reflect.getMetadata(key, ctor);
    if (raw === undefined) continue;
    found = true;
    // `websockets:gateway_options` is the options object; legacy keys held `[port, options]`.
    const options = Array.isArray(raw) ? raw[1] : raw;
    if (options && typeof options === 'object') {
      if (typeof options.path === 'string') path = options.path;
      if (typeof options.namespace === 'string') namespace = options.namespace;
      break;
    }
  }
  if (!found) return null;
  const ns = Reflect.getMetadata(NEST_GATEWAY_NAMESPACE_KEY, ctor);
  if (typeof ns === 'string' && !namespace) namespace = ns;
  return { path, namespace };
}
