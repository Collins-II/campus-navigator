"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { useToast } from "@/components/notifications";
import type { ChatConversation } from "@/lib/chat";

type ChatUnreadContextValue = { unread: number; refresh: () => Promise<void> };

const ChatUnreadContext = createContext<ChatUnreadContextValue>({ unread: 0, refresh: async () => {} });

export const useChatUnread = () => useContext(ChatUnreadContext);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const toastRef = useRef(toast);
  const routerRef = useRef(router);
  const viewRef = useRef({ pathname });
  const seen = useRef<Map<string, number> | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    toastRef.current = toast;
    routerRef.current = router;
    viewRef.current = { pathname };
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (!res.ok) return;
      const { conversations } = (await res.json()) as { conversations: ChatConversation[] };
      const total = conversations.reduce((sum, c) => sum + c.unread, 0);
      setUnread(total);

      const previous = seen.current;
      const path = viewRef.current.pathname;
      const active = new URLSearchParams(window.location.search).get("c");
      const onChat = path === "/chat";

      if (!previous) {
        if (total > 0 && !onChat) {
          toastRef.current.custom({
            type: "info",
            title: `${total} unread message${total === 1 ? "" : "s"}`,
            message: "You have new messages waiting in Chat.",
            action: { label: "Open", onClick: () => routerRef.current.push("/chat") },
          });
        }
      } else {
        for (const c of conversations) {
          const before = previous.get(c.id) ?? 0;
          const viewing = onChat && active === c.id;
          if (c.unread > before && !viewing) {
            toastRef.current.custom({
              type: "info",
              title: c.title,
              message: c.lastMessage?.text ?? "New message",
              action: { label: "Open", onClick: () => routerRef.current.push(`/chat?c=${c.id}`) },
            });
          }
        }
      }
      seen.current = new Map(conversations.map((c) => [c.id, c.unread]));
    } catch {
      /* retry on next tick */
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      seen.current = null;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 10000);
    return () => clearInterval(timer);
  }, [status, refresh]);

  const value = useMemo(
    () => ({ unread: status === "authenticated" ? unread : 0, refresh }),
    [unread, status, refresh]
  );
  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}
