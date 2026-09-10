export interface HistoricalDateLike {
  year: number;
  month?: number;
  day?: number;
}

export interface TimelineEventLike {
  id: string;
  start: HistoricalDateLike | null;
  end: HistoricalDateLike | null;
}

type SortKey = readonly [number, number, number, number];

/**
 * Converts a historical date to a sortable tuple without using Date.
 * Negative years therefore retain their natural BCE order and null dates
 * remain after every known date.
 */
export function historicalSortKey(date: HistoricalDateLike | null): SortKey {
  if (date === null) return [1, 0, 0, 0];
  return [0, date.year, date.month ?? 1, date.day ?? 1];
}

function compareKeys(left: SortKey, right: SortKey): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

export function sortTimelineEvents<T extends TimelineEventLike>(events: readonly T[]): T[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((left, right) => {
      const startDifference = compareKeys(
        historicalSortKey(left.event.start),
        historicalSortKey(right.event.start)
      );
      if (startDifference !== 0) return startDifference;

      const endDifference = compareKeys(
        historicalSortKey(left.event.end),
        historicalSortKey(right.event.end)
      );
      return endDifference || left.index - right.index;
    })
    .map(({ event }) => event);
}
