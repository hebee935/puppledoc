import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import { PuppleDocModule } from '@puppledoc/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useWebSocketAdapter(new WsAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription(
      [
        '**Chat API** provides channel management, message history, and a realtime',
        'WebSocket gateway. Pair it with the [Auth API](http://localhost:3005/auth/docs)',
        'for login and the [Push API](http://localhost:3004/push/docs) for notifications.',
        '',
        '## Getting started',
        '',
        'Send an `Authorization: Bearer <token>` header on every REST request and',
        'include a `token` query parameter when opening the WebSocket:',
        '',
        '```bash',
        'curl -H "Authorization: Bearer $TOKEN" http://localhost:3077/channels',
        'wscat -c "ws://localhost:3077/realtime?token=$TOKEN"',
        '```',
        '',
        '## What you can do',
        '',
        '- Create direct and group channels — `POST /channels`',
        '- Send, read, and search messages — `GET /channels/:id/messages`',
        '- Receive *live* frames over the `realtime` gateway',
        '- Upload and preview attachments up to **25MB**',
        '',
        '## Rate limits',
        '',
        '| Scope   | Requests/min | Burst |',
        '|---------|--------------|-------|',
        '| REST    | 120          | 30    |',
        '| WS send | 60           | 15    |',
        '',
        '> Hitting the limit returns `429 Too Many Requests` with a `Retry-After`',
        '> header. Back off exponentially before retrying.',
        '',
        '---',
        '',
        'See the [changelog](https://github.com/hebee935/puppledoc/blob/master/CHANGELOG.md) for breaking changes between versions.',
      ].join('\n'),
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${process.env.PORT ?? 3077}`, 'Local')
    .build();

  await PuppleDocModule.setup('/docs', app, config);

  const port = Number(process.env.PORT ?? 3077);
  await app.listen(port);
  console.log(`Playground ready on :${port}`);
  console.log(`  REST  → http://localhost:${port}/channels`);
  console.log(`  WS    → ws://localhost:${port}/realtime`);
  console.log(`  Docs  → http://localhost:${port}/docs`);
  console.log(`  Spec  → http://localhost:${port}/docs/openapi.json`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
