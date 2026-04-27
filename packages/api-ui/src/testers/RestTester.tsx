import { useEffect, useMemo, useState } from 'react';
import { Play, Key, Copy, Plus, X } from 'lucide-react';
import type { OpenApiDoc, RequestBody, RestEndpoint, SchemaObj } from '../types';
import { MethodPill } from '../components/MethodPill';
import { CodeBlock } from '../components/CodeBlock';
import { JsonView } from '../components/JsonView';
import { resolveRef } from '../spec';
import { buildExampleFromSchema, buildExampleParams } from '../samples';
import { genAxios, genCurl, genFetch } from '../codegen';
import { buildQueryString, resolvePath, runRest, type RestRunResult } from '../runners/rest';
import { useStore } from '../store';

type Tab = 'params' | 'body' | 'headers' | 'auth';
interface CustomHeader {
  id: string;
  name: string;
  value: string;
}
type Lang = 'curl' | 'fetch' | 'axios';
type BodyKind = 'json' | 'form';

interface BodySpec {
  kind: BodyKind;
  contentType: string;
  schema: SchemaObj;
}

interface Props {
  doc: OpenApiDoc;
  endpoint: RestEndpoint;
  leftEdge?: React.ReactNode;
}

export function RestTester({ doc, endpoint, leftEdge }: Props) {
  const { token, server, openAuth } = useStore();
  const op = endpoint.operation;
  const pathParams = useMemo(() => (op.parameters ?? []).filter((p) => p.in === 'path'), [op]);
  const queryParams = useMemo(() => (op.parameters ?? []).filter((p) => p.in === 'query'), [op]);
  const headerParams = useMemo(() => (op.parameters ?? []).filter((p) => p.in === 'header'), [op]);
  const body = useMemo(() => detectBody(doc, op.requestBody), [doc, op.requestBody]);
  const formFields = useMemo(
    () => (body?.kind === 'form' ? collectFormFields(doc, body.schema) : []),
    [doc, body],
  );

  const defaultTab = (): Tab => {
    if (body) return 'body';
    if (pathParams.length || queryParams.length) return 'params';
    if (endpoint.auth) return 'auth';
    return 'body';
  };
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [codeLang, setCodeLang] = useState<Lang>('curl');
  const [paramVals, setParamVals] = useState<Record<string, string>>({});
  const [queryVals, setQueryVals] = useState<Record<string, string>>({});
  const [headerVals, setHeaderVals] = useState<Record<string, string>>({});
  const [customHeaders, setCustomHeaders] = useState<CustomHeader[]>([]);
  const [bodyTxt, setBodyTxt] = useState('');
  const [formVals, setFormVals] = useState<Record<string, string | File>>({});
  const [resp, setResp] = useState<RestRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => {
    setParamVals(buildExampleParams(pathParams));
    setQueryVals(buildExampleParams(queryParams));
    setHeaderVals(buildExampleParams(headerParams));
    setCustomHeaders([]);
    if (body?.kind === 'json') {
      const example = buildExampleFromSchema(doc, body.schema);
      setBodyTxt(example === undefined ? '' : JSON.stringify(example, null, 2));
      setFormVals({});
    } else if (body?.kind === 'form') {
      const vals: Record<string, string | File> = {};
      for (const f of formFields) {
        if (f.isFile) continue;
        if (f.example !== undefined && f.example !== null) vals[f.name] = String(f.example);
      }
      setFormVals(vals);
      setBodyTxt('');
    } else {
      setBodyTxt('');
      setFormVals({});
    }
    setResp(null);
    setError(null);
    setShowMissing(false);
    setTab(defaultTab());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint.id, body, formFields, doc, headerParams]);

  const resolved = resolvePath(endpoint.path, paramVals);
  const qstr = buildQueryString(queryVals);
  const fullUrl = `${server}${resolved}${qstr}`;

  let parsedJson: unknown;
  let bodyErr: string | null = null;
  if (body?.kind === 'json' && bodyTxt) {
    try {
      parsedJson = JSON.parse(bodyTxt);
    } catch (e) {
      bodyErr = (e as Error).message;
    }
  }

  const missingRequired = useMemo(() => {
    const m: string[] = [];
    for (const p of pathParams) {
      if (p.required && !paramVals[p.name]?.toString().trim()) m.push(`path · ${p.name}`);
    }
    for (const p of queryParams) {
      if (p.required && !queryVals[p.name]?.toString().trim()) m.push(`query · ${p.name}`);
    }
    for (const p of headerParams) {
      if (p.required && !headerVals[p.name]?.toString().trim()) m.push(`header · ${p.name}`);
    }
    if (body?.kind === 'form') {
      for (const f of formFields) {
        if (!f.required) continue;
        const v = formVals[f.name];
        const empty = v === undefined || v === '' || (typeof v === 'string' && !v.trim());
        if (empty) m.push(`body · ${f.name}`);
      }
    }
    if (body?.kind === 'json') {
      if (op.requestBody?.required && !bodyTxt.trim()) {
        m.push('body');
      } else if (!bodyErr && parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
        // Top-level required fields per the body schema.
        const required = (body.schema.required as string[] | undefined) ?? [];
        const obj = parsedJson as Record<string, unknown>;
        for (const f of required) {
          const v = obj[f];
          if (v === undefined || v === null || v === '') m.push(`body · ${f}`);
        }
      }
    }
    return m;
  }, [
    pathParams, queryParams, headerParams,
    paramVals, queryVals, headerVals,
    body, formFields, formVals, bodyTxt,
    bodyErr, parsedJson,
    op.requestBody?.required,
  ]);

  // Auto-clear the warning once everything is valid + filled.
  useEffect(() => {
    if (showMissing && missingRequired.length === 0 && !bodyErr) setShowMissing(false);
  }, [showMissing, missingRequired, bodyErr]);

  const headers = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = {};
    for (const p of headerParams) {
      const v = headerVals[p.name];
      if (v) h[p.name] = v;
    }
    for (const c of customHeaders) {
      if (c.name && c.value) h[c.name] = c.value;
    }
    if (endpoint.auth && token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [headerParams, headerVals, customHeaders, endpoint.auth, token]);

  const codeStr = useMemo(() => {
    if (body?.kind === 'form') {
      const fields = formFields.map((f) => {
        const v = formVals[f.name];
        return {
          name: f.name,
          kind: f.isFile ? ('file' as const) : ('text' as const),
          value: v instanceof File ? v.name : typeof v === 'string' ? v : '',
        };
      }).filter((f) => f.value !== '' || f.kind === 'file');
      const args = { method: endpoint.method, url: fullUrl, headers, form: fields };
      if (codeLang === 'curl') return genCurl(args);
      if (codeLang === 'fetch') return genFetch(args);
      return genAxios(args);
    }
    const args = { method: endpoint.method, url: fullUrl, headers, body: parsedJson };
    if (codeLang === 'curl') return genCurl(args);
    if (codeLang === 'fetch') return genFetch(args);
    return genAxios(args);
  }, [codeLang, endpoint.method, fullUrl, headers, parsedJson, body, formFields, formVals]);

  const send = async () => {
    if (bodyErr) return;
    if (endpoint.auth && !token) {
      openAuth();
      return;
    }
    setLoading(true);
    setResp(null);
    setError(null);
    try {
      let requestBody: unknown;
      if (body?.kind === 'form') {
        const fd = new FormData();
        for (const f of formFields) {
          const v = formVals[f.name];
          if (v instanceof File) fd.append(f.name, v);
          else if (typeof v === 'string' && v !== '') fd.append(f.name, v);
        }
        requestBody = fd;
      } else if (body?.kind === 'json') {
        requestBody = parsedJson;
      }
      const r = await runRest({
        method: endpoint.method,
        url: fullUrl,
        headers,
        body: requestBody,
      });
      setResp(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const hasParams = pathParams.length > 0 || queryParams.length > 0;

  return (
    <section className="test">
      {leftEdge}
      <div className="test-head">
        <MethodPill method={endpoint.method} variant="head" />
        <span className="test-path" title={fullUrl}>{resolved}{qstr}</span>
        <ServerSelect />
      </div>

      <div className="tabs">
        {hasParams && (
          <button className="tab" data-active={tab === 'params'} onClick={() => setTab('params')}>
            Params <span className="tab-count">{pathParams.length + queryParams.length}</span>
          </button>
        )}
        {body && (
          <button className="tab" data-active={tab === 'body'} onClick={() => setTab('body')}>
            Body <span className="tab-count">{body.kind === 'form' ? 'form' : 'json'}</span>
          </button>
        )}
        <button className="tab" data-active={tab === 'headers'} onClick={() => setTab('headers')}>
          Headers
          {(headerParams.length + customHeaders.filter((h) => h.name && h.value).length) > 0 && (
            <span className="tab-count">
              {headerParams.length + customHeaders.filter((h) => h.name && h.value).length}
            </span>
          )}
        </button>
        {endpoint.auth && (
          <button className="tab" data-active={tab === 'auth'} onClick={() => setTab('auth')}>
            Auth {token && <span className="wss-dot" data-state="connected" style={{ width: 6, height: 6 }} />}
          </button>
        )}
      </div>

      <div className="test-body">
        {tab === 'params' && hasParams && (
          <div className="param-editor">
            {pathParams.length > 0 && (
              <>
                <SectionLabel>Path</SectionLabel>
                {pathParams.map((p) => (
                  <ParamInput
                    key={p.name}
                    label={p.name}
                    required={!!p.required}
                    placeholder={String(p.example ?? p.schema?.example ?? '')}
                    value={paramVals[p.name] ?? ''}
                    onChange={(v) => setParamVals((prev) => ({ ...prev, [p.name]: v }))}
                    fieldKey={`path-${p.name}`}
                  />
                ))}
              </>
            )}
            {queryParams.length > 0 && (
              <>
                <SectionLabel style={{ marginTop: 12 }}>Query</SectionLabel>
                {queryParams.map((p) => (
                  <ParamInput
                    key={p.name}
                    label={p.name}
                    required={!!p.required}
                    placeholder={String(p.example ?? p.schema?.example ?? '')}
                    value={queryVals[p.name] ?? ''}
                    onChange={(v) => setQueryVals((prev) => ({ ...prev, [p.name]: v }))}
                    fieldKey={`query-${p.name}`}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'body' && body?.kind === 'json' && (
          <div className="param-editor">
            <textarea
              className="input input-textarea"
              data-field="body"
              value={bodyTxt}
              onChange={(e) => setBodyTxt(e.target.value)}
              spellCheck={false}
            />
            {bodyErr && (
              <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                JSON error: {bodyErr}
              </div>
            )}
          </div>
        )}

        {tab === 'body' && body?.kind === 'form' && (
          <div className="param-editor">
            <SectionLabel>multipart/form-data</SectionLabel>
            {formFields.map((f) => (
              <FormFieldInput
                key={f.name}
                field={f}
                value={formVals[f.name]}
                onText={(v) => setFormVals((prev) => ({ ...prev, [f.name]: v }))}
                onFile={(file) => setFormVals((prev) => {
                  const next = { ...prev };
                  if (file) next[f.name] = file;
                  else delete next[f.name];
                  return next;
                })}
              />
            ))}
          </div>
        )}

        {tab === 'headers' && (
          <div className="param-editor">
            {headerParams.length > 0 && (
              <>
                <SectionLabel>Declared</SectionLabel>
                {headerParams.map((p) => (
                  <ParamInput
                    key={p.name}
                    label={p.name}
                    required={!!p.required}
                    placeholder={String(p.example ?? p.schema?.example ?? '')}
                    value={headerVals[p.name] ?? ''}
                    onChange={(v) => setHeaderVals((prev) => ({ ...prev, [p.name]: v }))}
                    fieldKey={`header-${p.name}`}
                  />
                ))}
              </>
            )}
            <SectionLabel style={{ marginTop: headerParams.length ? 12 : 0 }}>Custom</SectionLabel>
            {customHeaders.map((h) => (
              <div
                key={h.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr auto',
                  gap: 6,
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--line-dark)',
                }}
              >
                <input
                  className="input"
                  placeholder="X-Request-Id"
                  value={h.name}
                  onChange={(e) =>
                    setCustomHeaders((prev) =>
                      prev.map((x) => (x.id === h.id ? { ...x, name: e.target.value } : x)),
                    )
                  }
                />
                <input
                  className="input"
                  placeholder="value"
                  value={h.value}
                  onChange={(e) =>
                    setCustomHeaders((prev) =>
                      prev.map((x) => (x.id === h.id ? { ...x, value: e.target.value } : x)),
                    )
                  }
                />
                <button
                  className="btn ghost"
                  style={{ padding: '4px 6px' }}
                  onClick={() => setCustomHeaders((prev) => prev.filter((x) => x.id !== h.id))}
                  aria-label="Remove header"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              className="btn ghost"
              style={{ marginTop: 8, padding: '6px 10px' }}
              onClick={() =>
                setCustomHeaders((prev) => [
                  ...prev,
                  { id: `h_${Date.now()}_${prev.length}`, name: '', value: '' },
                ])
              }
            >
              <Plus size={12} /> Add header
            </button>
            {endpoint.auth && token && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 11,
                  color: 'var(--ink-dark-faint)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                + Authorization: Bearer {token.slice(0, 16)}…{' '}
                <span style={{ opacity: 0.6 }}>(auto from Auth tab)</span>
              </div>
            )}
          </div>
        )}

        {tab === 'auth' && (
          <div className="param-editor">
            <div style={{ fontSize: 12.5, color: 'var(--ink-dark-muted)', marginBottom: 10 }}>
              Bearer token is attached to every authenticated request.
            </div>
            <button className="btn" onClick={openAuth}>
              <Key size={14} /> {token ? 'Update token' : 'Set token'}
            </button>
            {token && (
              <div
                style={{
                  marginTop: 10,
                  padding: 8,
                  background: 'var(--panel-2)',
                  borderRadius: 5,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--ink-dark-muted)',
                  wordBreak: 'break-all',
                }}
              >
                {token.slice(0, 28)}…
              </div>
            )}
          </div>
        )}

        <div className="code-switcher" style={{ marginTop: 6 }}>
          {(['curl', 'fetch', 'axios'] as const).map((l) => (
            <button key={l} className="code-tab" data-active={codeLang === l} onClick={() => setCodeLang(l)}>
              {l}
            </button>
          ))}
        </div>
        <CodeBlock code={codeStr} />

        <div className="response-preview">
          <div className="response-preview-head">
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--ink-dark-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Response
            </span>
            {resp && <span className="resp-status" data-kind={String(resp.status)[0]}>{resp.status}</span>}
            {resp && <span className="resp-meta">{resp.durationMs}ms · {resp.size}B</span>}
            {loading && <span className="dots"><span /><span /><span /></span>}
          </div>
          {!resp && !loading && !error && (
            <div className="resp-empty">
              No response yet
              <div className="hint">Press Send to dispatch a real request</div>
            </div>
          )}
          {loading && (
            <div className="resp-empty">
              Sending…
              <div className="hint">{endpoint.method} {resolved}</div>
            </div>
          )}
          {error && (
            <div className="resp-empty">
              <div style={{ color: 'var(--danger)' }}>{error}</div>
              <div className="hint">
                {/Latin-1|non-ASCII/.test(error)
                  ? 'Invalid header value · use ASCII-only characters'
                  : 'Network / CORS error · check your server'}
              </div>
            </div>
          )}
          {resp && resp.body !== null && resp.body !== undefined && resp.body !== '' && (
            <JsonView data={resp.body} maxHeight={280} />
          )}
        </div>
      </div>

      <div className="test-foot">
        <button
          className="btn primary"
          onClick={() => {
            // JSON syntax error takes precedence — focus the body textarea so
            // the user sees the parser message right next to it.
            if (bodyErr) {
              setShowMissing(true);
              if (tab !== 'body') setTab('body');
              requestAnimationFrame(() => {
                const el = document.querySelector<HTMLElement>('[data-field="body"]');
                if (!el) return;
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.focus({ preventScroll: true });
              });
              return;
            }
            if (missingRequired.length === 0) {
              setShowMissing(false);
              send();
              return;
            }
            setShowMissing(true);
            const first = missingRequired[0];
            const [kind, name] = first.split(' · ');
            const tabFor: Record<string, Tab> = {
              path: 'params', query: 'params', header: 'headers', body: 'body',
            };
            const target = tabFor[kind];
            if (target && target !== tab) setTab(target);
            requestAnimationFrame(() => {
              const sel = name ? `[data-field="${kind}-${name}"]` : `[data-field="${kind}"]`;
              const el = document.querySelector<HTMLElement>(sel);
              if (!el) return;
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.focus({ preventScroll: true });
            });
          }}
          disabled={loading}
        >
          {loading ? (
            <><span className="dots"><span /><span /><span /></span> Sending</>
          ) : (
            <><Play size={14} /> Send Request</>
          )}
        </button>
        {showMissing && (bodyErr || missingRequired.length > 0) && (
          <span className="test-foot-warn">
            {bodyErr
              ? `Invalid JSON · ${bodyErr}`
              : `Missing required: ${missingRequired.join(', ')}`}
          </span>
        )}
        <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(codeStr)}>
          <Copy size={14} /> Copy {codeLang}
        </button>
      </div>
    </section>
  );
}

/* ---------- helpers ---------- */

function detectBody(doc: OpenApiDoc, rb: RequestBody | undefined): BodySpec | null {
  if (!rb?.content) return null;
  const json = rb.content['application/json'];
  if (json?.schema) {
    const schema = resolveRef(doc, json.schema) ?? json.schema;
    return { kind: 'json', contentType: 'application/json', schema };
  }
  const form = rb.content['multipart/form-data'];
  if (form?.schema) {
    const schema = resolveRef(doc, form.schema) ?? form.schema;
    return { kind: 'form', contentType: 'multipart/form-data', schema };
  }
  const urlEncoded = rb.content['application/x-www-form-urlencoded'];
  if (urlEncoded?.schema) {
    const schema = resolveRef(doc, urlEncoded.schema) ?? urlEncoded.schema;
    return { kind: 'form', contentType: 'application/x-www-form-urlencoded', schema };
  }
  return null;
}

interface FormField {
  name: string;
  isFile: boolean;
  required: boolean;
  description?: string;
  example?: unknown;
}

function collectFormFields(doc: OpenApiDoc, schema: SchemaObj): FormField[] {
  const resolved = resolveRef(doc, schema) ?? schema;
  if (!resolved.properties) return [];
  const required = new Set(resolved.required ?? []);
  return Object.entries(resolved.properties).map(([name, raw]) => {
    const prop = resolveRef(doc, raw) ?? raw;
    return {
      name,
      isFile: prop.type === 'string' && prop.format === 'binary',
      required: required.has(name),
      description: prop.description,
      example: prop.example,
    };
  });
}

function FormFieldInput({
  field,
  value,
  onText,
  onFile,
}: {
  field: FormField;
  value: string | File | undefined;
  onText: (v: string) => void;
  onFile: (f: File | null) => void;
}) {
  return (
    <div className="param-row">
      <span className="param-label" title={field.name}>
        {field.name}
        {field.required && <span className="req">*</span>}
      </span>
      {field.isFile ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="file"
            className="input"
            style={{ padding: 4 }}
            data-field={`body-${field.name}`}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          {value instanceof File && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-dark-muted)' }}>
              {value.size}B
            </span>
          )}
        </div>
      ) : (
        <input
          className="input"
          data-field={`body-${field.name}`}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onText(e.target.value)}
          placeholder={String(field.example ?? '')}
        />
      )}
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: 'var(--ink-dark-faint)',
        fontFamily: 'var(--font-mono)',
        marginBottom: 6,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ParamInput({
  label,
  required,
  placeholder,
  value,
  onChange,
  fieldKey,
}: {
  label: string;
  required: boolean;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  fieldKey?: string;
}) {
  return (
    <div className="param-row">
      <span className="param-label" title={label}>
        {label}
        {required && <span className="req">*</span>}
      </span>
      <input
        className="input"
        data-field={fieldKey}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ServerSelect() {
  const { server, setServer, doc } = useStore();
  const options =
    doc?.servers?.map((s) => ({ label: s.description ?? s.url, url: s.url })) ??
    [];
  if (options.length <= 1) return null;
  return (
    <select className="test-server-select" value={server} onChange={(e) => setServer(e.target.value)}>
      {options.map((s) => (
        <option key={s.url} value={s.url}>{s.label}</option>
      ))}
    </select>
  );
}
