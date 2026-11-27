"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, LogOut } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard caught error:", error);
  }, [error]);

  const handleClearCacheAndReload = () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
      }
    } catch {}
    window.location.reload();
  };

  const handleResetAuth = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_role");
        localStorage.removeItem("auth_email");
        localStorage.removeItem("pu_agent_profile");
        localStorage.removeItem("councillor_profile");
      }
    } catch {}
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white">Temporary Loading Error</h2>
          <p className="text-sm text-slate-400">
            {error?.message && !error.message.includes("digest")
              ? error.message
              : "An unexpected error occurred while loading this dashboard."}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={handleClearCacheAndReload}
            className="w-full border-white/10 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Clear Cache & Refresh
          </Button>
          <Button
            variant="ghost"
            onClick={handleResetAuth}
            className="w-full text-slate-400 hover:text-white hover:bg-white/5 text-xs py-2"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out / Switch Account
          </Button>
        </div>
      </div>
    </div>
  );
}
