import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface.js';
import { scanWsChannels } from '../scanner/ws.scanner.js';
import type { WsChannelDoc, WsEventDoc, XWebsocketExtension } from '../metadata/types.js';
import { registerPayload } from './schema.js';
import { resolveConnHandshake } from './conn.js';

/**
 * Enrich an OpenAPI document (produced by `SwaggerModule.createDocument`) with
 * WebSocket event metadata collected from `@Receive`/`@Send` decorators. Registers
 * payload DTOs into `components.schemas` and attaches them under `x-websocket`.
 */
export async function enrichWithWebsocket(
  app: INestApplication,
  document: OpenAPIObject,
): Promise<OpenAPIObject> {
  const channels = scanWsChannels(app);

  document.components ??= {};
  document.components.schemas ??= {};
  const schemas = document.components.schemas as Record<string, SchemaObject>;

  const wsChannels: WsChannelDoc[] = [];
  for (const ch of channels) {
    const events: WsEventDoc[] = [];
    for (const e of ch.events) {
      events.push({
        direction: e.direction,
        event: e.event,
        operationId: e.operationId,
        summary: e.summary,
        description: e.description,
        auth: e.auth ?? true,
        deprecated: e.deprecated || undefined,
        payload: (await registerPayload(e.payload, schemas)) as WsEventDoc['payload'],
        reply: e.reply
          ? ((await registerPayload(e.reply, schemas)) as WsEventDoc['reply'])
          : undefined,
        replyEvent: e.replyEvent,
      });
    }
    const conn = await resolveConnHandshake(ch.conn);
    wsChannels.push({
      name: ch.name,
      // Nest gateways set either `path` (raw ws adapter) or `namespace`
      // (socket.io) as the URL; only one of the two is populated in practice.
      url: ch.path ?? ch.namespace ?? `/${ch.name.toLowerCase()}`,
      namespace: ch.namespace,
      events,
      tags: ch.tags && ch.tags.length > 1 ? ch.tags : undefined,
      conn,
    });
  }

  const extension: XWebsocketExtension = { channels: wsChannels };
  (document as OpenAPIObject & { 'x-websocket': XWebsocketExtension })['x-websocket'] = extension;
  return document;
}
