import 'reflect-metadata';
import { SPACE_API_WS_EVENTS } from '../metadata/keys.js';
import type { SendOptions, WsEventMeta } from '../metadata/types.js';

/**
 * Declare a WebSocket frame the server emits.
 *
 * Usable as either a method decorator (attach near the emitter) or a class decorator
 * (stack multiple on a gateway to describe server-pushed events).
 *
 * ```ts
 * @Send({ event: 'presence.update', payload: PresenceDto })
 * @WebSocketGateway({ path: '/realtime' })
 * export class ChatGateway {}
 * ```
 */
export const Send = (opts: SendOptions): ClassDecorator & MethodDecorator =>
  ((target: object, propertyKey?: string | symbol) => {
    const ctor = propertyKey === undefined ? (target as Function) : (target as { constructor: Function }).constructor;
    const existing: WsEventMeta[] = Reflect.getOwnMetadata(SPACE_API_WS_EVENTS, ctor) ?? [];
    existing.push({
      direction: 'send',
      event: opts.event,
      operationId: opts.operationId,
      payload: opts.payload,
      summary: opts.summary,
      description: opts.description,
      auth: opts.auth,
      deprecated: opts.deprecated,
      channel: opts.channel,
      handler: propertyKey === undefined ? undefined : String(propertyKey),
    });
    Reflect.defineMetadata(SPACE_API_WS_EVENTS, existing, ctor);
  }) as ClassDecorator & MethodDecorator;
