type UpcomingItem = {
  title: string;
  time: string;
  room: string;
};

type QuickAccessPanelProps = {
  upcoming: UpcomingItem[];
};

export function QuickAccessPanel({ upcoming }: QuickAccessPanelProps) {
  return (
    <div className="rounded-[30px] border border-gray-300 bg-white/80 p-4 shadow-md backdrop-blur-md md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-600">Today</p>
          <h3 className="mt-1 text-xl font-semibold text-gray-900">Quick access</h3>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-300">
          Updated
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {upcoming.map((item) => (
          <div
            key={`${item.title}-${item.time}-${item.room}`}
            className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 p-3.5 transition hover:border-emerald-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                <div className="mt-1 truncate text-[11px] text-gray-600">{item.room}</div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-300">
                {item.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
