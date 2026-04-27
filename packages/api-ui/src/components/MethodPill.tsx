interface Props {
  method: string;
  /** Use on the test panel — slightly larger variant with letter-spacing adjusted. */
  variant?: 'nav' | 'head';
}

export function MethodPill({ method, variant = 'nav' }: Props) {
  const aria = method === 'SEND' || method === 'RECV' || method === 'CONN'
    ? `WebSocket ${method.toLowerCase()}`
    : `HTTP method ${method}`;
  const className = variant === 'head' ? 'test-method' : 'method-pill';
  return (
    <span className={className} data-method={method} aria-label={aria}>
      {method}
    </span>
  );
}
