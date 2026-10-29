import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { CardHeader } from '../../../../components/ui/CardHeader';
import { Eyebrow } from '../../../../components/ui/Eyebrow';
import { Icon } from '../../../../components/ui/Icon';
import { BILLING_SPLIT, PREDICTED_NEEDS } from '../../../../data/vessels';
import { useApp } from '../../../../store/app';

/** Every supplier matched across the list: one quote request each. */
const REQUESTS = PREDICTED_NEEDS.reduce((n, need) => n + need.matched, 0);

/**
 * MV Choice's drafted list, approved by the client (30 Oct).
 *
 * The agent desk drafts the list from what the vessel bought on her last
 * Aberdeen call; this card is the client's side of the same list. One click
 * approves it and the quote requests go, and the agent desk reads the same
 * store flag, so both sides agree that the requests are out.
 *
 * Nothing here is larger than the card's heading: the consolidation card
 * above keeps the screen's one big number.
 */
export function ApproveList() {
  const sent = useApp((s) => s.quoteRequestsSent);
  const sendQuoteRequests = useApp((s) => s.sendQuoteRequests);
  const pushToast = useApp((s) => s.pushToast);
  const navigate = useNavigate();

  function approve() {
    sendQuoteRequests();
    pushToast(
      `${REQUESTS} quote requests issued for MV Choice. Replies will populate the comparison view automatically.`,
    );
    navigate('/app/quotes');
  }

  return (
    <Card data-tour="approve" data-testid="client-approve-list">
      <Eyebrow>Your list is drafted</Eyebrow>
      <CardHeader
        className="mt-1"
        title="MV Choice, Regent Quay, ETA 08:00 tomorrow"
        subtitle="Drafted from what she bought on her last Aberdeen call."
      />
      <ul role="list" className="mt-3 grid list-none gap-2 sm:grid-cols-3">
        {PREDICTED_NEEDS.map((need) => (
          <li
            key={need.service}
            className="flex items-start gap-2.5 rounded-lg border border-line px-3 py-2.5"
          >
            <Icon name="badge-check" size={16} className="mt-0.5 shrink-0 text-success" />
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold">{need.service}</span>
              <span className="block text-[12.5px] text-ink-soft">
                {need.matched} vetted suppliers matched
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] text-ink-soft">
        Billing split {BILLING_SPLIT}, already applied.
      </p>
      <div className="mt-3.5" aria-live="polite">
        {sent ? (
          <p
            data-testid="client-approve-done"
            className="flex items-center gap-2 text-[14px] font-semibold text-success"
          >
            <Icon name="circle-check" size={17} className="shrink-0" />
            <span>
              Approved. {REQUESTS} quote requests out, replies land in{' '}
              <Link to="/app/quotes" className="text-sea">
                Quotes
              </Link>
              .
            </span>
          </p>
        ) : (
          <Button onClick={approve}>Approve and send {REQUESTS} quote requests</Button>
        )}
      </div>
    </Card>
  );
}
