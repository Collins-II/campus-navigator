import { Clock3, Users } from 'lucide-react';

import { OverviewActionLink } from '@/components/home/OverviewPanel';

type SelectedLocationCardProps = {
  selectedDestination: {
    name: string;
    tag: string;
  };
};

export function SelectedLocationCard({ selectedDestination }: SelectedLocationCardProps) {
  return (
    <div className="rounded-[30px] border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-4 shadow-md backdrop-blur-md md:p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-600">Selected</p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">{selectedDestination.name}</h3>
        </div>
        <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-300">
          {selectedDestination.tag}
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm text-gray-700">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <Clock3 className="h-4 w-4 text-emerald-600" />
          <span>Best arrival window: 8:30 AM</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <Users className="h-4 w-4 text-emerald-600" />
          <span>Capacity: 120 students</span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] text-gray-700">
          <span>Route readiness</span>
          <span className="font-medium text-emerald-600">92%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-emerald-200">
          <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300" />
        </div>
      </div>

      <OverviewActionLink destinationName={selectedDestination.name} />
    </div>
  );
}
