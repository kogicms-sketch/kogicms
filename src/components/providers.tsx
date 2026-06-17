"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { PartyProvider } from "@/contexts/PartyContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ChatNotifications } from "@/components/chat/ChatNotifications";
import { ActivityNotifications } from "@/components/notifications/ActivityNotifications";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PartyProvider>
          <AuthProvider>
            <ChatNotifications />
            <ActivityNotifications />
            <PWAInstallPrompt />
            <Toaster />
            <Sonner />
            {children}
          </AuthProvider>
        </PartyProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
