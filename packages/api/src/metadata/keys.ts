// Metadata keys used by @puppledoc/nestjs-api-reference. Symbols so they can't collide with user/library keys.
export const PUPPLEDOC_WS_EVENTS = Symbol('puppledoc:ws-events');
export const PUPPLEDOC_WS_CHANNEL = Symbol('puppledoc:ws-channel');
export const PUPPLEDOC_WS_CONN = Symbol('puppledoc:ws-conn');
export const PUPPLEDOC_WS_CONN_QUERY = Symbol('puppledoc:ws-conn-query');
export const PUPPLEDOC_WS_CONN_HEADER = Symbol('puppledoc:ws-conn-header');
export const PUPPLEDOC_WS_CONN_BEARER = Symbol('puppledoc:ws-conn-bearer');
export const PUPPLEDOC_WS_CONN_SUBPROTOCOLS = Symbol('puppledoc:ws-conn-subprotocols');
export const PUPPLEDOC_WS_CONN_CLOSE = Symbol('puppledoc:ws-conn-close');

// NestJS @WebSocketGateway stores its options under `websockets:gateway_options` (10.x+).
// We keep a fallback list in case the constant ever changes again.
export const NEST_GATEWAY_OPTIONS_KEYS = [
  'websockets:gateway_options',
  '__gatewayMetadata__',
] as const;
export const NEST_GATEWAY_NAMESPACE_KEY = 'websockets:namespace';
