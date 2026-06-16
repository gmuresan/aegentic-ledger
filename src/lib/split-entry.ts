/**
 * Split a 71-format entry body into its two visual zones (Story 72.1).
 *
 * The Epic 71 entry format is:
 *
 *   [editorial prose]
 *   \n\n---\n\n
 *   [deterministic fact panel]
 *
 * This split is STRUCTURAL — it drives which markdown renders above the visual
 * fact-wall (commentary) vs. below it (evidence). The split happens at build time;
 * no client JS. We split on the FIRST `---` that stands alone on its own line
 * (a markdown thematic break), tolerating surrounding blank lines.
 *
 * If no wall separator is present, the entire body is treated as prose and the
 * fact half is empty — a malformed/legacy entry still renders, it just has no
 * recessed fact panel.
 */
export interface SplitEntry {
  prose: string;
  fact: string;
}

export function splitEntry(body: string): SplitEntry {
  const text = body.replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  // Find the first line that is a lone thematic break (`---`, `***`, or `___`,
  // 3+ chars), which the 71 generator emits between prose and the fact panel.
  let wallIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i].trim())) {
      wallIdx = i;
      break;
    }
  }

  if (wallIdx === -1) {
    return { prose: text.trim(), fact: '' };
  }

  const prose = lines.slice(0, wallIdx).join('\n').trim();
  const fact = lines.slice(wallIdx + 1).join('\n').trim();
  return { prose, fact };
}
