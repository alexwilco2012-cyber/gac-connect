import { describe, expect, it } from 'vitest';
import { LETTER_DATA_NOTICE } from '../src/data/crewChange';
import {
  isCrewRequest,
  isLetterDueForPurge,
  LETTER_RETENTION_DAYS,
  letterPurgeLabel,
  purgeExpiredLetters,
  REDACTED_FIELD,
} from '../src/lib/crewChange';
import type { CrewRequest } from '../src/lib/crewChange';

const DAY = 24 * 60 * 60 * 1000;
const DONE = '2026-10-01T09:00:00.000Z';
const at = (days: number) => new Date(new Date(DONE).getTime() + days * DAY);

function loi(extra: Partial<CrewRequest> = {}): CrewRequest {
  return {
    id: 'LOI-0001',
    createdAt: 'Thu 1 Oct, 08:00',
    kind: 'loi',
    stage: 'Returned to client',
    completedAtIso: DONE,
    form: {
      familyName: 'MEMBER',
      forenames: 'Crew',
      nationality: 'Demo nationality A',
      dateOfBirth: '01/01/1990',
      passportNumber: 'X0000001',
      passportExpiry: '01/01/2031',
      vesselId: 'choice',
      port: 'Aberdeen',
      joiningDate: '02/10/2026',
      arrivingFlight: 'ZZ 417',
      visaNational: true,
    },
    ...extra,
  } as CrewRequest;
}

describe('letters filed by hand — the thirty-day deletion the notice promises', () => {
  it('is not due a day before thirty days, and is due on the day', () => {
    expect(isLetterDueForPurge(loi(), at(LETTER_RETENTION_DAYS - 1))).toBe(false);
    expect(isLetterDueForPurge(loi(), at(LETTER_RETENTION_DAYS))).toBe(true);
  });

  it('never runs before the letter is returned', () => {
    const open = loi({ stage: 'GAC checking', completedAtIso: undefined });
    expect(isLetterDueForPurge(open, at(400))).toBe(false);
  });

  it('leaves a letter raised from a crew list to its list’s clock', () => {
    expect(isLetterDueForPurge(loi({ crewListId: 'CL-0001' }), at(400))).toBe(false);
  });

  it('redacts every personal field and keeps the reference, vessel and port', () => {
    const [swept] = purgeExpiredLetters([loi()], at(31));
    expect(swept!.redacted).toBe(true);
    expect(swept!.id).toBe('LOI-0001');
    expect(swept!.form.vesselId).toBe('choice');
    expect(swept!.form.port).toBe('Aberdeen');
    expect(swept!.form.familyName).toBe(REDACTED_FIELD);
    expect(swept!.form.passportNumber).toBe(REDACTED_FIELD);
    expect(swept!.form.dateOfBirth).toBe(REDACTED_FIELD);
  });

  it('returns the same array when nothing was due, so the store knows not to write', () => {
    const list = [loi()];
    expect(purgeExpiredLetters(list, at(5))).toBe(list);
  });

  it('names the day the details go', () => {
    expect(letterPurgeLabel(DONE)).toBe('on 31 Oct');
  });

  it('accepts the completion stamp in storage and refuses a malformed one', () => {
    expect(isCrewRequest(loi())).toBe(true);
    expect(isCrewRequest({ ...loi(), completedAtIso: 42 })).toBe(false);
  });
});

describe('the letter data notice', () => {
  const text = [
    LETTER_DATA_NOTICE.title,
    LETTER_DATA_NOTICE.intro,
    ...LETTER_DATA_NOTICE.points.flatMap((p) => [p.title, p.body]),
  ].join(' ');

  it('leads with illustrative, so the demo never reads as GAC’s legal position', () => {
    expect(LETTER_DATA_NOTICE.intro).toMatch(/^Illustrative/);
  });

  it('says UK GDPR, thirty days and how to delete sooner', () => {
    expect(text).toMatch(/UK GDPR/);
    expect(text).toMatch(/thirty days/);
    expect(text).toMatch(/Delete crew details/);
  });

  it('never names an address and never shouts', () => {
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/!/);
  });
});
