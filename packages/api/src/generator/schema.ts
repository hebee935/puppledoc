import type { Type } from '@nestjs/common';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface.js';

type SchemasMap = Record<string, SchemaObject>;

/**
 * Register a DTO class in the OpenAPI `components.schemas` map, using
 * `@nestjs/swagger`'s own extractor so `@ApiProperty`, class-validator and
 * swagger's CLI plugin metadata all flow through the same pipeline REST uses.
 *
 * Returns a `$ref` pointer. On failure (e.g. primitive type, missing decorators)
 * returns an inline open schema so the UI still renders *something*.
 */
export async function registerPayload(
  type: Type<unknown>,
  schemas: SchemasMap,
): Promise<{ $ref: string } | SchemaObject> {
  const ref = `#/components/schemas/${type.name}`;
  if (schemas[type.name]) return { $ref: ref };

  try {
    const factory = await createSchemaFactory();
    factory.exploreModelSchema(type as never, schemas as never, []);
    if (schemas[type.name]) return { $ref: ref };
  } catch {
    // fall through to placeholder
  }
  const placeholder: SchemaObject = {
    type: 'object',
    title: type.name,
    description: 'Schema could not be introspected. Add @ApiProperty() to fields or enable the @nestjs/swagger CLI plugin.',
    additionalProperties: true,
  };
  schemas[type.name] = placeholder;
  return { $ref: ref };
}

export async function createSchemaFactory() {
  // Nest swagger internals. Import lazily to keep cold-start light and to isolate
  // version drift to one place.
  const [{ SchemaObjectFactory }, { ModelPropertiesAccessor }, { SwaggerTypesMapper }] =
    await Promise.all([
      import('@nestjs/swagger/dist/services/schema-object-factory.js'),
      import('@nestjs/swagger/dist/services/model-properties-accessor.js'),
      import('@nestjs/swagger/dist/services/swagger-types-mapper.js'),
    ]);
  return new SchemaObjectFactory(new ModelPropertiesAccessor(), new SwaggerTypesMapper());
}
