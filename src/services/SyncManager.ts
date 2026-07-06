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
    try {
      const status = await Network.getStatus();
      this.updateStatus(status.connected);
    } catch (e) {
      console.warn('Network plugin not available, defaulting to online.', e);
      this.updateStatus(true);
    }

    Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      console.log('📶 Network status changed:', status.connected ? 'Connected' : 'Disconnected');
      this.updateStatus(status.connected);
    });
  }

  private async updateStatus(connected: boolean) {
    if (!connected) {
      this.emitStatus('Offline');
    } else {
      this.emitStatus('Synced');
      this.sync();
    }
  }

  public async sync(): Promise<void> {
    if (this.syncing) return;

    try {
      const status = await Network.getStatus();
      if (!status.connected) {
        this.emitStatus('Offline');
        return;
      }
    } catch (e) {
      // Fallback
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
          break;
        }
      }
    } catch (err) {
      console.error('❌ Error running sync engine:', err);
    } finally {
      this.syncing = false;
      const remainingQueue = await localRepository.getSyncQueue();
      if (remainingQueue.length === 0) {
        this.emitStatus('Synced');
      } else {
        const status = await Network.getStatus();
        this.emitStatus(status.connected ? 'Synced' : 'Offline');
      }
    }
  }

  private async syncQueueItem(item: SyncQueueItem): Promise<boolean> {
    const payload = JSON.parse(item.payload);
    const localUpdatedAt = new Date(payload.updated_at || item.created_at);

    try {
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

        if (serverUpdatedAt > localUpdatedAt) {
          console.log(`⚠️ Conflict detected: Server record is newer (LWW). Overwriting local db for ID ${item.record_id}`);
          
          if (item.table_name === 'members') {
            await localRepository.saveMember(serverRecord);
          } else if (item.table_name === 'polling_unit_cells') {
            const cached = await localRepository.getPollingUnitCells();
            const filtered = cached.filter(c => c.id !== serverRecord.id);
            filtered.push(serverRecord);
            await localRepository.savePollingUnitCells(filtered);
          }
          return true;
        }
      }

      console.log(`📤 Push changes to server (LWW won): ${item.table_name} / ID ${item.record_id}`);
      
      const dbRecord: any = {
        id: item.record_id,
        ...payload,
        updated_at: localUpdatedAt.toISOString()
      };

      // Clean up joined properties that are not columns in the schema
      delete dbRecord.organizations;
      delete dbRecord.members;
      delete dbRecord.canvasser;
      delete dbRecord.app_members_count;
      delete dbRecord.polling_unit_agent_name;
      delete dbRecord.polling_unit_agent_phone;

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
