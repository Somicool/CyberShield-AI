/** Simple shimmer skeleton block, used for table/panel loading states. */
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-800/70 ${className}`} />
}

/** A run of skeleton table rows matching the case table column count. */
export function SkeletonRows({ rows = 6, cols = 9 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-slate-800">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
