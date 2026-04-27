import type {
  Endpoint,
  EndpointGroup,
  HttpMethod,
  OpenApiDoc,
  Operation,
  RestEndpoint,
  SchemaObj,
  WsConnectionEndpoint,
  WsEventEndpoint,
} from './types';

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

/**
 * Flatten an OpenAPI doc + x-websocket extension into a single grouped endpoint list
 * that the UI can render uniformly. Groups preserve insertion order of the source
 * document; within a group, endpoints keep their declared order.
 */
export function normalize(doc: OpenApiDoc): EndpointGroup[] {
  const groups = new Map<string, EndpointGroup>();
  const upsertGroup = (id: string, name: string, description?: string): EndpointGroup => {
    let g = groups.get(id);
    if (!g) {
      g = { id, name, description, endpoints: [] };
      groups.set(id, g);
    }
    return g;
  };

  // REST
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    if (!item) continue;
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op) continue;
      const groupName = op.tags?.[0] ?? deriveGroupFromPath(path);
      const groupId = `rest:${slug(groupName)}`;
      const group = upsertGroup(groupId, groupName);
      group.endpoints.push(makeRestEndpoint(path, method, op, groupName));
    }
  }

  // WebSocket
  for (const channel of doc['x-websocket']?.channels ?? []) {
    const groupId = `ws:${slug(channel.name)}`;
    const group = upsertGroup(groupId, channel.name, `WebSocket channel at ${channel.url}`);

    const connId = `${groupId}:connection`;
    const connection: WsConnectionEndpoint = {
      id: connId,
      kind: 'ws-connection',
      method: 'CONN',
      path: channel.url,
      title: 'Connection',
      description: `Open a WebSocket to \`${channel.url}\` and exchange JSON frames.`,
      auth: true,
      groupName: channel.name,
      groupDescription: group.description,
      channel,
    };
    group.endpoints.push(connection);

    for (const ev of channel.events) {
      const ep: WsEventEndpoint = {
        id: `${groupId}:${ev.direction}:${ev.event}`,
        kind: 'ws-event',
        // Match the decorator name 1:1: @Receive → RECV, @Send → SEND. The
        // arrow text on each event page (`client → server` etc.) makes the
        // data direction unambiguous regardless of perspective.
        method: ev.direction === 'send' ? 'SEND' : 'RECV',
        path: ev.event,
        title: ev.summary ?? ev.event,
        description: ev.description,
        auth: ev.auth,
        deprecated: ev.deprecated,
        groupName: channel.name,
        groupDescription: group.description,
        channel,
        event: ev,
      };
      group.endpoints.push(ep);
    }
  }

  return [...groups.values()];
}

export function flattenEndpoints(groups: EndpointGroup[]): Endpoint[] {
  return groups.flatMap((g) => g.endpoints);
}

function makeRestEndpoint(
  path: string,
  method: HttpMethod,
  op: Operation,
  groupName: string,
): RestEndpoint {
  return {
    id: `rest:${method.toUpperCase()}:${path}`,
    kind: 'rest',
    method: method.toUpperCase(),
    path,
    title: op.summary ?? path,
    description: op.description,
    auth: isAuthRequired(op),
    deprecated: op.deprecated,
    groupName,
    operation: op,
  };
}

function isAuthRequired(op: Operation): boolean {
  if (!op.security) return false;
  return op.security.some((s) => Object.keys(s).length > 0);
}

function deriveGroupFromPath(path: string): string {
  const parts = path.split('/').filter(Boolean).filter((s) => !s.startsWith('{'));
  return parts[0] ?? 'default';
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Resolve a `$ref` pointer within the document's components.schemas table. */
export function resolveRef(doc: OpenApiDoc, schema: SchemaObj | undefined): SchemaObj | undefined {
  if (!schema) return undefined;
  if (!schema.$ref) return schema;
  const m = /^#\/components\/schemas\/(.+)$/.exec(schema.$ref);
  if (!m) return schema;
  return doc.components?.schemas?.[m[1]!];
}
