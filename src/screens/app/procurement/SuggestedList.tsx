import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { Pill } from '../../../components/ui/Pill';
import { VESSELS } from '../../../data/vessels';
import {
  callsConsideredFor,
  canSendSuggestion,
  editsFor,
  effectiveQty,
  isTicked,
  noPlannedCall,
  plannedCallFor,
  SUGGESTION_COPY,
  suggestionEyebrow,
  suggestionFor,
  suggestionRule,
  suggestionSendHint,
  suggestionTitle,
} from '../../../lib/procurementSuggest';
import { useApp } from '../../../store/app';
import { useProcurement } from '../../../store/procurement';

/**
 * The suggested stores list — drafted from the vessel's previous calls once
 * her next call is planned, so the client has it before she arrives. The
 * client unticks or changes a quantity and sends it to Compass in one click;
 * from there it is the same request, the same stages and the same invoice as
 * a list written by hand. Shown only while the request is a draft.
 */
export function SuggestedList({ onSent }: { onSent: () => void }) {
  const pushToast = useApp((s) => s.pushToast);
  const request = useProcurement((s) => s.request);
  const suggestion = useProcurement((s) => s.suggestion);
  const toggleSuggested = useProcurement((s) => s.toggleSuggested);
  const setSuggestedQty = useProcurement((s) => s.setSuggestedQty);
  const sendSuggested = useProcurement((s) => s.sendSuggested);

  const vesselId = request.vesselId;
  const vessel = VESSELS.find((v) => v.id === vesselId) ?? VESSELS[0]!;
  const call = plannedCallFor(vesselId);
  const lines = suggestionFor(vesselId);
  const edits = editsFor(suggestion, vesselId);
  const callsConsidered = callsConsideredFor(vesselId);

  if (!call || lines.length === 0) {
    return (
      <Card data-testid="suggested-list" data-planned="false">
        <Eyebrow>Suggested list</Eyebrow>
        <p className="mt-1 text-[13.5px] text-ink-soft" data-testid="suggested-none">
          {noPlannedCall(vessel.name)}
        </p>
      </Card>
    );
  }

  const ticked = lines.filter((l) => isTicked(edits, l.itemId));
  const sendable = canSendSuggestion(lines, edits);

  function onSend() {
    if (!sendable || !call) return;
    const count = ticked.length;
    onSent();
    sendSuggested(vesselId);
    pushToast(
      `${request.ref} sent to Compass — ${count} ${count === 1 ? 'line' : 'lines'}, ${vessel.name}, needed ${call.neededBy}. Compass sources and supplies every line; you see one invoice, from GAC.`,
    );
  }

  return (
    <Card
      data-testid="suggested-list"
      data-planned="true"
      role="region"
      aria-labelledby="suggested-list-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>{suggestionEyebrow(callsConsidered)}</Eyebrow>
          <h2 id="suggested-list-title" className="mt-0.5 font-display text-[17px] font-bold">
            {suggestionTitle(vessel.name, call)}
          </h2>
          <p className="mt-0.5 max-w-[640px] text-[13px] text-ink-soft">{SUGGESTION_COPY.intro}</p>
        </div>
        <Pill tone="info">{SUGGESTION_COPY.pill}</Pill>
      </div>

      <ul className="mt-3 divide-y divide-dashed divide-line" data-testid="suggested-lines">
        {lines.map((l) => {
          const on = isTicked(edits, l.itemId);
          const qty = effectiveQty(l, edits);
          const unit = qty === 1 ? l.unit.one : l.unit.other;
          return (
            <li
              key={l.itemId}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 py-2 sm:grid-cols-[auto_minmax(0,1fr)_200px]"
              data-testid="suggested-line"
              data-item-id={l.itemId}
              data-ticked={on ? 'true' : 'false'}
            >
              <input
                id={`suggested-${l.itemId}`}
                type="checkbox"
                checked={on}
                onChange={() => toggleSuggested(vesselId, l.itemId)}
                className="h-[18px] w-[18px] accent-sea"
                data-testid={`suggested-tick-${l.itemId}`}
              />
              <label htmlFor={`suggested-${l.itemId}`} className="min-w-0 cursor-pointer">
                <span
                  className={`block text-[13.5px] font-bold ${on ? '' : 'text-ink-soft line-through'}`}
                >
                  {l.description}
                </span>
                <span
                  className="block text-[12px] text-ink-soft"
                  data-testid={`suggested-reason-${l.itemId}`}
                >
                  {l.reason}
                </span>
              </label>
              <div className="col-start-2 flex items-center gap-2 sm:col-start-auto">
                <label htmlFor={`suggested-qty-${l.itemId}`} className="sr-only">
                  Quantity: {l.description}
                </label>
                <input
                  id={`suggested-qty-${l.itemId}`}
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={qty > 0 ? qty : ''}
                  disabled={!on}
                  onChange={(e) => setSuggestedQty(vesselId, l.itemId, Number(e.target.value))}
                  className="block min-h-[40px] w-[76px] rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink disabled:opacity-50"
                  data-testid={`suggested-qty-${l.itemId}`}
                />
                <span className="text-[12.5px] text-ink-soft">{unit}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[12px] text-ink-soft" data-testid="suggested-rule">
        {suggestionRule(callsConsidered)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={onSend} disabled={!sendable} data-testid="send-suggested">
          {SUGGESTION_COPY.sendLabel}
        </Button>
        <span className="text-[12.5px] text-ink-soft" data-testid="suggested-hint">
          {sendable
            ? suggestionSendHint(request.ref)
            : ticked.length === 0
              ? SUGGESTION_COPY.noneTicked
              : SUGGESTION_COPY.badQty}
        </span>
      </div>
    </Card>
  );
}
