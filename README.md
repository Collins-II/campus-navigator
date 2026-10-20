This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Shared page navigation

The homepage and all non-dashboard pages share [CampusNavbar](./components/ui/CampusNavbar.tsx) for the UNZA brand, desktop navigation, notifications and account actions. [PageHeader](./components/ui/PageHeader.tsx) adds page titles, back links and optional actions beneath that navbar; chat uses the navbar above its split-pane layout. Mobile pages retain the bottom navigation. The dashboard keeps its independent navigation design.

## Student timetable

The `/timetable` page presents published sessions in a day-grouped table, sorted by start time. Filter by department, academic year, semester and cohort to find the relevant classes; the university schedule is not automatically limited to enrolled courses. On smaller screens, scroll the table horizontally while the time column stays visible.

**Download PDF** saves a landscape A4 timetable directly, without opening a print dialog. The PDF contains only sessions matching the current filters, including room details, lecturers and session notes, with repeated column headings and page numbers for longer schedules. PDF generation runs in the browser and loads only when requested. CSV and recurring calendar (`.ics`) exports remain available and use the same filtered sessions.

Timetables require an authenticated student session and a configured campus-data integration. Announcements remain visible beside the schedule on wide screens and below it on smaller screens. Check the live page for schedule changes after downloading.

Run `npm run test:timetable` with Node.js 22.18+ (or Node.js 24+) to check PDF contents, pagination, missing details and empty-export handling.

## MongoDB availability

Configure `MONGODB_URI` (or the supported `MONGODB_URL` / `DATABASE_URL` fallback) in the deployment environment. If MongoDB is unreachable, Mongo-backed API routes return a retryable `503` response with a user-safe message and `Retry-After` header; validation and duplicate-record failures return `400` and `409` respectively. Connection and server errors are logged with operation and error type, not the connection string or raw database message. Check the deployment logs, confirm the cluster is available, and verify its network access and credentials before retrying.

Atlas SRV and TXT lookups use Node's promise-based DNS resolver, as used by the MongoDB driver. The database module sets that resolver to `8.8.8.8` and `1.1.1.1` because the local network's default DNS can refuse these lookups (`ECONNREFUSED`). This is a process-wide resolver setting, and the runtime must allow DNS traffic to those servers as well as connections to Atlas. Do not replace it with only the callback-based `dns.setServers` API: that did not resolve the failure in the Next.js runtime.

Run `npm run test:database` with Node.js 24+ for resolver setup, connection reuse, retry and credential-safe diagnostic tests. These tests mock DNS and MongoDB; they do not access a live database.

## Student lecture-room bookings

Students can request **lecture rooms only**, from either `/bookings` or the dashboard. Only rooms explicitly classified by staff with `spaceType: lecture_room` are eligible. Legacy category labels do not grant access: unclassified locations are hidden until staff verify and classify them in Central Admin's Campus locations register. Other campus locations remain visible on the map but cannot be reserved.

On mobile, purpose choices stay side by side with shorter timing hints, including in the dashboard booking dialog. The three dashboard summary cards also share one compact row; larger screens retain the roomier layout.

- **Tutorial Group:** submit at least **48 hours before** the session starts. There is no maximum advance-booking limit.
- **Event:** submit **between 7 and 14 days before** the event starts, inclusive.
- **Study Circle:** a member can request a room from the chat Circle board or select their circle in the booking form. The circle must have **at least 50 unique members, including the requester**. These reservations use the Tutorial Group purpose and its 48-hour minimum. The server verifies membership and reserves capacity for the full circle; a submitted attendee count cannot bypass eligibility.

Advance notice is measured from submission to the exact start timestamp, not calendar dates. The form displays local times and sends timezone-qualified timestamps. Tutorial Groups require a group name, course code, topic/description, tutor or group-leader name, and expected attendees. Event names are required; TG booking titles are optional. Attendees must fit the room's published capacity when it is known. Disabled rooms, published class slots and overlapping non-cancelled reservations are rejected.

New requests remain pending until campus staff approve them in Central Admin. Editing also enforces the current rules, rechecks availability (including when rescheduling within the same room), and returns the request to pending approval. A circle booking cannot be detached from its circle to bypass membership checks. Existing bookings remain visible. Cancelled or started bookings cannot be edited; students cannot cancel a booking after it starts. Published classes take priority: central admin rejects conflicting requests and automatically cancels conflicting reservations when publishing a timetable, with `cancellationReason: "timetable_conflict"` shown on booking details and in history.

Configure server-only `ADMIN_APP_URL` and `STUDENT_APP_API_KEY` (matching Central Admin). Creation, edits, cancellations and booking lists are proxied to the central integration using the student ID from the authenticated session; there is no fallback to local booking writes if central admin is unavailable. An inactive or unregistered central-admin student account is reported as an account issue; an unexpected 404 from the integration URL is reported as `502` (integration unavailable). Both apps must use the same database for students, rooms and Study Circles. Staff approval checks the submission-time window rather than penalizing a valid request for a later review. Central admin must be deployed with purpose authorization support before deploying this student update.

Run `npm run test:bookings` with Node.js 24+ to check exact time-window boundaries, input validation, lecture-only queries, membership thresholds, capacity, conflict checks, approval and cancellation behavior. Tests mock database writes and never create real bookings. Restart an already-running development server after pulling booking-schema changes so Mongoose reloads the new fields; no data migration is required.

## Study Circles

On `/chat`, select two or more other students when starting a conversation to create a named Study Circle. Existing group chats also have a **Circle board** tab; direct messages keep their normal conversation view.

- Share future study sessions at published campus locations, RSVP and open campus directions. Times use each student's local timezone. A meetup is a plan, **not a room reservation**; use `/bookings` when a reservation is needed.
- Circles with **50+ members** can also use **Request lecture room** on the board to start a Tutorial Group booking, subject to the booking rules above. A meetup activity alone is not a reservation.
- Plan revision topics or meeting times with 2–6-option polls. Each member has one changeable vote. Votes and RSVPs are visible to circle members, not anonymous.
- Keep useful HTTP(S) links or upload **PDF and DOCX documents (up to 4 MB each)** in the **Resource shelf**. Choose **Pinned resource → Upload file**, select a document, and add a title/details. Files show their name and size with a download action; links still open external websites.

Activities are stored in MongoDB and restricted to authenticated members of the group. Authors can remove their activities; the circle creator can remove any activity. The board refreshes every 15 seconds while visible, with cursor pagination and server-side filters. Board activities do not create chat messages or unread-message notifications; check the board for updates.

Documents are stored as binary data within their resource record in MongoDB, not on the deployment filesystem or a public URL. Deleting the resource deletes its file in the same operation. List responses exclude the binary data, and each download rechecks membership and is served as a private, non-cached attachment. No extra storage credentials are required, but uploads count against database storage and transfer limits; monitor usage before scaling this to a large student population.

Uploads are size-bounded on the client and server. The server checks filenames, PDF signatures/end markers and DOCX package contents with limits on archive expansion; legacy `.doc`, macro-enabled and encrypted Word documents are not supported. These checks are **not antivirus scanning**. Only share material you have permission to share, and download documents only from people you trust. The multipart request limit includes 64 KB of overhead above the 4 MB file limit; your hosting provider may impose additional limits.

Run `npm run test:circles` with Node.js 24+ for input validation and API tests using mocked authentication and database operations. These tests never access a live MongoDB database. The API tests use Node's experimental module-mocking and TypeScript-transform flags.

## Campus commerce and DPO

Authenticated students can use `/commerce` to purchase campus services. Checkout creates a pending order, requests a hosted DPO payment token, and redirects the student to DPO. Configure these server-side variables before enabling live checkout:

```env
DPO_COMPANY_TOKEN=your-company-token
DPO_CURRENCY=ZMW
# Optional: use the DPO sandbox/API endpoint supplied for your account
DPO_API_URL=https://secure.3gdirectpay.com/API/v6/
```

Configure DPO to POST payment notifications to `/api/commerce/callback`. The callback marks the matching order as `paid` only when DPO returns result `000`; no card data is stored by this application.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
