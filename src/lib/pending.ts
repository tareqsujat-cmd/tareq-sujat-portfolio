/**
 * Facts marked as unverified in content carry a `TODO_CONFIRM` prefix.
 *
 * Keeping the detection in one place means a placeholder can never silently
 * render as though it were a confirmed fact — every surface that prints one of
 * these fields asks this function first.
 */

const MARKER = /TODO_CONFIRM/i;

export function isPending(value: string | null | undefined): boolean {
  return typeof value === "string" && MARKER.test(value);
}

/** Splits a list into confirmed entries and the pending ones. */
export function partitionPending(values: readonly string[]): {
  confirmed: string[];
  pending: string[];
} {
  const confirmed: string[] = [];
  const pending: string[] = [];

  for (const value of values) {
    (isPending(value) ? pending : confirmed).push(value);
  }

  return { confirmed, pending };
}
