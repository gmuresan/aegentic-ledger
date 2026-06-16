/**
 * Homepage-state types for the static public site.
 *
 * These mirror the `HomepageState` aggregate emitted by the publish pipeline's
 * scripts/generate-homepage-state.ts (in the monorepo). The public repo is a
 * standalone Astro app — it must not import from the monorepo — so the shape the
 * widgets consume is declared locally here. Keep in sync with the generator when
 * the aggregate schema changes.
 */

export interface SelfCustodiedCapital {
  formatted: string; // e.g. "$95.39"
  symbol: 'USD';
}

export interface InterceptionItem {
  policyLabel: string; // machine label, e.g. "value-cap" — never an editorial adjective
  intentSummary: string; // brief description of what was blocked
  entrySlug: string | null; // slug of the ledger entry if matchable; null otherwise
}

export interface CurrentPosition {
  protocol: string;
  token: string;
  symbol?: string;
  positionUsd: string | null; // formatted USD string or null if unpriced
}

export interface StreamEntryRef {
  slug: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD) from entry frontmatter
  stream: 'agent-ledger' | 'build-log';
}

export interface HomepageState {
  generatedAt: string; // ISO-8601 UTC timestamp
  cyclesSupervised: number; // economics.cycleCount
  selfCustodiedCapital: SelfCustodiedCapital | null; // null if no positions snapshot
  movesBlocked: number; // count of policy.blocked events
  drained: 0; // always literal 0 — observed, never derived from a gap
  currentPositions: CurrentPosition[];
  latestInterceptions: InterceptionItem[]; // up to 4, newest first
  latestByStream: {
    agent: StreamEntryRef[]; // up to 3, newest first
    build: StreamEntryRef[]; // up to 3, newest first
  };
}
