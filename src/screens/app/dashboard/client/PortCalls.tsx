import { Link } from 'react-router-dom';
import { Card } from '../../../../components/ui/Card';
import { CardHeader } from '../../../../components/ui/CardHeader';
import { Icon } from '../../../../components/ui/Icon';
import { isTerminalStage } from '../../../../lib/crewChange';
import { portCallStep } from '../../../../lib/clientDesk';
import {
  PORT_CALLS,
  PORT_CALL_STAGES,
  type PortCall,
  type PortCallChip,
} from '../../../../data/clientDesk';
import { VESSELS, type Vessel } from '../../../../data/vessels';
import { useCrewChange } from '../../../../store/crewChange';

/**
 * "Your port calls" (spec §2, row 3 left) — replaces "Your vessels". One row
 * per call in `VESSELS` order: the vessel, where it berths, when it arrives or
 * sails, a five-step milestone rail, and the work riding on the call as chips
 * that lead to it. The rail speaks `StageTrack`'s language (done ✓ in the
 * success tone, current ● in sea, pending ○), compacted; on a phone it folds
 * to "Step 3 of 5 · Berth confirmed" over a thin segmented bar, because five
 * labels will not share 300px.
 */

type StepState = 'done' | 'current' | 'pending';

function stepState(i: number, at: number): StepState {
  return i < at ? 'done' : i === at ? 'current' : 'pending';
}

/** The full rail, from `sm` up. */
function MilestoneRail({ vessel, call }: { vessel: Vessel; call: PortCall }) {
  const at = portCallStep(call.stage) - 1;
  return (
    <ol
      aria-label={`${vessel.name} milestones`}
      className="mt-3.5 hidden list-none grid-cols-5 sm:grid"
    >
      {PORT_CALL_STAGES.map((stage, i) => {
        const state = stepState(i, at);
        return (
          <li
            key={stage}
            data-step-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex flex-col items-center px-1 text-center"
          >
            {i > 0 ? (
              <span
                aria-hidden="true"
                className={`absolute top-[10px] right-1/2 -left-1/2 h-[2px] -translate-y-1/2 ${
                  i <= at ? 'bg-success' : 'bg-line-strong'
                }`}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={`relative z-[1] grid h-5 w-5 place-items-center rounded-full ${
                state === 'done'
                  ? 'bg-success-soft text-success ring-[1.5px] ring-success/40'
                  : state === 'current'
                    ? 'bg-sea text-white ring-4 ring-sea-soft'
                    : 'bg-white ring-[1.5px] ring-line-strong'
              }`}
            >
              {state === 'done' ? (
                <Icon name="check" size={12} strokeWidth={3} />
              ) : state === 'current' ? (
                <span className="block h-2 w-2 rounded-full bg-white" />
              ) : null}
            </span>
            <span
              className={`mt-1.5 text-[11.5px] leading-tight ${
                state === 'current'
                  ? 'font-bold text-ink'
                  : state === 'done'
                    ? 'text-ink-soft'
                    : 'text-[#5B6B7F]'
              }`}
            >
              {stage}
              <span className="sr-only"> ({state})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The phone fold: the step in words over a five-segment bar. */
function MilestoneCompact({ call }: { call: PortCall }) {
  const step = portCallStep(call.stage);
  return (
    <div className="mt-3 sm:hidden">
      <p className="text-[12.5px] font-semibold text-ink">
        {`Step ${step} of ${PORT_CALL_STAGES.length} · ${call.stage}`}
      </p>
      <div aria-hidden="true" className="mt-1.5 grid grid-cols-5 gap-1">
        {PORT_CALL_STAGES.map((stage, i) => (
          <span
            key={stage}
            className={`block h-1 rounded-full ${
              i < step - 1 ? 'bg-success' : i === step - 1 ? 'bg-sea' : 'bg-line'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const CHIP_TONES: Record<PortCallChip['tone'], string> = {
  info: 'bg-sea-soft text-sea',
  warn: 'bg-warn-soft text-warn',
  success: 'bg-success-soft text-success',
};

/** A shade under the resting tone; the warn one is kept light enough for 4.5:1 text. */
const CHIP_LINK_HOVER: Record<PortCallChip['tone'], string> = {
  info: 'hover:bg-[#D5E7F2]',
  warn: 'hover:bg-[#F8E8D2]',
  success: 'hover:bg-[#D3EBE1]',
};

/**
 * A piece of work riding on the call. Most lead somewhere; one that is only a
 * status ("All documents complete") is plain. The glyph carries the tone, so
 * nothing is said by colour alone. Chips are 32px to the eye with a 44px hit
 * area on a phone (the row gap leaves room for it).
 */
function CallChip({ chip }: { chip: PortCallChip }) {
  const glyph =
    chip.tone === 'warn' ? (
      <Icon name="triangle-alert" size={13} />
    ) : chip.tone === 'success' ? (
      <Icon name="circle-check" size={13} />
    ) : null;
  const base = `inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold ${CHIP_TONES[chip.tone]}`;

  if (!chip.to) {
    return (
      <span data-tone={chip.tone} className={base}>
        {glyph}
        {chip.label}
      </span>
    );
  }
  return (
    <Link
      to={chip.to}
      data-tone={chip.tone}
      className={`${base} ${CHIP_LINK_HOVER[chip.tone]} relative no-underline transition-colors after:absolute after:inset-x-0 after:-inset-y-1.5 sm:after:hidden`}
    >
      {glyph}
      {chip.label}
      <Icon name="chevron-right" size={13} className="-mr-1 opacity-70" />
    </Link>
  );
}

function PortCallRow({ call }: { call: PortCall }) {
  const vessel = VESSELS.find((v) => v.id === call.vesselId);
  if (!vessel) return null;
  return (
    <li
      data-testid={`port-call-${call.vesselId}`}
      data-stage={call.stage}
      className="flex gap-3 border-b border-dashed border-line-strong py-4 first:pt-3 last:border-b-0 last:pb-0"
    >
      {/* The tile gives way on a phone, where the width is worth more. */}
      <span
        aria-hidden="true"
        className="mt-0.5 hidden h-9 w-9 shrink-0 place-items-center rounded-lg bg-sea-soft text-sea sm:grid"
      >
        <Icon name="ship" size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <h3 className="text-[14.5px] leading-snug font-bold text-ink">{vessel.name}</h3>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-paper px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap text-ink tabular-nums">
            <Icon name="clock" size={13} className="text-ink-soft" />
            {call.when} <span className="font-normal text-ink-soft">· {call.countdown}</span>
          </span>
        </div>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          {call.berth} · {vessel.operatorLine}
        </p>

        <MilestoneRail vessel={vessel} call={call} />
        <MilestoneCompact call={call} />

        <ul role="list" className="mt-3.5 flex list-none flex-wrap gap-x-2 gap-y-3 sm:gap-y-2">
          {call.chips.map((chip) => (
            <li key={chip.label}>
              <CallChip chip={chip} />
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export function PortCalls() {
  const crewRequests = useCrewChange((s) => s.requests);
  const letters = crewRequests.filter((r) => !isTerminalStage(r.kind, r.stage)).length;

  return (
    <Card data-testid="client-port-calls">
      <CardHeader
        title="Your port calls"
        subtitle="Where each call stands, milestone by milestone"
      />
      <ul role="list" className="mt-1 list-none">
        {PORT_CALLS.map((call) => (
          <PortCallRow key={call.vesselId} call={call} />
        ))}
      </ul>
      <p className="mt-4 border-t border-line pt-3.5 text-[12.5px] text-ink-soft">
        Crew joining or leaving on any of these?{' '}
        <Link to="/app/agency/crew-change" className="font-semibold text-sea">
          Open crew change
        </Link>{' '}
        — hotels, taxis timed off the flight, launches, and the letters.
        {letters > 0 ? ` ${letters} in progress.` : ''}
      </p>
    </Card>
  );
}
