import 'reflect-metadata';
import {
  SPACE_API_WS_CONN,
  SPACE_API_WS_CONN_AUTH,
  SPACE_API_WS_CONN_HEADER,
  SPACE_API_WS_CONN_QUERY,
} from '../metadata/keys.js';
import type { ConnInputDecl, ConnOptions } from '../metadata/types.js';

/**
 * Document the WebSocket handshake on the gateway's `handleConnection` method.
 * Mirrors `@nestjs/swagger`'s per-input pattern (`@ApiQuery`, `@ApiHeader`)
 * — apply once per documented input.
 *
 * Each per-input decorator accepts three forms:
 *  - Inline: `{ name: 'token', required: true, description: '...' }`
 *  - DTO class shorthand: `(SomeDto)` — expanded via `@ApiProperty` metadata
 *  - DTO class explicit: `{ type: SomeDto }` — same as the shorthand
 *
 * ```ts
 * class HandshakeQueryDto {
 *   @ApiProperty({ description: 'JWT bearer.', example: 'eyJ...' })
 *   token!: string;
 *   @ApiProperty({ description: 'Workspace slug.' })
 *   workspace!: string;
 * }
 *
 * @WebSocketGateway({ namespace: '/chat' })
 * export class ChatGateway implements OnGatewayConnection {
 *   @Conn({ description: 'Authenticate with a workspace-scoped JWT.' })
 *   @ConnQuery(HandshakeQueryDto)
 *   @ConnHeader({ name: 'Authorization', description: 'Bearer <jwt>.' })
 *   async handleConnection(client: Socket) {}
 * }
 * ```
 */
export const Conn = (opts: ConnOptions = {}): MethodDecorator =>
  (target, propertyKey) => {
    Reflect.defineMetadata(SPACE_API_WS_CONN, opts, target.constructor, propertyKey);
  };

/** Declare a handshake URL query param. Pass an inline field decl or a DTO class. */
export const ConnQuery = (decl: ConnInputDecl): MethodDecorator =>
  pushTo(SPACE_API_WS_CONN_QUERY, decl);

/**
 * Declare a header expected on the upgrade. Browsers can't set arbitrary
 * headers on a WebSocket upgrade — these are documented for non-browser
 * clients (curl, wscat, native ws libraries) and socket.io's `extraHeaders`.
 */
export const ConnHeader = (decl: ConnInputDecl): MethodDecorator =>
  pushTo(SPACE_API_WS_CONN_HEADER, decl);

/**
 * Declare a field on socket.io's `client.handshake.auth` payload.
 * Ignored by clients using the raw WebSocket protocol.
 */
export const ConnAuth = (decl: ConnInputDecl): MethodDecorator =>
  pushTo(SPACE_API_WS_CONN_AUTH, decl);

function pushTo(key: symbol, decl: ConnInputDecl): MethodDecorator {
  return (target, propertyKey) => {
    const existing =
      (Reflect.getOwnMetadata(key, target.constructor, propertyKey) as
        | ConnInputDecl[]
        | undefined) ?? [];
    // Method decorators evaluate bottom-up: prepend so source order is preserved.
    Reflect.defineMetadata(key, [decl, ...existing], target.constructor, propertyKey);
  };
}
