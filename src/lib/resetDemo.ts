import { useApp } from '../store/app';
import { useBunkers } from '../store/bunkers';
import { useCertification } from '../store/certification';
import { useCrewChange } from '../store/crewChange';
import { useCustoms } from '../store/customs';
import { useLogistics } from '../store/logistics';
import { useProcurement } from '../store/procurement';

/**
 * The top bar's Reset demo (16 Sep): one control that puts every screen back
 * to its seeded state, so a presenter can walk the same room twice — or hand
 * the QR to a second panel — without visiting six screens to tidy up. It
 * calls the same reset each screen's own button calls, then the app store's,
 * so nothing here knows what "clean" looks like: the stores do.
 *
 * Kept: the collapsed-sidebar preference (furniture, not demo state) and the
 * loader-seen session flag (the loader plays once per visit, not once per
 * reset).
 */
export function resetDemo(): void {
  useCrewChange.getState().reset();
  useProcurement.getState().reset();
  useLogistics.getState().reset();
  useCustoms.getState().reset();
  useCertification.getState().reset();
  useBunkers.getState().reset();
  useApp.getState().resetDemo();
}

export const RESET_DEMO_TOAST = 'Demo reset — every screen is back to its starting state.';
