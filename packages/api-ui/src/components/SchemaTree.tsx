import { useState, type ReactNode } from 'react';
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
  const resolved = resolveRef(doc, prop) ?? prop;
  const [open, setOpen] = useState(true);
  const children = resolved.properties ?? (resolved.items?.properties ? resolved.items.properties : undefined);
  const hasChildren = !!children && Object.keys(children).length > 0;
  const example = resolved.example ?? prop.example;

  return (
    <>
      <div
        className={depth > 0 ? 'schema-row nested' : 'schema-row'}
        style={depth > 0 ? ({ '--depth': depth } as React.CSSProperties) : undefined}
      >
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
        <TypeCell doc={doc} prop={prop} resolved={resolved} />
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
export function extractRefName(schema: SchemaObj | undefined): string | null {
  if (!schema?.$ref) return null;
  const m = /^#\/components\/schemas\/(.+)$/.exec(schema.$ref);
  return m ? m[1]! : null;
}

function linkedModelName(doc: OpenApiDoc, refName: string | null): string | null {
  return refName && doc.components?.schemas?.[refName] ? refName : null;
}

/**
 * Type column for one schema row. Splits the rendered text from the CSS class
 * so `array<UserDto>` stays both colored as an array and clickable as a model.
 */
function TypeCell({
  doc,
  prop,
  resolved,
}: {
  doc: OpenApiDoc;
  prop: SchemaObj;
  resolved: SchemaObj;
}) {
  const selectEndpoint = useStore((s) => s.selectEndpoint);
  const goto = (name: string) => selectEndpoint(`model:${name}`);

  const ModelLink = ({ name }: { name: string }): ReactNode => (
    <button
      type="button"
      className="schema-type-ref"
      onClick={(e) => {
        e.stopPropagation();
        goto(name);
      }}
      title={`Go to ${name}`}
    >
      {name}
    </button>
  );

  // array<…>: prefer linking to the item's $ref when one resolves to a known
  // component schema, otherwise fall back to the format / inferred primitive type.
  if (resolved.type === 'array' && resolved.items) {
    const itemRef = linkedModelName(doc, extractRefName(prop.items) ?? extractRefName(resolved.items));
    const itemLabel = resolved.items.format ?? resolved.items.type ?? 'object';
    return (
      <div className="schema-type type-array">
        {itemRef ? (
          <span className="model-array-wrap">array&lt;<ModelLink name={itemRef} />&gt;</span>
        ) : (
          <>array&lt;{itemLabel}&gt;</>
        )}
      </div>
    );
  }

  if (resolved.enum) {
    const enumRef = linkedModelName(doc, extractRefName(prop));
    return (
      <div className="schema-type type-enum">
        enum
        {enumRef && <ModelLink name={enumRef} />}
      </div>
    );
  }

  // Format wins over type when present — `date-time`, `uri`, `binary` etc. are
  // strictly more informative than `string`, and they also rescue the case where
  // a schema generator (NestJS swagger CLI) couldn't infer the type from a
  // `string | null` union and fell back to `object`.
  const kind = resolved.format ?? resolved.type ?? (resolved.properties ? 'object' : 'any');
  return <div className={`schema-type type-${kind}`}>{kind}</div>;
}
