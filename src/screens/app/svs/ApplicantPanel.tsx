import { useId, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { Icon } from '../../../components/ui/Icon';
import { Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';
import {
  CHECKS,
  ONBOARDING_STAGES,
  type Application,
  type CheckId,
  type CheckState,
} from '../../../data/svsDesk';
import {
  approveBlocker,
  checkLabel,
  checklistProgress,
  nextOnboardingStage,
  slaState,
} from '../../../lib/svsDesk';
import { APPROVED_NOTE, useSvsDesk } from '../../../store/svsDesk';
import { useApp } from '../../../store/app';
import { AuditTrail, ChecksBar, InShell, Monogram, NoteForm } from './parts';
import { CHECK_STATUS, RISK_TONE, SLA_TONE, focusSoon } from './ui';

/**
 * The applicant panel (spec §4.5): one applicant's eight checks, the open
 * information request, the decision and the audit trail, in a wide Modal —
 * so its notes are typed where the tour's arrow keys cannot reach them.
 *
 * "Approve and list" stays disabled until `canApprove`, and the reason is
 * written beside it rather than left to a greyed button. Approving or
 * declining closes the panel; the Decided list under the board takes it.
 */
export function ApplicantPanel({
  app,
  onClose,
  onDecided,
}: {
  app: Application | null;
  onClose: () => void;
  /** Called after an approval or a decline, instead of `onClose`. */
  onDecided: () => void;
}) {
  return (
    <InShell>
      <Modal open={app !== null} onClose={onClose} labelledBy="applicant-title" size="lg">
        {app ? <PanelBody key={app.id} app={app} onClose={onClose} onDecided={onDecided} /> : null}
      </Modal>
    </InShell>
  );
}

type NoteMode = 'info' | 'decline' | null;

const OPTIONS: { value: Exclude<CheckState, 'pending'>; text: string }[] = [
  { value: 'passed', text: 'Pass' },
  { value: 'failed', text: 'Fail' },
  { value: 'na', text: 'N/A' },
];

/** Pass · Fail · N/A for one check. Pressing the chosen option again reopens it. */
function CheckControl({
  label,
  state,
  onSet,
}: {
  label: string;
  state: CheckState;
  onSet: (next: CheckState) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 rounded-lg border-[1.5px] border-line-strong bg-white p-0.5"
    >
      {OPTIONS.map((o) => {
        const pressed = state === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={pressed}
            title={pressed ? 'Press again to reopen this check' : undefined}
            onClick={() => onSet(pressed ? 'pending' : o.value)}
            className={`min-h-[40px] min-w-[52px] cursor-pointer rounded-md px-2.5 text-[12.5px] font-semibold transition-colors sm:min-h-[32px] ${
              pressed
                ? 'bg-ink text-white'
                : 'bg-transparent text-ink-soft hover:bg-sea-soft hover:text-ink'
            }`}
          >
            {o.text}
          </button>
        );
      })}
    </div>
  );
}

function StageRail({ current }: { current: Application['stage'] }) {
  const at = ONBOARDING_STAGES.indexOf(current);
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Onboarding stage">
      {ONBOARDING_STAGES.map((s, i) => {
        const state = i < at ? 'done' : i === at ? 'current' : 'todo';
        return (
          <li key={s} aria-current={state === 'current' ? 'step' : undefined} className="min-w-0">
            <span
              aria-hidden="true"
              className={`block h-1.5 rounded-full ${
                state === 'todo' ? 'bg-line' : state === 'done' ? 'bg-sea/45' : 'bg-sea'
              }`}
            />
            <span
              className={`mt-1.5 block text-[10.5px] leading-tight break-words sm:text-[11.5px] ${
                state === 'current' ? 'font-bold text-ink' : 'text-ink-soft'
              }`}
            >
              {state === 'done' ? <span aria-hidden="true">✓ </span> : null}
              {s}
              {state === 'done' ? <span className="sr-only"> (done)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PanelBody({
  app,
  onClose,
  onDecided,
}: {
  app: Application;
  onClose: () => void;
  onDecided: () => void;
}) {
  const pushToast = useApp((s) => s.pushToast);
  const setCheck = useSvsDesk((s) => s.setCheck);
  const advance = useSvsDesk((s) => s.advanceApplication);
  const requestInfo = useSvsDesk((s) => s.requestInfo);
  const clearInfo = useSvsDesk((s) => s.clearInfoRequest);
  const approve = useSvsDesk((s) => s.approveApplication);
  const decline = useSvsDesk((s) => s.declineApplication);

  const [mode, setMode] = useState<NoteMode>(null);
  const blockerId = useId();
  const infoRef = useRef<HTMLDivElement>(null);
  const checksRef = useRef<HTMLHeadingElement>(null);
  const actionsRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const open = app.outcome === 'open';
  const { done, total } = checklistProgress(app);
  const sla = slaState(app);
  const blocker = approveBlocker(app);
  const next = nextOnboardingStage(app.stage);
  const canMove = open && next !== app.stage;

  /** One of the decision buttons, found once the next render has committed. */
  const action = (name: 'info' | 'decline' | 'approve') =>
    actionsRef.current?.querySelector<HTMLButtonElement>(`[data-action="${name}"]`) ?? null;

  function onMove() {
    const reachesDecision = next === 'Decision';
    advance(app.id);
    // The button goes once the application reaches Decision.
    if (reachesDecision) {
      focusSoon(() => {
        const approveButton = action('approve');
        return approveButton && !approveButton.disabled ? approveButton : titleRef.current;
      });
    }
  }

  function onRequest(note: string) {
    requestInfo(app.id, note);
    setMode(null);
    pushToast(`Sent to ${app.company}: more information requested (simulated).`);
    focusSoon(() => infoRef.current);
  }

  function onAnswered() {
    clearInfo(app.id);
    focusSoon(() => checksRef.current);
  }

  function onDecline(reason: string) {
    decline(app.id, reason);
    pushToast(`Declined: ${app.company}.`);
    onDecided();
  }

  function onApprove() {
    approve(app.id);
    pushToast(
      `Approved: ${app.company}. The listing goes live at the next marketplace publish (simulated).`,
    );
    onDecided();
  }

  function cancelNote(from: NoteMode) {
    setMode(null);
    focusSoon(() => action(from === 'decline' ? 'decline' : 'info'));
  }

  return (
    <div>
      <header className="flex items-start gap-3.5">
        <Monogram name={app.company} size={44} />
        <div className="min-w-0 flex-1">
          <Eyebrow>Onboarding · {app.id}</Eyebrow>
          <h2
            id="applicant-title"
            ref={titleRef}
            tabIndex={-1}
            className="mt-0.5 font-display text-[20px] leading-tight font-bold tracking-[-0.01em]"
          >
            {app.company}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {app.category} · {app.port}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close applicant panel"
          className="-mt-1.5 -mr-2 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-lg border-none bg-transparent text-ink-soft transition-colors hover:bg-sea-soft hover:text-ink"
        >
          <Icon name="x" size={18} />
        </button>
      </header>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {app.outcome === 'approved' ? <Pill tone="verified">✓ Approved</Pill> : null}
        {app.outcome === 'declined' ? <Pill tone="danger">✗ Declined</Pill> : null}
        {open ? <Pill tone={SLA_TONE[sla.state]}>{sla.label}</Pill> : null}
        <Pill tone={RISK_TONE[app.risk]}>{app.risk} risk</Pill>
        {app.infoRequest ? <Pill tone="info">Awaiting applicant</Pill> : null}
      </div>

      {open ? (
        <div className="mt-4">
          <StageRail current={app.stage} />
        </div>
      ) : (
        <p
          className={`mt-4 rounded-lg px-3.5 py-2.5 text-[13.5px] ${
            app.outcome === 'approved'
              ? 'bg-success-soft text-success'
              : 'bg-danger-soft text-danger'
          }`}
        >
          <strong>{app.outcome === 'approved' ? 'Approved' : 'Declined'}</strong>
          {' — '}
          {app.outcome === 'approved'
            ? APPROVED_NOTE.replace(/^Approved — /, '')
            : (app.decisionNote ?? 'no reason recorded')}
        </p>
      )}

      {app.infoRequest ? (
        <div
          ref={infoRef}
          tabIndex={-1}
          className="mt-4 rounded-lg border border-[#CFE2EE] bg-sea-soft/60 px-3.5 py-3"
        >
          <p className="text-[11px] font-extrabold tracking-[0.12em] text-sea uppercase">
            Waiting on the applicant
          </p>
          <p className="mt-1 text-[13.5px] text-ink">{app.infoRequest}</p>
          {open ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Button
                variant="ghost"
                onClick={onAnswered}
                className="min-h-[40px] px-3 text-[13px]"
              >
                Mark as answered
              </Button>
              <span className="text-[12px] text-ink-soft">Simulates the applicant’s reply.</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <section className="mt-5" aria-labelledby="applicant-checks">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            id="applicant-checks"
            ref={checksRef}
            tabIndex={-1}
            className="font-display text-[15px] font-bold"
          >
            Checks
          </h3>
          <p className="text-[12.5px] font-semibold text-ink tabular-nums">
            {done} of {total} checks
          </p>
        </div>
        <div className="mt-2">
          <ChecksBar done={done} total={total} />
        </div>
        <ul className="mt-2">
          {CHECKS.map((c) => {
            const id: CheckId = c.id;
            const state = app.checks[id];
            const label = checkLabel(app, id);
            const status = CHECK_STATUS[state];
            return (
              <li
                key={id}
                className="grid grid-cols-[78px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2 border-b border-dashed border-line py-2.5 last:border-b-0 sm:grid-cols-[78px_minmax(0,1fr)_auto]"
              >
                <span>
                  <Pill tone={status.tone}>{status.label}</Pill>
                </span>
                <span className="text-[13.5px] leading-snug text-ink">{label}</span>
                {open ? (
                  <span className="col-start-2 sm:col-start-3">
                    <CheckControl
                      label={label}
                      state={state}
                      onSet={(s) => setCheck(app.id, id, s)}
                    />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {open ? (
        <section ref={actionsRef} className="mt-4 border-t border-line pt-4" aria-label="Decision">
          {mode === 'info' ? (
            <NoteForm
              label="Note to the applicant"
              placeholder="What the applicant needs to send, and why"
              submitLabel="Send request"
              missing="a note for the applicant"
              onSubmit={onRequest}
              onCancel={() => cancelNote('info')}
            />
          ) : mode === 'decline' ? (
            <NoteForm
              label="Reason for declining"
              placeholder="The reason the applicant will see"
              submitLabel="Decline application"
              missing="a reason"
              destructive
              onSubmit={onDecline}
              onCancel={() => cancelNote('decline')}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {canMove ? (
                  <Button variant="ghost" onClick={onMove} className="max-sm:w-full">
                    Move to {next}
                  </Button>
                ) : null}
                {!app.infoRequest ? (
                  <Button
                    data-action="info"
                    variant="ghost"
                    onClick={() => setMode('info')}
                    className="max-sm:w-full"
                  >
                    Request more information
                  </Button>
                ) : null}
                <Button
                  data-action="decline"
                  variant="ghost"
                  onClick={() => setMode('decline')}
                  className="text-danger! hover:border-danger! max-sm:w-full"
                >
                  Decline
                </Button>
                <Button
                  data-action="approve"
                  onClick={onApprove}
                  disabled={blocker !== null}
                  aria-describedby={blocker ? blockerId : undefined}
                  className="max-sm:w-full sm:ml-auto"
                >
                  <Icon name="badge-check" size={16} />
                  Approve and list
                </Button>
              </div>
              {blocker ? (
                <p
                  id={blockerId}
                  data-testid="approve-blocker"
                  className="mt-3 flex items-start gap-2 rounded-lg bg-paper px-3 py-2.5 text-[12.5px] text-ink-soft"
                >
                  <Icon name="list-checks" size={15} className="mt-px shrink-0 text-sea" />
                  <span>
                    <strong className="text-ink">Not ready to approve.</strong> {blocker}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-[12.5px] text-ink-soft">
                  Every check is complete. Approving lists the supplier at the next marketplace
                  publish (simulated).
                </p>
              )}
            </>
          )}
        </section>
      ) : null}

      <section className="mt-5 border-t border-line pt-4" aria-labelledby="applicant-trail">
        <h3 id="applicant-trail" className="font-display text-[15px] font-bold">
          Audit trail
        </h3>
        <p className="mt-0.5 text-[12px] text-ink-soft">Newest first · recorded by role</p>
        <AuditTrail trail={app.trail} className="mt-3" />
      </section>
    </div>
  );
}
