import 'reflect-metadata';
import { SPACE_API_WS_EVENTS } from '../metadata/keys.js';
import type { ReceiveOptions, WsEventMeta } from '../metadata/types.js';

/**
 * Mark a gateway method as receiving a WebSocket frame.
 *
 * ```ts
 * @Receive({ event: 'chat.message', payload: ChatMessageDto, reply: AckDto })
 * @SubscribeMessage('chat.message')
 * onMessage(@MessageBody() dto: ChatMessageDto) {}
 * ```
 */
export const Receive = (opts: ReceiveOptions): MethodDecorator =>
  (target, propertyKey) => {
    const ctor = target.constructor;
    const existing: WsEventMeta[] = Reflect.getOwnMetadata(SPACE_API_WS_EVENTS, ctor) ?? [];
    existing.push({
      direction: 'recv',
      event: opts.event,
      payload: opts.payload,
      summary: opts.summary,
      description: opts.description,
      reply: opts.reply,
      auth: opts.auth,
      channel: opts.channel,
      handler: String(propertyKey),
    });
    Reflect.defineMetadata(SPACE_API_WS_EVENTS, existing, ctor);
  };
