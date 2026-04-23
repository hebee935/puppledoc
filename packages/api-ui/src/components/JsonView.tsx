interface Props {
  data: unknown;
  maxHeight?: number;
}

/** Tiny JSON syntax-highlighter. Avoids Prism/Shiki to keep the bundle tight. */
export function JsonView({ data, maxHeight }: Props) {
  const text = JSON.stringify(data, null, 2);
  const parts: { t: string; v: string }[] = [];
  let last = 0;
  const re = /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(\b-?\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)|([{}\[\],])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: 'plain', v: text.slice(last, m.index) });
    if (m[1]) parts.push({ t: 'key', v: m[1] });
    else if (m[2]) parts.push({ t: 'str', v: m[2] });
    else if (m[3]) parts.push({ t: 'num', v: m[3] });
    else if (m[4]) parts.push({ t: 'kw', v: m[4] });
    else if (m[5]) parts.push({ t: 'punct', v: m[5] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ t: 'plain', v: text.slice(last) });

  return (
    <pre className="resp-body" style={maxHeight ? { maxHeight } : undefined}>
      {parts.map((p, i) =>
        p.t === 'plain' ? (
          <span key={i}>{p.v}</span>
        ) : (
          <span key={i} className={`tok-${p.t}`}>{p.v}</span>
        ),
      )}
    </pre>
  );
}
