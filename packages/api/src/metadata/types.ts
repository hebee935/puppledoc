import type { Type } from '@nestjs/common';

export type WsEventDirection = 'recv' | 'send';

export interface ReceiveOptions {
  /** Frame `type` value (e.g. 'chat.message'). */
  event: string;
  /**
   * Stable identifier mirroring OpenAPI's `operationId`. Defaults to `event`;
   * override when codegen requires a name distinct from the wire `type`.
   */
  operationId?: string;
  /** DTO class used to validate + derive the payload JSON schema. */
  payload: Type<unknown>;
  summary?: string;
  description?: string;
  /**
   * If the server replies synchronously, describe the reply frame shape.
   * Pass either a DTO class (legacy shorthand) or `{ event, payload }` to
   * also document the reply's outgoing event name.
   */
  reply?: Type<unknown> | { event: string; payload: Type<unknown> };
  auth?: boolean;
  /** Mark this event as deprecated; the docs render a strike-through + badge. */
  deprecated?: boolean;
  /**
   * When declared outside the gateway class (e.g. on a service or controller),
   * point at the gateway class so the event is documented under that channel's URL.
   * Omit when the decorator is applied to the gateway itself.
   */
  channel?: Type<unknown>;
}

export interface SendOptions {
  event: string;
  /** See {@link ReceiveOptions.operationId}. */
  operationId?: string;
  payload: Type<unknown>;
  summary?: string;
  description?: string;
  auth?: boolean;
  deprecated?: boolean;
  /** See {@link ReceiveOptions.channel}. */
  channel?: Type<unknown>;
}

export interface WsEventMeta {
  direction: WsEventDirection;
  event: string;
  operationId?: string;
  payload: Type<unknown>;
  summary?: string;
  description?: string;
  reply?: Type<unknown>;
  /** Outgoing event name for the reply, when the user supplied `reply: { event, payload }`. */
  replyEvent?: string;
  auth?: boolean;
  deprecated?: boolean;
  /** Gateway class this event belongs to (explicit when the decorator is on a service/controller). */
  channel?: Type<unknown>;
  /** Method name the decorator was attached to (undefined for class-level @Send). */
  handler?: string;
}

export type WsTransport = 'ws' | 'socket.io';

export interface WsChannelMeta {
  name: string;
  path?: string;
  namespace?: string;
  events: WsEventMeta[];
  /** Additional tag names beyond the primary `name`, in source order. */
  tags?: string[];
  /** Raw handshake decls; resolved into `ConnHandshake` by the generator. */
  conn?: ConnHandshakeRaw;
  /** Inferred from the gateway options at scan time. */
  transport?: WsTransport;
}

export interface WsChannelDoc {
  name: string;
  url: string;
  namespace?: string;
  events: WsEventDoc[];
  tags?: string[];
  conn?: ConnHandshake;
  /** Wire protocol the channel uses; the docs UI tester branches on this. */
  transport?: WsTransport;
}

/**
 * Shape of a single handshake input, mirroring `@nestjs/swagger`'s
 * `ApiQueryOptions` / `ApiHeaderOptions` so callers don't have to learn a
 * second vocabulary.
 */
export interface ConnInputOptions {
  name: string;
  required?: boolean;
  description?: string;
  example?: string;
  /**
   * Mark this input as the destination for the Authorize-panel bearer token.
   * The docs tester pre-fills its value with the current `token` when the
   * row's value is empty. Inputs whose name is exactly `'token'` are treated
   * as bearer by convention even without this flag.
   */
  bearer?: boolean;
}

/**
 * What the per-input decorators (`@ConnQuery` etc.) actually accept. Three
 * forms, matching `@ApiQuery`'s flavor: an inline single-field declaration,
 * a DTO class to expand, or `{ type: Class }` for explicit DTO wrapping.
 */
export type ConnInputDecl =
  | ConnInputOptions
  | Type<unknown>
  | { type: Type<unknown> };

export interface ConnOptions {
  /** Markdown describing how the connection authenticates / hand-shakes. */
  description?: string;
}

export interface ConnCloseCodeOptions {
  /** RFC 6455 close code (1000–1015 reserved, 4000–4999 application). */
  code: number;
  /** Short reason phrase the server sends in the close frame. */
  reason?: string;
  /** Human description of when this code is used. */
  description?: string;
}

/** Raw (pre-expansion) shape stored on the gateway by the decorators. */
export interface ConnHandshakeRaw {
  description?: string;
  query?: ConnInputDecl[];
  headers?: ConnInputDecl[];
  bearerAuth?: { name: string };
  subprotocols?: string[];
  closeCodes?: ConnCloseCodeOptions[];
}

/** Resolved handshake doc consumed by the generator + UI. */
export interface ConnHandshake {
  description?: string;
  query?: ConnInputOptions[];
  headers?: ConnInputOptions[];
  bearerAuth?: { name: string };
  /** Sec-WebSocket-Protocol values offered by the server, in preference order. */
  subprotocols?: string[];
  /** Close codes the server may emit, sorted by code ascending. */
  closeCodes?: ConnCloseCodeOptions[];
}

export interface WsEventDoc {
  direction: WsEventDirection;
  event: string;
  operationId?: string;
  summary?: string;
  description?: string;
  auth: boolean;
  deprecated?: boolean;
  payload: { $ref: string } | SchemaLike;
  reply?: { $ref: string } | SchemaLike;
  /** Event name the server emits for the reply, when declared. */
  replyEvent?: string;
}

/** Inline JSON-Schema-ish shape. Open enough to accept the Swagger SchemaObject. */
export type SchemaLike = {
  [key: string]: unknown;
}

/**
 * UI-only options passed as the optional 4th argument to
 * `PuppleDocModule.setup`. Title, servers, and other OpenAPI-derivable values
 * are read from the document itself; this object only carries settings that
 * have no OpenAPI counterpart.
 */
export interface PuppleDocUiOptions {
  /** Visual theme. `auto` follows the OS `prefers-color-scheme` media query. */
  theme?: 'light' | 'dark' | 'auto';
}

/** @deprecated alias kept for older imports. Use {@link PuppleDocUiOptions}. */
export type PuppleDocOptions = PuppleDocUiOptions;

/** Our OpenAPI extension. Lives under `x-websocket` on the root document. */
export interface XWebsocketExtension {
  channels: WsChannelDoc[];
}
