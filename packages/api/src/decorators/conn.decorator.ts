import 'reflect-metadata';
import {
  SPACE_API_WS_CONN,
  SPACE_API_WS_CONN_AUTH,
  SPACE_API_WS_CONN_HEADER,
  SPACE_API_WS_CONN_QUERY,
} from '../metadata/keys.js';
import type { ConnInputOptions, ConnOptions } from '../metadata/types.js';

/**
 * Document the WebSocket handshake on the gateway's `handleConnection` method —
 * mirrors `@ApiQuery` / `@ApiHeader`, which decorate the controller method that
 * receives the request rather than the class itself.
 *
 * Use `@Conn` for an overall description, then repeat the per-input decorators
 * once per documented field. Apply the whole stack to the method that
 * implements the `OnGatewayConnection` lifecycle hook.
 *
 * ```ts
 * @WebSocketGateway({ namespace: '/chat' })
 * export class ChatGateway implements OnGatewayConnection {
 *   @Conn({ description: 'Authenticate with a workspace-scoped JWT.' })
 *   @ConnQuery({ name: 'token', required: true, description: 'JWT bearer.' })
 *   @ConnQuery({ name: 'workspace', required: true })
 *   @ConnHeader({ name: 'Authorization', description: 'Bearer <jwt> for non-browser clients.' })
 *   @ConnAuth({ name: 'token', required: true, description: 'socket.io handshake.auth payload.' })
 *   async handleConnection(client: Socket) {}
 * }
 * ```
 */
export const Conn = (opts: ConnOptions = {}): MethodDecorator =>
  (target, propertyKey) => {
    Reflect.defineMetadata(SPACE_API_WS_CONN, opts, target.constructor, propertyKey);
  };

/** Declare a handshake URL query param. Repeat the decorator per param. */
export const ConnQuery = (opts: ConnInputOptions): MethodDecorator =>
  pushTo(SPACE_API_WS_CONN_QUERY, opts);

/**
 * Declare a header expected on the upgrade. Browsers can't set arbitrary
 * headers on a WebSocket upgrade — these are documented for non-browser
 * clients (curl, wscat, native ws libraries) and socket.io's `extraHeaders`.
 */
export const ConnHeader = (opts: ConnInputOptions): MethodDecorator =>
  pushTo(SPACE_API_WS_CONN_HEADER, opts);

/**
 * Declare a field on socket.io's `client.handshake.auth` payload.
 * Ignored by clients using the raw WebSocket protocol.
 */
export const ConnAuth = (opts: ConnInputOptions): MethodDecorator =>
  pushTo(SPACE_API_WS_CONN_AUTH, opts);

function pushTo(key: symbol, opts: ConnInputOptions): MethodDecorator {
  return (target, propertyKey) => {
    const existing =
      (Reflect.getOwnMetadata(key, target.constructor, propertyKey) as
        | ConnInputOptions[]
        | undefined) ?? [];
    // Method decorators evaluate bottom-up: prepend so source order is preserved.
    Reflect.defineMetadata(key, [opts, ...existing], target.constructor, propertyKey);
  };
}
