import type { Type } from '@nestjs/common';

export type WsEventDirection = 'recv' | 'send';

export interface ReceiveOptions {
  /** Frame `type` value (e.g. 'chat.message'). */
  event: string;
  /** DTO class used to validate + derive the payload JSON schema. */
  payload: Type<unknown>;
  summary?: string;
  description?: string;
  /** If the server replies synchronously, describe the reply frame shape. */
  reply?: Type<unknown>;
  auth?: boolean;
  /**
   * When declared outside the gateway class (e.g. on a service or controller),
   * point at the gateway class so the event is documented under that channel's URL.
   * Omit when the decorator is applied to the gateway itself.
   */
  channel?: Type<unknown>;
}

export interface SendOptions {
  event: string;
  payload: Type<unknown>;
  summary?: string;
  description?: string;
  auth?: boolean;
  /** See {@link ReceiveOptions.channel}. */
  channel?: Type<unknown>;
}

export interface WsEventMeta {
  direction: WsEventDirection;
  event: string;
  payload: Type<unknown>;
  summary?: string;
  description?: string;
  reply?: Type<unknown>;
  auth?: boolean;
  /** Gateway class this event belongs to (explicit when the decorator is on a service/controller). */
  channel?: Type<unknown>;
  /** Method name the decorator was attached to (undefined for class-level @Send). */
  handler?: string;
}

export interface WsChannelMeta {
  name: string;
  path?: string;
  namespace?: string;
  events: WsEventMeta[];
  conn?: ConnHandshake;
}

export interface WsChannelDoc {
  name: string;
  url: string;
  namespace?: string;
  events: WsEventDoc[];
  conn?: ConnHandshake;
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
}

export interface ConnOptions {
  /** Markdown describing how the connection authenticates / hand-shakes. */
  description?: string;
}

/** Aggregated handshake doc consumed by the generator + UI. */
export interface ConnHandshake {
  description?: string;
  query?: ConnInputOptions[];
  headers?: ConnInputOptions[];
  auth?: ConnInputOptions[];
}

export interface WsEventDoc {
  direction: WsEventDirection;
  event: string;
  summary?: string;
  description?: string;
  auth: boolean;
  payload: { $ref: string } | SchemaLike;
  reply?: { $ref: string } | SchemaLike;
}

/** Inline JSON-Schema-ish shape. Open enough to accept the Swagger SchemaObject. */
export type SchemaLike = {
  [key: string]: unknown;
}

export interface SpaceApiUiOptions {
  /** Title shown in the sidebar brand area. Falls back to `document.info.title`. */
  title?: string;
  /** Visual theme. Only `light` is implemented in v0.1. */
  theme?: 'light' | 'dark' | 'auto';
  /** Server list shown in the test panel's baseURL switcher. */
  servers?: { label: string; url: string }[];
}

/** @deprecated kept as an alias for compatibility — use the 4-arg `setup` form. */
export type SpaceApiOptions = SpaceApiUiOptions;

/** Our OpenAPI extension. Lives under `x-websocket` on the root document. */
export interface XWebsocketExtension {
  channels: WsChannelDoc[];
}
