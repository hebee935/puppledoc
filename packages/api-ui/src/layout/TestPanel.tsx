import { useStore } from '../store';
import { RestTester } from '../testers/RestTester';
import { WsTester } from '../testers/WsTester';

export function TestPanel() {
  const { doc, getActive } = useStore();
  const active = getActive();
  if (!doc || !active) return <section className="test" />;
  if (active.kind === 'rest') return <RestTester doc={doc} endpoint={active} />;
  return <WsTester doc={doc} endpoint={active} />;
}
