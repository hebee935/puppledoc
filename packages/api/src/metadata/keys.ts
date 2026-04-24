// Metadata keys used by @puppledoc/nestjs-api-reference. Symbols so they can't collide with user/library keys.
export const SPACE_API_WS_EVENTS = Symbol('space-api:ws-events');

// NestJS @WebSocketGateway stores its options under `websockets:gateway_options` (10.x+).
// We keep a fallback list in case the constant ever changes again.
export const NEST_GATEWAY_OPTIONS_KEYS = [
  'websockets:gateway_options',
  '__gatewayMetadata__',
] as const;
export const NEST_GATEWAY_NAMESPACE_KEY = 'websockets:namespace';
