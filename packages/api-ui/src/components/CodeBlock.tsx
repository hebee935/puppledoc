import { Copy } from 'lucide-react';

interface Props {
  code: string;
  onCopy?: (code: string) => void;
}

export function CodeBlock({ code, onCopy }: Props) {
  return (
    <div style={{ position: 'relative' }}>
      <pre className="code-block">{code}</pre>
      <button
        className="copy-btn"
        onClick={() => {
          void navigator.clipboard?.writeText(code);
          onCopy?.(code);
        }}
        aria-label="Copy code"
      >
        <Copy size={12} style={{ verticalAlign: 'middle' }} /> Copy
      </button>
    </div>
  );
}
