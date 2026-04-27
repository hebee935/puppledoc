// Minimal OpenAPI-3.1 + x-websocket shapes used by the UI.
// Intentionally loose — the UI is a viewer and must tolerate real-world docs.

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

export interface OpenApiDoc {
  openapi?: string;
  info?: { title?: string; version?: string; description?: string };
  servers?: { url: string; description?: string }[];
  paths?: Record<string, PathItem>;
  components?: { schemas?: Record<string, SchemaObj> };
  'x-websocket'?: { channels: WsChannel[] };
}

export type PathItem = Partial<Record<HttpMethod, Operation>>;

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, Response>;
  security?: { [scheme: string]: string[] }[];
}

export interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: SchemaObj;
  example?: unknown;
}

export interface RequestBody {
  required?: boolean;
  content?: Record<string, MediaType>;
}

export interface Response {
  description?: string;
  content?: Record<string, MediaType>;
  headers?: Record<string, { description?: string; schema?: SchemaObj }>;
}

export interface MediaType {
  schema?: SchemaObj;
  example?: unknown;
  examples?: Record<string, { value: unknown; summary?: string }>;
}

export interface SchemaObj {
  $ref?: string;
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  properties?: Record<string, SchemaObj>;
  required?: string[];
  items?: SchemaObj;
  enum?: unknown[];
  example?: unknown;
  default?: unknown;
  nullable?: boolean;
  additionalProperties?: boolean | SchemaObj;
  oneOf?: SchemaObj[];
  anyOf?: SchemaObj[];
  allOf?: SchemaObj[];
}

export interface WsChannel {
  name: string;
  url: string;
  namespace?: string;
  events: WsEvent[];
  tags?: string[];
  conn?: ConnHandshake;
}

export interface ConnInputOptions {
  name: string;
  required?: boolean;
  description?: string;
  example?: string;
  bearer?: boolean;
}

export interface ConnCloseCodeOptions {
  code: number;
  reason?: string;
  description?: string;
}

export interface ConnHandshake {
  description?: string;
  query?: ConnInputOptions[];
  headers?: ConnInputOptions[];
  bearerAuth?: { name: string };
  subprotocols?: string[];
  closeCodes?: ConnCloseCodeOptions[];
}

export interface WsEvent {
  direction: 'send' | 'recv';
  event: string;
  operationId?: string;
  summary?: string;
  description?: string;
  auth: boolean;
  deprecated?: boolean;
  payload: SchemaObj;
  reply?: SchemaObj;
  replyEvent?: string;
}

/**
 * Unified endpoint model used by Sidebar / Docs / TestPanel. A single REST operation
 * or one WS event (connection or frame) maps to one of these.
 */
export type EndpointKind = 'rest' | 'ws-connection' | 'ws-event';

export interface BaseEndpoint {
  id: string;
  kind: EndpointKind;
  method: string; // 'GET' | 'POST' | ... | 'CONN' | 'SEND' | 'RECV'
  path: string;   // REST path or ws url or `type: "event.name"`
  title: string;  // summary / event name
  description?: string;
  auth: boolean;
  deprecated?: boolean;
  groupName: string;
  groupDescription?: string;
}

export interface RestEndpoint extends BaseEndpoint {
  kind: 'rest';
  operation: Operation;
}

export interface WsConnectionEndpoint extends BaseEndpoint {
  kind: 'ws-connection';
  channel: WsChannel;
}

export interface WsEventEndpoint extends BaseEndpoint {
  kind: 'ws-event';
  channel: WsChannel;
  event: WsEvent;
}

export type Endpoint = RestEndpoint | WsConnectionEndpoint | WsEventEndpoint;

export interface EndpointGroup {
  id: string;
  name: string;
  description?: string;
  endpoints: Endpoint[];
}

export interface PuppleDocBootstrap {
  basePath: string;
  ui?: {
    title?: string;
    theme?: 'light' | 'dark' | 'auto';
    servers?: { label: string; url: string }[];
  };
}
