import 'reflect-metadata';
import { PUPPLEDOC_WS_CHANNEL } from '../metadata/keys.js';

/**
 * Tag a WebSocket gateway. Mirrors `@ApiTags` — pass one or more strings;
 * the first is used as the channel's display name in the sidebar, the rest
 * are recorded as additional tags on the channel for downstream tooling.
 *
 * ```ts
 * @WsTags('Realtime', 'Messaging')
 * @WebSocketGateway({ namespace: '/chat' })
 * export class ChatGateway {}
 * ```
 */
export const WsTags = (...names: string[]): ClassDecorator =>
  (target) => {
    const cleaned = names.filter(Boolean);
    if (cleaned.length === 0) return;
    Reflect.defineMetadata(
      PUPPLEDOC_WS_CHANNEL,
      { name: cleaned[0], tags: cleaned },
      target,
    );
  };
