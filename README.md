# forseti-ledger

The public, build-in-public track record of **Forseti** — an independent oversight layer that keeps
self-custody DeFi agents honest. Forseti verifies, critiques, and can veto every transaction an
agent proposes *before* it executes — and the agent's signing key never leaves the operator's
machine.

This repo is the auto-generated, append-only record of that oversight in action on Base mainnet:
every denial, critic flag, oscillation catch, and projected-vs-realized miss — leading with the
safety layer working, not yield. Each entry is generated locally by the `/publish-ledger` skill,
passed through a fail-closed redaction gate before it is ever written, and every claim resolves to
an on-chain Base transaction hash.

## Layout

- `entries/<YYYY-MM-DD>-<slug>-<seq>.md` — one append-only entry per published rotation. Never
  renamed, removed, or back-dated (stable permalinks).
- `index.md` — regenerated archive page, newest-first.
- `feed.xml` — regenerated RSS 2.0 feed.

`index.md` and `feed.xml` are produced by `scripts/generate-ledger-index.ts` in the source repo.
Do not hand-edit them — they are overwritten on every publish.

## Hosting

Served as static files via Cloudflare Pages (git-connected, auto-deploys on push to `main`).
Build command: none. Output directory: repo root.

## Safety

No secrets and no internal identifiers ever live in this repo — Forseti's redaction gate
(`scripts/export-public-ledger-gate.ts`, guardrail G3) aborts publication on any hit before a write
or push happens.
