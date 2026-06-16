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
  positionUsd: string | null; // raw decimal number string (e.g. "1234.5") or null if unpriced
}

export interface StreamEntryRef {
  slug: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD) from entry frontmatter
  stream: 'agent-ledger' | 'build-log';
}

// Story 75.4 (AC4): mirrors PerAgentState / FleetState from the generator
// (scripts/generate-homepage-state.ts). Copy verbatim — keep in sync with the
// generator when the fleet aggregate schema changes.
export interface PerAgentState {
  agentName: string; // DB identifier (e.g. "yield-dev")
  /** Public-facing slug used in entry frontmatter `agentSlug`; absent when it equals agentName. */
  publicSlug?: string;
  cyclesSupervised: number;
  movesBlocked: number;
  selfCustodiedCapital: SelfCustodiedCapital | null; // null = no snapshot
  drained: 0;
  currentPositions: CurrentPosition[];
  latestInterceptions: InterceptionItem[];
}

export interface FleetState {
  agentsCount: number;
  cyclesSupervised: number;
  movesBlocked: number;
  selfCustodiedCapital: SelfCustodiedCapital | null; // null = ALL agents have no snapshot
  drained: 0;
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
  // Story 75.4: optional fleet aggregate (absent on single-agent states).
  fleet?: FleetState;
  perAgent?: Record<string, PerAgentState>;
}
