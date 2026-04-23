# `@space/api`

NestJS 플러그인. `@nestjs/swagger`의 OpenAPI 3.1 문서에 **WebSocket 이벤트 메타**(`x-websocket` extension)를 덧붙이고, **REST와 WS를 같은 화면에서 문서화·테스트**한다.

- 📦 `@space/api` — NestJS 모듈 + 데코레이터
- 🎨 `@space/api-ui` — 정적 UI 번들 (core가 내부에서 서빙)

## Install

```bash
pnpm add @space/api
# or: npm install @space/api  /  yarn add @space/api
```

사용자는 UI를 별도로 빌드할 필요가 없습니다. `@space/api`의 tarball에 이미 `@space/api-ui/dist`가 포함돼 있고, core가 그대로 static 서빙합니다.

## Usage

```ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import { SpaceApiModule } from '@space/api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('D1 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  await SpaceApiModule.setup('/docs', app, config, {
    servers: [{ label: 'Local', url: 'http://localhost:3000' }],
  });

  await app.listen(3000);
}
bootstrap();
```

`SpaceApiModule.setup`이 내부에서 `SwaggerModule.createDocument`를 호출하고, `@Receive` / `@Send` 메타를 스캔해서 WebSocket 섹션을 덧붙입니다. 이미 만들어둔 document가 있으면 세 번째 인자로 그대로 넘길 수도 있습니다 (`Swagger`와 동일한 시그니처).

### WebSocket 문서화

게이트웨이 메서드에 `@Receive` / `@Send`를 얹으면 프레임 타입과 DTO가 그대로 문서에 반영됩니다.

```ts
import { MessageBody, SubscribeMessage, WebSocketGateway, WsResponse } from '@nestjs/websockets';
import { Receive, Send } from '@space/api';

@WebSocketGateway({ path: '/realtime' })
@Send({ event: 'presence.update', payload: PresenceDto })
export class ChatGateway {
  @Receive({
    event: 'chat.message',
    payload: ChatMessageDto,
    reply: ChatAckDto,
  })
  @SubscribeMessage('chat.message')
  onMessage(@MessageBody() dto: ChatMessageDto): WsResponse<ChatAckDto> {
    // ...
  }
}
```

서비스나 컨트롤러 안에서 이벤트를 emit하는 경우 `channel` 옵션으로 귀속 채널을 지정하면 됩니다.

```ts
@Send({
  channel: ChatGateway,
  event: 'message.created',
  payload: MessageCreatedDto,
})
export class MessagesController {
  /* ... */
}
```

접속:

- `http://localhost:3000/docs` — Docs UI
- `http://localhost:3000/docs/openapi.json` — enriched OpenAPI document

## Development (이 monorepo를 직접 기여/빌드할 때만)

```bash
pnpm install
pnpm -w turbo run build --filter='!playground'
pnpm --filter playground dev   # http://localhost:3077/docs
```

Playground는 실제 사용 예제이자 라이브러리 스모크 테스트 환경입니다. 자세한 릴리스 절차는 [`PUBLISHING.md`](./PUBLISHING.md) 참고.

자세한 스펙/디자인: [`SPEC.md`](./SPEC.md), [`DESIGN.md`](./DESIGN.md).
