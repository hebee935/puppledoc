import 'reflect-metadata';
import { PUPPLEDOC_WS_EVENTS } from '../metadata/keys.js';
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
    const existing: WsEventMeta[] = Reflect.getOwnMetadata(PUPPLEDOC_WS_EVENTS, ctor) ?? [];
    // `reply` accepts either a DTO class (legacy shorthand) or `{ event, payload }`
    // when the caller wants to also document the reply's outgoing event name.
    const replyClass = typeof opts.reply === 'function'
      ? opts.reply
      : opts.reply?.payload;
    const replyEvent = typeof opts.reply === 'object' && opts.reply !== null && 'event' in opts.reply
      ? opts.reply.event
      : undefined;
    existing.push({
      direction: 'recv',
      event: opts.event,
      operationId: opts.operationId,
      payload: opts.payload,
      summary: opts.summary,
      description: opts.description,
      reply: replyClass,
      replyEvent,
      auth: opts.auth,
      deprecated: opts.deprecated,
      channel: opts.channel,
      handler: String(propertyKey),
    });
    Reflect.defineMetadata(PUPPLEDOC_WS_EVENTS, existing, ctor);
  };
