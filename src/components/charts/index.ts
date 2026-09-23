/**
 * The site chart kit (live dashboards spec §6). Hand-rolled SVG and HTML, no
 * chart library. Screens compose `ChartFigure` (figure, caption, legend,
 * "Show the numbers" table) around one chart; the charts never render a
 * figure themselves.
 */
export { VIZ, LINE_COLOURS, type ServiceLineId, type VizPalette } from './palette';
export { niceTicks } from './scale';
export { ChartFigure, Legend, type LegendItem, type TableSpec } from './ChartFigure';
export { TimeSeriesPanels, type TimeSeriesPanel } from './TimeSeriesPanels';
export { StackedColumns, type StackLower, type StackSeries } from './StackedColumns';
export { HBarList, type HBarRow } from './HBarList';
export { FunnelBars } from './FunnelBars';
export { BenchmarkBar } from './BenchmarkBar';
export { Heatmap } from './Heatmap';
export { ExpiryBar, type ExpiryState } from './ExpiryBar';
