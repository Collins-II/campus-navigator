"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/notifications";
import { LocationProvider } from "@/lib/LocationContext";
import { ChatUnreadProvider } from "@/lib/ChatUnreadContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <LocationProvider>
          <ChatUnreadProvider>{children}</ChatUnreadProvider>
        </LocationProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
