import { describe, expect, it } from 'vitest';
import {
  DEMO_DECLARATION,
  DOCUMENT_CHECKLIST,
  EMPTY_DECLARATION,
  INFORMS_NOT_ADVISES,
  SEED_DECLARATIONS,
} from '../src/data/customs';
import { SEED_CONSIGNMENTS } from '../src/data/logistics';
import {
  DECLARATION_STAGES,
  declarationAction,
  declarationStageReached,
  declarationStageTone,
  isCleared,
  isDeclaration,
  nextDeclarationRef,
  nextDeclarationStage,
  openDeclarations,
  validateDeclaration,
} from '../src/lib/customs';
import type { Declaration, DeclarationForm } from '../src/lib/customs';

const complete: DeclarationForm = { ...DEMO_DECLARATION, documentsConfirmed: true };

const at = (stage: Declaration['stage'], form = complete): Declaration => ({
  id: 'DEC-9000',
  form,
  stage,
  createdAt: 'Wed 20 Aug · 09:00',
});

describe('Declaration pipeline', () => {
  it('runs documents → cleared and holds there', () => {
    let stage: string = 'Documents received';
    const seen = [stage];
    for (let i = 0; i < 8; i += 1) {
      stage = nextDeclarationStage(stage);
      if (seen[seen.length - 1] !== stage) seen.push(stage);
    }
    expect(seen).toEqual([...DECLARATION_STAGES]);
    expect(nextDeclarationStage('Cleared')).toBe('Cleared');
  });

  it('an unrecognised stage restarts rather than sticking', () => {
    expect(nextDeclarationStage('At the border, allegedly')).toBe('Documents received');
  });

  it('only Cleared reads as finished', () => {
    expect(isCleared('Submitted to HMRC')).toBe(false);
    expect(isCleared('Cleared')).toBe(true);
    expect(declarationStageTone('Submitted to HMRC')).toBe('info');
    expect(declarationStageTone('Cleared')).toBe('verified');
  });

  it('one simulate click can cover two stages, and runs out at Cleared', () => {
    expect(declarationAction('Documents received')).toEqual({
      label: 'Simulate: GAC prepares and submits the entry',
      steps: 2,
    });
    expect(declarationAction('Submitted to HMRC')?.steps).toBe(1);
    expect(declarationAction('Cleared')).toBeNull();
  });

  it('the rail marks every stage already passed', () => {
    expect(declarationStageReached('Submitted to HMRC', 'Declaration prepared')).toBe(true);
    expect(declarationStageReached('Submitted to HMRC', 'Cleared')).toBe(false);
  });

  it('open entries are everything not yet cleared', () => {
    const list = [at('Cleared'), { ...at('Submitted to HMRC'), id: 'DEC-9001' }];
    expect(openDeclarations(list).map((d) => d.id)).toEqual(['DEC-9001']);
  });
});

describe('Raising a declaration', () => {
  it('an empty form lists everything still needed', () => {
    const problems = validateDeclaration(EMPTY_DECLARATION);
    expect(problems).toContain('What the goods are');
    expect(problems).toContain('Moving from');
    expect(problems).toContain('Confirmation that the document set is complete');
  });

  it('will not take an entry until the document set is confirmed complete', () => {
    // The commonest reason goods sit at the border — the platform refuses the
    // entry rather than raising one that will bounce.
    expect(validateDeclaration({ ...complete, documentsConfirmed: false })).toEqual([
      'Confirmation that the document set is complete',
    ]);
    expect(validateDeclaration(complete)).toEqual([]);
  });

  it('packages and weight must be numbers above zero', () => {
    expect(validateDeclaration({ ...complete, packages: 'two' })).toEqual([
      'Packages must be a number above zero',
    ]);
    expect(validateDeclaration({ ...complete, grossWeightKg: '0' })).toEqual([
      'Gross weight must be a number above zero',
    ]);
  });

  it('a standalone entry needs no movement behind it', () => {
    expect(validateDeclaration({ ...complete, consignmentRef: '' })).toEqual([]);
  });

  it('references run on from the highest already held', () => {
    expect(nextDeclarationRef([])).toBe('DEC-1187');
    expect(nextDeclarationRef(SEED_DECLARATIONS)).toBe('DEC-1188');
  });
});

describe('Stored declarations are read defensively', () => {
  it('accepts a well-formed entry', () => {
    expect(isDeclaration(at('Cleared'))).toBe(true);
    expect(SEED_DECLARATIONS.every(isDeclaration)).toBe(true);
  });

  it('drops anything malformed', () => {
    expect(isDeclaration(undefined)).toBe(false);
    expect(isDeclaration({ ...at('Cleared'), stage: 'Nearly there' })).toBe(false);
    expect(isDeclaration({ ...at('Cleared'), form: { ...complete, kind: 'Guesswork' } })).toBe(
      false,
    );
    expect(
      isDeclaration({ ...at('Cleared'), form: { ...complete, documentsConfirmed: 'yes' } }),
    ).toBe(false);
  });
});

describe('What the screen must say', () => {
  it('states the boundary: GAC informs, it does not advise', () => {
    expect(INFORMS_NOT_ADVISES).toMatch(/informs, it does not advise/i);
    expect(INFORMS_NOT_ADVISES).toMatch(/classification/i);
  });

  it('the seeded entry is tied to the seeded movement it covers', () => {
    const ref = SEED_DECLARATIONS[0]!.form.consignmentRef;
    expect(SEED_CONSIGNMENTS.some((c) => c.id === ref)).toBe(true);
  });

  it('names no broker or third party — customs is GAC in-house end to end', () => {
    const copy = [
      INFORMS_NOT_ADVISES,
      ...DOCUMENT_CHECKLIST.flatMap((d) => [d.title, d.body]),
    ].join(' ');
    expect(copy).not.toMatch(/broker/i);
    expect(copy).not.toMatch(/third[- ]party/i);
  });
});
