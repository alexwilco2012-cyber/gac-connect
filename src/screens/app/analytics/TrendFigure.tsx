import { ChartFigure, TimeSeriesPanels, VIZ, type TableSpec } from '../../../components/charts';
import { PERIOD_SUMMARY, seriesFor, weeklySums, type Period } from '../../../data/analytics';
import { count } from '../../../lib/format';
import { daysAboveCategory } from './model';

/**
 * Views and quote requests (spec §5 item 2): two small multiples on one
 * shared time axis with one synced crosshair — never a dual axis. Views are
 * daily in both periods; requests are daily at 30 days and weekly at 90, so
 * the columns stay readable. The category average is Premium benchmarking.
 */
export function TrendFigure({ period, supplier }: { period: Period; supplier: string }) {
  const s = PERIOD_SUMMARY[period];
  const series = seriesFor(period);
  const above = daysAboveCategory(period);
  const weekly = period === 90;

  const table: TableSpec = weekly
    ? {
        caption: 'Profile views, category average and quote requests per week, last 90 days',
        columns: ['Week', 'Profile views', 'Category average', 'Quote requests'],
        rows: (() => {
          const views = weeklySums(series.views);
          const category = weeklySums(series.category);
          return series.requestLabels.map((week, k) => [
            week,
            count(views[k] ?? 0),
            count(Math.round(category[k] ?? 0)),
            count(series.requests[k] ?? 0),
          ]);
        })(),
      }
    : {
        caption: 'Profile views, category average and quote requests per day, last 30 days',
        columns: ['Day', 'Profile views', 'Category average', 'Quote requests'],
        rows: series.labels.map((day, i) => [
          day,
          count(series.views[i] ?? 0),
          (series.category[i] ?? 0).toFixed(1),
          count(series.requests[i] ?? 0),
        ]),
      };

  return (
    <ChartFigure
      testId="analytics-trend"
      title="Views and quote requests"
      subtitle={
        weekly
          ? 'Last 90 days · views per day, requests per week'
          : 'Last 30 days · views and requests per day'
      }
      takeaway={`${count(s.views)} profile views and ${count(s.requests)} quote requests in the last ${period} days. Views beat the category average on ${above} of ${period} days.`}
      legend={[
        { label: supplier, color: VIZ.sea, shape: 'line' },
        { label: 'Category average (Premium)', color: VIZ.context, shape: 'line' },
      ]}
      table={table}
    >
      <TimeSeriesPanels
        labels={series.labels}
        ariaLabel={`Profile views and quote requests, last ${period} days`}
        panels={[
          {
            id: 'views',
            label: 'Profile views per day',
            kind: 'area',
            values: series.views,
            format: count,
            benchmark: { label: 'Category average', values: series.category },
          },
          {
            id: 'requests',
            label: weekly ? 'Quote requests per week' : 'Quote requests per day',
            kind: 'columns',
            values: series.requests,
            format: count,
            ...(weekly ? { binLabels: series.requestLabels } : {}),
          },
        ]}
      />
    </ChartFigure>
  );
}
