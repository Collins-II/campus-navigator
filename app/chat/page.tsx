"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, BookOpen, LayoutGrid, Loader2, MessageSquare, MessageSquarePlus, Search, Send, X } from "lucide-react";

import type { ChatConversation, ChatMessage } from "@/lib/chat";
import { useChatUnread } from "@/lib/ChatUnreadContext";
import { StudyCircle } from "@/components/chat/StudyCircle";
import { CampusNavbar } from "@/components/ui/CampusNavbar";

type Person = { id: string; name: string; program?: string; year?: string };
type PendingMessage = ChatMessage & { pending?: boolean; failed?: boolean };

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

function shortTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function Avatar({ name, group }: { name: string; group?: boolean }) {
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${group ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
      {group ? <BookOpen className="h-5 w-5" /> : initials(name)}
    </span>
  );
}

function NewChatModal({ userId, onClose, onCreated }: { userId?: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shown = results.filter((p) => p.id !== userId);

  useEffect(() => {
    const handle = setTimeout(async () => {
      const term = query.trim();
      try {
        const res = await fetch(`/api/chat/users?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to search students right now.");
        setError("");
        setResults(data.users ?? []);
      } catch (searchError) {
        setResults([]);
        setError(searchError instanceof Error ? searchError.message : "Unable to search students right now.");
      }
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  const toggle = (p: Person) =>
    setSelected((cur) => (cur.some((s) => s.id === p.id) ? cur.filter((s) => s.id !== p.id) : [...cur, p]));

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: selected.filter((s) => s.id !== userId).map((s) => s.id), name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start chat");
      onCreated(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start chat");
    } finally {
      setBusy(false);
    }
  };

  const isGroup = selected.length > 1;

  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div className="ui-modal" role="dialog" aria-modal="true" aria-label="New chat" onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal-head">
          <h2 className="text-lg font-semibold tracking-tight">Find your people</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm leading-relaxed text-slate-500">Choose one student for a direct message, or two or more to start a Study Circle with meetups, polls and shared resources.</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              autoFocus
              className="ui-input ui-input-icon"
              placeholder="Type a name or programme"
              aria-label="Find students"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s)}
                  className="flex items-center gap-1 rounded-full bg-[#008236] px-3 py-1.5 text-xs font-bold text-white"
                >
                  {s.name} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          <ul className="max-h-56 divide-y divide-gray-200 overflow-y-auto">
            {shown.map((p) => {
              const on = selected.some((s) => s.id === p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    className={`flex min-h-[56px] w-full items-center gap-3 px-1 text-left ${on ? "bg-green-50" : ""}`}
                  >
                    <Avatar name={p.name} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{p.name}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {[p.program, p.year].filter(Boolean).join(" · ") || "Student"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && (
              <li className="py-6 text-center text-sm text-gray-500">No students found</li>
            )}
          </ul>

          {isGroup && (
            <input
              className="ui-input"
              placeholder="Name your study circle"
              aria-label="Study circle name"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        </div>
        <div className="ui-modal-actions">
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            disabled={busy || selected.length === 0 || (isGroup && !name.trim())}
            onClick={create}
          >
            {busy ? "Starting…" : isGroup ? "Create study circle" : "Start chat"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Thread({ conversation, userId, onBack, onActivity }: {
  conversation: ChatConversation;
  userId: string;
  onBack: () => void;
  onActivity: () => void;
}) {
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"messages" | "circle">("messages");
  const endRef = useRef<HTMLDivElement>(null);
  const nameById = useMemo(() => new Map(conversation.members.map((m) => [m.id, m.name])), [conversation.members]);
  const convId = conversation.id;

  const lastServerTime = useCallback(
    (list: PendingMessage[]) => [...list].reverse().find((m) => !m.pending && !m.failed)?.createdAt,
    []
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chat/conversations/${convId}/messages`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load messages right now.");
        if (!cancelled) setMessages(data.messages);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [convId]);

  useEffect(() => {
    if (loading) return;
    const tick = async () => {
      if (document.hidden) return;
      const after = lastServerTime(messages);
      const url = `/api/chat/conversations/${convId}/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as { messages: ChatMessage[] };
        if (data.messages.length === 0) return;
        setMessages((cur) => {
          const known = new Set(cur.map((m) => m.id));
          const fresh = data.messages.filter((m) => !known.has(m.id));
          return fresh.length ? [...cur, ...fresh] : cur;
        });
        onActivity();
      } catch {
        /* retry on next tick */
      }
    };
    const timer = setInterval(tick, 4000);
    return () => clearInterval(timer);
  }, [loading, messages, convId, lastServerTime, onActivity]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, loading]);

  const send = async (body: string, tempId?: string) => {
    const id = tempId ?? `tmp-${crypto.randomUUID()}`;
    const optimistic: PendingMessage = {
      id,
      senderId: userId,
      text: body,
      createdAt: new Date().toISOString(),
      deleted: false,
      pending: true,
    };
    setMessages((cur) => (tempId ? cur.map((m) => (m.id === id ? optimistic : m)) : [...cur, optimistic]));
    try {
      const res = await fetch(`/api/chat/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
      if (!res.ok) throw new Error();
      const { message } = (await res.json()) as { message: ChatMessage };
      setMessages((cur) => cur.map((m) => (m.id === id ? message : m)));
      onActivity();
    } catch {
      setMessages((cur) => cur.map((m) => (m.id === id ? { ...m, pending: false, failed: true } : m)));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    void send(body);
  };

  const isGroup = conversation.type === "group";

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 text-slate-900">
        <button type="button" onClick={onBack} aria-label="Back to chats" className="flex h-11 w-11 items-center justify-center xl:hidden">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <Avatar name={conversation.title} group={isGroup} />
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight">{conversation.title}</h2>
          <p className="truncate text-xs text-slate-500">
            {isGroup ? `Study circle · ${conversation.members.length} members` : conversation.members.find((m) => m.id !== userId)?.program || "Student"}
          </p>
        </div>
      </header>

      {isGroup && (
        <nav className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-3 py-2" aria-label="Study circle views">
          <button type="button" aria-pressed={tab === "messages"} onClick={() => setTab("messages")} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${tab === "messages" ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50"}`}><MessageSquare className="h-4 w-4" /> Conversation</button>
          <button type="button" aria-pressed={tab === "circle"} onClick={() => setTab("circle")} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${tab === "circle" ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50"}`}><LayoutGrid className="h-4 w-4" /> Circle board</button>
        </nav>
      )}
      {isGroup && tab === "circle" ? (
        <StudyCircle conversationId={convId} userId={userId} ownerId={conversation.createdBy} memberNames={nameById} />
      ) : (
      <>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-5">
        {loading && (
          <div className="flex justify-center py-10 text-[#008236]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {error && <p className="py-10 text-center text-sm font-semibold text-red-600">{error}</p>}
        {!loading && !error && messages.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-500">No messages yet. Say hello 👋</p>
        )}
        {messages.map((m, i) => {
          const mine = m.senderId === userId;
          const showName = isGroup && !mine && messages[i - 1]?.senderId !== m.senderId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "rounded-br-sm bg-[#008236] text-white" : "rounded-bl-sm border-2 border-[#052e16]/10 bg-white text-[#052e16]"
                } ${m.pending ? "opacity-60" : ""}`}
              >
                {showName && <p className="mb-0.5 text-[11px] font-black text-[#008236]">{nameById.get(m.senderId) ?? "Student"}</p>}
                <p className="whitespace-pre-wrap break-words">{m.deleted ? "Message deleted" : m.text}</p>
                <p className={`mt-1 text-right text-[10px] ${mine ? "text-green-100" : "text-gray-500"}`}>
                  {m.failed ? (
                    <button type="button" className="font-bold underline" onClick={() => send(m.text, m.id)}>
                      Failed · tap to retry
                    </button>
                  ) : m.pending ? (
                    "Sending…"
                  ) : (
                    shortTime(m.createdAt)
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <textarea
          rows={1}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={isGroup ? "Ask a question, share an idea..." : "Write a message..."}
          aria-label="Message"
          className="ui-input max-h-32 min-h-[44px] flex-1 resize-none rounded-3xl"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!text.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#008236] text-white disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
      </>
      )}
    </div>
  );
}

function ChatApp() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get("c");
  const userId = session?.user?.id as string | undefined;
  const { refresh: refreshGlobalUnread } = useChatUnread();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [inboxFilter, setInboxFilter] = useState<"all" | "group" | "direct">("all");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load chats");
      setConversations(data.conversations);
      void refreshGlobalUnread();
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load chats");
    } finally {
      setLoading(false);
    }
  }, [refreshGlobalUnread]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (status === "authenticated") void load();
  }, [status, load, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 8000);
    return () => clearInterval(timer);
  }, [status, load]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const open = (id: string | null) => router.push(id ? `/chat?c=${id}` : "/chat");
  const visible = conversations.filter((c) =>
    c.title.toLowerCase().includes(filter.toLowerCase()) && (inboxFilter === "all" || c.type === inboxFilter)
  );

  // Opening a thread zeroes its unread badge locally; the server marks it read on fetch.
  const withRead = (c: ChatConversation) => (c.id === activeId ? { ...c, unread: 0 } : c);

  return (
    <div className="fixed inset-0 bottom-[calc(68px+env(safe-area-inset-bottom))] flex flex-col bg-white xl:static xl:h-dvh">
      <div className="relative z-20 shrink-0 border-b border-slate-100 bg-slate-50 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:px-6">
        <CampusNavbar />
      </div>
      <div className="flex min-h-0 flex-1">
      <aside className={`${active ? "hidden" : "flex"} min-h-0 w-full flex-col border-r border-slate-200 xl:flex xl:w-[360px] xl:shrink-0`}>
        <header className="border-b border-slate-100 bg-slate-50 px-4 py-4 text-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" aria-label="Back to dashboard" className="-ml-2 flex h-11 w-11 items-center justify-center">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Your campus, connected</p><h1 className="text-2xl font-bold tracking-tight">Study & connect</h1></div>
            </div>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              aria-label="New chat"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-700"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              className="ui-input ui-input-icon !rounded-xl !border-0 !text-slate-900"
              placeholder="Search chats"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </header>

        <nav className="flex shrink-0 gap-1 border-b border-slate-100 p-3" aria-label="Filter conversations">
          {(["all", "group", "direct"] as const).map((value) => (
            <button key={value} type="button" onClick={() => setInboxFilter(value)} aria-pressed={inboxFilter === value} className={`min-h-11 flex-1 rounded-xl px-2 text-xs font-semibold ${inboxFilter === value ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50"}`}>
              {value === "all" ? "All" : value === "group" ? "Study circles" : "Direct"}
            </button>
          ))}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-12 text-[#008236]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {error && <p className="p-6 text-center text-sm font-semibold text-red-600">{error}</p>}
          {!loading && !error && conversations.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold text-slate-900">Better together</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">Message a coursemate or bring your study circle together. Turn questions into plans, and plans into progress.</p>
              <button type="button" className="ui-btn ui-btn-primary mt-4" onClick={() => setShowNew(true)}>
                New chat
              </button>
            </div>
          )}
          <ul className="divide-y divide-gray-200">
            {visible.map(withRead).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c.id)}
                  className={`flex min-h-[80px] w-full items-center gap-3 px-4 py-3 text-left ${c.id === activeId ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                >
                  <Avatar name={c.title} group={c.type === "group"} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{c.title}</span>
                      <span className="shrink-0 text-[11px] text-gray-500">{shortTime(c.lastMessage?.createdAt ?? c.updatedAt)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? "font-bold text-[#052e16]" : "text-gray-500"}`}>
                        {c.lastMessage ? `${c.lastMessage.senderId === userId ? "You: " : ""}${c.lastMessage.text}` : "No messages yet"}
                      </span>
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#008236] px-1.5 text-[11px] font-black text-white">
                          {c.unread > 99 ? "99+" : c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!loading && !error && conversations.length > 0 && visible.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No conversations match this view.</p>}
        </div>
      </aside>

      <section className={`${active ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col xl:flex`}>
        {active && userId ? (
          <Thread key={active.id} conversation={active} userId={userId} onBack={() => open(null)} onActivity={load} />
        ) : (
          <div className="hidden h-full items-center justify-center bg-slate-50 p-8 text-center xl:flex">
            <div className="max-w-md">
              <BookOpen className="mx-auto h-12 w-12 text-emerald-700" />
              <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">A little less solo.</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">Your next study session, a shared set of notes, a question finally answered. Start with your people.</p>
              <button type="button" onClick={() => setShowNew(true)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800"><MessageSquarePlus className="h-4 w-4" /> Start a conversation</button>
            </div>
          </div>
        )}
      </section>
      </div>

      {showNew && (
        <NewChatModal
          userId={userId}
          onClose={() => setShowNew(false)}
          onCreated={async (id) => {
            setShowNew(false);
            await load();
            open(id);
          }}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatApp />
    </Suspense>
  );
}
