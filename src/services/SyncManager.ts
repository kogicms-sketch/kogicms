import { Network, ConnectionStatus } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';
import { localRepository, SyncQueueItem, LocalMember } from './LocalRepository';

export type SyncStatus = 'Offline' | 'Syncing...' | 'Synced';

type StatusListener = (status: SyncStatus) => void;

class SyncManager {
  private currentStatus: SyncStatus = 'Offline';
  private listeners: Set<StatusListener> = new Set();
  private syncing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupNetworkListener();
    }
  }

  public getStatus(): SyncStatus {
    return this.currentStatus;
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    // Emit current state immediately
    listener(this.currentStatus);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitStatus(status: SyncStatus) {
    this.currentStatus = status;
    this.listeners.forEach((listener) => listener(status));
  }

  private async setupNetworkListener() {
    // Check initial connection status
    try {
      const status = await Network.getStatus();
      this.updateStatus(status.connected);
    } catch (e) {
      console.warn('Network plugin not available, defaulting to online.', e);
      this.updateStatus(true);
    }

    // Listen to network status changes
    Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      console.log('📶 Network status changed:', status.connected ? 'Connected' : 'Disconnected');
      this.updateStatus(status.connected);
    });
  }

  private async updateStatus(connected: boolean) {
    if (!connected) {
      this.emitStatus('Offline');
    } else {
      // If we reconnected, trigger sync
      this.emitStatus('Synced');
      this.sync();
    }
  }

  /**
   * Main sync function: Processes the queue items one by one.
   */
  public async sync(): Promise<void> {
    if (this.syncing) return;

    // Check if we are online before starting
    try {
      const status = await Network.getStatus();
      if (!status.connected) {
        this.emitStatus('Offline');
        return;
      }
    } catch (e) {
      // Fallback if plugin fails
    }

    const queue = await localRepository.getSyncQueue();
    if (queue.length === 0) {
      this.emitStatus('Synced');
      return;
    }

    this.syncing = true;
    this.emitStatus('Syncing...');
    console.log(`🚀 Starting sync. Processing ${queue.length} pending items...`);

    try {
      for (const item of queue) {
        const success = await this.syncQueueItem(item);
        if (success) {
          await localRepository.dequeueAction(item.id);
        } else {
          console.warn(`⚠️ Failed to sync queue item ${item.id}. Will retry later.`);
          // Stop sync loop to prevent out-of-order issues on failure
          break;
        }
      }
    } catch (err) {
      console.error('❌ Error running sync engine:', err);
    } finally {
      this.syncing = false;
      // Re-evaluate status based on remaining items
      const remainingQueue = await localRepository.getSyncQueue();
      if (remainingQueue.length === 0) {
        this.emitStatus('Synced');
      } else {
        const status = await Network.getStatus();
        this.emitStatus(status.connected ? 'Synced' : 'Offline');
      }
    }
  }

  /**
   * Syncs a single item to the server and implements Last-Write-Wins (LWW) conflict resolution.
   */
  private async syncQueueItem(item: SyncQueueItem): Promise<boolean> {
    const payload = JSON.parse(item.payload);
    const localUpdatedAt = new Date(payload.updated_at || item.created_at);

    try {
      // Handle DELETE operation
      if (item.action === 'DELETE') {
        console.log(`🗑️ Syncing DELETE for ID ${item.record_id} on ${item.table_name}`);
        const { error } = await supabase
          .from(item.table_name)
          .delete()
          .eq('id', item.record_id);

        if (error) {
          console.error(`❌ Delete failed for record ${item.record_id}:`, error);
          return false;
        }
        return true;
      }

      // Fetch the server-side state for conflict resolution (LWW)
      console.log(`🔍 Fetching server record for conflict resolution: ${item.table_name} / ID ${item.record_id}`);
      const { data: serverRecord, error: fetchError } = await supabase
        .from(item.table_name)
        .select('*')
        .eq('id', item.record_id)
        .maybeSingle();

      if (fetchError) {
        console.error(`❌ Failed to fetch server record for LWW check:`, fetchError);
        return false;
      }

      if (serverRecord) {
        const serverUpdatedAt = new Date(serverRecord.updated_at || serverRecord.created_at);

        // Conflict check: If the server's record has a newer updated_at timestamp, the server wins.
        if (serverUpdatedAt > localUpdatedAt) {
          console.log(`⚠️ Conflict detected: Server record is newer (LWW). Overwriting local db for ID ${item.record_id}`);
          
          // Overwrite local record with server version (resolving conflict)
          if (item.table_name === 'members') {
            await localRepository.saveMember({
              id: serverRecord.id,
              full_name: serverRecord.full_name,
              email: serverRecord.email,
              phone: serverRecord.phone,
              role: serverRecord.role,
              organization_id: serverRecord.organization_id,
              state: serverRecord.state || 'Katsina',
              lga: serverRecord.lga,
              ward: serverRecord.ward,
              polling_unit: serverRecord.polling_unit,
              gender: serverRecord.gender,
              date_of_birth: serverRecord.date_of_birth,
              voters_card_id: serverRecord.voters_card_id,
              voters_card_image_url: serverRecord.voters_card_image_url
            });
          }
          return true; // We successfully resolved conflict by applying server changes locally, so we can discard the queue item
        }
      }

      // No conflict or local is newer: Push local changes to Supabase (upsert)
      console.log(`📤 Push changes to server (LWW won): ${item.table_name} / ID ${item.record_id}`);
      
      // Map local record properties to database schema
      const dbRecord = {
        id: item.record_id,
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        organization_id: payload.organization_id,
        state: payload.state || 'Katsina',
        lga: payload.lga,
        ward: payload.ward,
        polling_unit: payload.polling_unit,
        gender: payload.gender,
        date_of_birth: payload.date_of_birth,
        voters_card_id: payload.voters_card_id,
        voters_card_image_url: payload.voters_card_image_url,
        updated_at: localUpdatedAt.toISOString()
      };

      const { error: upsertError } = await supabase
        .from(item.table_name)
        .upsert(dbRecord);

      if (upsertError) {
        console.error(`❌ Upsert to Supabase failed for ${item.record_id}:`, upsertError);
        return false;
      }

      return true;
    } catch (err) {
      console.error(`❌ Exception syncing queue item:`, err);
      return false;
    }
  }
}

export const syncManager = new SyncManager();
export default syncManager;
