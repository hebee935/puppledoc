import type {
  Endpoint,
  EndpointGroup,
  HttpMethod,
  ModelEndpoint,
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
  liftInlineEnums(doc);
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

  // Models — components.schemas surfaced as a single group at the bottom of the
  // sidebar so users can browse DTOs the same way Scalar / Stoplight do.
  const schemas = doc.components?.schemas ?? {};
  const schemaNames = Object.keys(schemas);
  if (schemaNames.length > 0) {
    const groupId = 'models';
    const group = upsertGroup(groupId, 'Models', 'Reusable schemas referenced by operations.');
    for (const name of schemaNames) {
      const schema = schemas[name]!;
      const ep: ModelEndpoint = {
        id: `model:${name}`,
        kind: 'model',
        method: 'TYPE',
        path: name,
        title: name,
        description: schema.description,
        auth: false,
        groupName: 'Models',
        groupDescription: group.description,
        name,
        schema,
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
  // Unicode-aware: keep letters/digits from any script (Hangul, CJK, etc.) so
  // tags like '인사/임직원' don't collapse to an empty id and merge with every
  // other non-Latin tag.
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

/**
 * NestJS swagger inlines enum values when `@ApiProperty`'s `enumName` is omitted,
 * which leaves every such enum unlinkable in the UI. Lift those inline enums
 * into `components.schemas` so they show up in the Models group and the type
 * chip becomes a clickable model link — equivalent to the user having set
 * `enumName` everywhere. Identical value sets dedupe to a single named entry,
 * including pre-existing named enums (so an inline match reuses the user's
 * `enumName` whenever they did set one elsewhere).
 */
function liftInlineEnums(doc: OpenApiDoc): void {
  if (!doc.components) doc.components = {};
  if (!doc.components.schemas) doc.components.schemas = {};
  const schemas = doc.components.schemas;
  const taken = new Set(Object.keys(schemas));
  const byHash = new Map<string, string>();
  for (const [name, s] of Object.entries(schemas)) {
    if (s.enum) byHash.set(hashEnum(s.enum), name);
  }

  const synth = (preferred: string, values: unknown[], type?: string): string => {
    const hash = hashEnum(values);
    const found = byHash.get(hash);
    if (found) return found;
    let name = preferred;
    let i = 2;
    while (taken.has(name)) name = `${preferred}${i++}`;
    schemas[name] = { ...(type ? { type } : {}), enum: values };
    taken.add(name);
    byHash.set(hash, name);
    return name;
  };

  const liftSchema = (host: SchemaObj, key: string, contextName: string): void => {
    const child = (host as unknown as Record<string, SchemaObj | undefined>)[key];
    if (!child || child.$ref) return;
    if (child.enum) {
      const lifted = synth(contextName, child.enum, child.type);
      (host as unknown as Record<string, SchemaObj>)[key] = { $ref: `#/components/schemas/${lifted}` };
      return;
    }
    if (child.type === 'array' && child.items && !child.items.$ref && child.items.enum) {
      const lifted = synth(contextName, child.items.enum, child.items.type);
      child.items = { $ref: `#/components/schemas/${lifted}` };
      return;
    }
    visit(child, contextName);
  };

  function visit(schema: SchemaObj, ctx: string): void {
    if (schema.$ref) return;
    if (schema.properties) {
      const base = dtoBase(ctx);
      for (const propName of Object.keys(schema.properties)) {
        // Scope the lifted enum to its owning DTO so generic property names
        // (`status`, `type`, `role`) don't collapse into `Status2`…`Status7`.
        // `CreateProjectDto.status` → `ProjectStatus`, matching the original
        // TS enum name that NestJS dropped when `enumName` was omitted.
        const preferred = base ? base + capitalize(propName) : capitalize(propName);
        liftSchema(schema.properties as unknown as SchemaObj, propName, preferred);
      }
    }
    if (schema.items && !schema.items.$ref) {
      visit(schema.items, ctx);
    }
  }

  // Snapshot keys — synth() adds entries we don't need to revisit.
  for (const name of Object.keys(schemas)) {
    const s = schemas[name];
    if (!s || s.enum || s.$ref) continue;
    visit(s, name);
  }

  // Operation parameters: lift inline enums on query/path/header schemas too.
  for (const item of Object.values(doc.paths ?? {})) {
    if (!item) continue;
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op?.parameters) continue;
      for (const p of op.parameters) {
        if (!p.schema || p.schema.$ref) continue;
        if (p.schema.enum) {
          const lifted = synth(capitalize(p.name), p.schema.enum, p.schema.type);
          p.schema = { $ref: `#/components/schemas/${lifted}` };
        } else if (p.schema.type === 'array' && p.schema.items && !p.schema.items.$ref && p.schema.items.enum) {
          const lifted = synth(capitalize(p.name), p.schema.items.enum, p.schema.items.type);
          p.schema = { type: 'array', items: { $ref: `#/components/schemas/${lifted}` } };
        }
      }
    }
  }
}

function hashEnum(values: unknown[]): string {
  return JSON.stringify([...values].sort());
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

const DTO_PREFIX = /^(Create|Update|Patch|Upsert|Modify|Replace|New|Edit)/;
const DTO_SUFFIX = /(Dto|Input|Request|Response|Body|Payload|Model|Schema)$/;

/**
 * Strip the conventional NestJS DTO affixes so a host schema name yields the
 * domain entity it describes — `CreateProjectDto` → `Project`,
 * `ProjectContractInputDto` → `ProjectContract`. Used to prefix lifted enum
 * names so they read like the original TS enum (`ProjectStatus`) instead of a
 * collision-numbered `Status7`. Falls back to the full name if stripping would
 * leave nothing.
 */
function dtoBase(name: string): string {
  let s = name.replace(DTO_PREFIX, '');
  while (DTO_SUFFIX.test(s)) s = s.replace(DTO_SUFFIX, '');
  return s.length > 0 ? s : name;
}

/**
 * Short, list-friendly classification of a schema (`object`, `enum`, `array`, …).
 * Used by sidebar/list/palette chips where width is constrained — the detail
 * page derives its own richer label that includes generic args like `array<X>`.
 */
export function deriveSchemaKind(schema: SchemaObj): string {
  if (schema.enum) return 'enum';
  if (schema.oneOf || schema.anyOf) return 'union';
  if (schema.type) return schema.type;
  if (schema.properties || schema.allOf) return 'object';
  return 'any';
}

/** Resolve a `$ref` pointer within the document's components.schemas table. */
export function resolveRef(doc: OpenApiDoc, schema: SchemaObj | undefined): SchemaObj | undefined {
  if (!schema) return undefined;
  if (!schema.$ref) return schema;
  const m = /^#\/components\/schemas\/(.+)$/.exec(schema.$ref);
  if (!m) return schema;
  return doc.components?.schemas?.[m[1]!];
}
