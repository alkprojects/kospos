/**
 * Landing view public surface — Phase 2.2.q.
 *
 * Welcome-tab dashboard showing what data is loaded + persistence status.
 */

export { LandingView } from './LandingView';
export type { LandingViewProps } from './LandingView';
export {
  buildDataSummary,
  formatRefreshedAt,
} from './build';
export type {
  DataSourceSummary,
  UserStateSummary,
  DataSummary,
} from './build';
