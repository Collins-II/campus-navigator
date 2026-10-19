"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, BookOpen, CalendarDays, Check, CheckCheck, Download, ExternalLink, FileText, ListChecks, Loader2, MapPin, Plus, Trash2, Upload, Users, X } from "lucide-react";
import { CIRCLE_DOCUMENT_ACCEPT, validateCircleDocument, validateCircleDraft, type CircleActivity, type CircleKind } from "@/lib/study-circles";

type ActivityPage = { activities: CircleActivity[]; nextCursor: string | null };
type Props = { conversationId: string; userId: string; ownerId?: string; memberNames: Map<string, string> };
const labels: Record<CircleKind, string> = { session: "Study session", poll: "Planning poll", resource: "Pinned resource" };
const icons = { session: CalendarDays, poll: ListChecks, resource: BookOpen };
const fieldClass = "min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

async function requestData<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(response.status === 413
      ? "The upload is too large. Choose a document up to 4 MB."
      : "The server returned an unexpected response. Please try again.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The Study Circle could not be updated. Please try again.");
  return data;
}

async function loadActivities(endpoint: string, pages: number, filter: "all" | CircleKind, signal?: AbortSignal) {
  const activities: CircleActivity[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < pages; page++) {
    const search = new URLSearchParams();
    if (cursor) search.set("before", cursor);
    if (filter !== "all") search.set("kind", filter);
    const result: ActivityPage = await requestData<ActivityPage>(`${endpoint}?${search}`, { signal, cache: "no-store" });
    activities.push(...result.activities);
    cursor = result.nextCursor;
    if (!cursor) break;
  }
  return { activities, hasMore: Boolean(cursor) };
}

export function StudyCircle({ conversationId, userId, ownerId, memberNames }: Props) {
  const [activities, setActivities] = useState<CircleActivity[]>([]);
  const [pages, setPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState<CircleKind | null>(null);
  const [filter, setFilter] = useState<"all" | CircleKind>("all");
  const requestVersion = useRef(0);
  const endpoint = `/api/chat/conversations/${conversationId}/circle`;

  const load = useCallback((signal?: AbortSignal) => {
    const version = ++requestVersion.current;
    return loadActivities(endpoint, pages, filter, signal)
      .then((result) => {
        if (signal?.aborted || version !== requestVersion.current) return;
        setActivities(result.activities);
        setHasMore(result.hasMore);
        setError("");
        setNow(Date.now());
      })
      .catch((error: unknown) => {
        if (!signal?.aborted && version === requestVersion.current) {
          setError(error instanceof Error ? error.message : "Unable to load the Study Circle.");
        }
      })
      .finally(() => {
        if (!signal?.aborted && version === requestVersion.current) setLoading(false);
      });
  }, [endpoint, pages, filter]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = setInterval(() => {
      if (!document.hidden) void load(controller.signal);
    }, 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);

  const mutate = async (method: string, body: object) => {
    setBusy(true);
    setActionError("");
    try {
      await requestData(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save your change.");
    } finally {
      setBusy(false);
    }
  };

  const download = async (activity: CircleActivity) => {
    if (!activity.document) return;
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`${endpoint}/${activity.id}/document`, { cache: "no-store" });
      if (!response.ok) {
        if (response.headers.get("content-type")?.includes("application/json")) {
          const data = await response.json();
          throw new Error(data.error || "Unable to download this document.");
        }
        throw new Error("Unable to download this document. Please try again.");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = activity.document.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to download this document.");
    } finally {
      setBusy(false);
    }
  };

  const visible = activities.filter((activity) => filter === "all" || activity.kind === filter);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-3 sm:p-5">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-2xl bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 text-white sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Less scrolling. More doing.</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight">Make a plan. Learn together.</h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-emerald-100">Find a time, meet on campus and keep useful documents and links where everyone can find them.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["session", "poll", "resource"] as const).map((kind) => {
              const Icon = icons[kind];
              return (
                <button key={kind} type="button" onClick={() => setCreating(kind)} className={`${actionClass} border border-white/20 bg-white/10 text-white hover:bg-white/20`}>
                  <Icon className="h-4 w-4" /> {labels[kind]}
                </button>
              );
            })}
          </div>
        </section>

        {creating && (
          <ActivityForm key={creating} kind={creating} endpoint={endpoint} onClose={() => setCreating(null)} onSaved={() => { setCreating(null); void load(); }} />
        )}

        <div className="flex gap-1 overflow-x-auto pb-1" aria-label="Filter circle activities">
          {(["all", "session", "poll", "resource"] as const).map((kind) => (
            <button key={kind} type="button" aria-pressed={filter === kind} onClick={() => {
              if (filter === kind) return;
              setLoading(true);
              setPages(1);
              setFilter(kind);
            }} className={`${actionClass} shrink-0 ${filter === kind ? "bg-emerald-700 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
              {kind === "all" ? "Everything" : kind === "session" ? "Meetups" : kind === "poll" ? "Polls" : "Resource shelf"}
            </button>
          ))}
        </div>

        {(error || actionError) && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>{actionError || error}</p>
            <button type="button" onClick={() => { setActionError(""); void load(); }} className={`${actionClass} shrink-0 hover:bg-amber-100`}>Refresh</button>
          </div>
        )}
        {loading ? (
          <div role="status" className="flex justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading circle activities</div>
        ) : !visible.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-emerald-700" />
            <h3 className="mt-3 font-semibold text-slate-900">{error ? "Activities are unavailable" : "Build something together"}</h3>
            <p className="mt-1 text-sm text-slate-500">{error ? "Your existing activities are safe. Try loading them again." : "Share a study session, run a quick poll or pin your first useful link."}</p>
          </div>
        ) : visible.map((activity) => {
          const Icon = icons[activity.kind];
          const mine = activity.responses[userId];
          const votes = Object.values(activity.responses);
          const ended = activity.kind === "session" && Date.parse(activity.startsAt) <= now;
          return (
            <article key={activity.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">{labels[activity.kind]}</p>
                  <h4 className="mt-1 break-words text-lg font-semibold text-slate-900">{activity.title}</h4>
                  <p className="mt-1 text-xs text-slate-500">Shared by {memberNames.get(activity.createdBy) || "a circle member"}</p>
                </div>
                {(activity.createdBy === userId || ownerId === userId) && (
                  <button type="button" aria-label={`Remove ${activity.title}`} disabled={busy} onClick={() => {
                    if (window.confirm(`Remove "${activity.title}" from this circle?`)) void mutate("DELETE", { activityId: activity.id });
                  }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              {activity.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{activity.description}</p>}
              {activity.kind === "session" && (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2">
                    <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{new Date(activity.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p className="flex items-start gap-2 break-words"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{activity.location}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={busy || ended} aria-pressed={mine === "going"} onClick={() => void mutate("PATCH", { activityId: activity.id, value: mine === "going" ? "not-going" : "going" })} className={`${actionClass} ${mine === "going" ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}>
                      <Check className="h-4 w-4" /> {ended ? "Session started" : mine === "going" ? "You're going" : "I'm going"}
                    </button>
                    <span className="flex items-center gap-1 text-xs text-slate-500"><Users className="h-4 w-4" />{votes.filter((vote) => vote === "going").length} going</span>
                    <Link href={`/navigation?destination=${encodeURIComponent(activity.location)}`} className={`${actionClass} text-emerald-800 hover:bg-emerald-50`}><MapPin className="h-4 w-4" /> Directions</Link>
                  </div>
                  <p className="text-xs text-slate-400">A meetup plan, not a room reservation. Check availability before meeting.</p>
                </div>
              )}
              {activity.kind === "poll" && (
                <div className="mt-4 space-y-2">
                  {activity.options.map((option, index) => {
                    const count = votes.filter((vote) => vote === String(index)).length;
                    const percent = votes.length ? Math.round(count / votes.length * 100) : 0;
                    return (
                      <button key={index} type="button" disabled={busy} aria-pressed={mine === String(index)} onClick={() => void mutate("PATCH", { activityId: activity.id, value: String(index) })} className={`relative flex min-h-12 w-full items-center gap-2 overflow-hidden rounded-xl border p-3 text-left text-sm disabled:opacity-50 ${mine === String(index) ? "border-emerald-500 text-emerald-900" : "border-slate-200 text-slate-700"}`}>
                        <span className="absolute inset-y-0 left-0 bg-emerald-50 transition-[width]" style={{ width: `${percent}%` }} />
                        {mine === String(index) && <CheckCheck className="relative h-4 w-4 shrink-0 text-emerald-700" />}
                        <span className="relative min-w-0 flex-1 break-words">{option}</span>
                        <span className="relative shrink-0 text-xs font-semibold">{count} · {percent}%</span>
                      </button>
                    );
                  })}
                  <p className="text-xs text-slate-500">{votes.length} {votes.length === 1 ? "vote" : "votes"} · One vote per member. Tap another option to change yours.</p>
                </div>
              )}
              {activity.kind === "resource" && (activity.document ? (
                <button type="button" disabled={busy} onClick={() => void download(activity)} className="mt-4 flex min-h-14 w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm text-emerald-800 hover:border-emerald-300 disabled:opacity-50">
                  <FileText className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{activity.document.name}</span><span className="mt-1 block text-xs text-slate-500">{activity.document.name.toLowerCase().endsWith(".pdf") ? "PDF" : "Word document"} · {(activity.document.size / (1024 * 1024)).toFixed(2)} MB · Download</span></span>
                  <Download className="h-5 w-5 shrink-0" />
                </button>
              ) : (
                <a href={activity.url} target="_blank" rel="noopener noreferrer" className="mt-4 flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-emerald-800 hover:border-emerald-300">
                  <ExternalLink className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{activity.url}</span><ArrowUpRight className="h-4 w-4 shrink-0" />
                </a>
              ))}
            </article>
          );
        })}
        {hasMore && <button type="button" disabled={loading || busy} onClick={() => { setLoading(true); setPages((count) => count + 1); }} className={`${actionClass} w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100`}>Load older activities</button>}
      </div>
    </div>
  );
}

function ActivityForm({ kind, endpoint, onClose, onSaved }: { kind: CircleKind; endpoint: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [url, setUrl] = useState("");
  const [resourceMode, setResourceMode] = useState<"link" | "document">("link");
  const [file, setFile] = useState<File | null>(null);
  const [places, setPlaces] = useState<string[]>([]);
  const [placesError, setPlacesError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPlaces = useCallback((signal?: AbortSignal) =>
    requestData<{ data: { name: string }[] }>("/api/locations", { signal })
      .then((data) => {
        if (!signal?.aborted) {
          setPlaces([...new Set(data.data.map((place) => place.name))]);
          setPlacesError("");
        }
      })
      .catch((error: unknown) => {
        if (!signal?.aborted) setPlacesError(error instanceof Error ? error.message : "Unable to load campus places.");
      }), []);

  useEffect(() => {
    if (kind !== "session") return;
    const controller = new AbortController();
    void loadPlaces(controller.signal);
    return () => controller.abort();
  }, [kind, loadPlaces]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (kind === "resource" && resourceMode === "document") {
      if (!file) { setError("Choose a PDF or DOCX document to upload."); return; }
      const metadata = validateCircleDocument(file.name, file.size);
      if (!metadata.data) { setError(metadata.error); return; }
    }
    const start = new Date(startsAt);
    const result = validateCircleDraft({
      kind, title, description, location, options, url,
      startsAt: Number.isNaN(start.getTime()) ? "" : start.toISOString(),
    }, Date.now(), resourceMode);
    if (!result.data) { setError(result.error); return; }
    setBusy(true);
    try {
      if (kind === "resource" && resourceMode === "document" && file) {
        const form = new FormData();
        form.set("title", result.data.title);
        form.set("description", result.data.description);
        form.set("file", file);
        await requestData(endpoint, { method: "POST", body: form });
      } else {
        await requestData(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.data) });
      }
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to share this activity.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
      <fieldset disabled={busy} className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">Share a {labels[kind].toLowerCase()}</h3>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Close activity form" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </div>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{kind === "poll" ? "Question" : "Title"}</span><input autoFocus required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} placeholder={kind === "session" ? "Calculus revision before the test" : kind === "poll" ? "What should we revise next?" : "Lecture notes and practice questions"} /></label>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>Details <span className="font-normal text-slate-400">(optional)</span></span><textarea maxLength={1000} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} className={fieldClass} placeholder="What should your circle know?" /></label>
      {kind === "session" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block min-w-0 space-y-1.5 text-sm font-medium text-slate-700"><span>When <span className="font-normal text-slate-400">(your local time)</span></span><input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={fieldClass} /></label>
          <label className="block min-w-0 space-y-1.5 text-sm font-medium text-slate-700"><span>Campus meeting place</span><select required value={location} onChange={(event) => setLocation(event.target.value)} className={fieldClass}><option value="">{places.length ? "Choose a place" : "No places loaded"}</option>{places.map((place) => <option key={place} value={place}>{place}</option>)}</select></label>
          {placesError && <div role="alert" className="text-sm text-amber-900 sm:col-span-2">{placesError} <button type="button" onClick={() => void loadPlaces()} className="min-h-11 px-2 font-semibold underline">Retry places</button></div>}
          <p className="text-xs text-slate-500 sm:col-span-2">This shares a meeting plan only. Reserve a room separately if needed.</p>
        </div>
      )}
      {kind === "poll" && (
        <div className="space-y-2">
          {options.map((option, index) => <label key={index} className="block space-y-1 text-sm font-medium text-slate-700"><span>Option {index + 1}</span><input required maxLength={80} value={option} onChange={(event) => setOptions((current) => current.map((value, i) => i === index ? event.target.value : value))} className={fieldClass} /></label>)}
          <div className="flex gap-2">
            {options.length < 6 && <button type="button" onClick={() => setOptions((current) => [...current, ""])} className={`${actionClass} text-emerald-800 hover:bg-emerald-50`}><Plus className="h-4 w-4" /> Add option</button>}
            {options.length > 2 && <button type="button" onClick={() => setOptions((current) => current.slice(0, -1))} className={`${actionClass} text-slate-500 hover:bg-slate-100`}>Remove last</button>}
          </div>
          <p className="text-xs text-slate-500">Votes are visible to circle members, not anonymous.</p>
        </div>
      )}
      {kind === "resource" && (
        <div className="min-w-0 space-y-3">
          <div className="flex gap-2" aria-label="Resource type">
            {(["link", "document"] as const).map((mode) => <button key={mode} type="button" aria-pressed={resourceMode === mode} onClick={() => {
              if (mode === resourceMode) return;
              setResourceMode(mode);
              setFile(null);
              setError("");
            }} className={`${actionClass} flex-1 ${resourceMode === mode ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"}`}>{mode === "link" ? <ExternalLink className="h-4 w-4" /> : <Upload className="h-4 w-4" />}{mode === "link" ? "Link" : "Upload file"}</button>)}
          </div>
          {resourceMode === "link" ? (
            <label key="resource-link" className="block space-y-1.5 text-sm font-medium text-slate-700"><span>Resource link</span><input required type="url" maxLength={2000} value={url} onChange={(event) => setUrl(event.target.value)} className={fieldClass} placeholder="https://..." /></label>
          ) : (
            <label key="resource-document" className="block min-w-0 space-y-1.5 text-sm font-medium text-slate-700">
              <span>Document</span>
              <input required type="file" accept={CIRCLE_DOCUMENT_ACCEPT} onChange={(event) => {
                const selected = event.target.files?.[0] || null;
                setError("");
                if (selected) {
                  const result = validateCircleDocument(selected.name, selected.size);
                  if (!result.data) { setError(result.error); setFile(null); event.target.value = ""; return; }
                  if (!title.trim()) setTitle(selected.name.replace(/\.(pdf|docx)$/i, "").slice(0, 120));
                }
                setFile(selected);
              }} className={`${fieldClass} text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-emerald-800`} />
              <span className="block text-xs font-normal text-slate-500">PDF or DOCX, up to 4 MB per document. Downloads are available only to circle members.</span>
            </label>
          )}
          <p className="text-xs text-slate-500">Only share material you have permission to share. Files are not virus-scanned; download only documents you trust.</p>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      <button type="submit" disabled={busy || (kind === "session" && !places.length)} className={`${actionClass} w-full bg-emerald-700 text-white hover:bg-emerald-800`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{busy ? file && resourceMode === "document" ? "Uploading document..." : "Sharing..." : "Share with circle"}
      </button>
      </fieldset>
    </form>
  );
}
