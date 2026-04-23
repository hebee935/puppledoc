import { ColumnResizer } from '../components/ColumnResizer';
import { useStore } from '../store';
import { RestTester } from '../testers/RestTester';
import { WsTester } from '../testers/WsTester';

export function TestPanel() {
  const { doc, getActive, testWidth, setTestWidth } = useStore();
  const active = getActive();
  const resizer = <ColumnResizer edge="left" current={testWidth} onChange={setTestWidth} />;
  if (!doc || !active) return <section className="test">{resizer}</section>;
  return active.kind === 'rest' ? (
    <RestTester doc={doc} endpoint={active} leftEdge={resizer} />
  ) : (
    <WsTester doc={doc} endpoint={active} leftEdge={resizer} />
  );
}
