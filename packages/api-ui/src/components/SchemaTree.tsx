import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { OpenApiDoc, SchemaObj } from '../types';
import { resolveRef } from '../spec';
import { useStore } from '../store';

interface Props {
  doc: OpenApiDoc;
  schema: SchemaObj | undefined;
  requiredNames?: string[];
}

/**
 * Render a JSON-Schema object as an expandable tree. Objects start expanded; array
 * items show as a single nested row. `$ref`s are resolved against `doc.components.schemas`.
 */
export function SchemaTree({ doc, schema, requiredNames }: Props) {
  const resolved = resolveRef(doc, schema);
  if (!resolved?.properties) return null;
  return (
    <div className="schema">
      {Object.entries(resolved.properties).map(([name, prop]) => (
        <SchemaRow
          key={name}
          doc={doc}
          name={name}
          prop={prop}
          required={(requiredNames ?? resolved.required)?.includes(name) ?? false}
          depth={0}
        />
      ))}
    </div>
  );
}

function SchemaRow({
  doc,
  name,
  prop,
  required,
  depth,
}: {
  doc: OpenApiDoc;
  name: string;
  prop: SchemaObj;
  required: boolean;
  depth: number;
}) {
  const selectEndpoint = useStore((s) => s.selectEndpoint);
  const resolved = resolveRef(doc, prop) ?? prop;
  const [open, setOpen] = useState(true);
  const children = resolved.properties ?? (resolved.items?.properties ? resolved.items.properties : undefined);
  const hasChildren = !!children && Object.keys(children).length > 0;
  const typeLabel = deriveTypeLabel(resolved);
  const example = resolved.example ?? prop.example;
  // Only surface the ref name for enum-typed refs — object refs already expand
  // inline so the structure makes the source obvious; enums collapse to a single
  // `enum` token and lose that signal.
  const refName = extractRefName(prop) ?? extractRefName(prop.items);
  const isEnum = !!resolved.enum;
  const linkedModel = isEnum && refName && doc.components?.schemas?.[refName] ? refName : null;

  return (
    <>
      <div className={depth > 0 ? 'schema-row nested' : 'schema-row'}>
        <div className="schema-name">
          {hasChildren ? (
            <button
              className="toggle"
              data-open={open}
              onClick={() => setOpen((x) => !x)}
              aria-label={open ? 'Collapse' : 'Expand'}
            >
              <ChevronDown size={12} />
            </button>
          ) : (
            <span style={{ width: 14, display: 'inline-block' }} />
          )}
          <span>{name}</span>
          {required && <span className="schema-req">required</span>}
        </div>
        <div className={`schema-type type-${typeLabel}`}>
          {typeLabel}
          {linkedModel && (
            <button
              type="button"
              className="schema-type-ref"
              onClick={(e) => {
                e.stopPropagation();
                selectEndpoint(`model:${linkedModel}`);
              }}
              title={`Go to ${linkedModel}`}
            >
              {linkedModel}
            </button>
          )}
        </div>
        <div>
          {resolved.description && <div className="schema-note">{resolved.description}</div>}
          {example !== undefined && example !== null && (
            <div className="schema-example">
              <b>e.g.</b>{' '}
              {typeof example === 'object' ? JSON.stringify(example) : String(example)}
            </div>
          )}
        </div>
      </div>
      {hasChildren && open && children &&
        Object.entries(children).map(([n, c]) => (
          <SchemaRow
            key={n}
            doc={doc}
            name={n}
            prop={c}
            required={(resolved.items?.required ?? resolved.required)?.includes(n) ?? false}
            depth={depth + 1}
          />
        ))}
    </>
  );
}

/** Pull the trailing segment off a `#/components/schemas/<Name>` pointer. */
function extractRefName(schema: SchemaObj | undefined): string | null {
  if (!schema?.$ref) return null;
  const m = /^#\/components\/schemas\/(.+)$/.exec(schema.$ref);
  return m ? m[1]! : null;
}

function deriveTypeLabel(schema: SchemaObj): string {
  if (schema.enum) return 'enum';
  if (schema.type === 'array' && schema.items) {
    const itemType = schema.items.type ?? 'object';
    return `array<${itemType}>`;
  }
  return schema.type ?? (schema.properties ? 'object' : 'any');
}
