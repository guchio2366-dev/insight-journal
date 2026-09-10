/**
 * Compare schema-valid public ISO dates or UTC timestamps by their instant,
 * newest first. Date-only values represent midnight UTC.
 */
export function comparePublicDatesDescending(left: string, right: string): number {
  const leftTime = Date.parse(left.length === 10 ? `${left}T00:00:00Z` : left);
  const rightTime = Date.parse(right.length === 10 ? `${right}T00:00:00Z` : right);

  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    throw new TypeError("公開日の比較には有効なISO日付またはUTC日時が必要です");
  }

  if (leftTime === rightTime) return 0;
  return leftTime > rightTime ? -1 : 1;
}

/** Compare public IDs deterministically without depending on the host locale. */
export function comparePublicIdsAscending(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Newest public date first, then public ID ascending for a stable total order. */
export function compareDatedPublicIds(
  leftDate: string,
  leftPublicId: string,
  rightDate: string,
  rightPublicId: string
): number {
  return comparePublicDatesDescending(leftDate, rightDate)
    || comparePublicIdsAscending(leftPublicId, rightPublicId);
}
