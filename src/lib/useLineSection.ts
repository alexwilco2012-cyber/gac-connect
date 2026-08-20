import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ServiceLine } from '../data/serviceLines';
import { resolveLineSection } from './serviceLines';

/**
 * A service line's active section, held in the URL (`?section=consignments`)
 * so the dashboard, a hub service card and a shared link all open straight
 * onto the right one — the same rule crew change follows. An unrecognised
 * section resolves to the line's first and the address bar is tidied, so a
 * link minted against a section that has since been renamed still lands
 * somewhere sensible rather than silently showing the default.
 */
export function useLineSection(line: ServiceLine): [string, (id: string) => void] {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('section');
  const section = resolveLineSection(line, fromUrl) ?? '';
  const first = line.sections?.[0]?.id;

  const setSection = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === first) next.delete('section');
    else next.set('section', id);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (fromUrl !== null && fromUrl !== section) setSection(section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrl, section]);

  return [section, setSection];
}
