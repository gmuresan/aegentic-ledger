/**
 * Parse the deterministic fact panel text into typed interception signals and
 * receipt rows (Story 72.5).
 *
 * The source of truth for highlights is the `### Decisions & interceptions`
 * section of the fact panel — the deterministic half below the `---` wall, emitted
 * by `renderFactPanel` in scripts/export-public-ledger.ts. The callouts above the
 * fold are derived ONLY from these machine-rendered facts, never from the LLM prose
 * (G1 provenance requirement).
 *
 * Both functions are pure: input is the raw fact-panel text string (already split
 * by `splitEntry`); output is a typed array. No side-effects, no @agent-overseer
 * imports, no DB, no fetch — this runs at Astro build time (G7).
 */

export type EntrySignal =
  | { kind: 'denial'; policyLabel: string; intentSummary: string }
  | { kind: 'critic'; severity: string; detail: string }
  | { kind: 'critic-summary'; text: string }
  | { kind: 'oscillation' }
  | { kind: 'apr-miss'; projected: string; realized: string; delta: string };

export interface ReceiptData {
  verb: string; // the leg operation, e.g. "withdraw" / "deposit"
  amount: string; // humanized amount + symbol, e.g. "78.723843 USDC"
  hash: string; // tx hash recovered from the explorer URL's /tx/<hash> segment
  explorerName: string; // the link text the generator printed, e.g. "view on basescan"
  explorerUrl: string;
}

// Section extraction: the text between "### Decisions & interceptions" and the
// next "### " heading (or end of string).
const INTERCEPTIONS_SECTION = /### Decisions & interceptions\n([\s\S]*?)(?=###|$)/;

// The move section: between "### The move" and the next "### " heading (or EOS).
const MOVE_SECTION = /### The move\n([\s\S]*?)(?=###|$)/;

// Signal patterns (applied per line in the extracted interceptions section).
const DENIAL_RE = /^- \*\*Denied\*\* \(`([^`]+)`\): (.+)$/;
const CRITIC_RE = /^- \*\*Critic flag\*\* \((\w+)\): (.+)$/;
const CRITIC_SUM_RE = /^- \*\*Critic summary\*\*: (.+)$/;
const OSCILLATION_RE = /^- \*\*Oscillation caught\*\*/;
// aprStr renders either `<n>%` or the literal `(not captured)`, and deltaStr renders
// `<sign><n>%` or `—`. The projected/realized groups must therefore tolerate the
// parenthesized null value AND its embedded space — `([^→]+?)` matches up to the arrow
// (trimmed), so the common `projected (not captured) → realized 3.1%` case still parses.
const APR_MISS_RE =
  /^- \*\*Projected vs realized APY\*\*: projected (.+?) → realized (.+?) \(delta (.+)\)$/;

// Receipt pattern from renderFactPanel's "The move" section. The generator emits
// (export-public-ledger.ts renderFactPanel + txLink):
//   - <operation> <amount> <symbol> on <protocol> — [<linkText>](<explorerUrl>)
// e.g. `- withdraw 78.723843 USDC on Aave — [view on basescan](https://…/tx/0x…)`
// No backticks, no ↗ arrow. The link part is optional (omitted when txHash is null).
const RECEIPT_RE =
  /^- (\S+) (.+?) (\S+) on (.+?) — \[([^\]]+)\]\(([^)]+)\)$/;

/**
 * Extract the interception signals from the fact-panel text. Returns `[]` for a
 * quiet entry (one with only "No denials, critic flags, or oscillation catches…"
 * or no matching patterns) — an empty array means render no callout block.
 */
export function parseEntrySignals(factText: string): EntrySignal[] {
  const section = INTERCEPTIONS_SECTION.exec(factText);
  if (section === null) return [];

  const signals: EntrySignal[] = [];
  for (const raw of section[1].split('\n')) {
    const line = raw.trim();
    if (line === '') continue;

    const denial = DENIAL_RE.exec(line);
    if (denial !== null) {
      signals.push({ kind: 'denial', policyLabel: denial[1], intentSummary: denial[2] });
      continue;
    }

    const critic = CRITIC_RE.exec(line);
    if (critic !== null) {
      signals.push({ kind: 'critic', severity: critic[1], detail: critic[2] });
      continue;
    }

    const criticSum = CRITIC_SUM_RE.exec(line);
    if (criticSum !== null) {
      signals.push({ kind: 'critic-summary', text: criticSum[1] });
      continue;
    }

    if (OSCILLATION_RE.test(line)) {
      signals.push({ kind: 'oscillation' });
      continue;
    }

    const aprMiss = APR_MISS_RE.exec(line);
    if (aprMiss !== null) {
      signals.push({
        kind: 'apr-miss',
        projected: aprMiss[1],
        realized: aprMiss[2],
        delta: aprMiss[3],
      });
      continue;
    }
    // The "No denials…" quiet line and any non-matching line yield no signal.
  }

  return signals;
}

/**
 * Extract the receipt rows from the fact-panel's "### The move" section. Returns
 * `[]` when the section is absent or contains no receipt-formatted lines (e.g. a
 * denied cycle with no execution).
 */
export function parseReceiptRows(factText: string): ReceiptData[] {
  const section = MOVE_SECTION.exec(factText);
  if (section === null) return [];

  const rows: ReceiptData[] = [];
  for (const raw of section[1].split('\n')) {
    const line = raw.trim();
    if (line === '') continue;

    const m = RECEIPT_RE.exec(line);
    if (m !== null) {
      const explorerUrl = m[6];
      // The generator's link carries the tx hash in the `/tx/<hash>` URL segment; the
      // line itself no longer prints the bare hash, so recover it from the URL.
      const hashMatch = /\/tx\/([^/?#]+)/.exec(explorerUrl);
      rows.push({
        verb: m[1],
        amount: `${m[2]} ${m[3]}`,
        hash: hashMatch !== null ? hashMatch[1] : '',
        explorerName: m[5],
        explorerUrl,
      });
    }
  }

  return rows;
}
