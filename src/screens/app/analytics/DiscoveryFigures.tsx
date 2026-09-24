import { ChartFigure, HBarList, VIZ } from '../../../components/charts';
import { PERIOD_SUMMARY, type Period } from '../../../data/analytics';
import { count } from '../../../lib/format';
import { sharePct } from './model';

/**
 * Where clients found you (spec §5 item 5): ranked bars on one hue, value and
 * share at every tip. The promoted placement is tagged in words and keeps the
 * sea bar — paid visibility is labelled, never coloured differently — and
 * "Direct link and other" sits last in the neutral.
 */
export function SourcesFigure({ period }: { period: Period }) {
  const s = PERIOD_SUMMARY[period];
  const total = s.sources.reduce((a, r) => a + r.value, 0);
  const top = s.sources[0];
  const promoted = s.sources.find((r) => r.promoted);
  const tip = (v: number) => `${count(v)} · ${sharePct(v, total)}%`;
  return (
    <ChartFigure
      testId="analytics-sources"
      title="Where clients found you"
      subtitle={`Profile views by source · last ${period} days`}
      takeaway={`${top?.label ?? ''} brought ${sharePct(top?.value ?? 0, total)}% of ${count(total)} profile views${
        promoted ? `; the promoted placement ${sharePct(promoted.value, total)}%` : ''
      }.`}
      table={{
        caption: `Profile views by source, last ${period} days`,
        columns: ['Source', 'Profile views', 'Share'],
        rows: s.sources.map((r) => [
          r.promoted ? `${r.label} (promoted)` : r.label,
          count(r.value),
          `${sharePct(r.value, total)}%`,
        ]),
      }}
    >
      <HBarList
        rows={s.sources.map((r) => ({
          id: r.label,
          label: r.label,
          value: r.value,
          valueLabel: tip(r.value),
          ...(r.promoted ? { tag: '▲ Promoted' } : {}),
          ...(r.other ? { color: VIZ.other } : {}),
        }))}
        format={count}
        ariaLabel={`Profile views by source, last ${period} days`}
      />
    </ChartFigure>
  );
}

/** Searches that found you (spec §5 item 8): the five terms that surfaced the profile. */
export function SearchesFigure({ period }: { period: Period }) {
  const s = PERIOD_SUMMARY[period];
  const top = s.searches[0];
  return (
    <ChartFigure
      testId="analytics-searches"
      title="Searches that found you"
      subtitle={`Top five search terms · last ${period} days`}
      takeaway={`“${top?.term ?? ''}” showed your profile most often, ${count(top?.count ?? 0)} times in the last ${period} days.`}
      table={{
        caption: `Search terms that showed the profile, last ${period} days`,
        columns: ['Search term', 'Searches'],
        rows: s.searches.map((t) => [t.term, count(t.count)]),
      }}
    >
      <HBarList
        rows={s.searches.map((t) => ({ id: t.term, label: `“${t.term}”`, value: t.count }))}
        format={count}
        ariaLabel={`Search terms that showed your profile, last ${period} days`}
      />
    </ChartFigure>
  );
}
