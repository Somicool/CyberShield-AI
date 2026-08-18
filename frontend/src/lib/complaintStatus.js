/**
 * Citizen complaint status vocabulary.
 *
 * Kept out of the page components so the labels and tones can be shared
 * without tripping Fast Refresh (a file that exports both components and
 * constants loses hot-reload state).
 *
 * The values mirror the backend's complaint status enum — this file only maps
 * them to display text and colour, it never invents a status.
 */

export const STATUS_STYLE = {
  submitted: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  under_review: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  resolved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
}

export const STATUS_LABEL = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  resolved: 'Resolved',
}
