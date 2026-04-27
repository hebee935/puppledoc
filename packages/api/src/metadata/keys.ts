// Metadata keys used by @puppledoc/nestjs-api-reference. Symbols so they can't collide with user/library keys.
export const SPACE_API_WS_EVENTS = Symbol('space-api:ws-events');
export const SPACE_API_WS_CHANNEL = Symbol('space-api:ws-channel');
export const SPACE_API_WS_CONN = Symbol('space-api:ws-conn');
export const SPACE_API_WS_CONN_QUERY = Symbol('space-api:ws-conn-query');
export const SPACE_API_WS_CONN_HEADER = Symbol('space-api:ws-conn-header');
export const SPACE_API_WS_CONN_BEARER = Symbol('space-api:ws-conn-bearer');
export const SPACE_API_WS_CONN_SUBPROTOCOLS = Symbol('space-api:ws-conn-subprotocols');
export const SPACE_API_WS_CONN_CLOSE = Symbol('space-api:ws-conn-close');

// NestJS @WebSocketGateway stores its options under `websockets:gateway_options` (10.x+).
// We keep a fallback list in case the constant ever changes again.
export const NEST_GATEWAY_OPTIONS_KEYS = [
  'websockets:gateway_options',
  '__gatewayMetadata__',
] as const;
export const NEST_GATEWAY_NAMESPACE_KEY = 'websockets:namespace';
