"use client";
import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { syncManager, SyncStatus } from '@/services/SyncManager';
import { cn } from '@/lib/utils';

export const SyncIndicator = () => {
  const [status, setStatus] = useState<SyncStatus>('Offline');

  useEffect(() => {
    // Subscribe to status changes in the SyncManager
    const unsubscribe = syncManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleManualSync = () => {
    if (status !== 'Offline' && status !== 'Syncing...') {
      syncManager.sync();
    }
  };

  return (
    <button
      onClick={handleManualSync}
      disabled={status === 'Syncing...'}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border transition-all duration-300 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2",
        status === 'Offline' && "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20 focus:ring-destructive",
        status === 'Syncing...' && "bg-amber-500/10 text-amber-500 border-amber-500/30 focus:ring-amber-500",
        status === 'Synced' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/15 focus:ring-emerald-500"
      )}
      title={
        status === 'Offline'
          ? "You are offline. Changes are saved locally and will sync when reconnected."
          : status === 'Syncing...'
          ? "Synchronizing local data with cloud..."
          : "All changes synchronized. Click to force a manual sync check."
      }
    >
      {status === 'Offline' && (
        <>
          <WifiOff className="w-3.5 h-3.5 animate-pulse text-destructive" />
          <span>Offline</span>
        </>
      )}

      {status === 'Syncing...' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
          <span>Syncing...</span>
        </>
      )}

      {status === 'Synced' && (
        <>
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span>Synced</span>
        </>
      )}
    </button>
  );
};

export default SyncIndicator;
