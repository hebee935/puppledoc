// Public API surface. Keep this small.
export { Receive } from './decorators/receive.decorator.js';
export { Send } from './decorators/send.decorator.js';
export { WsTags } from './decorators/ws-tags.decorator.js';
export { Conn, ConnQuery, ConnHeader, ConnAuth } from './decorators/conn.decorator.js';
export { SpaceApiModule } from './module/space-api.module.js';
export type {
  ConnOptions,
  ConnInputOptions,
  ConnHandshake,
  ReceiveOptions,
  SendOptions,
  SpaceApiOptions,
  SpaceApiUiOptions,
  WsEventDirection,
  WsEventMeta,
  WsChannelMeta,
} from './metadata/types.js';
