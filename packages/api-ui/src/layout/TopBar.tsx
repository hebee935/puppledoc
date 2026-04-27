import { Command, Download, Menu, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '../store';

export function TopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { doc, bootstrap, openPalette, goOverview } = useStore();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('puppledoc:theme') as 'light' | 'dark') ?? 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('puppledoc:theme', theme);
  }, [theme]);

  const title = doc?.info?.title ?? 'API Docs';
  const version = doc?.info?.version ?? '';

  return (
    <header className="topbar">
      <button className="topbar-icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <Menu size={16} />
      </button>

      <button className="topbar-brand" onClick={goOverview} aria-label="Overview">
        <img
          className="brand-mark brand-mark-sm"
          src={`${bootstrap.basePath || ''}/android-chrome-192x192.png`}
          alt=""
        />
        <span className="topbar-title">{title}</span>
        {version && <span className="topbar-version">{version}</span>}
      </button>

      <button className="topbar-search" onClick={openPalette}>
        <Command size={13} />
        <span>Search</span>
        <span className="kbd topbar-kbd">⌘K</span>
      </button>

      <div className="topbar-actions">
        <button
          className="topbar-icon-btn"
          onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <a
          className="topbar-icon-btn"
          href={`${bootstrap.basePath || ''}/openapi.json`}
          download={`${(doc?.info?.title ?? 'openapi').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'openapi'}.json`}
          aria-label="Download OpenAPI spec"
          title="Download OpenAPI spec"
        >
          <Download size={16} />
        </a>
      </div>
    </header>
  );
}
