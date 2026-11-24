import { Network, ConnectionStatus } from '@capacitor/network';
import { supabase } from '@/integrations/supabase/client';
import { localRepository, SyncQueueItem, LocalMember } from './LocalRepository';
import { cleanMemberForDb } from '@/hooks/useMembers';

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

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('📶 Browser online event detected: Auto-syncing outbox...');
        this.updateStatus(true);
        this.sync();
      });
      window.addEventListener('offline', () => {
        console.log('📶 Browser offline event detected');
        this.updateStatus(false);
      });
    }
  }

  private async updateStatus(connected: boolean) {
    if (!connected) {
      this.emitStatus('Offline');
    } else {
      this.emitStatus('Synced');
      this.sync();
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(`Sync request timed out after ${timeoutMs}ms`);
        resolve(fallback);
      }, timeoutMs);
    });

    return Promise.race([
      promise.then((result) => {
        clearTimeout(timeoutId);
        return result;
      }),
      timeoutPromise
    ]);
  }

  public async sync(): Promise<void> {
    if (this.syncing) return;

    try {
      const status = await this.withTimeout(
        Network.getStatus(),
        2000,
        { connected: true } as any
      );
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
        const { error } = await this.withTimeout(
          supabase
            .from(item.table_name)
            .delete()
            .eq('id', item.record_id),
          10000,
          { error: new Error('Delete timed out') } as any
        );

        if (error) {
          console.error(`❌ Delete failed for record ${item.record_id}:`, error);
          return false;
        }
        return true;
      }

      console.log(`🔍 Fetching server record for conflict resolution: ${item.table_name} / ID ${item.record_id}`);
      const { data: serverRecord, error: fetchError } = await this.withTimeout(
        supabase
          .from(item.table_name)
          .select('*')
          .eq('id', item.record_id)
          .maybeSingle(),
        10000,
        { data: null, error: new Error('Fetch server record timed out') } as any
      );

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
      
      let dbRecord: any = {
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
      if (item.table_name === 'members') {
        dbRecord = cleanMemberForDb(dbRecord);
      }

      let syncError;
      if (item.action === 'UPDATE') {
        const { data, error } = await this.withTimeout(
          supabase
            .from(item.table_name)
            .update(dbRecord)
            .eq('id', item.record_id)
            .select(),
          10000,
          { data: null, error: new Error('Update timed out') } as any
        );
        syncError = error;
        if (!error && (!data || data.length === 0)) {
          console.warn(`⚠️ RLS blocked UPDATE or record not found for ID ${item.record_id} on ${item.table_name}. Dequeuing.`);
        }
      } else {
        const { error } = await this.withTimeout(
          supabase
            .from(item.table_name)
            .upsert(dbRecord),
          10000,
          { error: new Error('Upsert timed out') } as any
        );
        syncError = error;
      }

      if (syncError) {
        console.error(`❌ Sync to Supabase failed for ${item.record_id} (${item.action}):`, syncError);
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
