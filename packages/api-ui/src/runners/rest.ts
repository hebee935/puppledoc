export interface RestRunResult {
  status: number;
  body: unknown;
  headers: Record<string, string>;
  durationMs: number;
  size: number;
}

export async function runRest(req: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}): Promise<RestRunResult> {
  const start = performance.now();
  const method = req.method.toUpperCase();
  const isForm = req.body instanceof FormData;
  const sendBody = !['GET', 'HEAD'].includes(method) && req.body !== undefined && req.body !== null;
  const hdrs = { ...req.headers };
  if (sendBody && !isForm && !hdrs['Content-Type']) hdrs['Content-Type'] = 'application/json';
  // For FormData, let the browser set Content-Type with the boundary parameter.

  // HTTP headers must be ISO-8859-1 (Latin-1). Detect non-conforming chars up-front
  // so we can surface a clear message instead of the opaque native fetch error.
  for (const [k, v] of Object.entries(hdrs)) {
    const offender = findNonLatin1(k) ?? findNonLatin1(v);
    if (offender) {
      throw new Error(
        `Header "${k}" contains a non-Latin-1 character (${offender}). HTTP headers only accept ASCII / Latin-1 — use an ASCII-only value (e.g. a real bearer token).`,
      );
    }
  }

  const res = await fetch(req.url, {
    method,
    headers: hdrs,
    body: sendBody
      ? isForm
        ? (req.body as FormData)
        : JSON.stringify(req.body)
      : undefined,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // keep as text
  }
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k] = v;
  });
  return {
    status: res.status,
    body: parsed,
    headers,
    durationMs: Math.round(performance.now() - start),
    size: new Blob([text]).size,
  };
}

function findNonLatin1(s: string): string | null {
  for (const ch of s) {
    if (ch.codePointAt(0)! > 0xff) return JSON.stringify(ch);
  }
  return null;
}

/** Replace `{name}` placeholders in a path with actual values (URI-encoded). */
export function resolvePath(template: string, values: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const v = values[name];
    return v !== undefined && v !== '' ? encodeURIComponent(v) : `{${name}}`;
  });
}

export function buildQueryString(values: Record<string, string>): string {
  const entries = Object.entries(values).filter(([, v]) => v !== '' && v !== undefined);
  if (!entries.length) return '';
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `?${qs}`;
}
