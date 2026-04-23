import { useState } from 'react';
import { Lock } from 'lucide-react';
import type { MediaType, OpenApiDoc, Operation, Parameter, RestEndpoint, SchemaObj } from '../types';
import { resolveRef } from '../spec';
import { MethodPill } from '../components/MethodPill';
import { SchemaTree } from '../components/SchemaTree';
import { JsonView } from '../components/JsonView';

interface Props {
  doc: OpenApiDoc;
  endpoint: RestEndpoint;
}

export function RestEndpointPage({ doc, endpoint }: Props) {
  const op = endpoint.operation;
  const pathParts = endpoint.path.split(/(\{[^}]+\})/g);

  const pathParams = (op.parameters ?? []).filter((p) => p.in === 'path');
  const queryParams = (op.parameters ?? []).filter((p) => p.in === 'query');
  const bodySchema = op.requestBody?.content?.['application/json']?.schema;

  return (
    <article className="endpoint">
      <div className="ep-header">
        <MethodPill method={endpoint.method} />
        <span className="ep-path">
          {pathParts.map((p, i) =>
            p.startsWith('{') ? (
              <span key={i} className="path-var">{p}</span>
            ) : (
              <span key={i}>{p}</span>
            ),
          )}
        </span>
        {endpoint.auth && (
          <span className="ep-lock">
            <Lock size={10} /> auth required
          </span>
        )}
      </div>
      {op.summary && <h2 className="ep-title">{op.summary}</h2>}
      {endpoint.description && (
        <p
          className="ep-desc"
          dangerouslySetInnerHTML={{ __html: renderMarkdownInline(endpoint.description) }}
        />
      )}

      <ParamSection title="Path Parameters" doc={doc} params={pathParams} />
      <ParamSection title="Query Parameters" doc={doc} params={queryParams} />

      {bodySchema && (
        <div className="section">
          <div className="section-head">Body</div>
          <SchemaTree doc={doc} schema={bodySchema} />
        </div>
      )}

      <Responses doc={doc} responses={op.responses} />
    </article>
  );
}

function ParamSection({
  title,
  doc,
  params,
}: {
  title: string;
  doc: OpenApiDoc;
  params: Parameter[];
}) {
  if (!params.length) return null;
  return (
    <div className="section">
      <div className="section-head">{title}</div>
      <div className="schema">
        {params.map((p) => {
          const schema = resolveRef(doc, p.schema) ?? p.schema;
          const typeLabel = deriveTypeLabel(schema);
          const example = p.example ?? schema?.example;
          return (
            <div key={p.name} className="schema-row">
              <div className="schema-name">
                <span style={{ width: 14, display: 'inline-block' }} />
                <span>{p.name}</span>
                {p.required && <span className="schema-req">required</span>}
              </div>
              <div className={`schema-type type-${typeLabel}`}>{typeLabel}</div>
              <div>
                {p.description && <div className="schema-note">{p.description}</div>}
                {example !== undefined && example !== null && (
                  <div className="schema-example">
                    <b>e.g.</b>{' '}
                    {typeof example === 'object' ? JSON.stringify(example) : String(example)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Responses({
  doc,
  responses,
}: {
  doc: OpenApiDoc;
  responses: Operation['responses'];
}) {
  const entries = Object.entries(responses ?? {});
  const [openIdx, setOpenIdx] = useState(0);
  if (!entries.length) return null;
  const [, current] = entries[openIdx] ?? [];

  return (
    <div className="section">
      <div className="section-head">Responses</div>
      {entries.map(([status, r], i) => {
        const kind = status[0] ?? '';
        return (
          <div
            key={status}
            className="response-block"
            onClick={() => setOpenIdx(i)}
            style={{ borderColor: openIdx === i ? 'var(--ink)' : 'var(--line)' }}
          >
            <span className="status-chip" data-kind={kind}>{status}</span>
            <span style={{ color: 'var(--ink-muted)', fontSize: 12.5 }}>
              {r.description ?? kindLabel(kind)}
            </span>
            <span style={{ flex: 1 }} />
            {r.content?.['application/json'] && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
                application/json
              </span>
            )}
          </div>
        );
      })}
      {current?.content?.['application/json'] && (
        <ResponseBody doc={doc} media={current.content['application/json']} />
      )}
      {current?.headers && Object.keys(current.headers).length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
          {Object.entries(current.headers).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: 'var(--ink)' }}>{k}:</span> {v.description ?? ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResponseBody({ doc, media }: { doc: OpenApiDoc; media: MediaType }) {
  const resolvedSchema = resolveRef(doc, media.schema) ?? media.schema;
  const hasSchema = !!resolvedSchema && (resolvedSchema.properties || resolvedSchema.items || resolvedSchema.type);
  const example = media.example ?? firstValue(media.examples)?.value ?? resolvedSchema?.example;
  if (!hasSchema && example === undefined) return null;
  return (
    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
      {hasSchema && resolvedSchema && <ResponseSchema doc={doc} schema={resolvedSchema} />}
      {example !== undefined && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
          <div
            style={{
              padding: '6px 10px',
              background: 'oklch(96% 0.005 80)',
              fontSize: 11,
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-mono)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            Example
          </div>
          <JsonView data={example} maxHeight={280} />
        </div>
      )}
    </div>
  );
}

function ResponseSchema({ doc, schema }: { doc: OpenApiDoc; schema: SchemaObj }) {
  // Arrays: show the item schema's properties, labeled.
  if (schema.type === 'array' && schema.items) {
    const item = resolveRef(doc, schema.items) ?? schema.items;
    if (item.properties) {
      return (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 4 }}>
            array&lt;{item.title ?? item.type ?? 'object'}&gt;
          </div>
          <SchemaTree doc={doc} schema={item} />
        </div>
      );
    }
  }
  if (schema.properties) return <SchemaTree doc={doc} schema={schema} />;
  // Primitives / no properties — inline one-liner.
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-muted)' }}>
      {schema.type ?? 'any'}
      {schema.format ? ` (${schema.format})` : ''}
    </div>
  );
}

function kindLabel(kind: string): string {
  if (kind === '2') return 'Success';
  if (kind === '3') return 'Redirect';
  if (kind === '4' || kind === '5') return 'Error';
  return '';
}

function firstValue<T>(m: Record<string, T> | undefined): T | undefined {
  if (!m) return undefined;
  for (const v of Object.values(m)) return v;
  return undefined;
}

function deriveTypeLabel(schema: SchemaObj | undefined): string {
  if (!schema) return 'any';
  if (schema.enum) return 'enum';
  if (schema.type === 'array' && schema.items) return `array<${schema.items.type ?? 'object'}>`;
  return schema.type ?? 'any';
}

function renderMarkdownInline(s: string): string {
  // Minimal: **bold** and `code`. Escape other HTML first.
  const escaped = s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
