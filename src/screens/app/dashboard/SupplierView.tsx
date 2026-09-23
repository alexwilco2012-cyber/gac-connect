import { AnalyticsTeaser } from './supplier/AnalyticsTeaser';
import { Certificates } from './supplier/Certificates';
import { Earnings } from './supplier/Earnings';
import { ListingPreview } from './supplier/ListingPreview';
import { PlanCard } from './supplier/PlanCard';
import { QuoteRequests } from './supplier/QuoteRequests';
import { RecentRatings } from './supplier/RecentRatings';
import { StatusRow } from './supplier/StatusRow';
import { SupplierKpis } from './supplier/SupplierKpis';

/**
 * The dashboard's supplier view — what Silver City Welding sees (26 Aug;
 * rebuilt as a working desk on 23 Sep, spec §3).
 *
 * A supplier arrives asking "am I being found, and does my paperwork still
 * hold". So the view leads with the four numbers that answer the first half,
 * puts the quote inbox (with a pipeline that moves as quotes go out) and the
 * earnings beside the certificates (with a real upload to the SVS team) and
 * the plan, and ends on a row about how the supplier is seen: the listing,
 * recent ratings and the way into analytics. (The spec stacked those three
 * in the two columns; a row of their own keeps the columns level.)
 *
 * This is the one place on the dashboard where the plan and the commission
 * band appear: commission applies to third-party work won through the
 * platform and comes off at invoice matching, never from the client. The
 * client view never mounts any of it.
 *
 * Every widget lives in `./supplier/`; this file is the layout.
 */
export function SupplierView() {
  return (
    <>
      <StatusRow />
      <SupplierKpis />

      {/* The work: requests and earnings beside the paperwork and the plan. */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid min-w-0 gap-5">
          <QuoteRequests />
          <Earnings />
        </div>
        <div className="grid min-w-0 gap-5">
          <Certificates />
          <PlanCard />
        </div>
      </div>

      {/* How the supplier is seen: the listing, what clients said, where the work came from. */}
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ListingPreview />
        <RecentRatings />
        <AnalyticsTeaser className="md:col-span-2 xl:col-span-1" />
      </div>
    </>
  );
}
