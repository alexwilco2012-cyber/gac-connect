import { describe, expect, it } from 'vitest';
import {
  ASK_TEAM_INTRO,
  ASK_TEAM_NOTICE,
  CLIENT_EORI,
  DECLARATION_NOTICE,
  EORI_NOTE,
  INFORMS_NOT_ADVISES,
  SEED_DECLARATIONS,
} from '../src/data/customs';
import { DEMO_CONSIGNMENT, SEED_CONSIGNMENTS } from '../src/data/logistics';
import { VESSELS } from '../src/data/vessels';
import {
  CUSTOMS_QUESTION_MAX,
  customsTeamChannelLabel,
  customsTeamOutcome,
  customsTeamRequest,
  eoriCallStatus,
  isCustomsTeamRequest,
  isDeclaration,
  isIllustrativeEori,
} from '../src/lib/customs';
import type { Declaration } from '../src/lib/customs';
import {
  bookingEta,
  FLT_RULE,
  FLT_THRESHOLD_KG,
  fltMovedText,
  fltRequestButton,
  fltRequestedText,
  fltSuggestion,
  fltSuggestionText,
  isConsignment,
  isQuayDelivery,
  shiftEta,
  weightPerPieceKg,
} from '../src/lib/logistics';
import type { Consignment } from '../src/lib/logistics';

const seeded = (id: string): Consignment => {
  const c = SEED_CONSIGNMENTS.find((x) => x.id === id);
  if (!c) throw new Error(`no seed ${id}`);
  return { ...c, form: { ...c.form } };
};

describe('ETA arithmetic', () => {
  it('moves an ETA by hours and rolls over the day and the week', () => {
    expect(shiftEta('Fri 14:00', 2)).toBe('Fri 16:00');
    expect(shiftEta('Fri 23:00', 2)).toBe('Sat 01:00');
    expect(shiftEta('Sun 23:30', 1)).toBe('Mon 00:30');
    expect(shiftEta('Mon 01:00', -2)).toBe('Sun 23:00');
  });

  it('leaves anything not shaped like an ETA alone', () => {
    expect(shiftEta('26 Aug 2026', 2)).toBe('26 Aug 2026');
    expect(shiftEta('', 2)).toBe('');
  });

  it('plans a new booking to land two hours before the vessel call', () => {
    const choice = VESSELS.find((v) => v.id === 'choice')!;
    expect(bookingEta(choice.timeline.label)).toBe('Fri 06:00');
  });
});

describe('Forklift timed to the freight', () => {
  it('states its rule with the threshold in it', () => {
    expect(FLT_RULE).toContain(`${FLT_THRESHOLD_KG} kg`);
    expect(FLT_RULE).toMatch(/quay/);
  });

  it('knows a quay from the warehouse', () => {
    expect(isQuayDelivery('Aberdeen — Regent Quay')).toBe(true);
    expect(isQuayDelivery('Peterhead — Smith Quay')).toBe(true);
    expect(isQuayDelivery('Aberdeen — GAC warehouse')).toBe(false);
  });

  it('weighs a piece as gross weight over pieces, rounded up', () => {
    expect(weightPerPieceKg({ pieces: '1', weightKg: '380' })).toBe(380);
    expect(weightPerPieceKg({ pieces: '3', weightKg: '1000' })).toBe(334);
    expect(weightPerPieceKg({ pieces: '0', weightKg: '100' })).toBeNull();
    expect(weightPerPieceKg({ pieces: 'two', weightKg: '100' })).toBeNull();
  });

  it('suggests one for the seeded Regent Quay crate, at its ETA', () => {
    const flt = fltSuggestion(seeded('CN-2042'));
    expect(flt).not.toBeNull();
    expect(flt!.neededBy).toBe('Fri 14:00');
    expect(flt!.perPieceKg).toBe(380);
    expect(flt!.requested).toBe(false);
  });

  it('does not suggest one for the seeded warehouse delivery', () => {
    expect(fltSuggestion(seeded('CN-2041'))).toBeNull();
  });

  it('does not suggest one when every piece is at or under the threshold', () => {
    const light = seeded('CN-2042');
    light.form.weightKg = String(FLT_THRESHOLD_KG);
    expect(fltSuggestion(light)).toBeNull();
  });

  it('does not suggest one without an ETA, or once delivered and never requested', () => {
    const noEta = seeded('CN-2042');
    delete noEta.eta;
    expect(fltSuggestion(noEta)).toBeNull();
    expect(fltSuggestion({ ...seeded('CN-2042'), stage: 'Delivered to quay' })).toBeNull();
  });

  it('follows the ETA when it moves', () => {
    const c = seeded('CN-2042');
    c.eta = shiftEta(c.eta!, 2);
    expect(fltSuggestion(c)!.neededBy).toBe('Fri 16:00');
    expect(fltRequestButton(fltSuggestion(c)!.neededBy)).toBe('Request a forklift for Fri 16:00');
  });

  it('shows a request, and flags it when the ETA has since moved', () => {
    const c: Consignment = { ...seeded('CN-2042'), fltRequestedFor: 'Fri 14:00' };
    expect(fltSuggestion(c)).toMatchObject({ requested: true, moved: false });
    const later = { ...c, eta: 'Fri 16:00' };
    expect(fltSuggestion(later)).toMatchObject({ requested: true, moved: true });
    // A forklift already requested stays on the record after delivery.
    expect(fltSuggestion({ ...c, stage: 'Delivered to quay' })).toMatchObject({ requested: true });
  });

  it('the worked example on the booking form also triggers it', () => {
    const c: Consignment = {
      id: 'CN-9000',
      form: { ...DEMO_CONSIGNMENT },
      stage: 'Booked',
      createdAt: 'Thu 21 Aug · 09:00',
      eta: 'Fri 06:00',
    };
    expect(fltSuggestion(c)!.perPieceKg).toBe(430);
  });

  it('reads in plain sentences', () => {
    expect(fltSuggestionText(380, 'Aberdeen — Regent Quay', 'Fri 14:00')).toBe(
      '380 kg a piece is over 250 kg, so a forklift with operator is suggested at Aberdeen — Regent Quay for the freight ETA, Fri 14:00.',
    );
    expect(fltRequestedText('Fri 14:00', 'Aberdeen — Regent Quay')).toBe(
      'Forklift requested for Fri 14:00 at Aberdeen — Regent Quay.',
    );
    expect(fltMovedText('Fri 16:00')).toBe(
      'The freight ETA is now Fri 16:00; your GAC agent moves the forklift to match.',
    );
  });

  it('stored entries keep their extras, and a malformed extra is dropped', () => {
    const c: Consignment = {
      ...seeded('CN-2042'),
      fltRequestedFor: 'Fri 14:00',
      eoriConfirmed: true,
    };
    expect(isConsignment(c)).toBe(true);
    // An entry from before the ETA existed still loads.
    const old = seeded('CN-2041');
    delete old.eta;
    expect(isConsignment(old)).toBe(true);
    expect(isConsignment({ ...c, eta: 14 })).toBe(false);
    expect(isConsignment({ ...c, eoriConfirmed: 'yes' })).toBe(false);
  });
});

describe('GB EORI held on the client record', () => {
  it('is obviously fictional, and the screen says so', () => {
    expect(isIllustrativeEori(CLIENT_EORI)).toBe(true);
    expect(EORI_NOTE).toMatch(/illustrative/i);
    // The warning against real EORI numbers stays on the declaration form.
    expect(DECLARATION_NOTICE).toMatch(/do not enter real .*EORI numbers/);
  });

  it('rejects anything that could pass for a real number', () => {
    expect(isIllustrativeEori('GB123456789000')).toBe(false);
    expect(isIllustrativeEori('GB00000000000')).toBe(false);
  });

  it('every seeded consignment starts unconfirmed for the call', () => {
    expect(SEED_CONSIGNMENTS.every((c) => c.eoriConfirmed !== true)).toBe(true);
  });

  it('the seeded entry carries the EORI across from its movement', () => {
    const entry = SEED_DECLARATIONS[0]!;
    expect(entry.form.consignmentRef).toBe('CN-2042');
    expect(entry.form.eori).toBe(CLIENT_EORI);
  });

  it('tells the declaration whether the call has been confirmed', () => {
    expect(eoriCallStatus(true, 'CN-2042')).toBe('Confirmed for this call on CN-2042');
    expect(eoriCallStatus(false, 'CN-2042')).toBe(
      'Not yet confirmed for this call — tick it on CN-2042 under Logistics',
    );
  });
});

describe('Ask the customs team', () => {
  const entry: Declaration = SEED_DECLARATIONS[0]!;

  it('offers a call back or an email, and logs the outcome in those words', () => {
    expect(customsTeamChannelLabel('call')).toBe('Call me back');
    expect(customsTeamChannelLabel('email')).toBe('Reply by email');
    expect(customsTeamOutcome('call')).toBe('Customs team will call you back');
    expect(customsTeamOutcome('email')).toBe('Customs team will reply by email');
  });

  it('keeps the question optional, trimmed and capped', () => {
    expect(customsTeamRequest('email', '   ', 'Thu').question).toBe('');
    expect(customsTeamRequest('call', '  Which entry type?  ', 'Thu').question).toBe(
      'Which entry type?',
    );
    expect(customsTeamRequest('call', 'x'.repeat(900), 'Thu').question).toHaveLength(
      CUSTOMS_QUESTION_MAX,
    );
  });

  it('a logged request survives storage; a malformed one is dropped', () => {
    const asked = { ...entry, teamRequest: customsTeamRequest('call', '', 'Thu 21 Aug · 10:00') };
    expect(isDeclaration(asked)).toBe(true);
    expect(isCustomsTeamRequest({ channel: 'fax', question: '', at: 'Thu' })).toBe(false);
    expect(isDeclaration({ ...entry, teamRequest: { channel: 'fax' } })).toBe(false);
  });

  it('is simulated, names nobody, no address and no broker', () => {
    const copy = [ASK_TEAM_INTRO, ASK_TEAM_NOTICE].join(' ');
    expect(ASK_TEAM_NOTICE).toMatch(/simulated/i);
    expect(copy).not.toMatch(/@/);
    expect(copy).not.toMatch(/broker|third[- ]party/i);
    expect(copy).not.toMatch(/!/);
  });

  it('the boundary sentence stands, and the immigration line stays off customs', () => {
    expect(INFORMS_NOT_ADVISES).toMatch(/platform does not give customs advice/i);
    const copy = [INFORMS_NOT_ADVISES, ASK_TEAM_INTRO, ASK_TEAM_NOTICE].join(' ');
    expect(copy).not.toMatch(/informs, it does not advise/i);
  });
});
