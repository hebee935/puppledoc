import type { Type } from '@nestjs/common';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface.js';
import type {
  ConnHandshake,
  ConnHandshakeRaw,
  ConnInputDecl,
  ConnInputOptions,
} from '../metadata/types.js';
import { createSchemaFactory } from './schema.js';

/**
 * Expand the raw handshake decls captured by `@Conn*` decorators into a flat
 * list of `ConnInputOptions[]`. Inline decls pass through unchanged; class /
 * `{ type: Class }` forms run through `@nestjs/swagger`'s schema factory so
 * any `@ApiProperty` / class-validator / CLI plugin metadata is honored.
 */
export async function resolveConnHandshake(
  raw: ConnHandshakeRaw | undefined,
): Promise<ConnHandshake | undefined> {
  if (!raw) return undefined;
  const out: ConnHandshake = {};
  if (raw.description) out.description = raw.description;
  if (raw.query?.length) out.query = await resolveDecls(raw.query);
  if (raw.headers?.length) out.headers = await resolveDecls(raw.headers);
  if (raw.auth?.length) out.auth = await resolveDecls(raw.auth);
  return out;
}

async function resolveDecls(decls: ConnInputDecl[]): Promise<ConnInputOptions[]> {
  const out: ConnInputOptions[] = [];
  for (const d of decls) {
    if (typeof d === 'function') {
      out.push(...(await expandDto(d)));
    } else if (typeof d === 'object' && d !== null && 'type' in d && typeof d.type === 'function') {
      out.push(...(await expandDto(d.type)));
    } else {
      // Inline declaration. Cast is safe — the discriminator above ruled out the
      // class variants and the user can't widen ConnInputDecl past these forms.
      out.push(d as ConnInputOptions);
    }
  }
  return out;
}

async function expandDto(dto: Type<unknown>): Promise<ConnInputOptions[]> {
  const schemas: Record<string, SchemaObject> = {};
  try {
    const factory = await createSchemaFactory();
    factory.exploreModelSchema(dto as never, schemas as never, []);
  } catch {
    return [];
  }
  const schema = schemas[dto.name];
  if (!schema || typeof schema !== 'object' || !schema.properties) return [];
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  return Object.entries(schema.properties).map(([name, prop]) => {
    const p = prop && typeof prop === 'object' ? (prop as Record<string, unknown>) : {};
    const desc = typeof p.description === 'string' ? p.description : undefined;
    const ex = p.example;
    return {
      name,
      required: required.has(name),
      ...(desc ? { description: desc } : {}),
      ...(ex !== undefined && ex !== null
        ? { example: typeof ex === 'string' ? ex : JSON.stringify(ex) }
        : {}),
    };
  });
}
