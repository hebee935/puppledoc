import 'reflect-metadata';
import { SPACE_API_WS_CHANNEL } from '../metadata/keys.js';

/**
 * Set the display name for a WebSocket gateway's group in the docs sidebar.
 * Without this decorator the gateway class name is used verbatim (e.g. `ChatGateway`).
 *
 * ```ts
 * @WsTags('Realtime chat')
 * @WebSocketGateway({ namespace: '/chat' })
 * export class ChatGateway {}
 * ```
 */
export const WsTags = (name: string): ClassDecorator =>
  (target) => {
    Reflect.defineMetadata(SPACE_API_WS_CHANNEL, { name }, target);
  };
