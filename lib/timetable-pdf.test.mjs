import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTimetablePdf } from './timetable-pdf.ts';

const session = {
  _id: 'session-1',
  academicYear: '2026',
  semester: 'Semester 1',
  department: { _id: 'dept-1', code: 'CSC', name: 'Computer Science' },
  course: { _id: 'course-1', code: 'CSC201', title: 'Data Structures' },
  room: { _id: 'room-1', name: 'LT 1', building: 'Science Building' },
  cohort: 'Year 2',
  lecturer: 'Dr Banda',
  dayOfWeek: 'Monday',
  startTime: '08:00',
  endTime: '10:00',
  notes: 'Bring your laptop',
};
const filters = ['Computer Science', '2026', 'Semester 1', 'Cohort: Year 2'];
const generatedAt = new Date(2026, 9, 19);

test('creates a real landscape A4 PDF containing session details and filter context', () => {
  const pdf = createTimetablePdf([session], filters, generatedAt);
  const content = pdf.output();

  assert.ok(content.startsWith('%PDF-'));
  assert.equal(pdf.getNumberOfPages(), 1);
  assert.ok(Math.abs(pdf.internal.pageSize.getWidth() - 297) < 1);
  assert.ok(Math.abs(pdf.internal.pageSize.getHeight() - 210) < 1);
  for (const text of ['Weekly timetable', 'CSC201 Data Structures', 'Science Building', 'Dr Banda', 'Bring your laptop', 'Cohort: Year 2', '19 Oct 2026', 'Page 1 of 1']) {
    assert.ok(content.includes(text), `PDF is missing ${text}`);
  }
});

test('exports exactly the supplied sessions in their displayed order', () => {
  const second = { ...session, _id: 'session-2', course: { _id: 'course-2', code: 'CSC202', title: 'Algorithms' } };
  const content = createTimetablePdf([second, session], filters, generatedAt).output();
  assert.ok(content.indexOf('CSC202 Algorithms') < content.indexOf('CSC201 Data Structures'));
  assert.equal((content.match(/CSC201 Data Structures/g) || []).length, 1);
  assert.ok(!content.includes('CSC999'));
});

test('paginates a long timetable with repeated headers and numbered footers', () => {
  const rows = Array.from({ length: 120 }, (_, index) => ({
    ...session,
    _id: `session-${index}`,
    course: { _id: `course-${index}`, code: `CSC${1000 + index}`, title: 'Lecture' },
  }));
  const pdf = createTimetablePdf(rows, filters, generatedAt);
  const content = pdf.output();
  const pages = pdf.getNumberOfPages();

  assert.ok(pages > 1);
  assert.equal((content.match(/\(Course \/ session\)/g) || []).length, pages);
  for (let page = 1; page <= pages; page++) {
    assert.ok(content.includes(`Page ${page} of ${pages}`));
  }
  for (let index = 0; index < rows.length; index++) {
    assert.ok(content.includes(`CSC${1000 + index} Lecture`), `Missing session ${index}`);
  }
});

test('shows explicit placeholders for unconfirmed details and wraps long notes', () => {
  const pdf = createTimetablePdf([{
    ...session,
    course: undefined,
    room: undefined,
    lecturer: undefined,
    notes: 'Please check the updated room assignment before attending this lecture. '.repeat(20),
  }], filters, generatedAt);
  const content = pdf.output();
  assert.ok(content.includes('Course to be confirmed'));
  assert.ok(content.includes('To be confirmed'));
  assert.ok(!content.includes('undefined'));
  assert.ok(!content.includes('NaN'));
});

test('rejects empty exports instead of producing a misleading blank timetable', () => {
  assert.throws(() => createTimetablePdf([], filters), /no timetable sessions to export/);
});
