import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

type Ref = { _id: string; code?: string; name?: string; title?: string; building?: string };

export type Allocation = {
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

export function createTimetablePdf(rows: Allocation[], filters: string[], generatedAt = new Date()) {
  if (!rows.length) throw new Error('There are no timetable sessions to export.');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const generated = generatedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  doc.setProperties({ title: 'UNZA weekly timetable', author: 'Campus Navigator' });
  doc.setFontSize(9);
  const context: string[] = doc.splitTextToSize(filters.join('  |  '), width - 28);
  const tableTop = 34 + context.length * 4;

  autoTable(doc, {
    startY: tableTop,
    margin: { top: tableTop, right: 14, bottom: 18, left: 14 },
    head: [['Day', 'Time', 'Course / session', 'Room / building', 'Cohort / department', 'Lecturer']],
    body: rows.map((row) => [
      row.dayOfWeek,
      `${row.startTime} - ${row.endTime}`,
      [
        [row.course?.code, row.course?.title].filter(Boolean).join(' ') || 'Course to be confirmed',
        [row.academicYear, row.semester].filter(Boolean).join(' / '),
        row.notes,
      ].filter(Boolean).join('\n'),
      [row.room?.name, row.room?.building].filter(Boolean).join('\n') || 'To be confirmed',
      [row.cohort, row.department?.code || row.department?.name].filter(Boolean).join('\n') || 'To be confirmed',
      row.lecturer || 'To be confirmed',
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: [31, 41, 55], lineColor: [225, 231, 227], lineWidth: 0.2, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [5, 46, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 249, 247] },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold', textColor: [1, 102, 48] },
      1: { cellWidth: 29 },
      2: { cellWidth: 78 },
      3: { cellWidth: 47 },
      4: { cellWidth: 43 },
      5: { cellWidth: 47 },
    },
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    didDrawPage: () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(1, 102, 48);
      doc.text('UNZANAV / CAMPUS TIMETABLE', 14, 13);
      doc.setFontSize(20);
      doc.setTextColor(5, 46, 22);
      doc.text('Weekly timetable', 14, 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text(context, 14, 30);
    },
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text(`Generated ${generated} | ${rows.length} sessions | Check Campus Navigator for updates.`, 14, height - 9);
    doc.text(`Page ${page} of ${pages}`, width - 14, height - 9, { align: 'right' });
  }

  return doc;
}
