import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store';
import { RestTester } from '../testers/RestTester';
import { WsTester } from '../testers/WsTester';

export function TestDrawer() {
  const { doc, getActive, drawerOpen, closeDrawer } = useStore();
  const active = getActive();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  return (
    <>
      {drawerOpen && <div className="drawer-scrim" onClick={closeDrawer} />}
      <aside className="drawer" data-open={drawerOpen} aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <span className="drawer-title">Try it</span>
          <button className="drawer-close" onClick={closeDrawer} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="drawer-body">
          {doc && active?.kind === 'rest' && <RestTester doc={doc} endpoint={active} />}
          {doc && active && active.kind !== 'rest' && <WsTester doc={doc} endpoint={active} />}
          {!active && (
            <div className="resp-empty">Select an endpoint to test</div>
          )}
        </div>
      </aside>
    </>
  );
}
