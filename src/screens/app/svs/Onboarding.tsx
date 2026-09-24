import { useCallback, useEffect, useRef, useState } from 'react';
import { Pill } from '../../../components/ui/Pill';
import {
  ONBOARDING_STAGES,
  SLA_DAYS,
  type Application,
  type OnboardingStage,
} from '../../../data/svsDesk';
import { checklistProgress, slaState } from '../../../lib/svsDesk';
import { useSvsDesk } from '../../../store/svsDesk';
import { ApplicantPanel } from './ApplicantPanel';
import { ChecksBar, Monogram } from './parts';
import { RISK_TONE, SLA_TONE, focusSoon, midSentence, refNumber } from './ui';

/**
 * Onboarding (spec §4.5): new suppliers on a four-column board — Applied,
 * Documents, Checks, Decision — each card carrying what the SVS team triages
 * on: checks done, days against the five-day target, risk, and whether the
 * applicant owes a reply. The company name opens the applicant panel; the
 * whole card is its hit area.
 *
 * On a phone the board scrolls sideways with snap, and never scrolls inside
 * itself vertically. From 640px it never scrolls sideways: the columns sit two
 * by two until all four fit across (1280px, with the sidebar out), so the
 * Decision column is never the one off-screen. Decided applicants leave the
 * board for the list beneath it.
 */

const STAGE_NOTES: Record<OnboardingStage, string> = {
  Applied: 'Application in, first checks',
  Documents: 'Evidence coming in',
  Checks: 'Screening and references',
  Decision: 'Ready for the SVS team',
};

/** Most days in review first — the card nearest its deadline leads the column. */
function byUrgency(a: Application, b: Application): number {
  return b.daysInReview - a.daysInReview || refNumber(b.id) - refNumber(a.id);
}

/** The id on an applicant's button — on the board or in Decided, never both. */
const cardId = (id: string) => `applicant-${id}`;

/** "Applied yesterday", "Applied Mon", "Invited today". */
function arrivedLine(app: Application): string {
  const invited = app.trail[0]?.text.startsWith('Invitation sent') ?? false;
  return `${invited ? 'Invited' : 'Applied'} ${midSentence(app.appliedLabel)}`;
}

function ApplicantCard({ app, onOpen }: { app: Application; onOpen: (id: string) => void }) {
  const { done, total } = checklistProgress(app);
  const sla = slaState(app);
  return (
    <li className="relative rounded-[10px] border border-line bg-white p-3 shadow-card transition-[border-color,box-shadow] hover:border-[#B7CCDD] hover:shadow-[0_8px_28px_rgba(10,37,64,0.09)] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sea">
      <div className="flex items-start gap-2.5">
        <Monogram name={app.company} />
        <div className="min-w-0 flex-1">
          <button
            id={cardId(app.id)}
            type="button"
            onClick={() => onOpen(app.id)}
            className="block cursor-pointer border-none bg-transparent p-0 text-left text-[14px] leading-snug font-bold text-ink after:absolute after:inset-0 after:rounded-[10px] after:content-[''] hover:text-sea focus-visible:outline-none"
          >
            {app.company}
          </button>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
            {app.category} · {app.port}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2 text-[12px]">
        <span className="font-semibold text-ink tabular-nums">
          {done} of {total} checks
        </span>
        <span className="truncate text-ink-soft">{arrivedLine(app)}</span>
      </div>
      <div className="mt-1.5">
        <ChecksBar done={done} total={total} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill tone={SLA_TONE[sla.state]}>{sla.label}</Pill>
        <Pill tone={RISK_TONE[app.risk]}>{app.risk} risk</Pill>
        {app.infoRequest ? <Pill tone="info">Awaiting applicant</Pill> : null}
      </div>
    </li>
  );
}

function Column({
  stage,
  index,
  apps,
  onOpen,
}: {
  stage: OnboardingStage;
  index: number;
  apps: Application[];
  onOpen: (id: string) => void;
}) {
  return (
    <section
      data-testid={`svs-column-${stage}`}
      aria-labelledby={`svs-stage-${stage}`}
      className="flex w-[82%] max-w-[300px] shrink-0 snap-start flex-col rounded-[12px] border border-line bg-[#F4F7FA] p-2.5 sm:w-auto sm:max-w-none sm:min-w-0 xl:flex-1"
    >
      <div className="px-1 pt-0.5 pb-2.5">
        <h3
          id={`svs-stage-${stage}`}
          className="flex items-center justify-between gap-2 text-[13.5px] font-bold text-ink"
        >
          <span>
            <span className="mr-1.5 text-[11.5px] font-semibold text-ink-soft tabular-nums">
              {index + 1}
            </span>
            {stage}
          </span>
          <span className="min-w-[24px] rounded-full border border-line bg-white px-2 py-px text-center text-[11.5px] font-bold text-ink-soft tabular-nums">
            {apps.length}
            <span className="sr-only">{apps.length === 1 ? ' applicant' : ' applicants'}</span>
          </span>
        </h3>
        <p className="mt-0.5 text-[11.5px] text-ink-soft">{STAGE_NOTES[stage]}</p>
      </div>
      {apps.length ? (
        <ul className="flex flex-col gap-2">
          {apps.map((a) => (
            <ApplicantCard key={a.id} app={a} onOpen={onOpen} />
          ))}
        </ul>
      ) : (
        <p className="grid min-h-[92px] place-items-center rounded-[10px] border border-dashed border-line-strong px-3 text-center text-[12.5px] text-ink-soft">
          Nothing at this stage
        </p>
      )}
    </section>
  );
}

function DecidedRow({ app, onOpen }: { app: Application; onOpen: (id: string) => void }) {
  const approved = app.outcome === 'approved';
  return (
    <li className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-dashed border-line-strong py-3 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-center">
      <Monogram name={app.company} size={32} />
      <div className="min-w-0">
        <button
          id={cardId(app.id)}
          type="button"
          onClick={() => onOpen(app.id)}
          className="cursor-pointer border-none bg-transparent p-0 text-left text-[14px] font-bold text-ink hover:text-sea hover:underline"
        >
          {app.company}
        </button>
        <p className="text-[12.5px] text-ink-soft">
          {app.category} · {app.port} · {app.id}
        </p>
        <p className="mt-1 text-[13px] text-ink">{app.decisionNote}</p>
      </div>
      <span className="col-start-2 sm:col-start-3 sm:row-start-1">
        {approved ? <Pill tone="verified">✓ Approved</Pill> : <Pill tone="danger">✗ Declined</Pill>}
      </span>
    </li>
  );
}

export function Onboarding() {
  const applications = useSvsDesk((s) => s.applications);
  const [openId, setOpenId] = useState<string | null>(null);
  const boardHeading = useRef<HTMLHeadingElement>(null);
  const decidedHeading = useRef<HTMLHeadingElement>(null);
  const focusDecided = useRef(false);
  const lastOpen = useRef<string | null>(null);

  const open = applications.filter((a) => a.outcome === 'open');
  const decided = applications
    .filter((a) => a.outcome !== 'open')
    .sort((a, b) => refNumber(b.id) - refNumber(a.id));
  const current = openId ? (applications.find((a) => a.id === openId) ?? null) : null;

  const openApplicant = useCallback((id: string) => {
    lastOpen.current = id;
    setOpenId(id);
  }, []);
  const close = useCallback(() => setOpenId(null), []);
  const decidedAndClose = useCallback(() => {
    focusDecided.current = true;
    setOpenId(null);
  }, []);

  // After an approval or a decline the card has left the board, so focus
  // follows it to the Decided list rather than falling back to the page.
  // After a stage move the card has re-mounted in another column, and the
  // panel's focus trap hands focus back to a button that is no longer on the
  // page — so, only when that left focus nowhere, it goes to the card where
  // it sits now (the board's heading if the card has gone).
  useEffect(() => {
    if (openId !== null) return;
    const id = lastOpen.current;
    lastOpen.current = null;
    if (focusDecided.current) {
      focusDecided.current = false;
      decidedHeading.current?.focus();
    } else if (id) {
      focusSoon(() => {
        const at = document.activeElement;
        if (at && at !== document.body) return null;
        return document.getElementById(cardId(id)) ?? boardHeading.current;
      });
    }
  }, [openId]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2
            ref={boardHeading}
            tabIndex={-1}
            className="font-display text-[17px] font-bold tracking-[-0.01em]"
          >
            Supplier onboarding
          </h2>
          <p className="mt-0.5 max-w-[760px] text-[13px] text-ink-soft">
            New suppliers pass four stages and eight checks before they are listed. The target is a
            decision inside {SLA_DAYS} working days.
          </p>
        </div>
        <p className="text-[12.5px] text-ink-soft sm:hidden" aria-hidden="true">
          Scroll the board sideways →
        </p>
      </div>

      <div
        data-testid="svs-board"
        className="relative -mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-1 xl:flex"
      >
        {ONBOARDING_STAGES.map((stage, i) => (
          <Column
            key={stage}
            stage={stage}
            index={i}
            apps={open.filter((a) => a.stage === stage).sort(byUrgency)}
            onOpen={openApplicant}
          />
        ))}
        <span aria-hidden="true" className="w-px shrink-0 sm:hidden" />
      </div>

      <section
        data-testid="svs-decided"
        aria-labelledby="svs-decided-title"
        className="mt-5 rounded-brand border border-line bg-white p-[22px] shadow-card"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2
            id="svs-decided-title"
            ref={decidedHeading}
            tabIndex={-1}
            className="font-display text-[15.5px] font-bold tracking-[-0.01em]"
          >
            Decided
          </h2>
          {decided.length ? (
            <p className="text-[12.5px] text-ink-soft">
              {decided.length} {decided.length === 1 ? 'decision' : 'decisions'} · newest first
            </p>
          ) : null}
        </div>
        {decided.length ? (
          <ul className="mt-3.5">
            {decided.map((a) => (
              <DecidedRow key={a.id} app={a} onOpen={openApplicant} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-line-strong px-4 py-4 text-[13px] text-ink-soft">
            No decisions yet. Approve or decline an applicant from the Decision column and it moves
            here, with the note the applicant sees.
          </p>
        )}
      </section>

      <ApplicantPanel app={current} onClose={close} onDecided={decidedAndClose} />
    </>
  );
}
