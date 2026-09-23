import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/** The SVS screen's three sections; the register is the front of the screen. */
export const SVS_SECTIONS = ['register', 'onboarding', 'evidence'] as const;
export type SvsSection = (typeof SVS_SECTIONS)[number];

function isSection(v: string | null): v is SvsSection {
  return v !== null && (SVS_SECTIONS as readonly string[]).includes(v);
}

/**
 * The active SVS section, held in the URL (`?section=onboarding`) so a reload
 * or a shared link opens the same queue — the rule the service lines follow.
 * The register is the default and keeps a clean address; anything unknown
 * lands on the register and the address bar is tidied.
 */
export function useSvsSection(): [SvsSection, (next: SvsSection) => void] {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('section');
  const section: SvsSection = isSection(fromUrl) ? fromUrl : 'register';

  const setSection = (next: SvsSection) => {
    const updated = new URLSearchParams(params);
    if (next === 'register') updated.delete('section');
    else updated.set('section', next);
    setParams(updated, { replace: true });
  };

  useEffect(() => {
    if (fromUrl !== null && !isSection(fromUrl)) {
      const updated = new URLSearchParams(params);
      updated.delete('section');
      setParams(updated, { replace: true });
    }
  }, [fromUrl, params, setParams]);

  return [section, setSection];
}
