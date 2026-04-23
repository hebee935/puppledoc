// Public API surface. Keep this small.
export { Receive } from './decorators/receive.decorator.js';
export { Send } from './decorators/send.decorator.js';
export { SpaceApiModule } from './module/space-api.module.js';
export type {
  ReceiveOptions,
  SendOptions,
  SpaceApiOptions,
  SpaceApiUiOptions,
  WsEventDirection,
  WsEventMeta,
  WsChannelMeta,
} from './metadata/types.js';
