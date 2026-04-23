import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import { SpaceApiModule } from '@space/api';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useWebSocketAdapter(new WsAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription('Realtime chat: channels, messages, and a WebSocket gateway for live frames.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  await SpaceApiModule.setup('/docs', app, config, {
    title: 'Chat API',
    servers: [
      { label: 'Local', url: `http://localhost:${process.env.PORT ?? 3077}` },
    ],
  });

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
