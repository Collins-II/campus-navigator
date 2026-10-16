"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, MessageSquarePlus, Search, Send, Users, X } from "lucide-react";

import type { ChatConversation, ChatMessage } from "@/lib/chat";
import { useChatUnread } from "@/lib/ChatUnreadContext";

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
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#052e16] bg-[#008236] text-sm font-black text-white">
      {group ? <Users className="h-5 w-5" /> : initials(name)}
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
        if (res.ok) setResults((await res.json()).users ?? []);
      } catch {
        setResults([]);
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
          <h2 className="text-lg font-black uppercase tracking-wide">New chat</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              autoFocus
              className="ui-input ui-input-icon"
              placeholder="Type a name or programme"
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
              placeholder="Group name"
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
            {busy ? "Starting…" : isGroup ? "Create group" : "Start chat"}
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
        if (!res.ok) throw new Error("Could not load messages");
        const data = await res.json();
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
      <header className="flex items-center gap-3 border-b-[3px] border-[#008236] bg-[#052e16] px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white">
        <button type="button" onClick={onBack} aria-label="Back to chats" className="flex h-11 w-11 items-center justify-center xl:hidden">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <Avatar name={conversation.title} group={isGroup} />
        <div className="min-w-0">
          <h2 className="truncate text-base font-black uppercase tracking-wide">{conversation.title}</h2>
          <p className="truncate text-xs text-green-200">
            {isGroup ? `${conversation.members.length} members` : conversation.members.find((m) => m.id !== userId)?.program || "Student"}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-green-50/50 px-3 py-4">
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

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-gray-200 bg-white mb-20 md:mb-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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
          placeholder="Message"
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
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (!res.ok) throw new Error("Could not load chats");
      setConversations((await res.json()).conversations);
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
  const visible = conversations.filter((c) => c.title.toLowerCase().includes(filter.toLowerCase()));

  // Opening a thread zeroes its unread badge locally; the server marks it read on fetch.
  const withRead = (c: ChatConversation) => (c.id === activeId ? { ...c, unread: 0 } : c);

  return (
    <div className="fixed inset-0 bottom-[calc(64px+env(safe-area-inset-bottom))] flex bg-white xl:static xl:h-[calc(100vh-72px)]">
      <aside className={`${active ? "hidden" : "flex"} w-full flex-col border-r-2 border-[#052e16] xl:flex xl:w-[380px] xl:shrink-0`}>
        <header className="bg-[#052e16] px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" aria-label="Back to dashboard" className="-ml-2 flex h-11 w-11 items-center justify-center">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-black uppercase tracking-wide">Chats</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              aria-label="New chat"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#008236]"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-500" />
            <input
              className="ui-input ui-input-icon"
              placeholder="Search chats"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-12 text-[#008236]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {error && <p className="p-6 text-center text-sm font-semibold text-red-600">{error}</p>}
          {!loading && !error && conversations.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-lg font-black uppercase">No chats yet</p>
              <p className="mt-1 text-sm text-gray-500">Start a conversation with a coursemate or create a study group.</p>
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
                  className={`flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left ${c.id === activeId ? "bg-green-50" : "hover:bg-gray-50"}`}
                >
                  <Avatar name={c.title} group={c.type === "group"} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-black">{c.title}</span>
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
        </div>
      </aside>

      <section className={`${active ? "fixed inset-0 z-[1200] xl:static" : "hidden"} min-w-0 flex-1 xl:block`}>
        {active && userId ? (
          <Thread key={active.id} conversation={active} userId={userId} onBack={() => open(null)} onActivity={load} />
        ) : (
          <div className="hidden h-full items-center justify-center text-center xl:flex">
            <div>
              <MessageSquarePlus className="mx-auto h-10 w-10 text-[#008236]" />
              <p className="mt-2 text-sm font-bold uppercase tracking-wide text-gray-500">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </section>

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
