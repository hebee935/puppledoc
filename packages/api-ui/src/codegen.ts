export interface FormFieldRef {
  name: string;
  kind: 'text' | 'file';
  /** File: original filename (we don't have the real disk path in the browser). Text: raw string. */
  value: string;
}

export interface RestRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  /** For JSON / no-body requests. */
  body?: unknown;
  /** Set when submitting multipart/form-data. */
  form?: FormFieldRef[];
}

export function genCurl(r: RestRequest): string {
  const lines = [`curl -X ${r.method} '${r.url}'`];
  for (const [k, v] of Object.entries(r.headers)) {
    if (!v) continue;
    lines.push(`  -H '${escapeSingle(k)}: ${escapeSingle(v)}'`);
  }
  if (r.form) {
    for (const f of r.form) {
      if (f.kind === 'file') lines.push(`  -F '${escapeSingle(f.name)}=@${escapeSingle(f.value || 'path/to/file')}'`);
      else lines.push(`  -F '${escapeSingle(f.name)}=${escapeSingle(f.value)}'`);
    }
  } else if (r.body !== undefined && r.body !== null) {
    lines.push(`  -d '${escapeSingle(JSON.stringify(r.body))}'`);
  }
  return lines.join(' \\\n');
}

export function genFetch(r: RestRequest): string {
  if (r.form) {
    const lines = [`const form = new FormData();`];
    for (const f of r.form) {
      if (f.kind === 'file') {
        lines.push(`form.append('${f.name}', /* File */ fileInput.files[0]);`);
      } else {
        lines.push(`form.append('${f.name}', ${JSON.stringify(f.value)});`);
      }
    }
    lines.push('');
    lines.push(`const res = await fetch('${r.url}', {`);
    lines.push(`  method: '${r.method}',`);
    const headerEntries = Object.entries(r.headers).filter(([, v]) => v);
    if (headerEntries.length) {
      lines.push(`  headers: ${stringifyObject(Object.fromEntries(headerEntries), 2)},`);
    }
    lines.push(`  body: form,`);
    lines.push(`});`);
    lines.push(`const data = await res.json();`);
    return lines.join('\n');
  }

  const lines = [`const res = await fetch('${r.url}', {`];
  lines.push(`  method: '${r.method}',`);
  const headerEntries = Object.entries(r.headers).filter(([, v]) => v);
  if (headerEntries.length) {
    lines.push(`  headers: ${stringifyObject(Object.fromEntries(headerEntries), 2)},`);
  }
  if (r.body !== undefined && r.body !== null) {
    lines.push(`  body: JSON.stringify(${stringifyObject(r.body as Record<string, unknown>, 2)}),`);
  }
  lines.push(`});`);
  lines.push(`const data = await res.json();`);
  return lines.join('\n');
}

export function genAxios(r: RestRequest): string {
  const method = r.method.toLowerCase();
  const lines = [`import axios from 'axios';`, ''];
  const config: Record<string, unknown> = {};
  if (Object.keys(r.headers).length > 0) config.headers = r.headers;

  if (r.form) {
    lines.push(`const form = new FormData();`);
    for (const f of r.form) {
      if (f.kind === 'file') lines.push(`form.append('${f.name}', /* File */ fileInput.files[0]);`);
      else lines.push(`form.append('${f.name}', ${JSON.stringify(f.value)});`);
    }
    lines.push('');
    const suffix = Object.keys(config).length ? `, ${stringifyObject(config, 2)}` : '';
    lines.push(`const { data } = await axios.${method}('${r.url}', form${suffix});`);
    return lines.join('\n');
  }

  const hasBody = r.body !== undefined && r.body !== null && !['get', 'head', 'delete'].includes(method);
  if (hasBody) {
    const suffix = Object.keys(config).length ? `, ${stringifyObject(config, 2)}` : '';
    lines.push(`const { data } = await axios.${method}('${r.url}', ${stringifyObject(r.body as Record<string, unknown>, 2)}${suffix});`);
  } else {
    const suffix = Object.keys(config).length ? `, ${stringifyObject(config, 2)}` : '';
    lines.push(`const { data } = await axios.${method}('${r.url}'${suffix});`);
  }
  return lines.join('\n');
}

function stringifyObject(value: unknown, indent: number): string {
  // Keep 2-space indentation on nested lines too.
  return JSON.stringify(value, null, indent).replace(/\n/g, '\n');
}

function escapeSingle(s: string): string {
  return s.replace(/'/g, "'\\''");
}
