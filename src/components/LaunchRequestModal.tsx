import { useState } from 'react';
import { VESSELS } from '../data/vessels';
import { overCapacityWarning, runsNeeded } from '../lib/launches';
import type { LaunchSupplier } from '../lib/launches';
import {
  DEFAULT_REPLY_WINDOW,
  deadlineAdvice,
  REPLY_WINDOWS,
  replyWindowById,
} from '../lib/requests';
import { useApp } from '../store/app';
import { Button } from './ui/Button';
import { Eyebrow } from './ui/Eyebrow';
import { Modal } from './ui/Modal';
import { Toggle } from './ui/Toggle';

/**
 * Request-a-launch modal — the Launches tab's booking form. Same shape as the
 * quote request (vessel, deadline set by the client, deadline advice) plus the
 * two launch facts that decide the run: passengers against the launch's
 * capacity, and whether freight goes out and is included in the price.
 */

export interface LaunchRequestDefaults {
  passengers: number;
  freight: boolean;
}

const ADVICE_TONE = {
  warn: 'border-warn bg-warn-soft text-warn',
  info: 'border-sea bg-sea-soft text-sea',
  ok: 'border-success bg-success-soft text-success',
} as const;

const FIELD =
  'mt-1 block min-h-[40px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink';

export function LaunchRequestModal({
  supplier,
  defaults,
  onClose,
}: {
  supplier: LaunchSupplier | null;
  defaults?: LaunchRequestDefaults;
  onClose: () => void;
}) {
  // The form mounts fresh each time the modal opens (Modal renders nothing
  // while closed), so every request starts from the plan-a-run defaults.
  return (
    <Modal open={supplier !== null} onClose={onClose} labelledBy="launch-request-title">
      {supplier ? (
        <LaunchForm key={supplier.id} supplier={supplier} defaults={defaults} onClose={onClose} />
      ) : null}
    </Modal>
  );
}

function LaunchForm({
  supplier,
  defaults,
  onClose,
}: {
  supplier: LaunchSupplier;
  defaults?: LaunchRequestDefaults;
  onClose: () => void;
}) {
  const pushToast = useApp((s) => s.pushToast);
  const launch = supplier.launch;

  const [vesselId, setVesselId] = useState(VESSELS[0]!.id);
  const [paxText, setPaxText] = useState(String(defaults?.passengers ?? 9));
  const [freight, setFreight] = useState(defaults?.freight ?? true);
  const [freightDetail, setFreightDetail] = useState('');
  const [outTime, setOutTime] = useState('Fri 06:00');
  const [returnTime, setReturnTime] = useState('Fri 10:00');
  const [windowId, setWindowId] = useState(DEFAULT_REPLY_WINDOW);

  const pax = Math.max(1, Math.floor(Number(paxText) || 1));
  const runs = runsNeeded(launch.maxPassengers, pax);
  const overLimit = overCapacityWarning(launch, pax);
  const window_ = replyWindowById(windowId);
  const advice = deadlineAdvice(window_.hours);
  const vessel = VESSELS.find((v) => v.id === vesselId) ?? VESSELS[0]!;

  function send() {
    const parts = [
      `Launch request sent to ${supplier.name} — ${vessel.name}, ${pax} ${
        pax === 1 ? 'passenger' : 'passengers'
      }${runs > 1 ? ` (${runs} runs)` : ''}`,
    ];
    if (freight) {
      const detail = freightDetail.trim();
      parts.push(
        `freight${detail ? ` (${detail})` : ''}${
          launch.freightIncluded ? '' : ' — quoted separately'
        }`,
      );
    }
    parts.push(`${launch.port} ${outTime.trim()}–${returnTime.trim()}`);
    pushToast(`${parts.join(', ')}. Reply-by window: ${window_.label}.`);
    onClose();
  }

  return (
    <>
      <Eyebrow>Launch request</Eyebrow>
      <h2 id="launch-request-title" className="mt-1 font-display text-[19px] font-bold">
        Request launch — {supplier.name}
      </h2>
      <p className="mt-1.5 text-[13px] text-ink-soft" data-testid="launch-summary">
        {launch.vesselName} from {launch.port} · max {launch.maxPassengers} passengers · freight{' '}
        {launch.freightIncluded ? 'included' : 'not included'}. The operator quotes against the
        deadline you set.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-[12.5px] font-semibold text-ink-soft">
          Vessel
          <select
            value={vesselId}
            onChange={(e) => setVesselId(e.target.value)}
            className={FIELD}
            data-testid="launch-vessel"
          >
            {VESSELS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.port}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12.5px] font-semibold text-ink-soft">
          Passengers
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={paxText}
            onChange={(e) => setPaxText(e.target.value)}
            className={FIELD}
            data-testid="launch-passengers"
            aria-describedby={overLimit ? 'launch-over-limit' : undefined}
          />
        </label>
      </div>
      {overLimit ? (
        <p
          id="launch-over-limit"
          className="mt-2 rounded-lg border-l-4 border-warn bg-warn-soft px-3 py-2 text-[12.5px] text-warn"
          data-testid="over-limit"
        >
          {overLimit}
        </p>
      ) : null}

      {/* Freight — included in the run or quoted separately */}
      <div className="mt-4 rounded-lg border border-line bg-paper p-3" data-testid="launch-freight">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold">Freight to go out?</span>
          <Toggle
            pressed={freight}
            onToggle={() => setFreight(!freight)}
            label="Freight to go out"
          />
        </div>
        {freight ? (
          <div className="mt-2.5">
            <label className="text-[12.5px] font-semibold text-ink-soft">
              Freight detail
              <input
                type="text"
                value={freightDetail}
                onChange={(e) => setFreightDetail(e.target.value)}
                placeholder="e.g. 2 pallets stores, ~300 kg"
                className={FIELD}
                data-testid="launch-freight-detail"
              />
            </label>
            <p className="mt-2 text-[12px] text-ink-soft" data-testid="launch-freight-note">
              {launch.freightIncluded ? (
                launch.freightNote
              ) : (
                <>
                  <strong className="text-ink">Quoted separately by {supplier.name}.</strong>{' '}
                  {launch.freightNote}
                </>
              )}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-[12.5px] font-semibold text-ink-soft">
          Out from {launch.port}
          <input
            type="text"
            value={outTime}
            onChange={(e) => setOutTime(e.target.value)}
            className={FIELD}
            data-testid="launch-out"
          />
        </label>
        <label className="text-[12.5px] font-semibold text-ink-soft">
          Return
          <input
            type="text"
            value={returnTime}
            onChange={(e) => setReturnTime(e.target.value)}
            className={FIELD}
            data-testid="launch-return"
          />
        </label>
      </div>

      {/* Reply-by deadline — set by the client */}
      <fieldset className="mt-4 border-0 p-0">
        <legend className="text-[12.5px] font-semibold text-ink-soft">
          Reply-by deadline · set by you
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Reply-by window">
          {REPLY_WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              aria-pressed={windowId === w.id}
              onClick={() => setWindowId(w.id)}
              className={`min-h-[34px] cursor-pointer rounded-full border-[1.5px] px-3 py-1 text-[12.5px] font-semibold transition-colors ${
                windowId === w.id
                  ? 'border-ink bg-ink text-white'
                  : 'border-line-strong bg-white text-ink-soft hover:border-sea'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
        <p
          className={`mt-2 rounded-lg border-l-4 px-3 py-2 text-[12.5px] ${ADVICE_TONE[advice.tone]}`}
          data-testid="deadline-advice"
          data-tone={advice.tone}
        >
          {advice.text}
        </p>
      </fieldset>

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={send} data-testid="launch-send">
          Send request
        </Button>
      </div>
    </>
  );
}
