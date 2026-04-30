import type { ModelEndpoint, OpenApiDoc, SchemaObj } from '../types';
import { SchemaTree } from '../components/SchemaTree';
import { JsonView } from '../components/JsonView';
import { renderMarkdownInline } from '../markdown';

interface Props {
  doc: OpenApiDoc;
  endpoint: ModelEndpoint;
}

export function ModelPage({ doc, endpoint }: Props) {
  const schema = endpoint.schema;
  const typeLabel = deriveTypeLabel(schema);
  const example = schema.example;

  return (
    <article className="endpoint-card">
      <header className="endpoint-hero">
        <div className="endpoint-breadcrumb">
          <span>Models</span>
        </div>
        <div className="endpoint-hero-row">
          <span className="model-type-chip">{typeLabel}</span>
          <span className="endpoint-path-static">{endpoint.name}</span>
        </div>
        <h1 className="endpoint-title">{endpoint.name}</h1>
        {schema.description && (
          <p
            className="endpoint-desc"
            dangerouslySetInnerHTML={{ __html: renderMarkdownInline(schema.description) }}
          />
        )}
      </header>

      <section className="card">
        <header className="card-head">
          <h3 className="card-title">Schema</h3>
          <span className="card-subtitle">{typeLabel}</span>
        </header>
        <div className="card-body">
          <ModelSchema doc={doc} schema={schema} />
        </div>
      </section>

      {example !== undefined && example !== null && (
        <section className="card">
          <header className="card-head">
            <h3 className="card-title">Example</h3>
          </header>
          <div className="card-body">
            <JsonView data={example} maxHeight={320} />
          </div>
        </section>
      )}
    </article>
  );
}

function ModelSchema({ doc, schema }: { doc: OpenApiDoc; schema: SchemaObj }) {
  if (schema.enum) {
    return (
      <div className="model-enum">
        {schema.enum.map((v, i) => (
          <code key={i} className="model-enum-value">
            {typeof v === 'string' ? `"${v}"` : String(v)}
          </code>
        ))}
      </div>
    );
  }
  if (schema.properties) {
    return <SchemaTree doc={doc} schema={schema} />;
  }
  if (schema.type === 'array' && schema.items) {
    return (
      <div>
        <div className="array-label">
          array&lt;{schema.items.format ?? schema.items.type ?? 'object'}&gt;
        </div>
        {schema.items.properties && <SchemaTree doc={doc} schema={schema.items} />}
      </div>
    );
  }
  return (
    <div className="primitive-type">
      {schema.format ?? schema.type ?? 'any'}
    </div>
  );
}

function deriveTypeLabel(schema: SchemaObj): string {
  if (schema.enum) return 'enum';
  if (schema.type === 'array' && schema.items) {
    return `array<${schema.items.format ?? schema.items.type ?? 'object'}>`;
  }
  return schema.format ?? schema.type ?? (schema.properties ? 'object' : 'any');
}
