'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Megaphone, Printer } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

type Ref = { _id: string; code?: string; name?: string; title?: string; building?: string };
type Allocation = {
  _id: string;
  academicYear: string;
  semester: string;
  department?: Ref;
  course?: Ref;
  room?: Ref;
  cohort: string;
  lecturer?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  notes?: string;
};
type Announcement = { _id: string; title: string; message: string; priority: string; createdAt: string };
type Department = { _id: string; code: string; name: string };
type CampusData = { timetable: Allocation[]; announcements: Announcement[]; departments: Department[] };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ICS_DAY: Record<string, string> = { Monday: 'MO', Tuesday: 'TU', Wednesday: 'WE', Thursday: 'TH', Friday: 'FR', Saturday: 'SA' };

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

function toCsv(rows: Allocation[]) {
  const header = ['Day', 'Start', 'End', 'Course code', 'Course', 'Room', 'Building', 'Cohort', 'Lecturer', 'Department'];
  const lines = rows.map((r) =>
    [r.dayOfWeek, r.startTime, r.endTime, r.course?.code ?? '', r.course?.title ?? '', r.room?.name ?? '', r.room?.building ?? '', r.cohort, r.lecturer ?? '', r.department?.code ?? '']
      .map(csvCell)
      .join(',')
  );
  return [header.map(csvCell).join(','), ...lines].join('\r\n');
}

// Weekly recurring events starting on the next occurrence of each weekday.
function toIcs(rows: Allocation[]) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const events = rows.map((r) => {
    const target = DAYS.indexOf(r.dayOfWeek) + 1;
    const d = new Date();
    d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7));
    const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const t = (s: string) => s.replace(':', '') + '00';
    return [
      'BEGIN:VEVENT',
      `UID:${r._id}@unza-campus`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART:${day}T${t(r.startTime)}`,
      `DTEND:${day}T${t(r.endTime)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${ICS_DAY[r.dayOfWeek]}`,
      `SUMMARY:${esc(`${r.course?.code ?? ''} ${r.course?.title ?? ''}`.trim())}`,
      `LOCATION:${esc([r.room?.name, r.room?.building].filter(Boolean).join(', '))}`,
      `DESCRIPTION:${esc(`Cohort: ${r.cohort}${r.lecturer ? `\nLecturer: ${r.lecturer}` : ''}`)}`,
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UNZA Campus//Timetable//EN', ...events, 'END:VCALENDAR'].join('\r\n');
}

const priorityClass = (p: string) =>
  p === 'urgent' ? 'border-red-300 bg-red-50' : p === 'high' ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white';

export default function TimetablePage() {
  const [data, setData] = useState<CampusData | null>(null);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState('all');
  const [semester, setSemester] = useState('all');
  const [cohort, setCohort] = useState('');

  useEffect(() => {
    fetch('/api/campus-data')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Unable to load campus data.');
        setData(json);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const semesters = useMemo(() => [...new Set((data?.timetable ?? []).map((t) => t.semester))], [data]);

  const rows = useMemo(
    () =>
      (data?.timetable ?? [])
        .filter((t) => department === 'all' || t.department?._id === department)
        .filter((t) => semester === 'all' || t.semester === semester)
        .filter((t) => !cohort.trim() || t.cohort.toLowerCase().includes(cohort.trim().toLowerCase()))
        .sort((a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime)),
    [data, department, semester, cohort]
  );

  return (
    <div className="min-h-screen bg-white px-4 pb-28 pt-4 md:px-8">
      <PageHeader
        title="Timetable"
        subtitle="Published lecture schedule and announcements from the university."
        backHref="/dashboard"
        actions={
          <>
            <button type="button" disabled={!rows.length} onClick={() => download('timetable.csv', toCsv(rows), 'text/csv')} className="ui-btn ui-btn-primary">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button type="button" disabled={!rows.length} onClick={() => download('timetable.ics', toIcs(rows), 'text/calendar')} className="ui-btn ui-btn-primary">
              <Download className="h-4 w-4" /> Calendar
            </button>
            <button type="button" disabled={!rows.length} onClick={() => window.print()} className="ui-btn ui-btn-primary">
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
          </>
        }
      />

      {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-500">Loading...</p>}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-4 grid gap-2 sm:grid-cols-3 print:hidden">
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" aria-label="Department">
                <option value="all">All departments</option>
                {data.departments.map((d) => <option key={d._id} value={d._id}>{d.code} - {d.name}</option>)}
              </select>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" aria-label="Semester">
                <option value="all">All semesters</option>
                {semesters.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={cohort} onChange={(e) => setCohort(e.target.value)} placeholder="Filter by cohort / year" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-gray-500">No published timetable entries match your filters.</p>
            ) : (
              DAYS.filter((day) => rows.some((r) => r.dayOfWeek === day)).map((day) => (
                <div key={day} className="mb-5">
                  <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-[#008236]">{day}</h2>
                  <ul className="space-y-2">
                    {rows.filter((r) => r.dayOfWeek === day).map((r) => (
                      <li key={r._id} className="rounded-md border border-gray-200 p-3 text-sm">
                        <p className="font-bold">{r.startTime} - {r.endTime} &middot; {r.course?.code} {r.course?.title}</p>
                        <p className="text-gray-600">
                          {r.room?.name}{r.room?.building ? `, ${r.room.building}` : ''} &middot; {r.cohort}{r.lecturer ? <> &middot; {r.lecturer}</> : null}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>

          <aside className="print:hidden">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#008236]">
              <Megaphone className="h-4 w-4" /> Announcements
            </h2>
            {data.announcements.length === 0 ? (
              <p className="text-sm text-gray-500">No announcements.</p>
            ) : (
              <ul className="space-y-2">
                {data.announcements.map((a) => (
                  <li key={a._id} className={`rounded-md border p-3 text-sm ${priorityClass(a.priority)}`}>
                    <p className="font-bold">{a.title}</p>
                    <p className="mt-1 whitespace-pre-line text-gray-700">{a.message}</p>
                    <p className="mt-2 text-[11px] text-gray-500">{new Date(a.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
