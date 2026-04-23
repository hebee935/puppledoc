import type { INestApplication, Type } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { NEST_GATEWAY_NAMESPACE_KEY, NEST_GATEWAY_OPTIONS_KEYS, SPACE_API_WS_EVENTS } from '../metadata/keys.js';
import type { WsChannelMeta, WsEventMeta } from '../metadata/types.js';

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

    const events = (Reflect.getOwnMetadata(SPACE_API_WS_EVENTS, metatype) as
      | WsEventMeta[]
      | undefined) ?? [];
    const gatewayMeta = readGatewayMeta(metatype);

    if (gatewayMeta) {
      gateways.set(metatype, {
        meta: { name: metatype.name, ...gatewayMeta },
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
    channels.push({ name: meta.name, path: meta.path, namespace: meta.namespace, events });
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
