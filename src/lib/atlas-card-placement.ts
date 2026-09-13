export interface Rect { left: number; top: number; right: number; bottom: number }
export interface CardPlacement { id: string; left: number; top: number; score: number }

const ids = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const;

function intersectionArea(a: Rect, b: Rect) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

export function chooseCardPlacement(frame: { width: number; height: number }, card: { width: number; height: number }, protectedRects: Rect[], margin = 8): CardPlacement | null {
  if (card.width + margin * 2 > frame.width || card.height + margin * 2 > frame.height) return null;
  const x = [margin, (frame.width - card.width) / 2, frame.width - card.width - margin];
  const y = [margin, (frame.height - card.height) / 2, frame.height - card.height - margin];
  const candidates = [
    [x[0], y[0]], [x[1], y[0]], [x[2], y[0]], [x[0], y[1]],
    [x[2], y[1]], [x[0], y[2]], [x[1], y[2]], [x[2], y[2]]
  ];
  let best: CardPlacement | null = null;
  candidates.forEach(([left, top], index) => {
    const rect = { left, top, right: left + card.width, bottom: top + card.height };
    const score = protectedRects.reduce((sum, target) => sum + intersectionArea(rect, target), 0);
    if (!best || score < best.score) best = { id: ids[index], left: Math.round(left), top: Math.round(top), score };
  });
  return best?.score === 0 ? best : null;
}
