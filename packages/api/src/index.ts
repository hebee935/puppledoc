// Public API surface. Keep this small.
export { Receive } from './decorators/receive.decorator.js';
export { Send } from './decorators/send.decorator.js';
export { WsTags } from './decorators/ws-tags.decorator.js';
export {
  Conn,
  ConnQuery,
  ConnHeader,
  ConnBearerAuth,
  ConnSubprotocols,
  ConnCloseCode,
} from './decorators/conn.decorator.js';
export { PuppleDocModule } from './module/puppledoc.module.js';
export type {
  ConnOptions,
  ConnInputOptions,
  ConnInputDecl,
  ConnHandshake,
  ConnHandshakeRaw,
  ConnCloseCodeOptions,
  ReceiveOptions,
  SendOptions,
  PuppleDocOptions,
  PuppleDocUiOptions,
  WsEventDirection,
  WsEventMeta,
  WsChannelMeta,
} from './metadata/types.js';
