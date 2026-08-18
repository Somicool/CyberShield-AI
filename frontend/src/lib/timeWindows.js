/**
 * Time windows for the Live Feed filter bar.
 *
 * The incidents API has no date parameter, so these are applied to the fetched
 * result set in the browser. Kept out of the component file so Fast Refresh
 * stays happy.
 */
export const TIME_WINDOWS = [
  { value: '', label: 'All time' },
  { value: '24h', label: 'Last 24 hours', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { value: '30d', label: 'Last 30 days', hours: 24 * 30 },
]

/** Cutoff timestamp (ms) for a window value, or null for "all time". */
export function windowCutoff(value) {
  const hours = TIME_WINDOWS.find((t) => t.value === value)?.hours
  return hours ? Date.now() - hours * 3600 * 1000 : null
}
