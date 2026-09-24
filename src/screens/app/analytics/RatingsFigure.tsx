import { ChartFigure, HBarList } from '../../../components/charts';
import { RATINGS_DISTRIBUTION } from '../../../data/analytics';
import { count, ratingsCount } from '../../../lib/format';
import { sharePct } from './model';

/**
 * Ratings (spec §5 item 7): the score never travels without its count, and
 * the bars show what sits behind it, 5 ★ down to 1 ★ in one hue. All time,
 * so the period switch leaves it alone. Set in ink rather than the rating
 * readout's gold-deep: this screen keeps gold out entirely.
 */
export function RatingsFigure({ rating, ratingCount }: { rating: number; ratingCount: number }) {
  const total = RATINGS_DISTRIBUTION.reduce((a, r) => a + r.count, 0);
  const fourPlus = RATINGS_DISTRIBUTION.filter((r) => r.stars >= 4).reduce(
    (a, r) => a + r.count,
    0,
  );
  const five = RATINGS_DISTRIBUTION.find((r) => r.stars === 5)?.count ?? 0;
  return (
    <ChartFigure
      testId="analytics-ratings"
      title="Ratings"
      subtitle="All time · from clients and GAC agents on completed jobs"
      takeaway={`${rating.toFixed(1)} stars from ${ratingsCount(ratingCount)}; ${count(five)} of them five stars.`}
      table={{
        caption: 'Ratings by stars, all time',
        columns: ['Stars', 'Ratings', 'Share'],
        rows: RATINGS_DISTRIBUTION.map((r) => [
          `${r.stars} ★`,
          count(r.count),
          `${sharePct(r.count, total)}%`,
        ]),
      }}
    >
      <div className="grid items-center gap-x-10 gap-y-5 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div>
          <p className="font-display text-[26px] leading-none font-bold text-ink tabular-nums">
            {rating.toFixed(1)} ★
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-ink">{ratingsCount(ratingCount)}</p>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
            {sharePct(fourPlus, total)}% rated four or five stars
          </p>
        </div>
        <HBarList
          rows={RATINGS_DISTRIBUTION.map((r) => ({
            id: `stars-${r.stars}`,
            label: `${r.stars} ★`,
            value: r.count,
          }))}
          format={count}
          ariaLabel={`Ratings by stars, ${count(total)} in all`}
        />
      </div>
    </ChartFigure>
  );
}
