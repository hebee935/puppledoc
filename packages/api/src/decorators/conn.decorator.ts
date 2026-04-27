import 'reflect-metadata';
import {
  PUPPLEDOC_WS_CONN,
  PUPPLEDOC_WS_CONN_BEARER,
  PUPPLEDOC_WS_CONN_CLOSE,
  PUPPLEDOC_WS_CONN_HEADER,
  PUPPLEDOC_WS_CONN_QUERY,
  PUPPLEDOC_WS_CONN_SUBPROTOCOLS,
} from '../metadata/keys.js';
import type { ConnCloseCodeOptions, ConnInputDecl, ConnOptions } from '../metadata/types.js';

/**
 * Document the WebSocket handshake on the gateway's `handleConnection` method.
 * Mirrors `@nestjs/swagger`'s per-input pattern (`@ApiQuery`, `@ApiHeader`,
 * `@ApiBearerAuth`) — apply once per documented input.
 *
 * Per-input decorators each accept three forms:
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
 *   @ConnBearerAuth()
 *   async handleConnection(client: Socket) {}
 * }
 * ```
 */
export const Conn = (opts: ConnOptions = {}): MethodDecorator =>
  (target, propertyKey) => {
    Reflect.defineMetadata(PUPPLEDOC_WS_CONN, opts, target.constructor, propertyKey);
  };

/** Declare a handshake URL query param. Pass an inline field decl or a DTO class. */
export const ConnQuery = (decl: ConnInputDecl): MethodDecorator =>
  pushTo(PUPPLEDOC_WS_CONN_QUERY, decl);

/**
 * Declare a header expected on the upgrade. Browsers can't set arbitrary
 * headers on a WebSocket upgrade — these are documented for non-browser
 * clients (curl, wscat, native ws libraries) and socket.io's `extraHeaders`.
 */
export const ConnHeader = (decl: ConnInputDecl): MethodDecorator =>
  pushTo(PUPPLEDOC_WS_CONN_HEADER, decl);

/**
 * Mark the connection as bearer-token authenticated, mirroring
 * `@ApiBearerAuth`. Tokens may travel via the `?token=` query, an
 * `Authorization: Bearer <jwt>` header (non-browser clients), or socket.io's
 * `handshake.auth.token` field — the docs UI surfaces all three.
 *
 * The optional `name` matches the `securitySchemes` key on the document; it
 * defaults to `'bearer'` for parity with `@ApiBearerAuth()`.
 */
export const ConnBearerAuth = (name = 'bearer'): MethodDecorator =>
  (target, propertyKey) => {
    Reflect.defineMetadata(
      PUPPLEDOC_WS_CONN_BEARER,
      { name },
      target.constructor,
      propertyKey,
    );
  };

/**
 * Declare the subprotocols (`Sec-WebSocket-Protocol`) the server is willing to
 * negotiate, in preference order. The docs UI lists them and the tester
 * pre-fills its subprotocols input from this declaration.
 *
 * ```ts
 * @ConnSubprotocols('v1.chat', 'json.v2')
 * handleConnection(client) {}
 * ```
 */
export const ConnSubprotocols = (...protocols: string[]): MethodDecorator =>
  (target, propertyKey) => {
    Reflect.defineMetadata(
      PUPPLEDOC_WS_CONN_SUBPROTOCOLS,
      protocols.filter(Boolean),
      target.constructor,
      propertyKey,
    );
  };

/**
 * Document a close code the server may send, mirroring `@ApiResponse`'s
 * per-status pattern. Apply once per code (1000–1015 reserved, 4000–4999
 * application-defined per RFC 6455).
 *
 * ```ts
 * @ConnCloseCode({ code: 4001, reason: 'unauthorized', description: 'JWT failed validation.' })
 * @ConnCloseCode({ code: 4003, reason: 'workspace_not_found' })
 * handleConnection(client) {}
 * ```
 */
export const ConnCloseCode = (opts: ConnCloseCodeOptions): MethodDecorator =>
  (target, propertyKey) => {
    const existing =
      (Reflect.getOwnMetadata(PUPPLEDOC_WS_CONN_CLOSE, target.constructor, propertyKey) as
        | ConnCloseCodeOptions[]
        | undefined) ?? [];
    Reflect.defineMetadata(
      PUPPLEDOC_WS_CONN_CLOSE,
      [opts, ...existing],
      target.constructor,
      propertyKey,
    );
  };

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
