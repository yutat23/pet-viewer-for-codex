export interface FramePosition {
  xPercent: number;
  yPercent: number;
}

export function getBackgroundPosition(
  column: number,
  row: number,
  columns: number,
  rows: number
): FramePosition {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns <= 0 || rows <= 0) {
    throw new RangeError("Sprite columns and rows must be positive integers.");
  }
  if (!Number.isInteger(column) || column < 0 || column >= columns) {
    throw new RangeError(`Sprite column ${column} is outside 0-${columns - 1}.`);
  }
  if (!Number.isInteger(row) || row < 0 || row >= rows) {
    throw new RangeError(`Sprite row ${row} is outside 0-${rows - 1}.`);
  }

  return {
    xPercent: columns === 1 ? 0 : (column / (columns - 1)) * 100,
    yPercent: rows === 1 ? 0 : (row / (rows - 1)) * 100
  };
}

export function toCssPosition(position: FramePosition): string {
  return `${position.xPercent}% ${position.yPercent}%`;
}
