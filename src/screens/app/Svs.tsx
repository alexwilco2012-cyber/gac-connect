import { useCallback, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { Icon } from '../../components/ui/Icon';
import { MEDIAN_VERIFY_LABEL, SLA_DAYS } from '../../data/svsDesk';
import { SUPPLIERS } from '../../data/suppliers';
import { complianceWatch, watchLine } from '../../lib/svs';
import { evidenceOpenCount, onboardingOpenCount, slaState } from '../../lib/svsDesk';
import { useSvsDesk } from '../../store/svsDesk';
import { EvidenceQueue } from './svs/EvidenceQueue';
import { InviteModal } from './svs/InviteModal';
import { Onboarding } from './svs/Onboarding';
import { Register, type SvsFilter } from './svs/Register';
import { SectionTabs, type SectionTab } from './svs/SectionTabs';
import { SvsKpis, type SvsKpi } from './svs/SvsKpis';
import { midSentence, refNumber } from './svs/ui';
import { useSvsSection } from './svs/useSvsSection';

/**
 * SVS — the Supplier Vetting System's desk (live dashboards, 23 Sep; spec §4.5).
 *
 * The register is still the front of the screen, exactly as before, and the
 * alerts banner stays directly under the header on every tab: it is tour stop
 * 11, and it is the one thing on the screen a client would recognise. Beside
 * the register sit the SVS team's two working queues — new suppliers moving
 * through onboarding, and certificate evidence sent in by suppliers — with
 * the four numbers the team runs on above them. The section lives in the URL
 * (`?section=onboarding`), so a reload or a shared link opens the same queue.
 *
 * Nothing here feeds `useNeedsYou`: the SVS team's queue is not the client's
 * "Waiting on you", and the bell never moves on an SVS decision.
 */
export default function Svs() {
  const [section, setSection] = useSvsSection();
  const applications = useSvsDesk((s) => s.applications);
  const evidence = useSvsDesk((s) => s.evidence);
  const [filter, setFilter] = useState<SvsFilter>('all');
  const [inviteOpen, setInviteOpen] = useState(false);

  const watch = complianceWatch(SUPPLIERS);
  const blocked = watch.filter((w) => w.status === 'blocked').length;
  const onboarding = onboardingOpenCount(applications);
  const overdue = applications.filter(
    (a) => a.outcome === 'open' && slaState(a).state === 'over',
  ).length;
  const toReview = evidenceOpenCount(evidence);
  const oldest = evidence
    .filter((e) => e.stage === 'submitted')
    .sort((a, b) => refNumber(a.id) - refNumber(b.id))[0];

  const kpis: SvsKpi[] = [
    {
      id: 'onboarding',
      label: 'In onboarding',
      value: String(onboarding),
      note: overdue
        ? `${overdue} past the ${SLA_DAYS}-day target`
        : `All inside the ${SLA_DAYS}-day target`,
      icon: 'user-plus',
    },
    {
      id: 'evidence',
      label: 'Evidence to review',
      value: String(toReview),
      note: oldest ? `Oldest sent ${midSentence(oldest.submittedAt)}` : 'Queue clear',
      icon: 'file-check',
    },
    {
      id: 'alerts',
      label: 'Compliance alerts',
      value: String(watch.length),
      note: `${blocked} blocked · ${watch.length - blocked} renewals due`,
      icon: 'triangle-alert',
      tone: 'warn',
    },
    {
      id: 'verify',
      label: 'Median time to verify',
      value: MEDIAN_VERIFY_LABEL,
      note: `Target ${SLA_DAYS} working days`,
      icon: 'clock',
    },
  ];

  const tabs: SectionTab[] = [
    { id: 'register', label: 'Register', icon: 'shield-check' },
    { id: 'onboarding', label: 'Onboarding', icon: 'user-plus', count: onboarding },
    { id: 'evidence', label: 'Evidence', labelTail: ' queue', icon: 'file-check', count: toReview },
  ];

  // Stable, so the invite modal's focus trap does not restart on each render.
  const closeInvite = useCallback(() => setInviteOpen(false), []);

  function invited() {
    setInviteOpen(false);
    setSection('onboarding');
  }

  return (
    <div className="screen-enter">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <Eyebrow>Supplier Vetting System · proprietary</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold">Compliance at a glance</h1>
          <p className="mt-1 max-w-[680px] text-[14px] text-ink-soft">
            Certification is a mandatory vetting field. Expiries trigger automatic alerts at 90, 30,
            and 7 days; lapsed suppliers cannot be booked.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="max-sm:w-full">
          <Icon name="user-plus" size={17} />
          Invite a supplier
        </Button>
      </div>

      {/* Derived from the supplier data (complianceWatch), never hand-counted
          — the same list feeds the dashboard and the top-bar bell. */}
      <div
        data-tour="svs"
        className="mt-4 rounded-lg border-l-4 border-warn bg-warn-soft px-4 py-3 text-[13.5px]"
      >
        <strong>{watch.length} alerts:</strong>{' '}
        {watch
          .map(
            (w) =>
              `${watchLine(w)} (${
                w.status === 'blocked'
                  ? 'booking blocked until evidence uploaded'
                  : 'renewal reminder sent'
              }).`,
          )
          .join(' ')}
      </div>

      <SvsKpis kpis={kpis} />

      <div className="mt-6">
        <SectionTabs
          tabs={tabs}
          current={section}
          onSelect={setSection}
          controls="svs-section-panel"
        />
      </div>

      <div id="svs-section-panel" className="mt-5">
        {section === 'onboarding' ? (
          <Onboarding />
        ) : section === 'evidence' ? (
          <EvidenceQueue />
        ) : (
          <Register filter={filter} onFilter={setFilter} />
        )}
      </div>

      <p className="mt-6 text-[12px] text-ink-soft">
        Figures are illustrative. Onboarding checks, evidence reviews and invitations are simulated
        — nothing is sent, and an approved applicant is listed at the next marketplace publish.
      </p>

      <InviteModal open={inviteOpen} onClose={closeInvite} onInvited={invited} />
    </div>
  );
}
