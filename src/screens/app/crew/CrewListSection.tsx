import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';
import { Pill } from '../../../components/ui/Pill';
import { StageTrack } from '../../../components/ui/StageTrack';
import { Toggle } from '../../../components/ui/Toggle';
import { CREW_PORTS } from '../../../data/crewChange';
import type { CrewSectionId } from '../../../data/crewChange';
import {
  CREW_DATA_NOTICE,
  CREW_LIST_ILLUSTRATIVE,
  CREW_LIST_STEPS,
  CREW_SERVICE_CARDS,
  CREW_TEMPLATE_FILE_NAME,
  CREW_TEMPLATE_HEADERS,
  DELETE_CONFIRM,
  DEMO_CREW_ROWS,
} from '../../../data/crewList';
import { HOTEL_AVAILABILITY_CAVEAT } from '../../../data/related';
import { SUPPLIERS, supplierById } from '../../../data/suppliers';
import { VESSELS } from '../../../data/vessels';
import { formatCrewName } from '../../../lib/crewChange';
import {
  CREW_FIELDS,
  CREW_LIST_STAGES,
  crewFieldLabel,
  deletionAvailability,
  hasPersonalData,
  importFromTable,
  maskPassport,
  planHotel,
  planLoi,
  planTaxis,
  purgeAtIso,
  serviceSummary,
  simulateCrewListAction,
  summarise,
  withMapping,
  withoutRow,
} from '../../../lib/crewList';
import type {
  CrewField,
  CrewImport,
  CrewListSubmission,
  CrewRow,
  ServiceChoices,
} from '../../../lib/crewList';
import { stageToneIn } from '../../../lib/pipeline';
import { isBookable } from '../../../lib/svs';
import { FLIGHT_FEED_NOTE, TRANSFER_PORTS } from '../../../lib/transfers';
import { canReadXlsx, parseSpreadsheet, writeXlsx } from '../../../lib/xlsx';
import { useApp } from '../../../store/app';
import { useCrewChange } from '../../../store/crewChange';

/**
 * Crew list — the first section of the crew change screen (owner's ask,
 * 23 Aug 2026). The coordinator uploads the spreadsheet they already keep,
 * checks what the platform read, chooses the services that hang off it (LOIs
 * for the visa-national on-signers, rooms, taxis timed to the flights) and
 * submits the lot in one go. Then, because the list is personal data, they
 * can delete it — one click, confirmed back — or it goes by itself thirty
 * days after the crew change completes.
 *
 * The draft (the file, the mapping, the choices) lives in component state
 * only and is never persisted: the notice promises nothing leaves this
 * browser until Submit, so a refresh drops the draft by design. Only the
 * submission record reaches the store, and the store owns its deletion.
 */

const INPUT =
  'mt-1 block min-h-[40px] w-full rounded-lg border-[1.5px] border-line-strong bg-white px-2.5 py-2 text-[13.5px] font-semibold text-ink';
const LABEL = 'text-[12.5px] font-semibold text-ink-soft';
const TH =
  'px-2.5 py-2 text-left text-[11.5px] font-bold tracking-[0.04em] text-ink-soft uppercase';
const TD = 'px-2.5 py-2 align-top text-[13px]';
const LINK_BUTTON =
  'cursor-pointer border-none bg-transparent p-0 font-semibold text-sea underline';

const HOTELS = SUPPLIERS.filter((s) => s.category === 'Hotels');
const PORT_SET = new Set<string>(CREW_PORTS);
const TAXI_PORT_SET = new Set<string>(TRANSFER_PORTS);

/** Where a draft is — the first four stepper pills; the fifth belongs to a submitted list. */
type DraftStep = 'check' | 'services' | 'submit';
const STEP_INDEX: Record<DraftStep, number> = { check: 1, services: 2, submit: 3 };
const DEMO_FILE_NAME = 'crew-list-demo.xlsx';

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A Uint8Array's bytes as an ArrayBuffer of their own, for the parser. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Hand the browser a file to save — the template, built in the page. */
function downloadBytes(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([toArrayBuffer(bytes)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The service lines a stored submission reads as — from its counts, since the crew may be gone. */
function storedServiceLines(s: CrewListSubmission['services']): string[] {
  const lines: string[] = [];
  if (s.loi) lines.push(`LOIs · ${plural(s.loiCount, 'visa-national on-signer')}`);
  if (s.hotels) {
    const hotel = supplierById(s.hotelId)?.name ?? 'a GAC-vetted hotel';
    lines.push(
      `Hotel · ${plural(s.rooms, 'room')} × ${plural(s.hotelNights, 'night')} at ${hotel}, subject to availability`,
    );
  }
  if (s.taxis) lines.push(`Taxis · ${plural(s.runs, 'run')}, timed to the flights`);
  return lines;
}

/** 'LOIs for 5 crew, 8 rooms and 4 taxi runs' — the toast's services phrase. */
function servicesPhrase(s: CrewListSubmission['services']): string {
  const parts: string[] = [];
  if (s.loi) parts.push(plural(s.loiCount, 'LOI'));
  if (s.hotels) parts.push(plural(s.rooms, 'hotel room'));
  if (s.taxis) parts.push(plural(s.runs, 'taxi run'));
  if (parts.length === 0) return 'no services chosen';
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** The vessel the sheet names, when it names one of ours; else the first vessel. */
function vesselFromRows(rows: readonly CrewRow[]): string {
  const named = rows.map((r) => r.vessel.trim().toLowerCase()).find((v) => v !== '');
  const match = named ? VESSELS.find((v) => v.name.toLowerCase() === named) : undefined;
  return (match ?? VESSELS[0])?.id ?? '';
}

/** The port the sheet names, when it is one the letters cover; else the vessel's call; else the first. */
function portFromRows(rows: readonly CrewRow[], vesselId: string): string {
  const named = rows.map((r) => r.port.trim()).find((p) => PORT_SET.has(p));
  if (named) return named;
  const call = VESSELS.find((v) => v.id === vesselId)?.port ?? '';
  return PORT_SET.has(call) ? call : CREW_PORTS[0];
}

function defaultChoices(rows: readonly CrewRow[], port: string): ServiceChoices {
  const hotel = HOTELS.find((h) => isBookable(h.certs)) ?? HOTELS[0];
  return {
    loi: planLoi(rows).crew.length > 0,
    hotels: true,
    taxis: true,
    hotelId: hotel?.id ?? '',
    hotelNights: 1,
    port: TAXI_PORT_SET.has(port) ? port : TRANSFER_PORTS[0],
  };
}

/* ---------------------------------------------------------------- Stepper */

function Stepper({ current }: { current: number }) {
  return (
    <ol
      aria-label="Crew list steps"
      data-testid="crew-list-steps"
      className="flex flex-wrap gap-1.5"
    >
      {CREW_LIST_STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'pending';
        return (
          <li
            key={label}
            aria-current={state === 'current' ? 'step' : undefined}
            data-step-state={state}
            className={`rounded-full border-[1.5px] px-3 py-1 text-[12.5px] font-semibold ${
              state === 'current'
                ? 'border-ink bg-ink text-white'
                : state === 'done'
                  ? 'border-success-soft bg-success-soft text-success'
                  : 'border-line-strong bg-white text-ink-soft'
            }`}
          >
            <span aria-hidden="true" className="mr-1">
              {state === 'done' ? '✓' : i + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------- Disclosure */

function DataNotice({
  collapsible,
  open,
  onToggle,
}: {
  collapsible: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const expanded = !collapsible || open;
  return (
    <Card data-testid="crew-data-notice" data-expanded={expanded}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13.5px] font-bold">{CREW_DATA_NOTICE.title}</p>
          {!expanded ? <span className="text-[12.5px] text-ink-soft">· read</span> : null}
        </div>
        {collapsible ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls="crew-data-notice-body"
            className={`${LINK_BUTTON} text-[12.5px]`}
            data-testid="crew-data-notice-toggle"
          >
            {open ? 'Hide' : 'Show'}
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div id="crew-data-notice-body">
          <p className="mt-1.5 inline-block rounded-full border border-line-strong bg-paper px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-soft">
            {CREW_DATA_NOTICE.intro}
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {CREW_DATA_NOTICE.points.map((p) => (
              <div key={p.title} className="min-w-0 text-[13px]">
                <dt className="font-bold">{p.title}</dt>
                <dd className="text-ink-soft">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ Upload */

function UploadStep({
  busy,
  error,
  onFile,
  onDemo,
}: {
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onDemo: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const xlsxOk = canReadXlsx();

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // Let the same file be chosen twice in a row.
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  function downloadTemplate() {
    downloadBytes(
      writeXlsx({ name: 'Crew list', rows: [CREW_TEMPLATE_HEADERS] }),
      CREW_TEMPLATE_FILE_NAME,
    );
  }

  return (
    <Card data-testid="crew-list-upload">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        data-drag-over={dragOver}
        aria-describedby="crew-list-illustrative"
        className={`rounded-brand border-2 border-dashed p-5 transition-colors focus-within:ring-2 focus-within:ring-sea ${
          dragOver ? 'border-sea bg-sea-soft' : 'border-line-strong bg-paper'
        }`}
      >
        <label className="block cursor-pointer text-center">
          <input
            ref={inputRef}
            type="file"
            accept={xlsxOk ? '.xlsx,.csv,.txt' : '.csv,.txt'}
            onChange={onChange}
            disabled={busy}
            className="sr-only"
            aria-describedby="crew-list-illustrative"
            data-testid="crew-list-file"
          />
          <span className="block font-display text-[16px] font-bold">
            {xlsxOk
              ? 'Drop your crew list here, or choose a file — .xlsx or .csv.'
              : 'Drop your crew list here, or choose a file — .csv.'}
          </span>
          <span className="mt-1 block text-[13px] text-ink-soft">
            {xlsxOk
              ? 'Any layout: the platform reads your headers.'
              : '.xlsx cannot be read in this browser — in your spreadsheet program choose Save As and pick .csv, then upload that. Any layout: the platform reads your headers.'}
          </span>
        </label>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            data-testid="crew-list-choose"
          >
            Choose file
          </Button>
          <Button variant="ghost" onClick={downloadTemplate} data-testid="crew-list-template">
            Download the template (.xlsx)
          </Button>
          <Button variant="ghost" onClick={onDemo} disabled={busy} data-testid="crew-list-demo">
            Use the demo crew list
          </Button>
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border-l-4 border-danger bg-danger-soft px-3 py-2 text-[12.5px] text-danger"
          data-testid="crew-list-error"
        >
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-[12.5px] text-ink-soft">
        The file is read here, in your browser. Nothing is sent until you press Submit on the last
        step.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------- Check */

function MovementPill({ movement }: { movement: CrewRow['movement'] }) {
  if (movement === 'on') return <Pill tone="info">On</Pill>;
  if (movement === 'off') return <Pill tone="neutral">Off</Pill>;
  return <Pill tone="warn">Not stated</Pill>;
}

function CheckStep({
  imp,
  showPassports,
  onShowPassports,
  onChange,
  onRemove,
  onContinue,
  onDiscard,
}: {
  imp: CrewImport;
  showPassports: boolean;
  onShowPassports: () => void;
  onChange: (next: CrewImport) => void;
  onRemove: (rowId: string) => void;
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const summary = summarise(imp.rows);
  return (
    <Card data-testid="crew-list-check">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-bold">Check what the platform read</p>
          <p className="mt-0.5 text-[12.5px] text-ink-soft" data-testid="crew-list-summary">
            {imp.fileName} · {imp.sheetName} · {plural(summary.total, 'crew member', 'crew')} ·{' '}
            {plural(summary.on, 'on-signer')} · {plural(summary.off, 'off-signer')}
            {summary.unstated ? ` · ${summary.unstated} not stated` : ''} ·{' '}
            {summary.withIssues === 0
              ? 'nothing needs attention'
              : summary.withIssues === 1
                ? '1 needs attention'
                : `${summary.withIssues} need attention`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span aria-hidden="true">Show passport numbers</span>
          <span data-testid="crew-show-passports" className="inline-flex">
            <Toggle
              pressed={showPassports}
              onToggle={onShowPassports}
              label="Show passport numbers"
            />
          </span>
        </div>
      </div>

      <fieldset className="mt-4 border-0 p-0">
        <legend className="text-[12.5px] font-bold">
          Columns — change any the platform got wrong
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {imp.headers.map((header, i) => {
            const name = header || `Column ${i + 1}`;
            return (
              <label key={`${i}-${header}`} className={`${LABEL} min-w-0`}>
                <span className="block truncate" title={name}>
                  {name}
                </span>
                <select
                  value={imp.mapping[i] ?? ''}
                  onChange={(e) =>
                    onChange(withMapping(imp, i, (e.target.value || null) as CrewField | null))
                  }
                  aria-label={`Column: ${name}`}
                  className={`${INPUT} !mt-0.5`}
                  data-testid={`crew-map-${i}`}
                >
                  <option value="">— ignore —</option>
                  {CREW_FIELDS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
        {imp.unmapped.length > 0 ? (
          <p className="mt-2 text-[12.5px] text-ink-soft" data-testid="crew-list-unmapped">
            Not found in your file: {imp.unmapped.map(crewFieldLabel).join(', ')}.
          </p>
        ) : null}
      </fieldset>

      {/* The scroller is positioned so the sr-only heading in the last column
          (absolutely placed) is clipped by it, not by the page — otherwise a
          phone shows a horizontal scrollbar for a 1px box nobody can see. */}
      <div className="relative mt-4 overflow-x-auto rounded-lg border border-line">
        <table
          className="w-full min-w-[980px] border-collapse text-[13px]"
          data-testid="crew-table"
        >
          <thead className="bg-paper">
            <tr>
              <th scope="col" className={TH}>
                Name
              </th>
              <th scope="col" className={TH}>
                Rank
              </th>
              <th scope="col" className={TH}>
                Nationality
              </th>
              <th scope="col" className={TH}>
                DOB
              </th>
              <th scope="col" className={TH}>
                Passport
              </th>
              <th scope="col" className={TH}>
                Expiry
              </th>
              <th scope="col" className={TH}>
                On/Off
              </th>
              <th scope="col" className={TH}>
                Flight
              </th>
              <th scope="col" className={TH}>
                Issues
              </th>
              <th scope="col" className={TH}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {imp.rows.map((r) => {
              const name = formatCrewName(r.familyName, r.forenames) || '—';
              const flight = [r.flightNumber, r.flightDate, r.flightTime, r.flightFrom]
                .filter((p) => p !== '')
                .join(' · ');
              return (
                <tr
                  key={r.id}
                  className="border-t border-line"
                  data-testid="crew-row"
                  data-issues={r.issues.length || undefined}
                >
                  <td className={`${TD} font-semibold`}>{name}</td>
                  <td className={TD}>{r.rank || '—'}</td>
                  <td className={TD}>{r.nationality || '—'}</td>
                  <td className={`${TD} whitespace-nowrap`}>{r.dateOfBirth || '—'}</td>
                  <td className={`${TD} whitespace-nowrap`} data-testid="crew-passport">
                    {r.passportNumber
                      ? showPassports
                        ? r.passportNumber
                        : maskPassport(r.passportNumber)
                      : '—'}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>{r.passportExpiry || '—'}</td>
                  <td className={TD}>
                    <MovementPill movement={r.movement} />
                  </td>
                  <td className={TD}>{flight || '—'}</td>
                  <td className={TD}>
                    {r.issues.length === 0 ? (
                      <span className="text-ink-soft">—</span>
                    ) : (
                      <ul className="flex flex-wrap gap-1">
                        {r.issues.map((issue) => (
                          <li key={issue}>
                            <Pill tone="warn">{issue}</Pill>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={`${TD} text-right`}>
                    <button
                      type="button"
                      onClick={() => onRemove(r.id)}
                      aria-label={`Remove ${name} from the list`}
                      className="min-h-[32px] min-w-[32px] cursor-pointer rounded-md border border-line-strong bg-white px-2 text-[13px] font-bold text-ink-soft hover:border-danger hover:text-danger"
                      data-testid="crew-remove"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12.5px] text-ink-soft">
        Nothing has left this browser. Discard clears it; Submit is the only thing that sends it.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          onClick={onContinue}
          disabled={imp.rows.length === 0}
          data-testid="crew-list-continue"
        >
          Continue to services
        </Button>
        <Button variant="ghost" onClick={onDiscard} data-testid="crew-list-discard">
          Discard
        </Button>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- Services */

function ServiceCard({
  testId,
  title,
  body,
  on,
  onToggle,
  children,
}: {
  testId: string;
  title: string;
  body: string;
  on: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0" data-service-on={on}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-bold">{title}</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">{body}</p>
        </div>
        <span data-testid={testId} className="inline-flex shrink-0">
          <Toggle pressed={on} onToggle={onToggle} label={title} />
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function ServicesStep({
  rows,
  choices,
  rooms,
  onChoices,
  onRooms,
  onBack,
  onContinue,
  onOpenSection,
}: {
  rows: CrewRow[];
  choices: ServiceChoices;
  rooms: number | null;
  onChoices: (next: ServiceChoices) => void;
  onRooms: (n: number | null) => void;
  onBack: () => void;
  onContinue: () => void;
  onOpenSection: (id: CrewSectionId) => void;
}) {
  const loi = planLoi(rows);
  const onSigners = rows.filter((r) => r.movement === 'on').length;
  const hotel = planHotel(rows, choices.hotelNights);
  const roomCount = rooms ?? hotel.rooms;
  const hotelName = supplierById(choices.hotelId)?.name ?? 'a GAC-vetted hotel';
  const taxis = planTaxis(rows, choices.port);
  const set = <K extends keyof ServiceChoices>(k: K, v: ServiceChoices[K]) =>
    onChoices({ ...choices, [k]: v });

  return (
    <div data-testid="crew-list-services">
      <h3 className="font-display text-[17px] font-bold">What do you need for this crew?</h3>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        <ServiceCard
          testId="service-loi"
          title={CREW_SERVICE_CARDS.loi.title}
          body={CREW_SERVICE_CARDS.loi.body}
          on={choices.loi}
          onToggle={() => set('loi', !choices.loi)}
        >
          <p className="text-[13px] font-semibold" data-testid="service-loi-count">
            {onSigners === 0
              ? 'No on-signers on this list'
              : plural(loi.crew.length, 'visa-national on-signer')}
          </p>
          {loi.crew.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5 text-[12.5px] text-ink-soft">
              {loi.crew.map((r) => (
                <li key={r.id}>
                  {formatCrewName(r.familyName, r.forenames)}
                  {r.visaNational === null ? ' · visa status not stated, letter offered' : ''}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-[12.5px] text-ink-soft">
            Not sure who needs one? The{' '}
            <button
              type="button"
              onClick={() => onOpenSection('immigration')}
              className={LINK_BUTTON}
              data-testid="crew-list-immigration-link"
            >
              Immigration checklist
            </button>{' '}
            settles it.
          </p>
        </ServiceCard>

        <ServiceCard
          testId="service-hotels"
          title={CREW_SERVICE_CARDS.hotels.title}
          body={CREW_SERVICE_CARDS.hotels.body}
          on={choices.hotels}
          onToggle={() => set('hotels', !choices.hotels)}
        >
          <fieldset className="border-0 p-0" disabled={!choices.hotels}>
            <legend className="sr-only">Hotel, nights and rooms</legend>
            <label className={LABEL}>
              Hotel
              <select
                value={choices.hotelId}
                onChange={(e) => set('hotelId', e.target.value)}
                className={INPUT}
                data-testid="service-hotel-id"
              >
                {HOTELS.map((h) => {
                  const bookable = isBookable(h.certs);
                  return (
                    <option key={h.id} value={h.id} disabled={!bookable}>
                      {h.name}
                      {bookable ? '' : ' — blocked by SVS'}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className={LABEL}>
                Nights
                <input
                  type="number"
                  min={1}
                  max={14}
                  step={1}
                  inputMode="numeric"
                  value={choices.hotelNights}
                  onChange={(e) =>
                    set(
                      'hotelNights',
                      Math.min(14, Math.max(1, Math.floor(Number(e.target.value) || 1))),
                    )
                  }
                  className={INPUT}
                  data-testid="service-hotel-nights"
                />
              </label>
              <label className={LABEL}>
                Rooms
                <input
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  inputMode="numeric"
                  value={roomCount}
                  onChange={(e) => {
                    const n = Math.floor(Number(e.target.value));
                    onRooms(Number.isFinite(n) && n >= 1 ? Math.min(99, n) : null);
                  }}
                  className={INPUT}
                  data-testid="service-hotel-rooms"
                />
              </label>
            </div>
          </fieldset>
          <p className="mt-2 text-[13px] font-semibold" data-testid="service-hotel-line">
            {plural(roomCount, 'room')} × {plural(hotel.nights, 'night')} at {hotelName}
          </p>
          <p className="mt-1 text-[12px] text-ink-soft">{HOTEL_AVAILABILITY_CAVEAT}</p>
        </ServiceCard>

        <ServiceCard
          testId="service-taxis"
          title={CREW_SERVICE_CARDS.taxis.title}
          body={CREW_SERVICE_CARDS.taxis.body}
          on={choices.taxis}
          onToggle={() => set('taxis', !choices.taxis)}
        >
          <fieldset className="border-0 p-0" disabled={!choices.taxis}>
            <legend className="sr-only">Port for the runs</legend>
            <label className={LABEL}>
              Port
              <select
                value={choices.port}
                onChange={(e) => set('port', e.target.value)}
                className={INPUT}
                data-testid="service-taxi-port"
              >
                {TRANSFER_PORTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <p className="mt-2 text-[13px] font-semibold" data-testid="service-taxi-line">
            {plural(taxis.runs.length, 'run')} for {plural(rows.length, 'crew member', 'crew')}
          </p>
        </ServiceCard>
      </div>

      <div className="relative mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[760px] border-collapse text-[13px]" data-testid="taxi-runs">
          <caption className="px-2.5 py-2 text-left text-[12.5px] font-bold">
            Taxi runs, grouped from the list
          </caption>
          <thead className="bg-paper">
            <tr>
              <th scope="col" className={TH}>
                Flight
              </th>
              <th scope="col" className={TH}>
                From / to
              </th>
              <th scope="col" className={TH}>
                Date
              </th>
              <th scope="col" className={TH}>
                Time
              </th>
              <th scope="col" className={TH}>
                Crew
              </th>
              <th scope="col" className={TH}>
                Timing
              </th>
              <th scope="col" className={TH}>
                Pick-up
              </th>
            </tr>
          </thead>
          <tbody>
            {taxis.runs.map((run) => (
              <tr
                key={run.key}
                className="border-t border-line"
                data-testid="taxi-run"
                data-tracked={run.tracked}
              >
                <td className={`${TD} font-semibold`}>
                  {run.flightNumber || 'No flight given'}
                  <span className="block text-[11.5px] font-normal text-ink-soft">
                    {run.direction === 'arriving' ? 'Arriving' : 'Departing'}
                  </span>
                </td>
                <td className={TD}>{run.flightFrom || '—'}</td>
                <td className={`${TD} whitespace-nowrap`}>{run.flightDate || '—'}</td>
                <td className={`${TD} whitespace-nowrap`}>{run.flightTime || '—'}</td>
                <td className={TD}>{run.crew.length}</td>
                <td className={TD}>
                  {run.tracked ? (
                    <Pill tone="verified">tracked</Pill>
                  ) : (
                    <Pill tone="neutral">from itinerary</Pill>
                  )}
                </td>
                <td className={`${TD} font-display font-bold whitespace-nowrap`}>
                  {run.pickupTime || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* The runs above show feed-derived times, so the feed's honesty line
          renders here too — someone who plans taxis from the crew list never
          opens the Taxis planner where it otherwise lives. */}
      <p className="mt-2 text-[12px] text-ink-soft" data-testid="crew-list-feed-note">
        {FLIGHT_FEED_NOTE}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onBack} data-testid="crew-list-back-to-list">
          Back to the list
        </Button>
        <Button onClick={onContinue} data-testid="crew-list-to-submit">
          Continue to submit
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Submit */

function SubmitStep({
  rows,
  choices,
  rooms,
  vesselId,
  port,
  ack,
  onVessel,
  onPort,
  onAck,
  onBack,
  onSubmit,
}: {
  rows: CrewRow[];
  choices: ServiceChoices;
  rooms: number | null;
  vesselId: string;
  port: string;
  ack: boolean;
  onVessel: (id: string, callPort: string | null) => void;
  onPort: (p: string) => void;
  onAck: (v: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const lines = serviceSummary({ ...choices, hotelRooms: rooms ?? undefined }, rows);
  return (
    <Card data-testid="crew-list-submit-step">
      <p className="text-[13.5px] font-bold">Submit the crew list to GAC</p>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">
        {plural(rows.length, 'crew member', 'crew')} and the services you chose go to GAC’s agency
        team for this crew change. This is the only step that sends anything.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Vessel
          <select
            value={vesselId}
            onChange={(e) => {
              const v = VESSELS.find((x) => x.id === e.target.value);
              onVessel(e.target.value, v && PORT_SET.has(v.port) ? v.port : null);
            }}
            className={INPUT}
            data-testid="crew-list-vessel"
          >
            {VESSELS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.port}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Port of crew change
          <select
            value={port}
            onChange={(e) => onPort(e.target.value)}
            className={INPUT}
            data-testid="crew-list-port"
          >
            {CREW_PORTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul
        className="mt-3 space-y-1 rounded-lg border border-line bg-paper px-3 py-2 text-[13px]"
        data-testid="crew-list-service-summary"
      >
        {lines.length === 0 ? (
          <li>
            No services chosen — GAC receives the list for the crew change and your agent picks it
            up.
          </li>
        ) : (
          lines.map((l) => <li key={l}>{l}</li>)
        )}
      </ul>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px]">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => onAck(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-sea"
          data-testid="crew-list-ack"
        />
        <span>{CREW_DATA_NOTICE.acknowledgement}</span>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onBack} data-testid="crew-list-back-to-services">
          Back to services
        </Button>
        <Button onClick={onSubmit} disabled={!ack} data-testid="crew-list-submit">
          Submit crew list to GAC
        </Button>
        <span className="text-[12.5px] text-ink-soft">
          GAC confirms receipt, then arranges what you chose.
        </span>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------- Submitted lists */

function focusRequestCard(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-testid="crew-request-${id}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'start' });
  el.focus();
}

function CrewListCard({ sub, onDelete }: { sub: CrewListSubmission; onDelete: () => void }) {
  const advance = useCrewChange((s) => s.advanceCrewList);
  const [crewOpen, setCrewOpen] = useState(false);
  const vessel = VESSELS.find((v) => v.id === sub.vesselId)?.name ?? '—';
  const action = simulateCrewListAction(sub.stage);
  const deletion = deletionAvailability(sub);
  const present = hasPersonalData(sub);
  const purgeAt = purgeAtIso(sub);
  const lines = storedServiceLines(sub.services);

  return (
    <Card
      tabIndex={-1}
      data-testid={`crew-list-${sub.id}`}
      data-stage={sub.stage}
      data-personal-data={present ? 'present' : 'deleted'}
      className="outline-none focus-visible:ring-2 focus-visible:ring-sea"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral">Crew list</Pill>
            <span className="text-[12px] font-semibold tracking-[0.02em] text-ink-soft">
              {sub.id} · {sub.createdAt}
            </span>
          </div>
          <h3 className="mt-1 font-display text-[17px] font-bold break-words">{sub.fileName}</h3>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {vessel} · {sub.port}
          </p>
        </div>
        <div className="max-w-full [&>span]:whitespace-normal" data-testid="crew-list-stage">
          <Pill tone={stageToneIn(CREW_LIST_STAGES, sub.stage)}>
            {sub.stage === 'Crew change complete' ? '✓ ' : ''}
            {sub.stage}
          </Pill>
        </div>
      </div>

      <StageTrack stages={CREW_LIST_STAGES} current={sub.stage} />

      <p className="mt-3 text-[13px]">
        <strong>{plural(sub.crewCount, 'crew member', 'crew')}</strong> ·{' '}
        {plural(sub.onCount, 'on-signer')} · {plural(sub.offCount, 'off-signer')}
      </p>
      <ul className="mt-1 space-y-0.5 text-[12.5px] text-ink-soft">
        {lines.length === 0 ? <li>No services chosen</li> : lines.map((l) => <li key={l}>{l}</li>)}
      </ul>

      {present && sub.crew ? (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setCrewOpen((v) => !v)}
            aria-expanded={crewOpen}
            aria-controls={`crew-list-crew-${sub.id}`}
            className={`${LINK_BUTTON} text-[12.5px]`}
            data-testid="crew-list-show-crew"
          >
            {crewOpen ? 'Hide crew' : `Show crew (${sub.crew.length})`}
          </button>
          {crewOpen ? (
            <ul
              id={`crew-list-crew-${sub.id}`}
              className="mt-1.5 grid gap-x-6 gap-y-0.5 text-[12.5px] sm:grid-cols-2"
              data-testid="crew-list-crew"
            >
              {sub.crew.map((r) => (
                <li key={r.id} className="min-w-0">
                  {formatCrewName(r.familyName, r.forenames) || '—'}
                  <span className="text-ink-soft">
                    {' '}
                    · {r.passportNumber ? maskPassport(r.passportNumber) : 'no passport'} ·{' '}
                    {r.movement === 'on' ? 'on' : r.movement === 'off' ? 'off' : 'not stated'}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {sub.linkedRequestIds.length > 0 ? (
        <p className="mt-2 text-[12.5px] text-ink-soft" data-testid="crew-list-linked">
          LOIs raised:{' '}
          {sub.linkedRequestIds.map((id, i) => (
            <span key={id}>
              {i ? ' · ' : ''}
              <button
                type="button"
                onClick={() => focusRequestCard(id)}
                className={LINK_BUTTON}
                aria-label={`Go to ${id} in the letters list below`}
              >
                {id}
              </button>
            </span>
          ))}{' '}
          in the letters list below.
        </p>
      ) : null}

      <p
        className={`mt-3 rounded-lg border-l-4 px-3 py-2 text-[12.5px] ${
          present
            ? 'border-sea bg-sea-soft text-sea'
            : 'border-success bg-success-soft text-success'
        }`}
        data-testid="crew-list-data-state"
      >
        {present
          ? `Personal data held on this device and with GAC for this crew change · deleted automatically ${
              purgeAt
                ? `on ${shortDate(purgeAt)} (thirty days after completion)`
                : 'thirty days after the crew change completes'
            }`
          : `✓ Personal data deleted ${sub.personalDataDeletedAt ?? ''} · GAC confirmed deletion (simulated)`}
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        {action ? (
          <Button
            variant="ghost"
            onClick={() => advance(sub.id, action.steps)}
            data-testid="crew-list-advance"
          >
            {action.label}
          </Button>
        ) : null}
        {deletion.allowed ? (
          <Button variant="ghost" onClick={onDelete} data-testid="crew-list-delete">
            {deletion.label}
          </Button>
        ) : null}
        {deletion.note ? (
          <span className="max-w-[560px] text-[12.5px] text-ink-soft">{deletion.note}</span>
        ) : null}
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- Section */

export function CrewListSection({ onOpenSection }: { onOpenSection: (id: CrewSectionId) => void }) {
  const crewLists = useCrewChange((s) => s.crewLists);
  const addCrewList = useCrewChange((s) => s.addCrewList);
  const deleteCrewData = useCrewChange((s) => s.deleteCrewData);
  const deleteAllCrewData = useCrewChange((s) => s.deleteAllCrewData);
  const pushToast = useApp((s) => s.pushToast);

  // The draft — never persisted.
  const [imp, setImp] = useState<CrewImport | null>(null);
  const [step, setStep] = useState<DraftStep>('check');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassports, setShowPassports] = useState(false);
  const [choices, setChoices] = useState<ServiceChoices>(() => defaultChoices([], ''));
  const [rooms, setRooms] = useState<number | null>(null);
  const [vesselId, setVesselId] = useState<string>(VESSELS[0]?.id ?? '');
  const [port, setPort] = useState<string>(CREW_PORTS[0]);
  const [ack, setAck] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [deleteFor, setDeleteFor] = useState<string | 'all' | null>(null);
  const focusCardNext = useRef<string | null>(null);

  const rows = imp?.rows ?? [];
  const draftStep: DraftStep | 'upload' = imp ? step : 'upload';
  const currentStep = imp ? STEP_INDEX[step] : crewLists.length > 0 ? 4 : 0;
  const withData = crewLists.filter(hasPersonalData).length;

  // After Submit the new card is where the eye should go.
  useEffect(() => {
    const id = focusCardNext.current;
    if (!id) return;
    focusCardNext.current = null;
    const el = document.querySelector<HTMLElement>(`[data-testid="crew-list-${id}"]`);
    el?.scrollIntoView({ block: 'start' });
    el?.focus();
  }, [crewLists]);

  function startDraft(next: CrewImport) {
    const vessel = vesselFromRows(next.rows);
    const callPort = portFromRows(next.rows, vessel);
    setImp(next);
    setStep('check');
    setShowPassports(false);
    setChoices(defaultChoices(next.rows, callPort));
    setRooms(null);
    setVesselId(vessel);
    setPort(callPort);
    setAck(false);
    setAnnounce(`Read ${plural(next.rows.length, 'crew member', 'crew')} from ${next.fileName}`);
  }

  async function importBytes(buf: ArrayBuffer, fileName: string) {
    setBusy(true);
    setError(null);
    try {
      const sheets = await parseSpreadsheet(buf, fileName);
      const sheet = sheets.find((s) => s.rows.length > 1) ?? sheets[0];
      if (!sheet) throw new Error(`No sheets were found in ${fileName}.`);
      const next = importFromTable(fileName, sheet.name, sheet.rows);
      if (next.rows.length === 0) {
        throw new Error(
          `No crew were found in ${fileName} — the sheet needs a header row with at least one crew member under it.`,
        );
      }
      startDraft(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : `${fileName} could not be read.`);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      await importBytes(buf, file.name);
    } catch {
      setError(`${file.name} could not be read.`);
    }
  }

  function onDemo() {
    // The demo takes the same road as a real file: written as .xlsx, then parsed.
    const bytes = writeXlsx({
      name: 'Crew list',
      rows: [CREW_TEMPLATE_HEADERS, ...DEMO_CREW_ROWS],
    });
    void importBytes(toArrayBuffer(bytes), DEMO_FILE_NAME);
  }

  function discard() {
    setImp(null);
    setError(null);
    setAnnounce('Crew list discarded — nothing was sent.');
  }

  /**
   * Removing a row unmounts the button that was pressed, so the change is
   * announced and focus moves to the next row's remove button (or to Discard
   * when the table empties — Continue is disabled then), rather than being
   * dropped at the top of the page.
   */
  function removeRow(rowId: string) {
    if (!imp) return;
    const row = imp.rows.find((r) => r.id === rowId);
    const name = row ? formatCrewName(row.familyName, row.forenames) : '';
    const index = imp.rows.findIndex((r) => r.id === rowId);
    const next = withoutRow(imp, rowId);
    setImp(next);
    setAnnounce(
      `Removed ${name || 'crew member'} — ${plural(next.rows.length, 'crew member', 'crew')} left on the list`,
    );
    setTimeout(() => {
      const buttons = document.querySelectorAll<HTMLElement>('[data-testid="crew-remove"]');
      if (buttons.length > 0) buttons[Math.min(Math.max(index, 0), buttons.length - 1)]?.focus();
      else document.querySelector<HTMLElement>('[data-testid="crew-list-discard"]')?.focus();
    }, 0);
  }

  function continueToServices() {
    if (!imp) return;
    // No on-signers, no letters — the toggle follows the list.
    if (planLoi(imp.rows).crew.length === 0) setChoices((c) => ({ ...c, loi: false }));
    setStep('services');
  }

  function submit() {
    if (!imp || !ack) return;
    const summary = summarise(imp.rows);
    const loiCount = planLoi(imp.rows).crew.length;
    const roomCount = rooms ?? planHotel(imp.rows, choices.hotelNights).rooms;
    const runs = planTaxis(imp.rows, choices.port).runs.length;
    const services: CrewListSubmission['services'] = {
      loi: choices.loi,
      hotels: choices.hotels,
      taxis: choices.taxis,
      hotelId: choices.hotelId,
      hotelNights: choices.hotelNights,
      loiCount: choices.loi ? loiCount : 0,
      rooms: choices.hotels ? roomCount : 0,
      runs: choices.taxis ? runs : 0,
    };
    const id = addCrewList(
      {
        vesselId,
        port,
        fileName: imp.fileName,
        crewCount: summary.total,
        onCount: summary.on,
        offCount: summary.off,
        services,
        crew: imp.rows,
      },
      { raiseLoi: choices.loi, vesselId, port },
    );
    pushToast(
      `Crew list ${id} submitted — ${plural(summary.total, 'crew member', 'crew')}, ${servicesPhrase(services)}. GAC confirms receipt, then arranges what you chose.`,
    );
    focusCardNext.current = id;
    setImp(null);
    setAck(false);
    setAnnounce(`Crew list ${id} submitted`);
  }

  const closeDelete = useCallback(() => setDeleteFor(null), []);

  function confirmDelete() {
    if (deleteFor === null) return;
    // Confirming unmounts both the dialog and the Delete button that opened
    // it, so the focus restore has nowhere to land — send focus to the
    // affected card instead (the existing effect on crewLists does the work).
    focusCardNext.current =
      deleteFor === 'all' ? (crewLists.find(hasPersonalData)?.id ?? null) : deleteFor;
    if (deleteFor === 'all') {
      const n = withData;
      deleteAllCrewData();
      pushToast(
        `Crew data for ${plural(n, 'list')} deleted from this device — GAC asked to delete its ${n === 1 ? 'copy' : 'copies'} (simulated confirmation).`,
      );
    } else {
      deleteCrewData(deleteFor);
      pushToast(
        `Crew data for ${deleteFor} deleted from this device — GAC asked to delete its copy (simulated confirmation).`,
      );
    }
    setDeleteFor(null);
  }

  return (
    <div data-testid="section-crew-list" className="min-w-0 space-y-4">
      <Stepper current={currentStep} />
      <p role="status" aria-live="polite" className="sr-only" data-testid="crew-list-status">
        {announce}
      </p>

      <DataNotice
        collapsible={draftStep !== 'upload'}
        open={noticeOpen}
        onToggle={() => setNoticeOpen((v) => !v)}
      />

      <p
        id="crew-list-illustrative"
        className="rounded-lg border-l-4 border-warn bg-warn-soft px-3 py-2 text-[12.5px] font-semibold text-warn"
        data-testid="crew-list-illustrative"
      >
        {CREW_LIST_ILLUSTRATIVE}
      </p>

      {draftStep === 'upload' ? (
        <UploadStep busy={busy} error={error} onFile={onFile} onDemo={onDemo} />
      ) : null}

      {imp && draftStep === 'check' ? (
        <CheckStep
          imp={imp}
          showPassports={showPassports}
          onShowPassports={() => setShowPassports((v) => !v)}
          onChange={setImp}
          onRemove={removeRow}
          onContinue={continueToServices}
          onDiscard={discard}
        />
      ) : null}

      {imp && draftStep === 'services' ? (
        <ServicesStep
          rows={rows}
          choices={choices}
          rooms={rooms}
          onChoices={setChoices}
          onRooms={setRooms}
          onBack={() => setStep('check')}
          onContinue={() => setStep('submit')}
          onOpenSection={onOpenSection}
        />
      ) : null}

      {imp && draftStep === 'submit' ? (
        <SubmitStep
          rows={rows}
          choices={choices}
          rooms={rooms}
          vesselId={vesselId}
          port={port}
          ack={ack}
          onVessel={(id, callPort) => {
            setVesselId(id);
            if (callPort) {
              setPort(callPort);
              if (TAXI_PORT_SET.has(callPort)) setChoices((c) => ({ ...c, port: callPort }));
            }
          }}
          onPort={(p) => {
            setPort(p);
            if (TAXI_PORT_SET.has(p)) setChoices((c) => ({ ...c, port: p }));
          }}
          onAck={setAck}
          onBack={() => setStep('services')}
          onSubmit={submit}
        />
      ) : null}

      {crewLists.length > 0 ? (
        <section aria-labelledby="crew-lists-heading" data-testid="crew-lists">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="crew-lists-heading" className="font-display text-[17px] font-bold">
              Submitted crew lists · {crewLists.length}
            </h3>
            <p className="text-[12.5px] text-ink-soft" data-testid="crew-lists-summary">
              {withData === 0
                ? 'Personal data deleted from every list'
                : `${plural(withData, 'list')} still ${withData === 1 ? 'holds' : 'hold'} personal data`}
            </p>
          </div>
          <div className="mt-3 space-y-4">
            {crewLists.map((sub) => (
              <CrewListCard key={sub.id} sub={sub} onDelete={() => setDeleteFor(sub.id)} />
            ))}
          </div>
          {withData > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleteFor('all')}
                data-testid="crew-list-delete-all"
              >
                Delete all crew data
              </Button>
              <span className="text-[12.5px] text-ink-soft">
                Every list that still holds personal data, in one go. References, counts and
                services stay.
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      <Modal open={deleteFor !== null} onClose={closeDelete} labelledBy="crew-delete-title">
        <div data-testid="crew-delete-dialog" data-scope={deleteFor === 'all' ? 'all' : 'one'}>
          <h2 id="crew-delete-title" className="font-display text-[19px] font-bold">
            {deleteFor === 'all' ? 'Delete all crew data?' : DELETE_CONFIRM.title}
          </h2>
          <p className="mt-2 text-[13.5px] text-ink-soft">
            {deleteFor === 'all'
              ? `${plural(withData, 'list')} still ${withData === 1 ? 'holds' : 'hold'} personal data. ${DELETE_CONFIRM.bodyAll}`
              : DELETE_CONFIRM.body}
          </p>
          <div className="mt-3 grid gap-3 text-[12.5px] sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-paper p-3">
              <p className="font-bold">Removed</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-soft">
                <li>Names and ranks</li>
                <li>Passport numbers and expiry dates</li>
                <li>Dates of birth and nationality</li>
                <li>Flight details</li>
                <li>The details on any LOI raised from the list</li>
              </ul>
            </div>
            <div className="rounded-lg border border-line bg-paper p-3">
              <p className="font-bold">Kept</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-soft">
                <li>The reference and its dates</li>
                <li>The crew count</li>
                <li>The services chosen</li>
                <li>The vessel and port</li>
                <li>The file name</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
            <Button variant="ghost" onClick={closeDelete} data-testid="crew-delete-cancel">
              {DELETE_CONFIRM.cancel}
            </Button>
            <Button onClick={confirmDelete} data-testid="crew-delete-confirm">
              {DELETE_CONFIRM.confirm}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
