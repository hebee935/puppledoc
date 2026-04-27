# `@puppledoc/nestjs-api-reference`

NestJS plugin that extends `@nestjs/swagger` with WebSocket documentation (`x-websocket` OpenAPI extension) and serves a bundled testing UI for both REST and WS.

## Install

```bash
pnpm add @puppledoc/nestjs-api-reference
```

Peers: `@nestjs/common`, `@nestjs/core`, `@nestjs/swagger`, `@nestjs/websockets`, `reflect-metadata`.

## Usage

```ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import { SpaceApiModule } from '@puppledoc/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('My API').setVersion('1.0').addBearerAuth().build();

  await SpaceApiModule.setup('/docs', app, config, {
    servers: [{ label: 'Local', url: 'http://localhost:3000' }],
  });

  await app.listen(3000);
}
bootstrap();
```

Already have a pre-built document? Pass it instead — the signature matches
`SwaggerModule.setup`:

```ts
const document = SwaggerModule.createDocument(app, config);
SpaceApiModule.setup('/docs', app, document);
```

Browse `http://localhost:3000/docs`. The enriched OpenAPI JSON is at `/docs/openapi.json`.

### WebSocket frames

```ts
import { MessageBody, SubscribeMessage, WebSocketGateway, WsResponse } from '@nestjs/websockets';
import { Receive, Send } from '@puppledoc/nestjs-api-reference';
import { ChatMessageDto, ChatAckDto, PresenceDto } from './dto';

@WebSocketGateway({ path: '/realtime' })
@Send({ event: 'presence.update', payload: PresenceDto })
export class ChatGateway {
  @Receive({ event: 'chat.message', payload: ChatMessageDto, reply: ChatAckDto })
  @SubscribeMessage('chat.message')
  onMessage(@MessageBody() dto: ChatMessageDto): WsResponse<ChatAckDto> {
    return { event: 'chat.message.ack', data: { /* ... */ } };
  }
}
```

Outside the gateway (service / controller), point at the channel:

```ts
@Send({ channel: ChatGateway, event: 'message.created', payload: MessageCreatedDto })
export class MessagesController { /* ... */ }
```

## API

### `@Receive(options)` — method decorator

```ts
interface ReceiveOptions {
  event: string;            // frame `type` value
  payload: Type;            // DTO class
  reply?: Type;             // synchronous reply DTO (optional)
  summary?: string;
  description?: string;
  auth?: boolean;           // default true
  channel?: Type;           // when declared outside the gateway class
}
```

### `@Send(options)` — class or method decorator

```ts
interface SendOptions {
  event: string;
  payload: Type;
  summary?: string;
  description?: string;
  auth?: boolean;
  channel?: Type;
}
```

### `SpaceApiModule.setup(path, app, configOrDocument, options?)`

Overloaded: accepts a `DocumentBuilder().build()` config, or a full
`SwaggerModule.createDocument(...)` result. WS metadata is merged in either way.

```ts
interface SpaceApiUiOptions {
  title?: string;                                   // sidebar brand (fallback: document.info.title)
  theme?: 'light' | 'dark' | 'auto';                // v0.1: light only
  servers?: { label: string; url: string }[];       // base URL switcher
}
```

Registers two routes under `path`:

- `GET /{path}` — the Docs UI
- `GET /{path}/openapi.json` — the enriched document

## Notes

- The UI makes **real** requests from the browser. Configure CORS on your Nest app for the docs origin when testing against a remote server.
- Tokens live in `localStorage` only after the user saves them via the Authorize modal.
- WebSocket tokens are attached as `?token=` on the handshake URL (browsers can't set headers on the WS upgrade).
- DTO schemas use `@nestjs/swagger`'s own extractor — `@ApiProperty()` on fields produces the richest output; the Swagger CLI plugin also works.
