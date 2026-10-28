// All selected is the overview state; an individual click starts a focused selection.
export function toggleAspectSelection(selected, id, allIds) {
  if (!allIds.includes(id)) return [...selected];
  if (selected.length === allIds.length) return [id];
  const next = selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id];
  return next.length ? next : [...allIds];
}
