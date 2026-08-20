import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LineSectionStrip } from '../../components/LineSections';
import { ServiceLineHub } from '../../components/ServiceLineHub';
import type { LiveStat } from '../../components/ServiceLineHub';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Pill } from '../../components/ui/Pill';
import { StageTrack } from '../../components/ui/StageTrack';
import { Toggle } from '../../components/ui/Toggle';
import {
  CUSTOMS_INTRO,
  DECLARATION_NOTICE,
  DELAY_NOTE,
  DEMO_DECLARATION,
  DOCUMENT_CHECKLIST,
  EMPTY_DECLARATION,
  INFORMS_NOT_ADVISES,
} from '../../data/customs';
import { AGENT_ENGAGED, serviceLine } from '../../data/serviceLines';
import type { LineService } from '../../data/serviceLines';
import {
  DECLARATION_KINDS,
  DECLARATION_STAGES,
  declarationAction,
  declarationStageTone,
  isCleared,
  openDeclarations,
  validateDeclaration,
} from '../../lib/customs';
import type { Declaration, DeclarationForm, DeclarationKind } from '../../lib/customs';
import { needingCustoms } from '../../lib/logistics';
import { useLineSection } from '../../lib/useLineSection';
import { useApp } from '../../store/app';
import { useCustoms } from '../../store/customs';
import { useLogistics } from '../../store/logistics';

/**
 * Customs — the entry behind a movement. GAC prepares and submits it in-house,
 * which is the whole reason the line carries the top tier, so no third party
 * appears anywhere on this screen.
 *
 * Two rules are on the page rather than in a comment: the platform will not
 * accept a declaration until the client confirms the document set is complete
 * (an incomplete set is what actually holds goods at the border), and GAC
 * informs rather than advises — the classification and the declared position
 * stay the client's. Submission and the HMRC response are simulated.
 */

const INPUT =
  'mt-1 block min-h-[40px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink';
const LABEL = 'text-[12.5px] font-semibold text-ink-soft';

/* ------------------------------------------------------- Declaration form */

function DeclarationFormCard() {
  const raise = useCustoms((s) => s.raise);
  const consignments = useLogistics((s) => s.consignments);
  const pushToast = useApp((s) => s.pushToast);
  const [form, setForm] = useState<DeclarationForm>(EMPTY_DECLARATION);
  const [problems, setProblems] = useState<string[]>([]);

  // The movements a declaration can be raised against: coming from outside the
  // UK and not yet on the quay. Picking one fills the movement in from the
  // logistics record rather than asking the client to retype it.
  const available = needingCustoms(consignments);

  const set = <K extends keyof DeclarationForm>(key: K, value: DeclarationForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function pickConsignment(ref: string) {
    const c = available.find((x) => x.id === ref);
    if (!c) {
      set('consignmentRef', '');
      return;
    }
    setForm((f) => ({
      ...f,
      consignmentRef: c.id,
      goods: f.goods || c.form.description,
      movedFrom: c.form.origin,
      movedTo: c.form.deliveryPoint,
      packages: c.form.pieces,
      grossWeightKg: c.form.weightKg,
    }));
  }

  function submit() {
    const found = validateDeclaration(form);
    setProblems(found);
    if (found.length > 0) return;
    const id = raise(form);
    setForm(EMPTY_DECLARATION);
    pushToast(`${id} raised — ${form.kind}. Illustrative: nothing is submitted to HMRC.`);
  }

  return (
    <Card data-testid="declaration-form">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>Raise a declaration</Eyebrow>
          <h3 className="mt-1 font-display text-[17px] font-bold">
            Prepared and submitted by GAC, in-house
          </h3>
        </div>
        <Pill tone="neutral">Illustrative</Pill>
      </div>
      <p className="mt-1.5 max-w-[720px] text-[13px] text-ink-soft">{DECLARATION_NOTICE}</p>

      <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Entry type
          <select
            className={INPUT}
            value={form.kind}
            onChange={(e) => set('kind', e.target.value as DeclarationKind)}
          >
            {DECLARATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Against a movement
          <select
            className={INPUT}
            value={form.consignmentRef}
            onChange={(e) => pickConsignment(e.target.value)}
            data-testid="declaration-consignment"
          >
            <option value="">No movement — standalone entry</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.form.description}
              </option>
            ))}
          </select>
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          What the goods are
          <input
            className={INPUT}
            value={form.goods}
            onChange={(e) => set('goods', e.target.value)}
            placeholder="What the item is, what it is made of, what it does"
          />
        </label>
        <label className={LABEL}>
          Moving from
          <input
            className={INPUT}
            value={form.movedFrom}
            onChange={(e) => set('movedFrom', e.target.value)}
            placeholder="Rotterdam"
          />
        </label>
        <label className={LABEL}>
          Moving to
          <input
            className={INPUT}
            value={form.movedTo}
            onChange={(e) => set('movedTo', e.target.value)}
            placeholder="Aberdeen — Regent Quay"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={LABEL}>
            Packages
            <input
              className={INPUT}
              inputMode="numeric"
              value={form.packages}
              onChange={(e) => set('packages', e.target.value)}
              placeholder="1"
            />
          </label>
          <label className={LABEL}>
            Gross weight (kg)
            <input
              className={INPUT}
              inputMode="numeric"
              value={form.grossWeightKg}
              onChange={(e) => set('grossWeightKg', e.target.value)}
              placeholder="380"
            />
          </label>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-3 rounded-lg border border-line bg-paper p-3">
        <span className="max-w-[560px] text-[13px] font-semibold">
          The document set is complete — invoice, packing list, transport document, and any licence
          the goods need.
        </span>
        <Toggle
          pressed={form.documentsConfirmed}
          onToggle={() => set('documentsConfirmed', !form.documentsConfirmed)}
          label="Document set is complete"
        />
      </div>

      {problems.length > 0 ? (
        <p
          className="mt-3 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-[12.5px] text-warn"
          role="alert"
          data-testid="declaration-problems"
        >
          Still needed: {problems.join(' · ')}
        </p>
      ) : null}

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <Button onClick={submit} data-testid="declaration-raise">
          Raise the declaration
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setForm(DEMO_DECLARATION);
            setProblems([]);
          }}
        >
          Fill with an example
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------ Declarations */

function DeclarationCard({ declaration }: { declaration: Declaration }) {
  const advance = useCustoms((s) => s.advance);
  const pushToast = useApp((s) => s.pushToast);
  const { form } = declaration;
  const action = declarationAction(declaration.stage);
  const cleared = isCleared(declaration.stage);

  return (
    <Card
      data-testid={`declaration-${declaration.id}`}
      data-stage={declaration.stage}
      className="min-w-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral">{form.kind}</Pill>
            <span className="text-[12px] font-semibold tracking-[0.02em] text-ink-soft">
              {declaration.id} · {declaration.createdAt}
            </span>
          </div>
          <h3 className="mt-1 font-display text-[16.5px] font-bold">{form.goods}</h3>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {form.movedFrom} → {form.movedTo} · {form.packages}{' '}
            {Number(form.packages) === 1 ? 'package' : 'packages'} · {form.grossWeightKg} kg
          </p>
          {form.consignmentRef ? (
            <p className="mt-0.5 text-[12.5px] text-ink-soft" data-testid="declaration-movement">
              Against{' '}
              <Link
                to="/app/logistics?section=consignments"
                className="font-semibold text-sea no-underline hover:underline"
              >
                {form.consignmentRef}
              </Link>
            </p>
          ) : null}
        </div>
        <div className="max-w-full [&>span]:whitespace-normal">
          <Pill tone={declarationStageTone(declaration.stage)}>
            {cleared ? '✓ ' : ''}
            {declaration.stage}
          </Pill>
        </div>
      </div>

      <StageTrack stages={DECLARATION_STAGES} current={declaration.stage} />

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        {action ? (
          <Button
            variant="ghost"
            onClick={() => advance(declaration.id, action.steps)}
            data-testid="declaration-advance"
          >
            {action.label}
          </Button>
        ) : null}
        {cleared ? (
          <Button
            onClick={() =>
              pushToast('Illustrative — the clearance note would download here as a PDF.')
            }
          >
            Clearance note
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function DeclarationsSection() {
  const declarations = useCustoms((s) => s.declarations);
  const reset = useCustoms((s) => s.reset);
  const open = openDeclarations(declarations).length;

  return (
    <div className="space-y-4">
      <p className="max-w-[760px] text-[13.5px] text-ink-soft">{CUSTOMS_INTRO}</p>
      <DeclarationFormCard />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Eyebrow>Entries · {declarations.length}</Eyebrow>
          <h3 className="mt-0.5 font-display text-[17px] font-bold">Entries in progress</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] text-ink-soft" data-testid="declarations-summary">
            {declarations.length === 0
              ? 'No entries raised'
              : `${open} open · ${declarations.length - open} cleared`}
          </span>
          <Button variant="ghost" onClick={reset}>
            Reset entries
          </Button>
        </div>
      </div>

      <div className="space-y-4" data-testid="declarations">
        {declarations.map((d) => (
          <DeclarationCard key={d.id} declaration={d} />
        ))}
      </div>
    </div>
  );
}

function DocumentsSection() {
  return (
    <div className="space-y-4">
      <p className="max-w-[760px] rounded-brand border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
        {INFORMS_NOT_ADVISES}
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_CHECKLIST.map((d) => (
          <Card key={d.title} className="min-w-0">
            <p className="text-[13.5px] font-bold">{d.title}</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">{d.body}</p>
          </Card>
        ))}
      </div>
      <p className="max-w-[760px] text-[13px] text-ink-soft" data-testid="delay-note">
        {DELAY_NOTE}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- Screen */

export default function Customs() {
  const line = serviceLine('customs');
  const pushToast = useApp((s) => s.pushToast);
  const declarations = useCustoms((s) => s.declarations);
  const consignments = useLogistics((s) => s.consignments);
  const [section, setSection] = useLineSection(line);

  const open = openDeclarations(declarations);
  const waiting = needingCustoms(consignments).filter(
    (c) => !declarations.some((d) => d.form.consignmentRef === c.id),
  ).length;

  const live: LiveStat[] = [
    {
      label: 'Entries open',
      value: String(open.length),
      note: `${declarations.length - open.length} cleared`,
      to: '/app/customs?section=declarations',
    },
    {
      label: 'Movements without an entry',
      value: String(waiting),
      note: waiting === 0 ? 'Every movement is covered' : 'Raise one against the movement',
      to: '/app/logistics?section=consignments',
    },
    {
      label: 'Document set',
      value: `${DOCUMENT_CHECKLIST.length} items`,
      note: 'What GAC needs before an entry',
      to: '/app/customs?section=documents',
    },
  ];

  return (
    <ServiceLineHub
      line={line}
      live={live}
      onRequest={() => undefined}
      onAgent={(service: LineService) => pushToast(`${service.label} — ${AGENT_ENGAGED}`)}
    >
      <section className="mt-2" aria-label="Customs sections">
        <LineSectionStrip line={line} section={section} onSelect={setSection} />
        <div className="mt-4" data-testid="line-section" data-section={section}>
          {section === 'declarations' ? <DeclarationsSection /> : null}
          {section === 'documents' ? <DocumentsSection /> : null}
        </div>
      </section>
    </ServiceLineHub>
  );
}
