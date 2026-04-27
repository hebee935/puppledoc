import type { INestApplication } from '@nestjs/common';
import { SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { enrichWithWebsocket } from '../generator/openapi.js';
import { serveUi } from '../server/ui-adapter.js';
import type { PuppleDocUiOptions } from '../metadata/types.js';

/** The minimal shape produced by `new DocumentBuilder().build()`. */
type OpenApiConfig = Omit<OpenAPIObject, 'paths'>;

/**
 * Mirror of `@nestjs/swagger`'s `SwaggerModule.setup()` — except you can pass
 * either the raw config (most common) or a pre-built document. WebSocket events
 * discovered on `app` are merged into the document under `x-websocket`.
 *
 * ```ts
 * const config = new DocumentBuilder()
 *   .setTitle('My API').setVersion('1.0').addBearerAuth().build();
 * PuppleDocModule.setup('/docs', app, config);
 * ```
 */
export class PuppleDocModule {
  static setup(
    path: string,
    app: INestApplication,
    config: OpenApiConfig,
    options?: PuppleDocUiOptions,
  ): Promise<void>;
  static setup(
    path: string,
    app: INestApplication,
    document: OpenAPIObject,
    options?: PuppleDocUiOptions,
  ): Promise<void>;
  static async setup(
    path: string,
    app: INestApplication,
    configOrDocument: OpenApiConfig | OpenAPIObject,
    options: PuppleDocUiOptions = {},
  ): Promise<void> {
    // A built document has `paths`; a raw config from DocumentBuilder doesn't.
    const document: OpenAPIObject = isBuiltDocument(configOrDocument)
      ? configOrDocument
      : SwaggerModule.createDocument(app, configOrDocument);

    const enriched = await enrichWithWebsocket(app, document);
    const http = app.getHttpAdapter();
    serveUi(http, path, enriched, options);
  }
}

function isBuiltDocument(v: OpenApiConfig | OpenAPIObject): v is OpenAPIObject {
  return typeof (v as OpenAPIObject).paths === 'object';
}
