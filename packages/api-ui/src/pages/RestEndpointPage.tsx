import { useState } from 'react';
import { Check, Copy, Lock, Play } from 'lucide-react';
import type { MediaType, OpenApiDoc, Operation, Parameter, RestEndpoint, SchemaObj } from '../types';
import { resolveRef } from '../spec';
import { useStore } from '../store';
import { MethodPill } from '../components/MethodPill';
import { SchemaTree, extractRefName } from '../components/SchemaTree';
import { JsonView } from '../components/JsonView';
import { renderMarkdownInline } from '../markdown';

interface RefBadge {
  name: string;
  isArray: boolean;
}

/** Resolve `schema` (or its array items) to a known component-schema name. */
function refBadge(doc: OpenApiDoc, schema: SchemaObj | undefined): RefBadge | null {
  if (!schema) return null;
  const direct = extractRefName(schema);
  if (direct && doc.components?.schemas?.[direct]) return { name: direct, isArray: false };
  if (schema.type === 'array' && schema.items) {
    const itemRef = extractRefName(schema.items);
    if (itemRef && doc.components?.schemas?.[itemRef]) return { name: itemRef, isArray: true };
  }
  return null;
}

function ModelLink({ name }: { name: string }) {
  const selectEndpoint = useStore((s) => s.selectEndpoint);
  return (
    <button
      type="button"
      className="schema-type-ref card-head-ref"
      onClick={() => selectEndpoint(`model:${name}`)}
      title={`Go to ${name}`}
    >
      {name}
    </button>
  );
}

/** Render a model badge — wrapped in `array<…>` when the schema is a ref array. */
function ModelBadge({ badge }: { badge: RefBadge }) {
  if (!badge.isArray) return <ModelLink name={badge.name} />;
  return (
    <span className="model-array-wrap">
      array&lt;<ModelLink name={badge.name} />&gt;
    </span>
  );
}

interface Props {
  doc: OpenApiDoc;
  endpoint: RestEndpoint;
}

export function RestEndpointPage({ doc, endpoint }: Props) {
  const { openDrawer } = useStore();
  const op = endpoint.operation;

  const pathParams = (op.parameters ?? []).filter((p) => p.in === 'path');
  const queryParams = (op.parameters ?? []).filter((p) => p.in === 'query');
  const headerParams = (op.parameters ?? []).filter((p) => p.in === 'header');
  const bodyMedia =
    op.requestBody?.content?.['application/json'] ??
    op.requestBody?.content?.['multipart/form-data'];
  const bodySchema = bodyMedia?.schema;
  const bodyKind = op.requestBody?.content?.['application/json']
    ? 'application/json'
    : op.requestBody?.content?.['multipart/form-data']
      ? 'multipart/form-data'
      : null;

  return (
    <article className="endpoint-card">
      <header className="endpoint-hero">
        <div className="endpoint-breadcrumb">
          <span>{endpoint.groupName}</span>
        </div>
        <div className="endpoint-hero-row" data-deprecated={op.deprecated || undefined}>
          <MethodPill method={endpoint.method} />
          <PathWithCopy path={endpoint.path} />
          <div className="hero-actions">
            {endpoint.auth && (
              <span className="ep-lock-icon" title="Authentication required">
                <Lock size={12} />
              </span>
            )}
            <button className="btn primary btn-try" onClick={openDrawer}>
              <Play size={13} /> Try it
            </button>
          </div>
        </div>
        {op.summary && (
          <h1 className="endpoint-title">
            {op.summary}
            {op.deprecated && <span className="badge-deprecated">Deprecated</span>}
          </h1>
        )}
        {endpoint.description && (
          <p
            className="endpoint-desc"
            dangerouslySetInnerHTML={{ __html: renderMarkdownInline(endpoint.description) }}
          />
        )}
      </header>

      <SectionCard title="Path Parameters" hide={!pathParams.length}>
        <ParamList doc={doc} params={pathParams} />
      </SectionCard>

      <SectionCard title="Query Parameters" hide={!queryParams.length}>
        <ParamList doc={doc} params={queryParams} />
      </SectionCard>

      <SectionCard title="Headers" hide={!headerParams.length}>
        <ParamList doc={doc} params={headerParams} />
      </SectionCard>

      <SectionCard
        title="Request Body"
        subtitle={bodyKind ?? undefined}
        badge={refBadge(doc, bodySchema)}
        hide={!bodySchema}
      >
        {bodySchema && <SchemaTree doc={doc} schema={bodySchema} />}
      </SectionCard>

      <SectionCard title="Responses" hide={!op.responses || Object.keys(op.responses).length === 0}>
        <Responses doc={doc} responses={op.responses} />
      </SectionCard>
    </article>
  );
}

function SectionCard({
  title,
  subtitle,
  badge,
  hide,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: RefBadge | null;
  hide?: boolean;
  children: React.ReactNode;
}) {
  if (hide) return null;
  return (
    <section className="card">
      <header className="card-head">
        <h3 className="card-title">
          {title}
          {badge && <ModelBadge badge={badge} />}
        </h3>
        {subtitle && <span className="card-subtitle">{subtitle}</span>}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}

function PathWithCopy({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const parts = path.split(/(\{[^}]+\})/g);
  return (
    <button
      className="endpoint-path"
      onClick={() => {
        void navigator.clipboard?.writeText(path);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title="Copy path"
    >
      {parts.map((p, i) =>
        p.startsWith('{') ? (
          <span key={i} className="path-var">{p}</span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
      <span className="endpoint-path-copy">
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </span>
    </button>
  );
}

function ParamList({ doc, params }: { doc: OpenApiDoc; params: Parameter[] }) {
  return (
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
  );
}

function Responses({ doc, responses }: { doc: OpenApiDoc; responses: Operation['responses'] }) {
  const entries = Object.entries(responses ?? {});
  const [openIdx, setOpenIdx] = useState(0);
  if (!entries.length) return null;
  const [, current] = entries[openIdx] ?? [];
  return (
    <>
      <div className="response-tabs">
        {entries.map(([status, r], i) => (
          <button
            key={status}
            className="response-tab"
            data-active={openIdx === i}
            onClick={() => setOpenIdx(i)}
          >
            <span className="status-chip" data-kind={status[0]}>{status}</span>
            <span className="response-tab-label">{r.description ?? kindLabel(status[0] ?? '')}</span>
          </button>
        ))}
      </div>
      {current?.content?.['application/json'] && (
        <ResponseBody doc={doc} media={current.content['application/json']} />
      )}
    </>
  );
}

function ResponseBody({ doc, media }: { doc: OpenApiDoc; media: MediaType }) {
  const resolvedSchema = resolveRef(doc, media.schema) ?? media.schema;
  const hasSchema = !!resolvedSchema && (resolvedSchema.properties || resolvedSchema.items || resolvedSchema.type);
  const example = media.example ?? firstValue(media.examples)?.value ?? resolvedSchema?.example;
  const badge = refBadge(doc, media.schema);
  if (!hasSchema && example === undefined) return null;
  return (
    <div className="response-body">
      {badge && (
        <div className="response-model-head">
          <span className="response-model-label">Model</span>
          <ModelBadge badge={badge} />
        </div>
      )}
      {hasSchema && resolvedSchema && (
        <ResponseSchema doc={doc} schema={resolvedSchema} hideArrayLabel={!!badge?.isArray} />
      )}
      {example !== undefined && (
        <div className="example-block">
          <div className="example-head">Example</div>
          <JsonView data={example} maxHeight={280} />
        </div>
      )}
    </div>
  );
}

function ResponseSchema({
  doc,
  schema,
  hideArrayLabel,
}: {
  doc: OpenApiDoc;
  schema: SchemaObj;
  hideArrayLabel?: boolean;
}) {
  if (schema.type === 'array' && schema.items) {
    const item = resolveRef(doc, schema.items) ?? schema.items;
    const itemRef = extractRefName(schema.items);
    const linkedItem = itemRef && doc.components?.schemas?.[itemRef] ? itemRef : null;
    if (item.properties) {
      // The Model header above already says `array<Dto>` — don't repeat the
      // wrapper, just show the item's fields.
      if (hideArrayLabel && linkedItem) return <SchemaTree doc={doc} schema={item} />;
      return (
        <div>
          <div className="array-label">
            array&lt;
            {linkedItem
              ? <ModelLink name={linkedItem} />
              : (item.title ?? item.type ?? 'object')}
            &gt;
          </div>
          <SchemaTree doc={doc} schema={item} />
        </div>
      );
    }
  }
  if (schema.properties) return <SchemaTree doc={doc} schema={schema} />;
  return (
    <div className="primitive-type">
      {schema.format ?? schema.type ?? 'any'}
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
  if (schema.type === 'array' && schema.items) {
    return `array<${schema.items.format ?? schema.items.type ?? 'object'}>`;
  }
  // Format wins over type — see SchemaTree for the full rationale.
  return schema.format ?? schema.type ?? 'any';
}

