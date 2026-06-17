import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

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
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isNative: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

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

  /**
   * Initializes SQLite connection on native platforms or falls back to Web storage.
   */
  public async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.initialized) return;

    if (this.isNative) {
      try {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
        this.db = await this.sqlite.createConnection(
          'dikkocms',
          false,
          'no-encryption',
          1,
          false
        );
        await this.db.open();
        await this.createSchemas();
        this.initialized = true;
        console.log('📦 Native SQLite LocalRepository initialized.');
      } catch (err) {
        console.error('❌ Failed to initialize native SQLite. Falling back to web mock.', err);
        this.isNative = false;
        this.initializeWebMock();
      }
    } else {
      this.initializeWebMock();
    }
  }

  private initializeWebMock(): void {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('local_members')) {
      localStorage.setItem('local_members', JSON.stringify([]));
    }
    if (!localStorage.getItem('sync_queue')) {
      localStorage.setItem('sync_queue', JSON.stringify([]));
    }
    this.initialized = true;
    console.log('💻 Web localStorage LocalRepository initialized.');
  }

  private async createSchemas(): Promise<void> {
    if (!this.db) return;

    // Table for local member records with local timestamps and soft-delete flags
    const createMembersTable = `
      CREATE TABLE IF NOT EXISTS local_members (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT,
        organization_id TEXT,
        state TEXT NOT NULL,
        lga TEXT,
        ward TEXT,
        polling_unit TEXT,
        gender TEXT,
        date_of_birth TEXT,
        voters_card_id TEXT,
        voters_card_image_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted INTEGER DEFAULT 0
      );
    `;

    // Table for capturing offline actions that need synchronization
    const createSyncQueueTable = `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        action TEXT NOT NULL,
        record_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `;

    await this.db.execute(createMembersTable);
    await this.db.execute(createSyncQueueTable);
  }

  // ==========================================
  // SYNC QUEUE OPERATIONS
  // ==========================================

  public async getSyncQueue(): Promise<SyncQueueItem[]> {
    await this.initialize();

    if (this.isNative && this.db) {
      const result = await this.db.query('SELECT * FROM sync_queue ORDER BY created_at ASC');
      return (result.values || []) as SyncQueueItem[];
    } else {
      const queue = localStorage.getItem('sync_queue');
      return queue ? JSON.parse(queue) : [];
    }
  }

  public async enqueueAction(
    tableName: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    payload: Record<string, any>
  ): Promise<void> {
    await this.initialize();
    const id = this.generateUUID();
    const createdAt = new Date().toISOString();
    const payloadStr = JSON.stringify(payload);

    if (this.isNative && this.db) {
      await this.db.run(
        `INSERT INTO sync_queue (id, table_name, action, record_id, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, tableName, action, recordId, payloadStr, createdAt]
      );
    } else {
      const queue = await this.getSyncQueue();
      queue.push({
        id,
        table_name: tableName,
        action,
        record_id: recordId,
        payload: payloadStr,
        created_at: createdAt,
      });
      localStorage.setItem('sync_queue', JSON.stringify(queue));
    }
    console.log(` queued sync operation: ${action} on ${tableName} for ID ${recordId}`);
  }

  public async dequeueAction(id: string): Promise<void> {
    await this.initialize();

    if (this.isNative && this.db) {
      await this.db.run('DELETE FROM sync_queue WHERE id = ?', [id]);
    } else {
      const queue = await this.getSyncQueue();
      const filtered = queue.filter((item) => item.id !== id);
      localStorage.setItem('sync_queue', JSON.stringify(filtered));
    }
    console.log(`Removed task ${id} from sync queue.`);
  }

  // ==========================================
  // MEMBER OPERATIONS (CRUD)
  // ==========================================

  public async getMembers(): Promise<LocalMember[]> {
    await this.initialize();

    if (this.isNative && this.db) {
      const result = await this.db.query('SELECT * FROM local_members WHERE deleted = 0');
      return (result.values || []) as LocalMember[];
    } else {
      const members = localStorage.getItem('local_members');
      const parsed: LocalMember[] = members ? JSON.parse(members) : [];
      return parsed.filter(m => m.deleted === 0);
    }
  }

  public async saveMember(member: Omit<LocalMember, 'created_at' | 'updated_at' | 'deleted'>): Promise<LocalMember> {
    await this.initialize();

    const timestamp = new Date().toISOString();
    const existing = await this.getMemberById(member.id);

    const savedMember: LocalMember = {
      ...member,
      created_at: existing ? existing.created_at : timestamp,
      updated_at: timestamp,
      deleted: 0
    };

    if (this.isNative && this.db) {
      if (existing) {
        await this.db.run(
          `UPDATE local_members SET 
            full_name = ?, email = ?, phone = ?, role = ?, organization_id = ?, 
            state = ?, lga = ?, ward = ?, polling_unit = ?, gender = ?, 
            date_of_birth = ?, voters_card_id = ?, voters_card_image_url = ?, 
            updated_at = ?, deleted = 0
           WHERE id = ?`,
          [
            savedMember.full_name, savedMember.email, savedMember.phone, savedMember.role, savedMember.organization_id,
            savedMember.state, savedMember.lga, savedMember.ward, savedMember.polling_unit, savedMember.gender,
            savedMember.date_of_birth, savedMember.voters_card_id, savedMember.voters_card_image_url,
            savedMember.updated_at, savedMember.id
          ]
        );
      } else {
        await this.db.run(
          `INSERT INTO local_members (
            id, full_name, email, phone, role, organization_id, state, lga, ward, 
            polling_unit, gender, date_of_birth, voters_card_id, voters_card_image_url, 
            created_at, updated_at, deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            savedMember.id, savedMember.full_name, savedMember.email, savedMember.phone, savedMember.role, savedMember.organization_id,
            savedMember.state, savedMember.lga, savedMember.ward, savedMember.polling_unit, savedMember.gender,
            savedMember.date_of_birth, savedMember.voters_card_id, savedMember.voters_card_image_url,
            savedMember.created_at, savedMember.updated_at
          ]
        );
      }
    } else {
      const list = localStorage.getItem('local_members');
      const parsed: LocalMember[] = list ? JSON.parse(list) : [];
      const filtered = parsed.filter(m => m.id !== member.id);
      filtered.push(savedMember);
      localStorage.setItem('local_members', JSON.stringify(filtered));
    }

    return savedMember;
  }

  public async softDeleteMember(id: string): Promise<void> {
    await this.initialize();
    const timestamp = new Date().toISOString();

    if (this.isNative && this.db) {
      await this.db.run(
        'UPDATE local_members SET deleted = 1, updated_at = ? WHERE id = ?',
        [timestamp, id]
      );
    } else {
      const list = localStorage.getItem('local_members');
      const parsed: LocalMember[] = list ? JSON.parse(list) : [];
      const updated = parsed.map((m) => {
        if (m.id === id) {
          return { ...m, deleted: 1, updated_at: timestamp };
        }
        return m;
      });
      localStorage.setItem('local_members', JSON.stringify(updated));
    }
  }

  public async getMemberById(id: string): Promise<LocalMember | null> {
    await this.initialize();

    if (this.isNative && this.db) {
      const result = await this.db.query('SELECT * FROM local_members WHERE id = ?', [id]);
      if (result.values && result.values.length > 0) {
        return result.values[0] as LocalMember;
      }
      return null;
    } else {
      const list = localStorage.getItem('local_members');
      const parsed: LocalMember[] = list ? JSON.parse(list) : [];
      return parsed.find(m => m.id === id) || null;
    }
  }
}

export const localRepository = new LocalRepository();
export default localRepository;
