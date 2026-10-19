'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Download, FileDown, LoaderCircle, Megaphone, Search, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Allocation } from '@/lib/timetable-pdf';

type Announcement = { _id: string; title: string; message: string; priority: string; createdAt: string };
type Department = { _id: string; code: string; name: string };
type CampusData = { timetable: Allocation[]; announcements: Announcement[]; departments: Department[] };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ICS_DAY: Record<string, string> = { Monday: 'MO', Tuesday: 'TU', Wednesday: 'WE', Thursday: 'TH', Friday: 'FR', Saturday: 'SA', Sunday: 'SU' };

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  const [academicYear, setAcademicYear] = useState('all');
  const [cohort, setCohort] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

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
  const academicYears = useMemo(() => [...new Set((data?.timetable ?? []).map((t) => t.academicYear))].sort().reverse(), [data]);

  const rows = useMemo(
    () =>
      (data?.timetable ?? [])
        .filter((t) => department === 'all' || t.department?._id === department)
        .filter((t) => semester === 'all' || t.semester === semester)
        .filter((t) => academicYear === 'all' || t.academicYear === academicYear)
        .filter((t) => !cohort.trim() || t.cohort.toLowerCase().includes(cohort.trim().toLowerCase()))
        .sort((a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime)),
    [data, department, semester, academicYear, cohort]
  );

  const groups = DAYS.map((day) => ({ day, sessions: rows.filter((row) => row.dayOfWeek === day) }))
    .filter((group) => group.sessions.length);
  const courseCount = new Set(rows.map((row) => row.course?._id).filter(Boolean)).size;
  const hasFilters = department !== 'all' || semester !== 'all' || academicYear !== 'all' || Boolean(cohort.trim());
  const filterSummary = [
    data?.departments.find((item) => item._id === department)?.name || 'All departments',
    academicYear === 'all' ? 'All academic years' : academicYear,
    semester === 'all' ? 'All semesters' : semester,
    cohort.trim() ? `Cohort: ${cohort.trim()}` : 'All cohorts',
  ];

  function clearFilters() {
    setDepartment('all');
    setSemester('all');
    setAcademicYear('all');
    setCohort('');
  }

  async function downloadPdf() {
    setExporting(true);
    setExportError('');
    try {
      const { createTimetablePdf } = await import('@/lib/timetable-pdf');
      const pdf = createTimetablePdf(rows, filterSummary);
      await pdf.save('unza-timetable.pdf', { returnPromise: true });
    } catch (cause) {
      console.error('Timetable PDF export failed:', cause);
      setExportError('Your PDF could not be downloaded. Please try again. You can also export CSV or Calendar.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-4 md:px-8 md:pt-8">
      <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="Timetable"
        subtitle="Your week, clearly planned. Find your classes and keep a copy for offline use."
        backHref="/dashboard"
        actions={
          <>
            <button type="button" disabled={!rows.length} onClick={() => download('timetable.csv', toCsv(rows), 'text/csv')} className="ui-btn border border-white/30 text-white hover:bg-white/10">
              <Download aria-hidden="true" className="h-4 w-4" /> CSV
            </button>
            <button type="button" disabled={!rows.length} onClick={() => download('timetable.ics', toIcs(rows), 'text/calendar')} className="ui-btn border border-white/30 text-white hover:bg-white/10">
              <CalendarDays aria-hidden="true" className="h-4 w-4" /> Calendar
            </button>
            <button type="button" disabled={!rows.length || exporting} aria-busy={exporting} onClick={downloadPdf} className="ui-btn ui-btn-primary">
              {exporting ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <FileDown aria-hidden="true" className="h-4 w-4" />}
              {exporting ? 'Preparing PDF...' : 'Download PDF'}
            </button>
          </>
        }
      />

      {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {exportError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{exportError}</p>}
      {!data && !error && (
        <div role="status" className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-600">
          <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-emerald-700" /> Loading your timetable...
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <section aria-labelledby="filters-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="filters-title" className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-emerald-700" /> Find your classes
              </h2>
              {hasFilters && <button type="button" onClick={clearFilters} className="min-h-11 px-2 text-sm font-semibold text-emerald-700 underline-offset-4 hover:underline">Clear filters</button>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-slate-600">
                Department
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="ui-input mt-2 !rounded-lg !border !text-sm">
                <option value="all">All departments</option>
                {data.departments.map((d) => <option key={d._id} value={d._id}>{d.code} - {d.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Academic year
                <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="ui-input mt-2 !rounded-lg !border !text-sm">
                  <option value="all">All academic years</option>
                  {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Semester
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="ui-input mt-2 !rounded-lg !border !text-sm">
                <option value="all">All semesters</option>
                {semesters.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Cohort / year group
                <span className="relative mt-2 block">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
                  <input type="search" value={cohort} onChange={(e) => setCohort(e.target.value)} placeholder="e.g. Year 2" className="ui-input !rounded-lg !border !pl-9 !text-sm" />
                </span>
              </label>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Showing the published university schedule, not just your enrolled courses. Choose your department and cohort to narrow it down. Downloads use these filters.</p>
          </section>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section aria-labelledby="schedule-title" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Plan your week</p>
                <h2 id="schedule-title" className="text-xl font-bold text-emerald-950">Weekly schedule</h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{filterSummary.join(' / ')}</p>
              </div>
              <p role="status" aria-atomic="true" className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                {rows.length} {rows.length === 1 ? 'session' : 'sessions'} &middot; {courseCount} {courseCount === 1 ? 'course' : 'courses'} &middot; {groups.length} {groups.length === 1 ? 'day' : 'days'}
              </p>
            </div>
            {rows.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <CalendarDays aria-hidden="true" className="mx-auto mb-4 h-9 w-9 text-slate-300" />
                <h3 className="font-semibold text-emerald-950">{hasFilters ? 'No matching classes' : 'Your schedule is on its way'}</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  {hasFilters ? 'Try a different department, year or cohort, or clear your filters to see all published sessions.' : 'There are no published sessions yet. Check back once the university releases the timetable.'}
                </p>
                {hasFilters && <button type="button" onClick={clearFilters} className="ui-btn ui-btn-primary mt-5">Clear filters</button>}
              </div>
            ) : (
              <>
                <p id="table-scroll-hint" className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-xs text-slate-500 lg:hidden">
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /> Scroll across to see all class details. Times use the 24-hour clock.
                </p>
                <div role="region" aria-label="Weekly timetable" aria-describedby="table-scroll-hint" tabIndex={0} className="overflow-x-auto focus-visible:-outline-offset-2">
                  <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
                    <caption className="sr-only">Published weekly timetable, grouped by day and ordered by start time. Times use the 24-hour clock. {filterSummary.join(', ')}.</caption>
                    <thead>
                      <tr className="border-b border-slate-200 bg-white text-[10px] uppercase tracking-wider text-slate-500">
                        <th scope="col" className="sticky left-0 z-10 w-28 bg-white px-5 py-4 font-semibold">Time</th>
                        <th scope="col" className="w-[30%] px-4 py-4 font-semibold">Course / session</th>
                        <th scope="col" className="w-[21%] px-4 py-4 font-semibold">Room / building</th>
                        <th scope="col" className="w-[19%] px-4 py-4 font-semibold">Cohort</th>
                        <th scope="col" className="px-4 py-4 font-semibold">Lecturer</th>
                      </tr>
                    </thead>
                    {groups.map(({ day, sessions }) => (
                      <tbody key={day}>
                        <tr>
                          <th scope="rowgroup" colSpan={5} className="border-y border-emerald-100 bg-emerald-50/70 px-5 py-3 text-xs text-emerald-950">
                            <span className="sticky left-5 inline-flex items-center gap-3">
                              <span className="font-bold">{day}</span>
                              <span className="font-normal text-emerald-700">{sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}</span>
                            </span>
                          </th>
                        </tr>
                        {sessions.map((row) => (
                          <tr key={row._id} className="group border-b border-slate-100 align-top last:border-0 hover:bg-slate-50">
                            <td className="sticky left-0 z-10 bg-white px-5 py-5 tabular-nums group-hover:bg-slate-50">
                              <span className="block font-semibold text-emerald-950">{row.startTime}</span>
                              <span className="mt-1 block text-xs text-slate-500">to {row.endTime}</span>
                            </td>
                            <th scope="row" className="break-words px-4 py-5 font-normal">
                              <span className="inline-block rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">{row.course?.code || 'Course TBC'}</span>
                              <span className="mt-2 block font-semibold leading-5 text-slate-800">{row.course?.title || 'Course to be confirmed'}</span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500">{[row.academicYear, row.semester].filter(Boolean).join(' / ')}</span>
                              {row.notes && <span className="mt-2 block whitespace-pre-line text-xs leading-5 text-slate-600">{row.notes}</span>}
                            </th>
                            <td className="break-words px-4 py-5">
                              <span className="font-medium text-slate-700">{row.room?.name || 'To be confirmed'}</span>
                              {row.room?.building && <span className="mt-1 block text-xs leading-5 text-slate-500">{row.room.building}</span>}
                            </td>
                            <td className="break-words px-4 py-5">
                              <span className="text-slate-700">{row.cohort || 'To be confirmed'}</span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500">{row.department?.code || row.department?.name}</span>
                            </td>
                            <td className="break-words px-4 py-5 text-slate-600">{row.lecturer || <span className="text-xs text-slate-500">To be confirmed</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>
                </div>
                <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-4 text-xs leading-5 text-slate-500">
                  <span>All times shown in 24-hour format.</span>
                  <span>Schedules can change. Check announcements for updates.</span>
                </div>
              </>
            )}
          </section>

          <aside aria-labelledby="announcements-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 id="announcements-title" className="mb-1 flex items-center gap-2 text-sm font-bold text-emerald-950">
              <Megaphone aria-hidden="true" className="h-4 w-4 text-emerald-700" /> Announcements
            </h2>
            <p className="mb-5 text-xs leading-5 text-slate-500">The latest notices from your university.</p>
            {data.announcements.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">You&apos;re all caught up. No announcements right now.</p>
            ) : (
              <ul className="space-y-2">
                {data.announcements.map((a) => (
                  <li key={a._id} className={`rounded-xl border p-4 text-sm ${priorityClass(a.priority)}`}>
                    {['urgent', 'high'].includes(a.priority) && <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-700">{a.priority} priority</p>}
                    <p className="font-bold">{a.title}</p>
                    <p className="mt-1 whitespace-pre-line text-gray-700">{a.message}</p>
                    <p className="mt-2 text-[11px] text-gray-500">{new Date(a.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
