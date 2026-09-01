"use client";

const quickLinks = [
  "Campus Map",
  "Classrooms",
  "Study Spots",
  "Parking",
  "Cafeteria",
];

const rooms = [
  { name: "A-201", status: "Open" },
  { name: "B-114", status: "Booked" },
  { name: "C-310", status: "Open" },
  { name: "Lab 7", status: "Busy" },
];

export function Sidebar() {
  return (
    <aside className="flex h-full flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Campus Navigator</p>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">Explore campus</h2>
      </div>

      <div className="rounded-xl bg-gray-50 p-3 border border-gray-200">
        <label className="text-xs font-medium uppercase tracking-[0.15em] text-gray-600">Search</label>
        <input
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none ring-0 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          placeholder="Find a room or building"
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-800">Quick links</p>
        <div className="space-y-2">
          {quickLinks.map((item) => (
            <button
              key={item}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <span>{item}</span>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-800">Popular rooms</p>
        <div className="space-y-2">
          {rooms.map((room) => (
            <div
              key={room.name}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm border border-gray-200"
            >
              <span className="font-medium text-gray-800">{room.name}</span>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                  room.status === "Open"
                    ? "bg-emerald-100 text-emerald-700"
                    : room.status === "Booked"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-orange-100 text-orange-700"
                }`}
              >
                {room.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
