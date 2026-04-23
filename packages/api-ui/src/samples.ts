import type { OpenApiDoc, Parameter, SchemaObj } from './types';
import { resolveRef } from './spec';

/**
 * Build a plausible example payload from a JSON Schema. Prefers schema.example,
 * falls back to a recursive tour that picks defaults / type fallbacks. Used by the
 * test panels to pre-fill request bodies and WS compose buffers.
 */
export function buildExampleFromSchema(doc: OpenApiDoc, schema: SchemaObj | undefined): unknown {
  if (!schema) return undefined;
  const s = resolveRef(doc, schema) ?? schema;
  if (s.example !== undefined) return s.example;
  if (s.default !== undefined) return s.default;
  if (s.enum && s.enum.length) return s.enum[0];

  switch (s.type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return s.items ? [buildExampleFromSchema(doc, s.items)] : [];
    case 'object':
    default: {
      if (!s.properties) return {};
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(s.properties)) {
        obj[k] = buildExampleFromSchema(doc, v);
      }
      return obj;
    }
  }
}

export function buildExampleParams(params: Parameter[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of params) {
    if (p.example !== undefined && p.example !== null) out[p.name] = String(p.example);
    else if (p.schema?.example !== undefined && p.schema.example !== null) out[p.name] = String(p.schema.example);
    else out[p.name] = '';
  }
  return out;
}
