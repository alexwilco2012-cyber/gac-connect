import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DIRECTORY_POINTER, PROVISION_KEY, PROVISION_LABEL } from '../data/serviceLines';
import type { LineService, ServiceLine } from '../data/serviceLines';
import { SUPPLIERS } from '../data/suppliers';
import {
  bookableCount,
  stockedCategories,
  suppliersInLine,
  tierSentence,
} from '../lib/serviceLines';
import { Button, ButtonLink } from './ui/Button';
import { Card } from './ui/Card';
import { Eyebrow } from './ui/Eyebrow';
import { BetaPill, Pill } from './ui/Pill';
import { Rating } from './ui/Rating';

/**
 * The shared shape of a service-line hub — Agency, Logistics, Customs and
 * Procurement all render through this.
 *
 * A hub that is only a menu is worse than the flat navigation it replaced: it
 * adds a click and gives nothing back. So every hub lands on four things the
 * flat nav never showed —
 *
 *  1. **what is live in this line right now**, pulled from the real stores and
 *     linked straight through;
 *  2. **what you can ask for**, each service marked GAC or network so the tier
 *     story stays legible;
 *  3. **the line's own working screen**, rendered inline where it has one
 *     (`children`) rather than behind another click;
 *  4. **who is vetted in this line**, as a shortcut into the directory rather
 *     than a second copy of it.
 */

/** One "live in this line" figure, linked to the screen that holds it. */
export interface LiveStat {
  label: string;
  value: string;
  to: string;
  /** Reads out under the number — 'tightest 2 days left'. */
  note?: string;
}

function ProvisionPill({ service }: { service: LineService }) {
  return (
    <Pill tone={service.provision === 'gac' ? 'inhouse' : 'info'}>
      {PROVISION_LABEL[service.provision]}
    </Pill>
  );
}

function ServiceCard({
  service,
  onRequest,
  onAgent,
}: {
  service: LineService;
  onRequest: (service: LineService) => void;
  onAgent: (service: LineService) => void;
}) {
  return (
    <Card
      variant={service.provision === 'gac' && !service.beta ? 'inhouse' : 'default'}
      className="flex min-w-0 flex-col justify-between gap-3.5"
      data-testid={`line-service-${service.id}`}
      data-provision={service.provision}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-[15.5px] font-bold">
            {service.label}
            {service.beta ? <BetaPill /> : null}
          </h3>
          <ProvisionPill service={service} />
        </div>
        <p className="mt-1.5 text-[13px] text-ink-soft">{service.body}</p>
      </div>
      <div>
        {service.action.kind === 'link' ? (
          <ButtonLink
            to={service.action.to}
            variant={service.provision === 'gac' && !service.beta ? 'gold' : 'ghost'}
          >
            {service.action.label}
          </ButtonLink>
        ) : service.action.kind === 'request' ? (
          <Button variant="ghost" onClick={() => onRequest(service)}>
            {service.action.label}
          </Button>
        ) : (
          <Button variant="gold" onClick={() => onAgent(service)}>
            {service.action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

export function ServiceLineHub({
  line,
  live,
  onRequest,
  onAgent,
  children,
}: {
  line: ServiceLine;
  /** Live figures for this line; an empty array renders no strip. */
  live: LiveStat[];
  onRequest: (service: LineService) => void;
  onAgent: (service: LineService) => void;
  /** The line's own working screen, rendered between the services and the suppliers. */
  children?: ReactNode;
}) {
  const suppliers = suppliersInLine(line, SUPPLIERS).slice(0, 3);
  const categories = stockedCategories(line, SUPPLIERS);
  const bookable = bookableCount(line, SUPPLIERS);

  return (
    <div className="screen-enter" data-testid="service-line" data-line={line.id}>
      <Eyebrow>Service line · {line.name}</Eyebrow>
      <div className="mt-1 flex flex-wrap items-center gap-2.5">
        <h1 className="font-display text-2xl font-bold">{line.headline}</h1>
        <span data-testid="line-tier">
          <Pill tone="inhouse">{line.tierLabel}</Pill>
        </span>
      </div>
      <p className="mt-1.5 max-w-[760px] text-[14px] text-ink-soft">{line.intro}</p>

      {live.length > 0 ? (
        <div
          className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="line-live"
          aria-label={`Live in ${line.name}`}
        >
          {live.map((stat) => (
            <Link
              key={stat.label}
              to={stat.to}
              className="rounded-brand border border-line bg-white p-4 no-underline shadow-card transition-colors hover:border-sea"
            >
              <p className="text-[12px] text-ink-soft">{stat.label}</p>
              <p className="mt-0.5 font-display text-[24px] font-bold text-ink">{stat.value}</p>
              {stat.note ? <p className="text-[12px] text-ink-soft">{stat.note}</p> : null}
            </Link>
          ))}
        </div>
      ) : null}

      <section className="mt-7" aria-labelledby="line-services-heading">
        <h2 id="line-services-heading" className="font-display text-[19px] font-bold">
          What you can ask for
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-soft">{DIRECTORY_POINTER}</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="line-services">
          {line.services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onRequest={onRequest}
              onAgent={onAgent}
            />
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-soft" data-testid="provision-key">
          {PROVISION_KEY}
        </p>
      </section>

      {children}

      <section className="mt-8" aria-labelledby="line-suppliers-heading">
        <h2 id="line-suppliers-heading" className="font-display text-[19px] font-bold">
          Vetted suppliers in this line
        </h2>
        {suppliers.length > 0 ? (
          <>
            <p className="mt-0.5 text-[13px] text-ink-soft" data-testid="line-supplier-count">
              {bookable} bookable {bookable === 1 ? 'supplier' : 'suppliers'} across{' '}
              {categories.length} {categories.length === 1 ? 'category' : 'categories'}. The
              marketplace holds the full directory, the vetting and the terms.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5" data-testid="line-categories">
              {categories.map((c) => (
                <Link
                  key={c}
                  to={`/app/marketplace?category=${encodeURIComponent(c)}`}
                  className="rounded-full border-[1.5px] border-line-strong bg-white px-3 py-1 text-[12.5px] font-semibold text-ink-soft no-underline hover:border-sea"
                >
                  {c}
                </Link>
              ))}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3" data-testid="line-suppliers">
              {suppliers.map((s) => (
                <Card key={s.id} className="min-w-0">
                  <p className="font-display text-[14.5px] font-bold">
                    <Link
                      to={`/app/marketplace/${s.id}`}
                      className="text-ink no-underline hover:text-sea hover:underline"
                    >
                      {s.name}
                    </Link>
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-soft">{s.category}</p>
                  <p className="mt-1.5">
                    <Rating rating={s.rating} count={s.ratingCount} size="sm" />
                  </p>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1.5 max-w-[760px] text-[13.5px] text-ink-soft" data-testid="no-network">
            {line.noNetworkNote}
          </p>
        )}
      </section>

      <p className="mt-6 rounded-brand border border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
        {tierSentence(line)}{' '}
        <Link to="/app/tiers" className="font-semibold text-sea">
          Open the tier calculator →
        </Link>
      </p>
    </div>
  );
}
