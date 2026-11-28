/** Content of `foehn-valleys.json` (see backend `FoehnValleys.scala`), one element per hour offset in `hours` */
export type FoehnValleys = {
  version?: string // version of the formula, absent before 0.1
  valleys: Array<{
    id: string
    foehn: 'south' | 'north'
    hours: Array<{ s: number | null, i: number | null, dp: number | null }> // per mille, per mille, tenths of hPa
  }>
};

export const fetchFoehnValleys = (url: string): Promise<FoehnValleys | undefined> =>
  fetch(url)
    .then(response => response.ok ? response.json() as Promise<FoehnValleys> : undefined)
    .catch(() => undefined);

/** Index (0–1) of each valley at the given hour offset, keyed by flow-line id */
export const foehnValleyScores = (data: FoehnValleys, hourOffset: number): Map<string, number> => {
  const scores = new Map<string, number>();
  for (const valley of data.valleys) {
    const index = valley.hours[hourOffset]?.i;
    if (index !== undefined && index !== null) {
      scores.set(valley.id, index / 1000);
    }
  }
  return scores;
};
