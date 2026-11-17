/**
 * Status endpoints often return a compact resource while the table list has
 * extra display fields. Merge the mutation response into the visible record
 * and keep its original identifier so React retains the row.
 */
export function mergeStatusRecord<T extends { id: string | number }>(
  current: T,
  update: Partial<T>,
): T {
  return { ...current, ...update, id: current.id };
}
