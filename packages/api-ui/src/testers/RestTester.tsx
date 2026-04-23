import { useEffect, useMemo, useState } from 'react';
import { Play, Key, Copy } from 'lucide-react';
import type { OpenApiDoc, RequestBody, RestEndpoint, SchemaObj } from '../types';
import { MethodPill } from '../components/MethodPill';
import { CodeBlock } from '../components/CodeBlock';
import { JsonView } from '../components/JsonView';
import { resolveRef } from '../spec';
import { buildExampleFromSchema, buildExampleParams } from '../samples';
import { genAxios, genCurl, genFetch } from '../codegen';
import { buildQueryString, resolvePath, runRest, type RestRunResult } from '../runners/rest';
import { useStore } from '../store';

type Tab = 'params' | 'body' | 'auth';
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
  const [bodyTxt, setBodyTxt] = useState('');
  const [formVals, setFormVals] = useState<Record<string, string | File>>({});
  const [resp, setResp] = useState<RestRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setParamVals(buildExampleParams(pathParams));
    setQueryVals(buildExampleParams(queryParams));
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
    setTab(defaultTab());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint.id, body, formFields, doc]);

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

  const headers: Record<string, string> = {};
  if (endpoint.auth && token) headers.Authorization = `Bearer ${token}`;

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
              <div className="hint">Network / CORS error · check your server</div>
            </div>
          )}
          {resp && resp.body !== null && resp.body !== undefined && resp.body !== '' && (
            <JsonView data={resp.body} maxHeight={280} />
          )}
        </div>
      </div>

      <div className="test-foot">
        <button className="btn primary" onClick={send} disabled={loading || !!bodyErr}>
          {loading ? (
            <><span className="dots"><span /><span /><span /></span> Sending</>
          ) : (
            <><Play size={14} /> Send Request</>
          )}
        </button>
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
}: {
  label: string;
  required: boolean;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="param-row">
      <span className="param-label" title={label}>
        {label}
        {required && <span className="req">*</span>}
      </span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ServerSelect() {
  const { server, setServer, bootstrap, doc } = useStore();
  const options = bootstrap.ui?.servers ??
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
