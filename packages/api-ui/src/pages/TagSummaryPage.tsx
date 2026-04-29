import type { EndpointGroup } from '../types';
import { MethodPill } from '../components/MethodPill';
import { useStore } from '../store';
import { renderMarkdownInline } from '../markdown';

/**
 * Summary page for a tag (REST tag or WebSocket gateway). Lists every
 * operation in the group as a clickable row — same pattern the events list
 * on the Connection page uses.
 */
export function TagSummaryPage({ group }: { group: EndpointGroup }) {
  const { selectEndpoint } = useStore();
  return (
    <article className="endpoint-card">
      <header className="endpoint-hero">
        <div className="endpoint-breadcrumb">
          <span>Tag</span>
        </div>
        <h1 className="endpoint-title">{group.name}</h1>
        {group.description && (
          <p
            className="endpoint-desc"
            dangerouslySetInnerHTML={{ __html: renderMarkdownInline(group.description) }}
          />
        )}
      </header>

      <section className="card">
        <header className="card-head">
          <h3 className="card-title">Operations</h3>
          <span className="card-subtitle">{group.endpoints.length} total</span>
        </header>
        <div className="card-body">
          <div className="tag-summary-list">
            {group.endpoints.map((ep) => (
              <button
                key={ep.id}
                type="button"
                className="tag-summary-row"
                data-model={ep.kind === 'model' || undefined}
                onClick={() => selectEndpoint(ep.id)}
                title={ep.title}
              >
                {ep.kind === 'model' ? (
                  <span className="model-type-chip">type</span>
                ) : (
                  <MethodPill method={ep.method} />
                )}
                <span className="tag-summary-path">
                  {ep.kind === 'rest' ? ep.path : ep.kind === 'ws-event' ? `"${ep.path}"` : ep.path}
                </span>
                <span className="tag-summary-title">{ep.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
