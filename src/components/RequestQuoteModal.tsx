import { useState } from 'react';
import { CATEGORY_SERVICE, relatedServicesFor } from '../data/related';
import { VESSELS } from '../data/vessels';
import { gbp } from '../lib/format';
import {
  DEFAULT_REPLY_WINDOW,
  deadlineAdvice,
  mealAllowancePerDay,
  mealAllowanceTotal,
  MEAL_ALLOWANCE_SCALE,
  REPLY_WINDOWS,
  replyWindowById,
} from '../lib/requests';
import { useApp } from '../store/app';
import { Button } from './ui/Button';
import { Eyebrow } from './ui/Eyebrow';
import { Modal } from './ui/Modal';
import { Toggle } from './ui/Toggle';

/**
 * Request-a-quote modal (shared by the marketplace, supplier profile, and
 * dashboard). Three commercial rules live here:
 *  · the client sets the reply-by deadline, and the platform is honest about
 *    what a very short window will draw (a taxi, yes; a crane, no);
 *  · related services are suggested alongside the request (the medical example:
 *    transfer and hotel), for the GAC agent to arrange;
 *  · a hotel is quoted subject to availability, and if the client wants a meal
 *    allowance it follows a sliding scale.
 */

export interface RequestTarget {
  /** Named supplier, or undefined for a category-wide request. */
  supplierName?: string;
  category: string;
  /** Overrides the category's default service label. */
  service?: string;
}

const ADVICE_TONE = {
  warn: 'border-warn bg-warn-soft text-warn',
  info: 'border-sea bg-sea-soft text-sea',
  ok: 'border-success bg-success-soft text-success',
} as const;

const NIGHT_OPTIONS = [1, 2, 3, 4, 5, 7] as const;

export function RequestQuoteModal({
  target,
  onClose,
}: {
  target: RequestTarget | null;
  onClose: () => void;
}) {
  // The form mounts fresh each time the modal opens (Modal renders nothing
  // while closed), so every request starts from the defaults.
  return (
    <Modal open={target !== null} onClose={onClose} labelledBy="request-quote-title">
      {target ? (
        <RequestForm
          key={`${target.supplierName ?? ''}|${target.category}|${target.service ?? ''}`}
          target={target}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function RequestForm({ target, onClose }: { target: RequestTarget; onClose: () => void }) {
  const pushToast = useApp((s) => s.pushToast);

  const [vesselId, setVesselId] = useState(VESSELS[0]!.id);
  const [neededBy, setNeededBy] = useState('Fri 06:00');
  const [windowId, setWindowId] = useState(DEFAULT_REPLY_WINDOW);
  const [related, setRelated] = useState<Record<string, boolean>>({});
  const [meals, setMeals] = useState(false);
  const [nights, setNights] = useState<number>(1);

  const window_ = replyWindowById(windowId);
  const advice = deadlineAdvice(window_.hours);
  const suggestions = relatedServicesFor(target.category);
  const hotelChosen = suggestions.some((s) => s.offersMealAllowance && related[s.id]);
  const chosenCount = suggestions.filter((s) => related[s.id]).length;

  const serviceLabel = target.service ?? CATEGORY_SERVICE[target.category] ?? target.category;
  const who = target.supplierName ?? `${target.category} suppliers`;
  const vessel = VESSELS.find((v) => v.id === vesselId) ?? VESSELS[0]!;

  function send() {
    const parts = [
      `Quote request sent to ${who} — ${serviceLabel}, ${vessel.name}.`,
      `Reply-by window: ${window_.label}.`,
    ];
    if (chosenCount > 0) {
      parts.push(
        `${chosenCount} related ${chosenCount === 1 ? 'service' : 'services'} passed to your GAC agent${
          hotelChosen && meals
            ? ` (meal allowance ${gbp(mealAllowancePerDay(nights))}/day, ${nights} ${
                nights === 1 ? 'night' : 'nights'
              })`
            : ''
        }.`,
      );
    }
    pushToast(parts.join(' '));
    onClose();
  }

  return (
    <>
      <Eyebrow>Quote request</Eyebrow>
      <h2 id="request-quote-title" className="mt-1 font-display text-[19px] font-bold">
        Request a quote — {who}
      </h2>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        {serviceLabel}. Suppliers quote against the deadline you set; the platform tells you what
        that window is likely to draw.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-[12.5px] font-semibold text-ink-soft">
          Vessel
          <select
            value={vesselId}
            onChange={(e) => setVesselId(e.target.value)}
            className="mt-1 block min-h-[40px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink"
          >
            {VESSELS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.port}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12.5px] font-semibold text-ink-soft">
          Needed by
          <input
            type="text"
            value={neededBy}
            onChange={(e) => setNeededBy(e.target.value)}
            className="mt-1 block min-h-[40px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink"
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

      {/* Related services — cross-sell, arranged by the GAC agent */}
      {suggestions.length > 0 ? (
        <fieldset className="mt-4 rounded-lg border border-[#E5D89A] bg-gold-soft p-3">
          <legend className="px-1 text-[11px] font-extrabold tracking-[0.14em] text-gold-deep uppercase">
            You may also need · arranged by your GAC agent
          </legend>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Medical attention ashore usually means getting there and, sometimes, staying over. The
            platform suggests it; your agent books it inside the existing relationship.
          </p>
          <ul className="mt-2 space-y-2">
            {suggestions.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
                  <input
                    type="checkbox"
                    checked={!!related[s.id]}
                    onChange={(e) => setRelated({ ...related, [s.id]: e.target.checked })}
                    className="mt-1 h-4 w-4 accent-sea"
                  />
                  <span>
                    <strong>{s.label}</strong> — {s.body}
                    {s.availabilityCaveat ? (
                      <span className="mt-1 block text-[12px] text-ink-soft">
                        {s.availabilityCaveat}
                      </span>
                    ) : null}
                  </span>
                </label>
                {s.offersMealAllowance && related[s.id] ? (
                  <div className="mt-2 ml-6 rounded-lg border border-line bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold">
                        Meal allowance for the stay?
                      </span>
                      <Toggle
                        pressed={meals}
                        onToggle={() => setMeals(!meals)}
                        label="Include meal allowance"
                      />
                    </div>
                    {meals ? (
                      <div className="mt-2.5" data-testid="meal-scale">
                        <label className="text-[12.5px] font-semibold text-ink-soft">
                          Nights
                          <select
                            value={nights}
                            onChange={(e) => setNights(Number(e.target.value))}
                            className="ml-2 min-h-[34px] rounded-lg border-[1.5px] border-line-strong bg-white px-2 py-1 text-[13px] font-semibold text-ink"
                          >
                            {NIGHT_OPTIONS.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="mt-2 text-[13px]">
                          Sliding scale: <strong>{gbp(mealAllowancePerDay(nights))} per day</strong>{' '}
                          · <strong>{gbp(mealAllowanceTotal(nights))}</strong> for {nights}{' '}
                          {nights === 1 ? 'night' : 'nights'}, per crew member.
                        </p>
                        <p className="mt-1 text-[11.5px] text-ink-soft">
                          Scale (illustrative, set by client policy):{' '}
                          {MEAL_ALLOWANCE_SCALE.map((b, i) => {
                            const label =
                              b.upToNights === 1
                                ? '1 night'
                                : Number.isFinite(b.upToNights)
                                  ? `up to ${b.upToNights} nights`
                                  : 'longer stays';
                            return `${i ? ' · ' : ''}${label} ${gbp(b.perDayGBP)}/day`;
                          })}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={send}>Send request</Button>
      </div>
    </>
  );
}
