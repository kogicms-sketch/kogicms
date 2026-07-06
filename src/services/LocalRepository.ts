import { offlineDb, QueuedMutation } from './offlineDb';

// Interface for local member representation
export interface LocalMember {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  organization_id: string | null;
  state: string;
  lga: string | null;
  ward: string | null;
  polling_unit: string | null;
  gender: string | null;
  date_of_birth: string | null;
  voters_card_id: string | null;
  voters_card_image_url: string | null;
  created_at: string;
  updated_at: string;
  deleted: number; // 0 for active, 1 for soft-deleted
}

// Interface for queued sync item
export interface SyncQueueItem {
  id: string;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  payload: string; // JSON string representation of data
  created_at: string;
}

class LocalRepository {
  /**
   * Generates a standard RFC4122 version 4 compliant UUID locally.
   */
  public generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  public async initialize(): Promise<void> {
    // Dexie automatically opens the database on demand.
  }

  // ==========================================
  // SYNC QUEUE OPERATIONS
  // ==========================================

  public async getSyncQueue(): Promise<SyncQueueItem[]> {
    const queue = await offlineDb.sync_queue.orderBy('created_at').toArray();
    return queue as SyncQueueItem[];
  }

  public async enqueueAction(
    tableName: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    payload: Record<string, any>
  ): Promise<void> {
    const id = this.generateUUID();
    const createdAt = new Date().toISOString();
    const payloadStr = JSON.stringify(payload);

    await offlineDb.sync_queue.put({
      id,
      table_name: tableName,
      action,
      record_id: recordId,
      payload: payloadStr,
      created_at: createdAt,
    });

    console.log(` queued sync operation: ${action} on ${tableName} for ID ${recordId}`);
  }

  public async dequeueAction(id: string): Promise<void> {
    await offlineDb.sync_queue.delete(id);
    console.log(`Removed task ${id} from sync queue.`);
  }

  // ==========================================
  // MEMBER OPERATIONS (CRUD)
  // ==========================================

  public async getMembers(): Promise<LocalMember[]> {
    const members = await offlineDb.members.toArray();
    return members.filter(m => m.deleted !== 1);
  }

  public async saveMember(member: Omit<LocalMember, 'created_at' | 'updated_at' | 'deleted'>): Promise<LocalMember> {
    const timestamp = new Date().toISOString();
    const existing = await this.getMemberById(member.id);

    const savedMember: LocalMember = {
      ...member,
      created_at: existing ? existing.created_at : timestamp,
      updated_at: timestamp,
      deleted: 0
    };

    await offlineDb.members.put(savedMember);
    return savedMember;
  }

  public async softDeleteMember(id: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const existing = await this.getMemberById(id);
    if (existing) {
      existing.deleted = 1;
      existing.updated_at = timestamp;
      await offlineDb.members.put(existing);
    }
  }

  public async getMemberById(id: string): Promise<LocalMember | null> {
    const member = await offlineDb.members.get(id);
    return member || null;
  }

  // ==========================================
  // GENERAL CACHE-ASIDE CACHE OPERATIONS
  // ==========================================

  public async clearAllCache(): Promise<void> {
    await offlineDb.members.clear();
    await offlineDb.polling_unit_cells.clear();
    await offlineDb.member_incentives.clear();
    await offlineDb.activities.clear();
    console.log("Wiped all IndexedDB tables.");
  }

  // ==========================================
  // POLLING UNIT CELL OPERATIONS
  // ==========================================

  public async getPollingUnitCells(): Promise<any[]> {
    return await offlineDb.polling_unit_cells.toArray();
  }

  public async savePollingUnitCells(cells: any[]): Promise<void> {
    await offlineDb.polling_unit_cells.bulkPut(cells);
  }
}

export const localRepository = new LocalRepository();
export default localRepository;
