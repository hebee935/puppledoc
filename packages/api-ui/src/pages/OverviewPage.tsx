import { useStore } from '../store';
import type { OpenApiDoc } from '../types';

/**
 * Only renders content the spec author actually provided. We never invent sections
 * on their behalf — counts, boilerplate, shortcuts, etc. stay out.
 */
export function OverviewPage({ doc }: { doc: OpenApiDoc }) {
  const { bootstrap } = useStore();
  const info = doc.info ?? {};
  const servers =
    bootstrap.ui?.servers ??
    doc.servers?.map((s) => ({ label: s.description ?? s.url, url: s.url })) ??
    [];
  // `contact`, `license`, `termsOfService` are valid `info` fields per OpenAPI 3.1.
  // DocumentBuilder defaults `contact` to `{}`, so check for real content per field.
  const infoAny = info as typeof info & {
    contact?: { name?: string; url?: string; email?: string };
    license?: { name?: string; url?: string; identifier?: string };
    termsOfService?: string;
  };
  const hasContact = !!(infoAny.contact && (infoAny.contact.name || infoAny.contact.email || infoAny.contact.url));
  const hasLicense = !!(infoAny.license && (infoAny.license.name || infoAny.license.identifier || infoAny.license.url));
  const hasTerms = !!infoAny.termsOfService;
  const showInfoCard = hasContact || hasLicense || hasTerms;

  return (
    <div className="overview">
      <header className="overview-hero">
        {(info.version || doc.openapi) && (
          <div className="overview-version-row">
            {info.version && <span className="docs-version">v{info.version}</span>}
            {doc.openapi && <span className="docs-version">OpenAPI {doc.openapi}</span>}
          </div>
        )}
        {info.title && <h1 className="hero-title">{info.title}</h1>}
        {info.description && <p className="hero-desc">{info.description}</p>}
      </header>

      {servers.length > 0 && (
        <section className="card overview-card">
          <header className="card-head">
            <h3 className="card-title">Servers</h3>
          </header>
          <div className="card-body overview-servers">
            {servers.map((s) => (
              <div className="overview-server-row" key={s.url}>
                <span className="overview-server-label">{s.label}</span>
                <code className="overview-server-url">{s.url}</code>
              </div>
            ))}
          </div>
        </section>
      )}

      {showInfoCard && (
        <section className="card overview-card">
          <header className="card-head">
            <h3 className="card-title">Info</h3>
          </header>
          <div className="card-body overview-meta">
            {hasContact && infoAny.contact && (
              <div className="overview-meta-row">
                <span className="overview-server-label">Contact</span>
                <span>
                  {infoAny.contact.name}
                  {infoAny.contact.email && (
                    <>
                      {infoAny.contact.name ? ' · ' : ''}
                      <a href={`mailto:${infoAny.contact.email}`}>{infoAny.contact.email}</a>
                    </>
                  )}
                  {infoAny.contact.url && (
                    <>
                      {(infoAny.contact.name || infoAny.contact.email) ? ' · ' : ''}
                      <a href={infoAny.contact.url} target="_blank" rel="noreferrer">
                        {infoAny.contact.url}
                      </a>
                    </>
                  )}
                </span>
              </div>
            )}
            {hasLicense && infoAny.license && (
              <div className="overview-meta-row">
                <span className="overview-server-label">License</span>
                <span>
                  {infoAny.license.url ? (
                    <a href={infoAny.license.url} target="_blank" rel="noreferrer">
                      {infoAny.license.name ?? infoAny.license.identifier ?? infoAny.license.url}
                    </a>
                  ) : (
                    infoAny.license.name ?? infoAny.license.identifier
                  )}
                </span>
              </div>
            )}
            {hasTerms && (
              <div className="overview-meta-row">
                <span className="overview-server-label">Terms</span>
                <span>
                  <a href={infoAny.termsOfService} target="_blank" rel="noreferrer">
                    {infoAny.termsOfService}
                  </a>
                </span>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
