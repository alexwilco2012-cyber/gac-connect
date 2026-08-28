import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CertChip } from '../../components/ui/CertChip';
import { Chip } from '../../components/ui/Chip';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { BetaPill, Pill, StatusPill } from '../../components/ui/Pill';
import { StageTrack } from '../../components/ui/StageTrack';
import { StatCard } from '../../components/ui/StatCard';
import {
  CERT_INTRO,
  CERT_NOTICE,
  NO_NAMES_NOTE,
  NOT_THE_AUTHORITY_NOTE,
  SEED_CREW,
  SWEEP_NOTE,
} from '../../data/certification';
import { VESSELS } from '../../data/vessels';
import {
  CERT_FILTERS,
  RENEWAL_STAGES,
  SWEEP_TIER,
  attentionList,
  certsOf,
  counts,
  crewStatus,
  expiryLabel,
  expiryPhrase,
  horizonOf,
  isRouted,
  needsAttention,
  openRenewals,
  register,
  renewalAction,
  renewalStageTone,
  sweepCandidates,
} from '../../lib/certification';
import type { CertEntry, CertFilter, CrewMember, Renewal } from '../../lib/certification';
import { useApp } from '../../store/app';
import { useCertification } from '../../store/certification';

/**
 * Crew certification tracking — a beta preview with a working register behind
 * it. The screen still carries the scope banner first, because the service is
 * a direction rather than an offering; what follows shows how it would read.
 *
 * The point being demonstrated is that the platform already owns the hard
 * part. The expiry engine is the SVS one (`lib/svs`, via `lib/certification`),
 * so 90 / 30 / 7 means the same thing here as it does on a supplier, and the
 * chips are the same chips. Only the subject changes.
 *
 * Crew are held by reference and rank. That is a decision, stated on the
 * screen: a register of named seafarers is personal data, and the tracking
 * works without it.
 */

const VESSEL_NAME: Record<string, string> = Object.fromEntries(VESSELS.map((v) => [v.id, v.name]));

/* ----------------------------------------------------------- Register rows */

function CrewRow({
  member,
  renewals,
  onRoute,
}: {
  member: CrewMember;
  renewals: readonly Renewal[];
  onRoute: (entry: CertEntry) => void;
}) {
  const status = crewStatus(member);
  const certs = certsOf(member);
  const attention = member.certs.filter(needsAttention);

  return (
    <Card
      className="min-w-0"
      data-testid={member.id}
      data-status={status}
      data-vessel={member.vesselId}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[16px] font-bold">{member.ref}</h3>
            <Pill tone="neutral">{member.rank}</Pill>
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">{VESSEL_NAME[member.vesselId]}</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-2.5 -mx-0.5 flex flex-wrap">
        {certs.map((c) => (
          <CertChip key={c.name} cert={c} />
        ))}
      </div>

      {attention.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {attention.map((cert) => {
            const routed = isRouted(renewals, member.id, cert.name);
            return (
              <li
                key={cert.name}
                className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-line bg-paper px-3 py-2"
              >
                <span className="text-[12.5px] text-ink-soft">
                  <strong className="text-ink">{cert.name}</strong> — {expiryPhrase(cert)} ·{' '}
                  {expiryLabel(cert.daysToExpiry)}
                  {horizonOf(cert) !== null ? ` · ${horizonOf(cert)}-day alert` : ''}
                </span>
                {routed ? (
                  <Pill tone="info">Renewal routed</Pill>
                ) : (
                  <Button
                    variant="ghost"
                    className="min-h-[36px] px-3 py-1 text-[12.5px]"
                    onClick={() => onRoute({ member, cert })}
                    data-testid="route-renewal"
                  >
                    Route renewal
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}

/* -------------------------------------------------------------- Renewals */

function RenewalCard({ renewal }: { renewal: Renewal }) {
  const advance = useCertification((s) => s.advance);
  const pushToast = useApp((s) => s.pushToast);
  const action = renewalAction(renewal.stage);
  const done = renewal.stage === 'Certificate updated';

  return (
    <Card className="min-w-0" data-testid={`renewal-${renewal.id}`} data-stage={renewal.stage}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral">
              {renewal.automatic ? 'Routed by the platform' : 'Routed by you'}
            </Pill>
            <span className="text-[12px] font-semibold tracking-[0.02em] text-ink-soft">
              {renewal.id} · {renewal.createdAt}
            </span>
          </div>
          <h3 className="mt-1 font-display text-[16px] font-bold">
            {renewal.certName} — {renewal.crewRef}
          </h3>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {renewal.rank} · {VESSEL_NAME[renewal.vesselId]} · to {renewal.provider}
          </p>
        </div>
        <div className="max-w-full [&>span]:whitespace-normal">
          <Pill tone={renewalStageTone(renewal.stage)}>
            {done ? '✓ ' : ''}
            {renewal.stage}
          </Pill>
        </div>
      </div>

      <StageTrack stages={RENEWAL_STAGES} current={renewal.stage} />

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        {action ? (
          <Button
            variant="ghost"
            onClick={() => advance(renewal.id, action.steps)}
            data-testid="renewal-advance"
          >
            {action.label}
          </Button>
        ) : (
          <Button
            onClick={() =>
              pushToast('Illustrative — the updated certificate would attach to the record here.')
            }
          >
            Certificate on file
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- Screen */

export default function CertificationBeta() {
  const pushToast = useApp((s) => s.pushToast);
  const renewals = useCertification((s) => s.renewals);
  const route = useCertification((s) => s.route);
  const sweep = useCertification((s) => s.sweep);
  const reset = useCertification((s) => s.reset);
  const [vesselId, setVesselId] = useState<string>('all');
  const [filter, setFilter] = useState<CertFilter>('all');

  const crew = SEED_CREW;
  const totals = counts(crew);
  const rows = register(crew, vesselId, filter);
  const pending = sweepCandidates(crew, renewals);
  const open = openRenewals(renewals);
  const soonest = attentionList(crew)[0];

  function onRoute(entry: CertEntry) {
    const id = route(entry);
    if (!id) {
      pushToast(`${entry.cert.name} for ${entry.member.ref} is already routed.`);
      return;
    }
    pushToast(
      `${id} raised — ${entry.cert.name} for ${entry.member.ref}. Illustrative: nothing is sent to a provider.`,
    );
  }

  function onSweep() {
    const raised = sweep(pending);
    pushToast(
      raised === 0
        ? `Nothing to route — everything inside ${SWEEP_TIER} days is already with a provider.`
        : `${raised} ${raised === 1 ? 'renewal' : 'renewals'} routed. Illustrative: nothing is sent to a provider.`,
    );
  }

  return (
    <div className="screen-enter">
      <Eyebrow>Future service preview</Eyebrow>
      <h1 className="mt-1 font-display text-2xl font-bold">
        Crew Certification Tracking
        <BetaPill />
      </h1>

      {/* Mandatory scope banner — verbatim skeleton from 03 §3.2 */}
      <div
        data-tour="beta"
        className="mt-4 flex items-start gap-3.5 rounded-xl border border-gold-bright/30 bg-gradient-to-r from-gold-bright/12 to-gold-bright/4 px-4.5 py-3.5"
      >
        <span aria-hidden="true" className="text-[18px] text-gold-deep">
          ⓘ
        </span>
        <p className="text-[13px] text-ink-soft">
          <strong className="text-ink">Beta preview · not in current scope.</strong> Offshore
          certification as a service line is a strategic idea under consideration, not an
          established offering. This preview shows the tracking layer the platform could host once
          live — it would require its own business case.
        </p>
      </div>

      <div className="mt-5 rounded-[14px] bg-gradient-to-b from-[#04101F] via-[#0B2138] to-ink p-8 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-bright/35 bg-gold-bright/14 px-3 py-1 text-[11.5px] font-bold tracking-[0.06em] text-gold-bright uppercase">
          ⏲ BETA · future service preview
        </span>
        <h2 className="mt-3.5 font-display text-[24px] font-bold">
          Every credential, every crew member, one expiry view
        </h2>
        <p className="mt-2 max-w-[640px] text-[14px] text-[#B9C8D6]">
          BOSIET, HUET, GWO, ENG1 and sea survival tracked at vessel level — with renewals routed to
          training providers before anything lapses. The register below works: filter it, route a
          renewal, and follow it to the certificate coming back.
        </p>
      </div>

      {/* ------------------------------------------------------- The register */}

      <section className="mt-6" aria-label="Crew certification register">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Register</Eyebrow>
            <h2 className="mt-0.5 font-display text-[19px] font-bold">
              What is on the vessels today
            </h2>
          </div>
          <Pill tone="neutral">Illustrative</Pill>
        </div>
        <p className="mt-1.5 max-w-[760px] text-[13.5px] text-ink-soft">{CERT_INTRO}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Crew tracked" value={String(totals.crew)} icon="ship" />
          <StatCard
            label="Credentials held"
            value={String(totals.certificates)}
            icon="file-check"
          />
          <StatCard
            label="Inside the 90-day horizon"
            value={String(totals.expiring)}
            delta={soonest ? `soonest ${expiryPhrase(soonest.cert)}` : 'nothing expiring'}
            deltaTone="info"
            icon="timer"
          />
          <StatCard
            label="Lapsed"
            value={String(totals.lapsed)}
            delta={totals.lapsed === 0 ? 'all in date' : 'renewal overdue'}
            deltaTone="info"
            icon="triangle-alert"
          />
        </div>

        <p className="mt-4 max-w-[760px] rounded-brand border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
          {NO_NAMES_NOTE}
        </p>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by vessel">
          <Chip pressed={vesselId === 'all'} onClick={() => setVesselId('all')}>
            All vessels
          </Chip>
          {VESSELS.map((v) => (
            <Chip key={v.id} pressed={vesselId === v.id} onClick={() => setVesselId(v.id)}>
              {v.name}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Filter by expiry">
          {CERT_FILTERS.map((f) => (
            <Chip key={f.id} pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>

        <p className="mt-3 text-[12.5px] text-ink-soft" data-testid="register-summary">
          {rows.length} of {crew.length} crew shown · soonest expiry first
        </p>

        <div className="mt-3 grid gap-4 lg:grid-cols-2" data-testid="cert-register">
          {rows.map((member) => (
            <CrewRow key={member.id} member={member} renewals={renewals} onRoute={onRoute} />
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="mt-3 rounded-brand border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
            Nothing matches that filter — everything on that selection is in date.
          </p>
        ) : null}
      </section>

      {/* -------------------------------------------------------- Renewals */}

      <section className="mt-8" aria-label="Renewals">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Renewals · {renewals.length}</Eyebrow>
            <h2 className="mt-0.5 font-display text-[19px] font-bold">Routed to a provider</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] text-ink-soft" data-testid="renewals-summary">
              {renewals.length === 0
                ? 'No renewals routed'
                : `${open.length} open · ${renewals.length - open.length} closed`}
            </span>
            <Button variant="ghost" onClick={reset}>
              Reset renewals
            </Button>
          </div>
        </div>

        <Card className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-[15.5px] font-bold">
                Route everything inside {SWEEP_TIER} days
              </h3>
              <p className="mt-1 max-w-[640px] text-[13px] text-ink-soft">{SWEEP_NOTE}</p>
            </div>
            <Button onClick={onSweep} data-testid="renewal-sweep">
              {pending.length === 0
                ? 'Nothing to route'
                : `Route ${pending.length} ${pending.length === 1 ? 'renewal' : 'renewals'}`}
            </Button>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-soft">{CERT_NOTICE}</p>
        </Card>

        <div className="mt-4 space-y-4" data-testid="cert-renewals">
          {renewals.map((r) => (
            <RenewalCard key={r.id} renewal={r} />
          ))}
        </div>
        {renewals.length === 0 ? (
          <p className="mt-3 rounded-brand border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
            No renewals routed yet — route one from the register above, or run the sweep.
          </p>
        ) : null}

        <p className="mt-4 max-w-[760px] rounded-brand border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
          {NOT_THE_AUTHORITY_NOTE}
        </p>
      </section>
    </div>
  );
}
