export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, w) => (
        <div key={w} className="flex flex-col gap-2">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
