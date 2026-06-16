/**
 * Screenshot-manifest types for the static public site (Story 75.6).
 *
 * Mirrors the `ScreenshotManifestEntry` emitted by the capture pipeline's
 * scripts/capture-dashboard-screenshots.ts (in the monorepo). The public site is a
 * standalone Astro app — it must not import from the monorepo — so the shape it consumes
 * is declared locally here. Story 75.7 imports `src/data/screenshots.json` as a static
 * JSON asset and types it as `ScreenshotManifestEntry[]`.
 */

export interface ScreenshotManifestEntry {
  viewId: string; // e.g. 'home', 'portfolio'
  captureDate: string; // ISO-8601 UTC, e.g. '2026-06-16T12:00:00.000Z'
  sourceBuild: string; // 7-char git HEAD sha, e.g. 'abc1234'
  filePath: string; // relative to the site root, e.g. 'screenshots/home.png'
}
